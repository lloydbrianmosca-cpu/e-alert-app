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
  Animated,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { AuthHeader, FormInput, PrimaryButton, toastConfig } from '../components';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

export default function SignUpScreen({ navigation }) {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [contactNumber, setContactNumber] = React.useState('');
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

  const handleSocialSignUp = (provider) => {
    Toast.show({
      type: 'info',
      text1: 'Coming Soon',
      text2: `${provider} sign up will be available soon`,
    });
  };

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

    if (!contactNumber) {
      Toast.show({
        type: 'error',
        text1: 'Contact Number Required',
        text2: 'Please enter your contact number',
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
    const result = await signUp(email.trim(), password, fullName, contactNumber.trim());
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
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Feather name="chevron-left" size={28} color="#1D1D1F" />
      </TouchableOpacity>
      
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
          <Animated.View 
            style={[
              styles.formCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.welcomeText}>Create Account</Text>
            <Text style={styles.subtitleText}>Join E-Alert to stay connected with emergency services.</Text>

            {/* Social Sign Up Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => handleSocialSignUp('Apple')}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-apple" size={22} color="#000000" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => handleSocialSignUp('Google')}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-google" size={20} color="#EA4335" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => handleSocialSignUp('Facebook')}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-facebook" size={22} color="#1877F2" />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign up with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Name Row */}
            <View style={styles.nameRow}>
              <View style={styles.nameInputWrapper}>
                <FormInput
                  icon="user"
                  iconFamily="Feather"
                  placeholder="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.nameInputWrapper}>
                <FormInput
                  icon="user"
                  iconFamily="Feather"
                  placeholder="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <FormInput
              icon="email"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FormInput
              icon="phone"
              iconFamily="Feather"
              placeholder="Contact Number"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
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

            {/* Password Requirements */}
            <View style={styles.passwordRequirements}>
              <View style={styles.requirementRow}>
                <Feather 
                  name={password.length >= 6 ? "check-circle" : "circle"} 
                  size={14} 
                  color={password.length >= 6 ? "#34C759" : "#AEAEB2"} 
                />
                <Text style={[styles.requirementText, password.length >= 6 && styles.requirementMet]}>
                  At least 6 characters
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Feather 
                  name={/[A-Z]/.test(password) ? "check-circle" : "circle"} 
                  size={14} 
                  color={/[A-Z]/.test(password) ? "#34C759" : "#AEAEB2"} 
                />
                <Text style={[styles.requirementText, /[A-Z]/.test(password) && styles.requirementMet]}>
                  One uppercase letter
                </Text>
              </View>
            </View>

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

            {/* Password Match Indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchIndicator}>
                <Feather 
                  name={password === confirmPassword ? "check-circle" : "x-circle"} 
                  size={14} 
                  color={password === confirmPassword ? "#34C759" : "#FF3B30"} 
                />
                <Text style={[
                  styles.matchText, 
                  { color: password === confirmPassword ? "#34C759" : "#FF3B30" }
                ]}>
                  {password === confirmPassword ? "Passwords match" : "Passwords don't match"}
                </Text>
              </View>
            )}

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
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
          </Animated.View>

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
                <Feather name="mail" size={28} color="#0071E3" />
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
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 15,
    color: '#86868B',
    marginBottom: 24,
    lineHeight: 22,
  },
  // Social login styles
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 4,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Divider styles
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    fontSize: 13,
    color: '#86868B',
    marginHorizontal: 16,
    fontWeight: '400',
  },
  // Name row styles
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameInputWrapper: {
    flex: 1,
  },
  // Password requirements
  passwordRequirements: {
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#AEAEB2',
    marginLeft: 8,
  },
  requirementMet: {
    color: '#34C759',
  },
  // Password match indicator
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  matchText: {
    fontSize: 12,
    marginLeft: 8,
  },
  termsContainer: {
    marginBottom: 20,
    marginTop: 8,
  },
  termsText: {
    fontSize: 13,
    color: '#86868B',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#0071E3',
    fontWeight: '400',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    color: '#86868B',
  },
  signInLink: {
    color: '#0071E3',
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
    marginBottom: 16,
  },
  emailText: {
    color: '#1D1D1F',
    fontWeight: '500',
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
  verifyButton: {
    backgroundColor: '#0071E3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 15,
    color: '#86868B',
  },
  resendLink: {
    fontSize: 15,
    color: '#0071E3',
    fontWeight: '400',
  },
});
