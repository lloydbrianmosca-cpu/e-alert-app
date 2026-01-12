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
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
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
  const { signIn, resetPassword } = useAuth();

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
      } else {
        navigation.replace('Home');
      }
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
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.welcomeSubtext}>Sign in to continue</Text>

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

            <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="Sign In"
              loadingText="Signing In..."
              onPress={handleSignIn}
              isLoading={isLoading}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              New to E-Alert?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signUpLink}>Create Account</Text>
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
                <Feather name={emailSent ? "check-circle" : "lock"} size={48} color="#DC2626" />
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: 4,
  },
  forgotPassword: {
    fontSize: 14,
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
  signUpLink: {
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
    marginBottom: 20,
  },
  emailText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  modalInputContainer: {
    width: '100%',
    marginBottom: 8,
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
  resetButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resendContainer: {
    padding: 8,
  },
  resendLink: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
});
