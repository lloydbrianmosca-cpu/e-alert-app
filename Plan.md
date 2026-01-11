# E-ALERT Mobile Application

![E-ALERT](https://img.shields.io/badge/E--ALERT-Emergency%20Response-red)
![React Native](https://img.shields.io/badge/React%20Native-Expo-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚨 Philippine Emergency Response System

E-ALERT is a mission-critical emergency response application designed for the Philippines. It provides instant access to emergency services including PNP (Philippine National Police), BFP (Bureau of Fire Protection), hospitals, and local government units.

## ✨ Features

### 🆘 Emergency SOS System
- **Big Red SOS Button** - One-tap emergency alert activation
- **Long-press Activation** - Immediate alert without confirmation for urgent situations
- **Pulsing Animation** - Visual feedback when alert is active
- **Haptic Feedback** - Vibration patterns for tactile confirmation

### 🗺️ Emergency Dashboard
- **Mock Map Integration** - Visual representation of user location
- **Agency Cards** - Interactive cards for nearest Hospital, Fire Station, and Police Station
- **Real-time ETA** - Estimated time of arrival for responders
- **Distance Information** - Distance to nearest emergency services

### 💬 Communication Hub
- **Emergency Messaging** - Direct communication with responders
- **Quick Messages** - Pre-defined emergency phrases for fast communication
- **Emergency Hotlines** - Quick access to 911, PNP, and BFP hotlines

### 👤 Multi-Role Support
- **Citizen** - Standard user for emergency reporting
- **Responder** - Emergency service personnel (requires verification)
- **Admin** - System administrators

## 🎨 Design System

### Theme
- **Light Mode**: Red and White
- **Dark Mode**: Red and Black

### Typography
- Bold, sans-serif fonts optimized for high-stress situations
- High-contrast text for maximum readability

### Colors
- **Primary**: Emergency Red (#DC2626)
- **PNP**: Navy Blue (#1E3A8A)
- **BFP**: Fire Red (#DC2626)
- **Hospital**: Medical Green (#059669)

## 🛠️ Technology Stack

- **Framework**: React Native (Expo)
- **Language**: JavaScript
- **Navigation**: React Navigation
- **State Management**: React Context API
- **Animations**: React Native Reanimated
- **Icons**: Expo Vector Icons (Ionicons)

## 📱 Screens

1. **Login Screen** - Authentication with emergency access bypass
2. **Sign Up Screen** - User registration with role selection
3. **Home Screen** - SOS Dashboard with the big red button
4. **Map Screen** - Emergency services map with filtering
5. **Messages Screen** - Communication hub with responders
6. **Profile Screen** - User settings and preferences

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Expo Go app (for testing on physical device)

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-repo/e-alert-mobile.git
cd e-alert-mobile
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Scan the QR code with Expo Go (Android) or Camera app (iOS)

## 📁 Project Structure

```
e-alert-mobile/
├── App.js                 # Main application entry
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── babel.config.js        # Babel configuration
├── assets/                # Images and static assets
└── src/
    ├── components/        # Reusable components
    │   ├── ui/           # Generic UI components
    │   └── emergency/    # Emergency-specific components
    ├── hooks/            # Custom React hooks
    ├── navigation/       # Navigation configuration
    ├── screens/          # Screen components
    │   └── auth/         # Authentication screens
    ├── store/            # State management
    └── theme/            # Design system (colors, typography)
```

## 🔐 Security Considerations

- Emergency access bypass for urgent situations
- Secure authentication flow
- Location data privacy
- End-to-end encrypted messaging (planned)

## 🌟 Accessibility Features

- **One-handed Mode** - Large touch targets for distressed users
- **High Contrast** - Maximum visibility in all lighting conditions
- **Haptic Feedback** - Tactile confirmation for critical actions
- **Large Touch Targets** - Minimum 44x44 points for accessibility

## 📄 License

MIT License - Made with ❤️ for the Filipino people 🇵🇭

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

## 📞 Support

For support, please contact the development team or file an issue on GitHub.

---

**E-ALERT** - *Immediate help when you need it most*
