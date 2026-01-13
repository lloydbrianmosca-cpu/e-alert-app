import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

// Logo
const logoWithoutName = require('../assets/logo/without-name.png');

export default function AuthHeader({ title = 'E-Alert', subtitle = 'Emergency Response System' }) {
  return (
    <View style={styles.headerSection}>
      <View style={styles.logoContainer}>
        <View style={styles.alertIcon}>
          <Image source={logoWithoutName} style={styles.logoImage} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    paddingTop: 100,
    paddingBottom: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    marginBottom: 24,
  },
  alertIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#86868B',
    letterSpacing: 0,
    fontWeight: '400',
  },
});
