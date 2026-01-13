import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { 
  SignInScreen, 
  SignUpScreen, 
  ForgotPasswordScreen, 
  HomeScreen, 
  ChatScreen, 
  LocationsScreen, 
  ProfileScreen, 
  HotlinesScreen, 
  AdminHomeScreen, 
  ResponderSignUpScreen,
  UserLogsScreen,
  EmergencyHistoryScreen,
  RealtimeMonitoringScreen,
  ResponderManagementScreen,
  // Responder screens
  ResponderHomeScreen,
  ResponderLocationsScreen,
  ResponderChatsScreen,
  ResponderProfileScreen,
  ResponderEmergencyHistoryScreen,
} from '../screens';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="SignIn"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Auth Screens */}
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        
        {/* User Screens */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Locations" component={LocationsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Hotlines" component={HotlinesScreen} />
        
        {/* Admin Screens */}
        <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
        <Stack.Screen name="ResponderSignUp" component={ResponderSignUpScreen} />
        <Stack.Screen name="UserLogs" component={UserLogsScreen} />
        <Stack.Screen name="EmergencyHistory" component={EmergencyHistoryScreen} />
        <Stack.Screen name="RealtimeMonitoring" component={RealtimeMonitoringScreen} />
        <Stack.Screen name="ResponderManagement" component={ResponderManagementScreen} />
        
        {/* Responder Screens */}
        <Stack.Screen name="ResponderHome" component={ResponderHomeScreen} />
        <Stack.Screen name="ResponderLocations" component={ResponderLocationsScreen} />
        <Stack.Screen name="ResponderChats" component={ResponderChatsScreen} />
        <Stack.Screen name="ResponderProfile" component={ResponderProfileScreen} />
        <Stack.Screen name="ResponderEmergencyHistory" component={ResponderEmergencyHistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
