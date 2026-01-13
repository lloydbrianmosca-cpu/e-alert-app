import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Vibration,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCall } from '../context/CallContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function IncomingCallOverlay() {
  const navigation = useNavigation();
  const {
    isReceivingCall,
    callData,
    answerCall,
    rejectCall,
  } = useCall();

  const slideAnim = React.useRef(new Animated.Value(-300)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Slide in animation
  useEffect(() => {
    if (isReceivingCall) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Start vibration pattern
      const vibrationPattern = [0, 500, 200, 500];
      Vibration.vibrate(vibrationPattern, true);

      // Pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        pulse.stop();
        Vibration.cancel();
      };
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isReceivingCall]);

  // Handle answer
  const handleAnswer = () => {
    Vibration.cancel();
    answerCall();
    navigation.navigate('VoiceCall');
  };

  // Handle reject
  const handleReject = () => {
    Vibration.cancel();
    rejectCall();
  };

  if (!isReceivingCall || !callData) return null;

  return (
    <Modal
      visible={isReceivingCall}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Emergency indicator */}
          {callData.emergencyId && (
            <View style={styles.emergencyBanner}>
              <Ionicons name="warning" size={14} color="#FFFFFF" />
              <Text style={styles.emergencyText}>Emergency Call</Text>
            </View>
          )}

          {/* Caller info */}
          <View style={styles.callerSection}>
            <Animated.View
              style={[
                styles.avatarContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.avatar}>
                <Ionicons name="person" size={36} color="#FFFFFF" />
              </View>
              <View style={styles.callIcon}>
                <Ionicons name="call" size={14} color="#FFFFFF" />
              </View>
            </Animated.View>

            <View style={styles.callerInfo}>
              <Text style={styles.callerName}>{callData.callerName}</Text>
              <Text style={styles.callerType}>
                {callData.callerType === 'responder' ? 'Emergency Responder' : 'User'}
              </Text>
              <View style={styles.incomingBadge}>
                <View style={styles.incomingDot} />
                <Text style={styles.incomingText}>Incoming voice call</Text>
              </View>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="phone-hangup" size={28} color="#FFFFFF" />
              <Text style={styles.actionText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.answerButton]}
              onPress={handleAnswer}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={28} color="#FFFFFF" />
              <Text style={styles.actionText}>Answer</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-start',
  },
  container: {
    backgroundColor: '#1F2937',
    marginHorizontal: 16,
    marginTop: 60,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 6,
  },
  emergencyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  callerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  callerInfo: {
    flex: 1,
  },
  callerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  callerType: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  incomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  incomingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  incomingText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
  },
  answerButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
