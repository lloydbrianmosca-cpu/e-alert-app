import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  OAuthProvider,
  signInWithCredential,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { db } from '../services/firestore';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

// Required for web browser auth
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user role from Firestore
  const fetchUserRole = async (uid) => {
    try {
      // First check the users collection
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role || 'user';
        setUserRole(role);
        return role;
      }
      
      // If not found in users, check responders collection
      const responderDoc = await getDoc(doc(db, 'responders', uid));
      if (responderDoc.exists()) {
        setUserRole('responder');
        return 'responder';
      }
      
      setUserRole('user');
      return 'user';
    } catch (error) {
      console.log('Error fetching user role:', error);
      setUserRole('user');
      return 'user';
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchUserRole(user.uid);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email, password, fullName, contactNumber = '') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      if (fullName) {
        await updateProfile(userCredential.user, {
          displayName: fullName
        });
      }
      
      // Parse first and last name from fullName
      const nameParts = fullName ? fullName.trim().split(' ') : ['', ''];
      const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      
      // Save user data to Firestore with role = 'user'
      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          firstName: firstName,
          lastName: lastName,
          email: email,
          contactNumber: contactNumber,
          role: 'user',
          createdAt: serverTimestamp(),
        });
      } catch (firestoreError) {
        console.log('Firestore save error:', firestoreError);
      }
      
      // Send verification email immediately after signup
      try {
        await sendEmailVerification(userCredential.user);
      } catch (emailError) {
        console.log('Email verification error:', emailError);
      }
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: getErrorMessage(error.code) };
    }
  };

  const signIn = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch user role first
      const role = await fetchUserRole(userCredential.user.uid);
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        // Don't sign out - keep user signed in so we can resend verification email
        return { 
          success: false, 
          error: 'Please verify your email before signing in. Check your inbox or spam folder.',
          needsVerification: true,
          email: email,
          role: role,
          user: userCredential.user
        };
      }
      
      return { success: true, user: userCredential.user, role: role };
    } catch (error) {
      return { success: false, error: getErrorMessage(error.code) };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error.code) };
    }
  };

  const sendVerificationEmail = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        return { success: true };
      }
      return { success: false, error: 'No user logged in' };
    } catch (error) {
      return { success: false, error: getErrorMessage(error.code) };
    }
  };

  const checkEmailVerified = async () => {
    try {
      if (auth.currentUser) {
        await reload(auth.currentUser);
        return { success: true, verified: auth.currentUser.emailVerified };
      }
      return { success: false, error: 'No user logged in' };
    } catch (error) {
      return { success: false, error: getErrorMessage(error.code) };
    }
  };

  // Helper function to create/update user in Firestore for social sign-in
  const createSocialUser = async (user, provider) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Parse name from display name
        const displayName = user.displayName || '';
        const nameParts = displayName.trim().split(' ');
        const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

        await setDoc(doc(db, 'users', user.uid), {
          firstName: firstName,
          lastName: lastName,
          email: user.email || '',
          contactNumber: '',
          role: 'user',
          provider: provider,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.log('Error creating social user:', error);
    }
  };

  // Apple Sign In
  const signInWithApple = async () => {
    try {
      // Check if Apple Sign In is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        return { 
          success: false, 
          error: 'Apple Sign In is not available on this device' 
        };
      }

      // Generate nonce for security
      const nonce = Math.random().toString(36).substring(2, 10);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );

      // Perform Apple Sign In
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      // Create Firebase credential
      const provider = new OAuthProvider('apple.com');
      const oAuthCredential = provider.credential({
        idToken: credential.identityToken,
        rawNonce: nonce,
      });

      // Sign in to Firebase
      const userCredential = await signInWithCredential(auth, oAuthCredential);
      
      // Update display name if provided by Apple
      if (credential.fullName?.givenName || credential.fullName?.familyName) {
        const fullName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');
        
        if (fullName) {
          await updateProfile(userCredential.user, { displayName: fullName });
        }
      }

      // Create user in Firestore
      await createSocialUser(userCredential.user, 'apple');
      
      // Fetch role
      const role = await fetchUserRole(userCredential.user.uid);

      return { success: true, user: userCredential.user, role };
    } catch (error) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return { success: false, error: 'Sign in was cancelled' };
      }
      console.log('Apple Sign In Error:', error);
      return { success: false, error: error.message || 'Apple Sign In failed' };
    }
  };

  // Google Sign In
  const signInWithGoogle = async (response) => {
    try {
      if (response?.type === 'success') {
        const { id_token } = response.params;
        const credential = GoogleAuthProvider.credential(id_token);
        const userCredential = await signInWithCredential(auth, credential);
        
        // Create user in Firestore
        await createSocialUser(userCredential.user, 'google');
        
        // Fetch role
        const role = await fetchUserRole(userCredential.user.uid);

        return { success: true, user: userCredential.user, role };
      } else if (response?.type === 'cancel') {
        return { success: false, error: 'Sign in was cancelled' };
      }
      return { success: false, error: 'Google Sign In failed' };
    } catch (error) {
      console.log('Google Sign In Error:', error);
      return { success: false, error: error.message || 'Google Sign In failed' };
    }
  };

  // Facebook Sign In
  const signInWithFacebook = async (response) => {
    try {
      if (response?.type === 'success') {
        const { access_token } = response.params;
        const credential = FacebookAuthProvider.credential(access_token);
        const userCredential = await signInWithCredential(auth, credential);
        
        // Create user in Firestore
        await createSocialUser(userCredential.user, 'facebook');
        
        // Fetch role
        const role = await fetchUserRole(userCredential.user.uid);

        return { success: true, user: userCredential.user, role };
      } else if (response?.type === 'cancel') {
        return { success: false, error: 'Sign in was cancelled' };
      }
      return { success: false, error: 'Facebook Sign In failed' };
    } catch (error) {
      console.log('Facebook Sign In Error:', error);
      return { success: false, error: error.message || 'Facebook Sign In failed' };
    }
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please sign in instead.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  const value = {
    user,
    userRole,
    loading,
    signUp,
    signIn,
    logout,
    resetPassword,
    sendVerificationEmail,
    checkEmailVerified,
    fetchUserRole,
    signInWithApple,
    signInWithGoogle,
    signInWithFacebook,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
