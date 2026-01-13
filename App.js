import React from 'react';
import { AppNavigator } from './src/navigation';
import { EmergencyProvider } from './src/context/EmergencyContext';
import { ChatProvider } from './src/context/ChatContext';
import { CallProvider } from './src/context/CallContext';
import { AuthProvider } from './src/context/AuthContext';
import { toastConfig } from './src/components';
import Toast from 'react-native-toast-message';

export default function App() {
  return (
    <AuthProvider>
      <EmergencyProvider>
        <ChatProvider>
          <CallProvider>
            <AppNavigator />
            <Toast config={toastConfig} topOffset={60} visibilityTime={3000} />
          </CallProvider>
        </ChatProvider>
      </EmergencyProvider>
    </AuthProvider>
  );
}
