import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';

export default function FormInput({
  icon,
  iconFamily = 'MaterialIcons',
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  showPasswordToggle,
  isPasswordVisible,
  onTogglePassword,
}) {
  const IconComponent = iconFamily === 'Feather' ? Feather : MaterialIcons;

  return (
    <View style={styles.inputContainer}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#86868B"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {showPasswordToggle && (
          <TouchableOpacity onPress={onTogglePassword} style={styles.eyeButton}>
            <Feather name={isPasswordVisible ? 'eye-off' : 'eye'} size={18} color="#86868B" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: '#1D1D1F',
    letterSpacing: -0.4,
  },
  eyeButton: {
    padding: 4,
  },
});
