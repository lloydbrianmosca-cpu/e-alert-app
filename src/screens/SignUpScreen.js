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
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AuthHeader, FormInput, PrimaryButton, toastConfig } from '../components';
import { useAuth, USER_ROLES } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

// Role options for signup
const ROLE_OPTIONS = [
  {
    id: USER_ROLES.USER,
    title: 'User',
    description: 'Report emergencies & get help',
    icon: 'person',
    color: '#3B82F6',
  },
  {
    id: USER_ROLES.RESPONDER,
    title: 'Responder',
    description: 'Respond to emergency requests',
    icon: 'shield-checkmark',
    color: '#059669',
  },
];

// Emergency types for responders
const EMERGENCY_TYPES = [
  { id: 'police', name: 'Police', icon: 'local-police', color: '#1E3A8A' },
  { id: 'medical', name: 'Medical', icon: 'medical-services', color: '#059669' },
  { id: 'fire', name: 'Fire', icon: 'local-fire-department', color: '#DC2626' },
  { id: 'flood', name: 'Flood/Rescue', icon: 'flood', color: '#0369A1' },
];

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
  
  // Role selection states
  const [selectedRole, setSelectedRole] = React.useState(USER_ROLES.USER);
  const [selectedEmergencyType, setSelectedEmergencyType] = React.useState(null);
  const [badge, setBadge] = React.useState('');
  const [building, setBuilding] = React.useState('');
  
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

    // Responder validation
    if (selectedRole === USER_ROLES.RESPONDER) {
      if (!selectedEmergencyType) {
        Toast.show({
          type: 'error',
          text1: 'Emergency Type Required',
          text2: 'Please select your emergency response type',
        });
        return;
      }
      if (!badge.trim()) {
        Toast.show({
          type: 'error',
          text1: 'Badge Number Required',
          text2: 'Please enter your badge/ID number',
        });
        return;
      }
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    setIsLoading(true);
    
    const additionalData = selectedRole === USER_ROLES.RESPONDER ? {
      emergencyType: selectedEmergencyType,
      badge: badge.trim(),
      building: building.trim(),
    } : {};
    
    const result = await signUp(email.trim(), password, fullName, selectedRole, additionalData);
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
      // Just logout - navigation will happen automatically via AuthContext
      await logout();
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

            {/* Role Selection */}
            <Text style={styles.sectionTitle}>I am a:</Text>
            <View style={styles.roleContainer}>
              {ROLE_OPTIONS.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleOption,
                    selectedRole === role.id && { borderColor: role.color, backgroundColor: role.color + '10' },
                  ]}
                  onPress={() => {
                    setSelectedRole(role.id);
                    if (role.id !== USER_ROLES.RESPONDER) {
                      setSelectedEmergencyType(null);
                      setBadge('');
                      setBuilding('');
                    }
                  }}
                >
                  <View style={[styles.roleIconContainer, { backgroundColor: role.color + '20' }]}>
                    <Ionicons name={role.icon} size={24} color={role.color} />
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={[styles.roleTitle, selectedRole === role.id && { color: role.color }]}>
                      {role.title}
                    </Text>
                    <Text style={styles.roleDescription}>{role.description}</Text>
                  </View>
                  {selectedRole === role.id && (
                    <Ionicons name="checkmark-circle" size={24} color={role.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Responder-specific fields */}
            {selectedRole === USER_ROLES.RESPONDER && (
              <View style={styles.responderFields}>
                <Text style={styles.sectionTitle}>Emergency Response Type:</Text>
                <View style={styles.emergencyTypeContainer}>
                  {EMERGENCY_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.emergencyTypeOption,
                        selectedEmergencyType === type.id && { borderColor: type.color, backgroundColor: type.color + '15' },
                      ]}
                      onPress={() => setSelectedEmergencyType(type.id)}
                    >
                      <MaterialIcons name={type.icon} size={28} color={type.color} />
                      <Text style={[styles.emergencyTypeName, { color: selectedEmergencyType === type.id ? type.color : '#6B7280' }]}>
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <FormInput
                  icon="badge"
                  iconFamily="MaterialIcons"
                  placeholder="Badge/ID Number"
                  value={badge}
                  onChangeText={setBadge}
                />

                <FormInput
                  icon="business"
                  iconFamily="MaterialIcons"
                  placeholder="Station/Building (Optional)"
                  value={building}
                  onChangeText={setBuilding}
                />
              </View>
            )}

            <View style={styles.divider} />

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
  // Role Selection Styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  roleContainer: {
    marginBottom: 16,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  roleDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  responderFields: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  emergencyTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  emergencyTypeOption: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  emergencyTypeName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
});
