import React from 'react';
import { AppNavigator } from './src/navigation';
import { EmergencyProvider } from './src/context/EmergencyContext';

export default function App() {
  return (
    <EmergencyProvider>
      <AppNavigator />
    </EmergencyProvider>
  );
}
