# 🚨 e-Alert App

<div align="center">

![React Native](https://img.shields.io/badge/React_Native-0.81.5-blue?logo=react)
![Expo](https://img.shields.io/badge/Expo-54.0.0-black?logo=expo)
![Firebase](https://img.shields.io/badge/Firebase-12.7.0-orange?logo=firebase)
![License](https://img.shields.io/badge/License-MIT-green)

**A Real-Time Emergency Response System for the Philippines**

*Connecting citizens with emergency responders through instant location-based assistance*

[Features](#-key-features) • [Installation](#-installation) • [Documentation](DOCUMENTATION.md) • [Contributing](#-contributing)

</div>

---

## 🌟 About

**e-Alert** is a comprehensive emergency response mobile application built with React Native and Expo. The app enables real-time communication between citizens in distress and emergency responders including Police (PNP), Fire Department (BFP), Medical Services, and Flood/Rescue teams.

---

## ✨ Key Features

- 🆘 **Triple-tap SOS** - Quick emergency activation
- 📍 **Real-time GPS Tracking** - Live location sharing
- 🗺️ **Interactive Maps** - See responder location and ETA
- 💬 **In-App Chat** - Direct communication with responders
- 📞 **Emergency Hotlines** - Nationwide contact directory
- 👮 **Multi-Role System** - User, Responder, and Admin interfaces

> 📚 **For complete feature list, algorithms, and technical documentation, see [DOCUMENTATION.md](DOCUMENTATION.md)**

---

## 📲 Installation

### Prerequisites

| Requirement | Version | Download |
|-------------|---------|----------|
| Node.js | v18.0.0+ | [nodejs.org](https://nodejs.org/) |
| npm | v9.0.0+ | Included with Node.js |
| Git | Latest | [git-scm.com](https://git-scm.com/) |
| Expo Go App | v54+ | [iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) |

### Quick Start

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/lloydbrianmosca-cpu/e-alert-app.git
cd e-alert-app
```

#### 2️⃣ Install Dependencies

```bash
npm install
```

#### 3️⃣ Start Development Server

```bash
npm start
```

#### 4️⃣ Run on Device

1. Open **Expo Go** app on your mobile device
2. Scan the QR code from the terminal
3. App will load on your device

---

## 🖥️ Running on Emulators

### Android Emulator

```bash
npm run android
# OR
expo run:android
```

### iOS Simulator (macOS only)

```bash
npm run ios
# OR
expo run:ios
```

---

## 🔥 Firebase Setup (Optional)

The app comes pre-configured with Firebase. To use your own Firebase project:

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable:
   - ✅ Authentication (Email/Password)
   - ✅ Cloud Firestore
   - ✅ Storage

3. Update `src/services/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

---

## 📦 Building for Production

### Android (APK/AAB)

```bash
# Preview APK
eas build -p android --profile preview

# Production AAB (for Play Store)
eas build -p android --profile production
```

### iOS (IPA)

```bash
# Production build (for App Store)
eas build -p ios --profile production
```

---

## 📁 Project Structure

```
e-alert-app/
├── App.js              # Root component
├── src/
│   ├── components/     # Reusable UI components
│   ├── constants/      # App constants
│   ├── context/        # React Context (Auth, Emergency, Chat)
│   ├── navigation/     # Navigation setup
│   ├── screens/        # App screens
│   └── services/       # Firebase services
├── android/            # Android native code
├── ios/                # iOS native code
└── functions/          # Firebase Cloud Functions
```

> 📚 **For complete project structure, see [DOCUMENTATION.md](DOCUMENTATION.md#-project-structure)**

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React Native, Expo, React Navigation |
| **Backend** | Firebase Auth, Firestore, Storage |
| **Maps** | React Native Maps (Google Maps) |
| **Location** | Expo Location |

---

## 📚 Documentation

For comprehensive documentation including:

- ✅ Complete feature list
- ✅ System architecture
- ✅ Algorithms & formulas (Haversine, ETA calculation)
- ✅ Firebase configuration & security rules
- ✅ API documentation
- ✅ Color scheme & UI guidelines

👉 **See [DOCUMENTATION.md](DOCUMENTATION.md)**

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to the branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Lloyd Brian Mosca**

[![GitHub](https://img.shields.io/badge/GitHub-lloydbrianmosca--cpu-black?logo=github)](https://github.com/lloydbrianmosca-cpu)

---

## 🙏 Acknowledgments

- React Native & Expo teams
- Firebase documentation
- Philippine National Police (PNP)
- Bureau of Fire Protection (BFP)
- Department of Health (DOH)
- NDRRMC

---

<div align="center">

**⭐ Star this repository if you find it helpful! ⭐**

Made with ❤️ in the Philippines 🇵🇭

</div>
