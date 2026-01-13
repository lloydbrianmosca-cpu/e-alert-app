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
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { FormInput, PrimaryButton } from '../components';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { resetPassword } = useAuth();

  const handleResetPassword = async () => {
    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email address',
      });
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(email.trim());
    setIsLoading(false);

    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Email Sent',
        text2: 'Check your email for reset instructions',
      });
      navigation.goBack();
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: result.error,
      });
    }
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reset Password</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.iconContainer}>
              <Feather name="lock" size={48} color="#DC2626" />
            </View>
            
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>

            <FormInput
              icon="email"
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <PrimaryButton
              title="Send Reset Link"
              loadingText="Sending..."
              onPress={handleResetPassword}
              isLoading={isLoading}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Remember your password?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B91C1C',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#B91C1C',
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -40,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signInLink: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 14,
  },
});
