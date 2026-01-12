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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { AuthHeader, FormInput, PrimaryButton, toastConfig } from '../components';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

export default function SignUpScreen({ navigation }) {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [secureEntry, setSecureEntry] = React.useState(true);
  const [secureConfirmEntry, setSecureConfirmEntry] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showOtpModal, setShowOtpModal] = React.useState(false);
  const [otp, setOtp] = React.useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const { signUp, sendVerificationEmail, checkEmailVerified, logout } = useAuth();
  
  const otpInputRefs = React.useRef([]);

  const handleOtpChange = (value, index) => {
    if (value.length > 1) {
      value = value.charAt(value.length - 1);
    }
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSignUp = async () => {
    if (!firstName) {
      Toast.show({
        type: 'error',
        text1: 'First Name Required',
        text2: 'Please enter your first name',
      });
      return;
    }

    if (!lastName) {
      Toast.show({
        type: 'error',
        text1: 'Last Name Required',
        text2: 'Please enter your last name',
      });
      return;
    }

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
        text2: 'Please enter a password',
      });
      return;
    }

    if (!confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Confirm Password',
        text2: 'Please confirm your password',
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Passwords Mismatch',
        text2: 'Passwords do not match',
      });
      return;
    }

    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Weak Password',
        text2: 'Password must be at least 6 characters',
      });
      return;
    }

    // Check for at least one capital letter
    if (!/[A-Z]/.test(password)) {
      Toast.show({
        type: 'error',
        text1: 'Weak Password',
        text2: 'Password must contain at least 1 capital letter',
      });
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    setIsLoading(true);
    const result = await signUp(email.trim(), password, fullName);
    setIsLoading(false);
    
    if (result.success) {
      // Show verification modal - email is sent during signUp
      setShowOtpModal(true);
      Toast.show({
        type: 'success',
        text1: 'Verification Email Sent',
        text2: 'Check your inbox for the verification link',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Sign Up Failed',
        text2: result.error,
      });
    }
  };

  const handleVerifyEmail = async () => {
    setIsVerifying(true);
    const result = await checkEmailVerified();
    setIsVerifying(false);

    if (result.success && result.verified) {
      setShowOtpModal(false);
      Toast.show({
        type: 'success',
        text1: 'Email Verified!',
        text2: 'Your account is now active',
      });
      await logout();
      navigation.navigate('SignIn');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Not Verified Yet',
        text2: 'Please click the link in your email first',
      });
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    const result = await sendVerificationEmail();
    setIsResending(false);

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
        text2: result.error,
      });
    }
  };

  const handleCloseModal = async () => {
    await logout();
    setShowOtpModal(false);
    setOtp(['', '', '', '', '', '']);
  };

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#B91C1C" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AuthHeader />

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.welcomeText}>Create Account</Text>
            <Text style={styles.welcomeSubtext}>Sign up to get started</Text>

            <FormInput
              icon="user"
              iconFamily="Feather"
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />

            <FormInput
              icon="user"
              iconFamily="Feather"
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />

            <FormInput
              icon="email"
              placeholder="Email address"
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

            <FormInput
              icon="lock"
              iconFamily="Feather"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={secureConfirmEntry}
              showPasswordToggle
              isPasswordVisible={!secureConfirmEntry}
              onTogglePassword={() => setSecureConfirmEntry(!secureConfirmEntry)}
            />

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By signing up, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            <PrimaryButton
              title="Create Account"
              loadingText="Creating Account..."
              onPress={handleSignUp}
              isLoading={isLoading}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Verification Modal */}
      <Modal
        visible={showOtpModal}
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
                <Feather name="mail" size={48} color="#DC2626" />
              </View>

              <Text style={styles.modalTitle}>Verify Your Email</Text>
              <Text style={styles.modalSubtitle}>
                We've sent a verification link to{'\n'}
                <Text style={styles.emailText}>{email}</Text>
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

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the email? </Text>
                <TouchableOpacity onPress={handleResendCode} disabled={isResending}>
                  <Text style={styles.resendLink}>
                    {isResending ? 'Sending...' : 'Resend'}
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
    backgroundColor: '#F3F4F6',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -50,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 28,
  },
  termsContainer: {
    marginBottom: 24,
    marginTop: 8,
  },
  termsText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#DC2626',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    color: '#6B7280',
  },
  signInLink: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  },
  // Modal Styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  emailText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  spamNote: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  verifyButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
  },
  buttonIcon: {
    marginRight: 8,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendLink: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
});
