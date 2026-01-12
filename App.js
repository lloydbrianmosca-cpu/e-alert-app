import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppNavigator } from './src/navigation';
import { EmergencyProvider } from './src/context/EmergencyContext';
import { ChatProvider } from './src/context/ChatContext';
import { AuthProvider } from './src/context/AuthContext';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';

const toastConfig = {
  success: ({ text1, text2 }) => (
    <View style={styles.successToast}>
      <View style={styles.iconContainer}>
        <Feather name="check-circle" size={28} color="#FFFFFF" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{text1}</Text>
        {text2 && <Text style={styles.message}>{text2}</Text>}
      </View>
    </View>
  ),
  error: ({ text1, text2 }) => (
    <View style={styles.errorToast}>
      <View style={styles.iconContainer}>
        <Feather name="x-circle" size={28} color="#FFFFFF" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{text1}</Text>
        {text2 && <Text style={styles.message}>{text2}</Text>}
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  successToast: {
    width: '90%',
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorToast: {
    width: '90%',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  message: {
    fontSize: 15,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
});

export default function App() {
  return (
    <AuthProvider>
      <EmergencyProvider>
        <ChatProvider>
          <AppNavigator />
          <Toast config={toastConfig} />
        </ChatProvider>
      </EmergencyProvider>
    </AuthProvider>
  );
}
