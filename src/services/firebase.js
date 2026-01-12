import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCNovnVuLQ_76ROjbt6Nm_AVNohv7bWQG8",
  authDomain: "e-alert-app-a367f.firebaseapp.com",
  projectId: "e-alert-app-a367f",
  storageBucket: "e-alert-app-a367f.firebasestorage.app",
  messagingSenderId: "551588037764",
  appId: "1:551588037764:web:6e5b6341062995d12a6ed1",
  measurementId: "G-KH3KVBJ48S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export { app, auth };
