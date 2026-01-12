import React from 'react';
import { ActivityIndicator, View } from 'react-native';
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
  AdminDashboardScreen,
  ResponderDashboardScreen,
} from '../screens';
import { useAuth, USER_ROLES } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

// Auth Stack (for non-authenticated users)
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// User Stack (for regular users)
function UserStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Locations" component={LocationsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Hotlines" component={HotlinesScreen} />
    </Stack.Navigator>
  );
}

// Responder Stack
function ResponderStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ResponderDashboard" component={ResponderDashboardScreen} />
      <Stack.Screen name="Locations" component={LocationsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
    </Stack.Navigator>
  );
}

// Admin Stack
function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, userRole, loading } = useAuth();

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        // Not logged in - show auth screens
        <AuthStack />
      ) : userRole === USER_ROLES.ADMIN ? (
        // Admin user
        <AdminStack />
      ) : userRole === USER_ROLES.RESPONDER ? (
        // Responder user
        <ResponderStack />
      ) : (
        // Regular user
        <UserStack />
      )}
    </NavigationContainer>
  );
}
