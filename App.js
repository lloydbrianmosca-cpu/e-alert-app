import React from 'react';
import { AppNavigator } from './src/navigation';
import { EmergencyProvider } from './src/context/EmergencyContext';
import { ChatProvider } from './src/context/ChatContext';

export default function App() {
  return (
    <EmergencyProvider>
      <ChatProvider>
        <AppNavigator />
      </ChatProvider>
    </EmergencyProvider>
  );
}
