import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function PrimaryButton({ 
  title, 
  onPress, 
  isLoading, 
  loadingText,
  showArrow = true,
}) {
  return (
    <TouchableOpacity 
      style={[styles.button, isLoading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#DC2626', '#B91C1C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Text style={styles.buttonText}>
          {isLoading ? loadingText : title}
        </Text>
        {!isLoading && showArrow && (
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.arrowIcon} />
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  arrowIcon: {
    marginLeft: 8,
  },
});
