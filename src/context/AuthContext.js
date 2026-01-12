import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { 
  createUserProfile, 
  getUserProfile, 
  updateUserProfile,
  USER_ROLES,
  createResponderProfile
} from '../services/firestore';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingProfile, setPendingProfile] = useState(null);

  // Fetch user profile when auth state changes
  const fetchUserProfile = async (firebaseUser) => {
    if (firebaseUser) {
      const result = await getUserProfile(firebaseUser.uid);
      if (result.success) {
        setUserProfile(result.data);
        setUserRole(result.data.role || USER_ROLES.USER);
        return result.data;
      }
    }
    setUserProfile(null);
    setUserRole(null);
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Only set user if they exist AND email is verified
      if (firebaseUser && firebaseUser.emailVerified) {
        setUser(firebaseUser);
        await fetchUserProfile(firebaseUser);
      } else {
        // User not logged in or email not verified
        setUser(null);
        setUserProfile(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email, password, fullName, role = USER_ROLES.USER, additionalData = {}) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      if (fullName) {
        await updateProfile(userCredential.user, {
          displayName: fullName
        });
      }
      
      // Store signup data in user's custom claims or local storage for later
      // Profile will be created in Firestore only after email verification and first sign-in
      const pendingProfileData = {
        email,
        fullName,
        role,
        ...additionalData,
      };
      
      // Store pending profile data temporarily (will be used on first verified sign-in)
      setPendingProfile(pendingProfileData);
      
      // Send verification email immediately after signup
      try {
        await sendEmailVerification(userCredential.user);
      } catch (emailError) {
        console.log('Email verification error:', emailError);
      }
      
      return { success: true, user: userCredential.user, pendingProfile: pendingProfileData };
    } catch (error) {
      return { success: false, error: getErrorMessage(error.code) };
    }
  };

  const signIn = async (email, password, signupData = null) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        // Sign out the unverified user
        await signOut(auth);
        return { 
          success: false, 
          error: 'Please verify your email before signing in. Check your inbox or spam folder.',
          needsVerification: true,
          email: email
        };
      }
      
      // Check if user profile exists in Firestore
      let profile = await fetchUserProfile(userCredential.user);
      
      // If no profile exists, create one (first login after verification)
      if (!profile) {
        const profileData = signupData || pendingProfile || {
          email: userCredential.user.email,
          fullName: userCredential.user.displayName || 'User',
          role: USER_ROLES.USER,
        };
        
        await createUserProfile(userCredential.user.uid, profileData);
        
        // If responder, create additional responder profile
        if (profileData.role === USER_ROLES.RESPONDER && profileData.emergencyType) {
          await createResponderProfile(userCredential.user.uid, {
            fullName: profileData.fullName,
            email: profileData.email,
            emergencyType: profileData.emergencyType,
            badge: profileData.badge || '',
            building: profileData.building || '',
            hotline: profileData.hotline || '',
          });
        }
        
        // Clear pending profile
        setPendingProfile(null);
        
        // Fetch the newly created profile
        profile = await fetchUserProfile(userCredential.user);
      }
      
      return { 
        success: true, 
        user: userCredential.user,
        role: profile?.role || USER_ROLES.USER 
      };
    } catch (error) {
      return { success: false, error: getErrorMessage(error.code) };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setUserRole(null);
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
    userProfile,
    userRole,
    loading,
    pendingProfile,
    setPendingProfile,
    signUp,
    signIn,
    logout,
    resetPassword,
    sendVerificationEmail,
    checkEmailVerified,
    refreshUserProfile: () => fetchUserProfile(user),
    isAdmin: userRole === USER_ROLES.ADMIN,
    isResponder: userRole === USER_ROLES.RESPONDER,
    isUser: userRole === USER_ROLES.USER,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { USER_ROLES };
