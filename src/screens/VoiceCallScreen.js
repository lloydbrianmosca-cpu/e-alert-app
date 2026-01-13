import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCall } from '../context/CallContext';

const { width, height } = Dimensions.get('window');

export default function VoiceCallScreen({ navigation, route }) {
  const {
    isInCall,
    isCalling,
    isReceivingCall,
    callData,
    remoteUserJoined,
    isMuted,
    isSpeakerOn,
    answerCall,
    endCall,
    rejectCall,
    toggleMute,
    toggleSpeaker,
  } = useCall();

  const [callDuration, setCallDuration] = useState(0);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Pulse animation for calling/ringing state
  useEffect(() => {
    if (isCalling || isReceivingCall) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isCalling, isReceivingCall]);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Call duration timer
  useEffect(() => {
    let interval;
    if (isInCall && remoteUserJoined) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInCall, remoteUserJoined]);

  // Navigate back when call ends
  useEffect(() => {
    if (!isInCall && !isCalling && !isReceivingCall && callDuration > 0) {
      // Call has ended after being connected
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    }
  }, [isInCall, isCalling, isReceivingCall]);

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status text
  const getStatusText = () => {
    if (isReceivingCall) return 'Incoming call...';
    if (isCalling) return 'Calling...';
    if (isInCall && !remoteUserJoined) return 'Connecting...';
    if (isInCall && remoteUserJoined) return formatDuration(callDuration);
    return 'Call ended';
  };

  // Get caller/receiver name
  const getDisplayName = () => {
    if (!callData) return 'Unknown';
    return callData.isOutgoing ? callData.receiverName : callData.callerName;
  };

  // Get caller/receiver type
  const getDisplayType = () => {
    if (!callData) return '';
    if (callData.isOutgoing) {
      return 'User';
    }
    return callData.callerType === 'responder' ? 'Emergency Responder' : 'User';
  };

  // Handle end call
  const handleEndCall = () => {
    endCall();
    navigation.goBack();
  };

  // Handle reject call
  const handleRejectCall = () => {
    rejectCall();
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

      {/* Background */}
      <Animated.View style={[styles.background, { opacity: fadeAnim }]}>
        {/* Gradient-like effect with overlapping circles */}
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Caller Info */}
        <View style={styles.callerInfo}>
          {/* Avatar with pulse animation */}
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                transform: [{ scale: isCalling || isReceivingCall ? pulseAnim : 1 }],
              },
            ]}
          >
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={60} color="#9CA3AF" />
              </View>
            </View>
          </Animated.View>

          {/* Name and type */}
          <Text style={styles.callerName}>{getDisplayName()}</Text>
          <Text style={styles.callerType}>{getDisplayType()}</Text>

          {/* Status */}
          <View style={styles.statusContainer}>
            {(isCalling || isReceivingCall) && (
              <View style={styles.statusDot} />
            )}
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>

          {/* Connected indicator */}
          {isInCall && remoteUserJoined && (
            <View style={styles.connectedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          )}
        </View>

        {/* Call Controls */}
        <View style={styles.controls}>
          {/* In-call controls (mute, speaker) */}
          {(isInCall || isCalling) && (
            <View style={styles.inCallControls}>
              <TouchableOpacity
                style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                onPress={toggleMute}
              >
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic'}
                  size={28}
                  color={isMuted ? '#EF4444' : '#FFFFFF'}
                />
                <Text style={styles.controlLabel}>
                  {isMuted ? 'Unmute' : 'Mute'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
                onPress={toggleSpeaker}
              >
                <Ionicons
                  name={isSpeakerOn ? 'volume-high' : 'volume-low'}
                  size={28}
                  color={isSpeakerOn ? '#3B82F6' : '#FFFFFF'}
                />
                <Text style={styles.controlLabel}>
                  {isSpeakerOn ? 'Speaker' : 'Earpiece'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Main action buttons */}
          <View style={styles.actionButtons}>
            {/* Incoming call: Answer and Reject buttons */}
            {isReceivingCall && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={handleRejectCall}
                >
                  <MaterialCommunityIcons name="phone-hangup" size={32} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.answerButton]}
                  onPress={answerCall}
                >
                  <Ionicons name="call" size={32} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}

            {/* Active call or calling: End call button */}
            {(isInCall || isCalling) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.endCallButton]}
                onPress={handleEndCall}
              >
                <MaterialCommunityIcons name="phone-hangup" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Emergency badge */}
        {callData?.emergencyId && (
          <View style={styles.emergencyBadge}>
            <Ionicons name="warning" size={16} color="#F59E0B" />
            <Text style={styles.emergencyBadgeText}>Emergency Call</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1F2937',
  },
  bgCircle1: {
    position: 'absolute',
    top: -height * 0.2,
    left: -width * 0.3,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -height * 0.1,
    right: -width * 0.3,
    width: width,
    height: width,
    borderRadius: width * 0.5,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  callerInfo: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 24,
  },
  avatarRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  callerType: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 18,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 16,
    gap: 6,
  },
  connectedText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  controls: {
    alignItems: 'center',
  },
  inCallControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 48,
    marginBottom: 48,
  },
  controlButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 80,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlLabel: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 48,
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  endCallButton: {
    backgroundColor: '#EF4444',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  emergencyBadge: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  emergencyBadgeText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
});
