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
import { AuthHeader, FormInput, PrimaryButton } from '../components';

export default function SignUpScreen({ navigation }) {
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [secureEntry, setSecureEntry] = React.useState(true);
  const [secureConfirmEntry, setSecureConfirmEntry] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSignUp = () => {
    if (!fullName || !email || !password || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('Account created successfully!');
      navigation.navigate('SignIn');
    }, 1000);
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
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
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
});
