import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { AuthHeader, FormInput, PrimaryButton, toastConfig } from '../components';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [secureEntry, setSecureEntry] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showForgotModal, setShowForgotModal] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');
  const [isResetting, setIsResetting] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  // Verification modal states
  const [showVerificationModal, setShowVerificationModal] = React.useState(false);
  const [verificationEmail, setVerificationEmail] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResendingVerification, setIsResendingVerification] = React.useState(false);

  const { 
    signIn, 
    resetPassword, 
    sendVerificationEmail, 
    checkEmailVerified, 
    logout,
  } = useAuth();

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSignIn = async () => {
    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email address',
      });
      return;
    }

    if (!password) {
      Toast.show({
        type: 'error',
        text1: 'Password Required',
        text2: 'Please enter your password',
      });
      return;
    }
    
    setIsLoading(true);
    const result = await signIn(email.trim(), password);
    setIsLoading(false);
    
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Welcome Back!',
        text2: 'Signed in successfully',
      });
      // Navigate based on user role
      if (result.role === 'admin') {
        navigation.replace('AdminHome');
      } else if (result.role === 'responder') {
        navigation.replace('ResponderHome');
      } else {
        navigation.replace('Home');
      }
    } else if (result.needsVerification && result.role === 'responder') {
      // Show verification modal for unverified responders only
      setVerificationEmail(result.email);
      setShowVerificationModal(true);
      
      // Automatically send verification email
      const emailResult = await sendVerificationEmail();
      if (emailResult.success) {
        Toast.show({
          type: 'info',
          text1: 'Verification Email Sent',
          text2: 'Please check your inbox and verify your email',
        });
      } else {
        Toast.show({
          type: 'info',
          text1: 'Email Verification Required',
          text2: 'Please verify your email to continue',
        });
      }
    } else if (result.needsVerification) {
      // For non-responder unverified users, sign out and show error message
      await logout();
      Toast.show({
        type: 'error',
        text1: 'Email Not Verified',
        text2: 'Please verify your email before signing in. Check your inbox.',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Sign In Failed',
        text2: result.error,
      });
    }
  };

  const handleForgotPassword = () => {
    setResetEmail(email);
    setShowForgotModal(true);
    setEmailSent(false);
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail) {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email address',
      });
      return;
    }

    setIsResetting(true);
    const result = await resetPassword(resetEmail.trim());
    setIsResetting(false);

    if (result.success) {
      setEmailSent(true);
      Toast.show({
        type: 'success',
        text1: 'Reset Email Sent',
        text2: 'Check your inbox for the reset link',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: result.error,
      });
    }
  };

  const handleCloseModal = () => {
    setShowForgotModal(false);
    setResetEmail('');
    setEmailSent(false);
  };

  // Verification modal handlers
  const handleVerifyEmail = async () => {
    setIsVerifying(true);
    const result = await checkEmailVerified();
    setIsVerifying(false);

    if (result.success && result.verified) {
      setShowVerificationModal(false);
      Toast.show({
        type: 'success',
        text1: 'Email Verified!',
        text2: 'You can now sign in',
      });
      // Sign out and let user sign in again
      await logout();
    } else {
      Toast.show({
        type: 'error',
        text1: 'Not Verified Yet',
        text2: 'Please click the link in your email first',
      });
    }
  };

  const handleResendVerification = async () => {
    setIsResendingVerification(true);
    const result = await sendVerificationEmail();
    setIsResendingVerification(false);

    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Email Sent',
        text2: 'Verification email has been resent',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: result.error || 'Failed to resend email',
      });
    }
  };

  const handleCloseVerificationModal = async () => {
    await logout();
    setShowVerificationModal(false);
    setVerificationEmail('');
  };

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
        >
          <AuthHeader />

          {/* Form Card */}
          <Animated.View 
            style={[
              styles.formCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.welcomeText}>Sign In</Text>
            <Text style={styles.subtitleText}>Welcome back. Enter your credentials to continue.</Text>

            <FormInput
              icon="email"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FormInput
              icon="lock"
              iconFamily="Feather"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureEntry}
              showPasswordToggle
              isPasswordVisible={!secureEntry}
              onTogglePassword={() => setSecureEntry(!secureEntry)}
            />

            <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
              <Text style={styles.forgotPassword}>Forgot password?</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="Continue"
              loadingText="Signing In..."
              onPress={handleSignIn}
              isLoading={isLoading}
            />
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signUpLink}>Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
        statusBarTranslucent={true}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>

              <View style={styles.modalIconContainer}>
                <Feather name={emailSent ? "check-circle" : "lock"} size={28} color="#0071E3" />
              </View>

              {!emailSent ? (
                <>
                  <Text style={styles.modalTitle}>Forgot Password?</Text>
                  <Text style={styles.modalSubtitle}>
                    Enter your email address and we'll send you a link to reset your password.
                  </Text>

                  <View style={styles.modalInputContainer}>
                    <FormInput
                      icon="email"
                      placeholder="Email address"
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleSendResetEmail}
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="send" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                        <Text style={styles.resetButtonText}>Send Reset Link</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Check Your Email</Text>
                  <Text style={styles.modalSubtitle}>
                    We've sent a password reset link to{'\n'}
                    <Text style={styles.emailText}>{resetEmail}</Text>
                  </Text>

                  <Text style={styles.instructionText}>
                    Click the link in your email to reset your password.{'\n'}
                    <Text style={styles.spamNote}>Check your spam folder if you don't see it.</Text>
                  </Text>

                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleCloseModal}
                  >
                    <Feather name="arrow-left" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                    <Text style={styles.resetButtonText}>Back to Sign In</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.resendContainer}
                    onPress={handleSendResetEmail}
                    disabled={isResetting}
                  >
                    <Text style={styles.resendLink}>
                      {isResetting ? 'Sending...' : 'Resend Email'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          <Toast config={toastConfig} topOffset={60} />
        </View>
      </Modal>

      {/* Email Verification Modal */}
      <Modal
        visible={showVerificationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseVerificationModal}
        statusBarTranslucent={true}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseVerificationModal}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>

              <View style={styles.modalIconContainer}>
                <Feather name="mail" size={28} color="#0071E3" />
              </View>

              <Text style={styles.modalTitle}>Verify Your Email</Text>
              <Text style={styles.modalSubtitle}>
                We've sent a verification link to{'\n'}
                <Text style={styles.emailText}>{verificationEmail}</Text>
              </Text>

              <Text style={styles.instructionText}>
                Click the link in your email, then tap the button below to continue.{'\n'}
                <Text style={styles.spamNote}>Check your spam folder if you don't see it.</Text>
              </Text>

              <TouchableOpacity
                style={styles.verifyButton}
                onPress={handleVerifyEmail}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check-circle" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                    <Text style={styles.verifyButtonText}>I've Verified My Email</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.resendVerificationContainer}>
                <Text style={styles.resendText}>Didn't receive the email? </Text>
                <TouchableOpacity onPress={handleResendVerification} disabled={isResendingVerification}>
                  <Text style={styles.resendLink}>
                    {isResendingVerification ? 'Sending...' : 'Resend'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <Toast config={toastConfig} topOffset={60} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13,
    color: '#86868B',
    marginBottom: 12,
    lineHeight: 22,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: 4,
  },
  forgotPassword: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '400',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingBottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    color: '#86868B',
  },
  signUpLink: {
    color: '#DC2626',
    fontWeight: '400',
    fontSize: 15,
  },
  // Modal Styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#86868B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  emailText: {
    color: '#1D1D1F',
    fontWeight: '500',
  },
  modalInputContainer: {
    width: '100%',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    color: '#86868B',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
    lineHeight: 18,
  },
  spamNote: {
    color: '#AEAEB2',
  },
  resetButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  resendContainer: {
    padding: 8,
  },
  resendLink: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '400',
  },
  // Verification modal styles
  verifyButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  resendVerificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 15,
    color: '#86868B',
  },
});
