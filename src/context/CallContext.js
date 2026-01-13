import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { db } from '../services/firestore';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  updateDoc 
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

// Agora App ID
const AGORA_APP_ID = '5f2c1aafee7043bbb6ce210485fc968b';

// Lazy load Agora to prevent crash if not properly linked
let createAgoraRtcEngine = null;
let ChannelProfileType = null;
let ClientRoleType = null;
let agoraAvailable = false;

try {
  const agora = require('react-native-agora');
  createAgoraRtcEngine = agora.createAgoraRtcEngine;
  ChannelProfileType = agora.ChannelProfileType;
  ClientRoleType = agora.ClientRoleType;
  agoraAvailable = true;
} catch (error) {
  console.log('Agora SDK not available:', error.message);
  agoraAvailable = false;
}

const CallContext = createContext({
  isInCall: false,
  isCalling: false,
  isReceivingCall: false,
  callData: null,
  remoteUserJoined: false,
  isMuted: false,
  isSpeakerOn: true,
  isAgoraAvailable: false,
  startCall: () => {},
  answerCall: () => {},
  endCall: () => {},
  rejectCall: () => {},
  toggleMute: () => {},
  toggleSpeaker: () => {},
});

export function CallProvider({ children }) {
  const { user } = useAuth();
  const [isInCall, setIsInCall] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callData, setCallData] = useState(null);
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  
  const agoraEngineRef = useRef(null);
  const callDocUnsubscribe = useRef(null);

  // Initialize Agora Engine
  const initializeAgoraEngine = async () => {
    try {
      if (!agoraAvailable || !createAgoraRtcEngine) {
        console.log('Agora SDK not available');
        return null;
      }

      if (agoraEngineRef.current) return agoraEngineRef.current;

      const agoraEngine = createAgoraRtcEngine();
      agoraEngineRef.current = agoraEngine;

      agoraEngine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      // Register event handlers
      agoraEngine.registerEventHandler({
        onJoinChannelSuccess: (_connection, elapsed) => {
          console.log('Successfully joined channel');
          setIsInCall(true);
          setIsCalling(false);
        },
        onUserJoined: (_connection, remoteUid) => {
          console.log('Remote user joined:', remoteUid);
          setRemoteUserJoined(true);
        },
        onUserOffline: (_connection, remoteUid, reason) => {
          console.log('Remote user left:', remoteUid, reason);
          setRemoteUserJoined(false);
          // End call when remote user leaves
          endCall();
        },
        onError: (err, msg) => {
          console.log('Agora error:', err, msg);
        },
      });

      // Enable audio
      agoraEngine.enableAudio();
      agoraEngine.setDefaultAudioRouteToSpeakerphone(true);

      return agoraEngine;
    } catch (error) {
      console.log('Error initializing Agora:', error);
      return null;
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'E-Alert needs access to your microphone for voice calls.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.log('Permission error:', err);
        return false;
      }
    }
    return true; // iOS permissions are handled in Info.plist
  };

  // Generate a unique channel name for the call
  const generateChannelName = (callerId, receiverId) => {
    const sorted = [callerId, receiverId].sort();
    return `call_${sorted[0]}_${sorted[1]}`;
  };

  // Start a call
  const startCall = async (receiverId, receiverName, emergencyId = null) => {
    if (!user?.uid) return { success: false, error: 'Not authenticated' };

    // Check if Agora is available
    if (!agoraAvailable) {
      Alert.alert(
        'Voice Call Unavailable',
        'Voice calling requires rebuilding the app with native support. Please rebuild the app using "npx expo run:android" or "npx expo run:ios".',
        [{ text: 'OK' }]
      );
      return { success: false, error: 'Voice calling not available - app rebuild required' };
    }

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Microphone access is required for voice calls.');
      return { success: false, error: 'Permission denied' };
    }

    try {
      const channelName = generateChannelName(user.uid, receiverId);
      
      // Get caller info
      let callerName = 'Unknown';
      let callerType = 'user';
      
      // Check if caller is a responder
      const responderDoc = await getDoc(doc(db, 'responders', user.uid));
      if (responderDoc.exists()) {
        const data = responderDoc.data();
        callerName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Responder';
        callerType = 'responder';
      } else {
        // Check if caller is a user
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          callerName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || user.displayName || 'User';
          callerType = 'user';
        }
      }

      // Create call document in Firestore
      const callDocRef = doc(db, 'calls', channelName);
      const callInfo = {
        channelName,
        callerId: user.uid,
        callerName,
        callerType,
        receiverId,
        receiverName,
        emergencyId,
        status: 'ringing', // ringing, active, ended, rejected, missed
        createdAt: serverTimestamp(),
        answeredAt: null,
        endedAt: null,
      };

      await setDoc(callDocRef, callInfo);

      // Create incoming call document for receiver to detect
      const incomingCallRef = doc(db, 'incomingCalls', receiverId);
      await setDoc(incomingCallRef, {
        channelName,
        callerId: user.uid,
        callerName,
        callerType,
        emergencyId,
        status: 'ringing',
        createdAt: serverTimestamp(),
      });

      // Listen for call status changes
      listenToCallStatus(channelName);

      setCallData({
        ...callInfo,
        channelName,
        isOutgoing: true,
      });
      setIsCalling(true);

      // Initialize Agora and join channel
      const engine = await initializeAgoraEngine();
      if (engine) {
        engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        await engine.joinChannel('', channelName, user.uid, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        });
      }

      return { success: true, channelName };
    } catch (error) {
      console.log('Error starting call:', error);
      setIsCalling(false);
      return { success: false, error: error.message };
    }
  };

  // Answer an incoming call
  const answerCall = async () => {
    if (!callData || !user?.uid) return;

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Microphone access is required for voice calls.');
      return;
    }

    try {
      // Update call status to active
      const callDocRef = doc(db, 'calls', callData.channelName);
      await updateDoc(callDocRef, {
        status: 'active',
        answeredAt: serverTimestamp(),
      });

      setIsReceivingCall(false);

      // Initialize Agora and join channel
      const engine = await initializeAgoraEngine();
      if (engine) {
        engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        await engine.joinChannel('', callData.channelName, user.uid, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        });
      }
    } catch (error) {
      console.log('Error answering call:', error);
    }
  };

  // End the current call
  const endCall = async () => {
    try {
      // Leave Agora channel
      if (agoraEngineRef.current) {
        agoraEngineRef.current.leaveChannel();
      }

      // Update call document
      if (callData?.channelName) {
        const callDocRef = doc(db, 'calls', callData.channelName);
        const callDoc = await getDoc(callDocRef);
        
        if (callDoc.exists()) {
          await updateDoc(callDocRef, {
            status: 'ended',
            endedAt: serverTimestamp(),
          });
        }

        // Delete incoming call document
        if (callData.receiverId) {
          try {
            await deleteDoc(doc(db, 'incomingCalls', callData.receiverId));
          } catch (e) {
            console.log('Error deleting incoming call doc:', e);
          }
        }
      }

      // Unsubscribe from call status
      if (callDocUnsubscribe.current) {
        callDocUnsubscribe.current();
        callDocUnsubscribe.current = null;
      }

      // Reset state
      setIsInCall(false);
      setIsCalling(false);
      setIsReceivingCall(false);
      setCallData(null);
      setRemoteUserJoined(false);
      setIsMuted(false);
    } catch (error) {
      console.log('Error ending call:', error);
    }
  };

  // Reject an incoming call
  // Reject an incoming call
  const rejectCall = async () => {
    try {
      if (callData?.channelName) {
        const callDocRef = doc(db, 'calls', callData.channelName);
        await updateDoc(callDocRef, {
          status: 'rejected',
          endedAt: serverTimestamp(),
        });
      }

      // Delete incoming call document for current user
      if (user?.uid) {
        try {
          await deleteDoc(doc(db, 'incomingCalls', user.uid));
        } catch (e) {
          console.log('Error deleting incoming call doc:', e);
        }
      }

      // Unsubscribe from call status
      if (callDocUnsubscribe.current) {
        callDocUnsubscribe.current();
        callDocUnsubscribe.current = null;
      }

      setIsReceivingCall(false);
      setCallData(null);
    } catch (error) {
      console.log('Error rejecting call:', error);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (agoraEngineRef.current) {
      const newMuteState = !isMuted;
      agoraEngineRef.current.muteLocalAudioStream(newMuteState);
      setIsMuted(newMuteState);
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    if (agoraEngineRef.current) {
      const newSpeakerState = !isSpeakerOn;
      agoraEngineRef.current.setEnableSpeakerphone(newSpeakerState);
      setIsSpeakerOn(newSpeakerState);
    }
  };

  // Listen to call status changes
  const listenToCallStatus = (channelName) => {
    if (callDocUnsubscribe.current) {
      callDocUnsubscribe.current();
    }

    const callDocRef = doc(db, 'calls', channelName);
    callDocUnsubscribe.current = onSnapshot(callDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        if (data.status === 'ended' || data.status === 'rejected' || data.status === 'missed') {
          endCall();
        } else if (data.status === 'active') {
          setIsInCall(true);
          setIsCalling(false);
        }
      } else {
        // Call document was deleted
        endCall();
      }
    });
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!user?.uid) return;

    // Query for calls where current user is the receiver
    const checkIncomingCalls = () => {
      const callsRef = doc(db, 'incomingCalls', user.uid);
      
      return onSnapshot(callsRef, async (snapshot) => {
        if (snapshot.exists() && !isInCall && !isCalling) {
          const incomingData = snapshot.data();
          
          if (incomingData.status === 'ringing') {
            // Get full call data
            const callDocRef = doc(db, 'calls', incomingData.channelName);
            const callDoc = await getDoc(callDocRef);
            
            if (callDoc.exists()) {
              const fullCallData = callDoc.data();
              setCallData({
                ...fullCallData,
                isOutgoing: false,
              });
              setIsReceivingCall(true);
              
              // Listen to call status
              listenToCallStatus(incomingData.channelName);
            }
          }
        }
      });
    };

    const unsubscribe = checkIncomingCalls();
    return () => unsubscribe();
  }, [user?.uid, isInCall, isCalling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (agoraEngineRef.current) {
        agoraEngineRef.current.release();
      }
      if (callDocUnsubscribe.current) {
        callDocUnsubscribe.current();
      }
    };
  }, []);

  return (
    <CallContext.Provider
      value={{
        isInCall,
        isCalling,
        isReceivingCall,
        callData,
        remoteUserJoined,
        isMuted,
        isSpeakerOn,
        isAgoraAvailable: agoraAvailable,
        startCall,
        answerCall,
        endCall,
        rejectCall,
        toggleMute,
        toggleSpeaker,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);
