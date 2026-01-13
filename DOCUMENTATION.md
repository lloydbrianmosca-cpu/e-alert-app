# 📚 e-Alert App - Complete Documentation

<div align="center">

**Comprehensive Technical Documentation**

*Everything you need to know about the e-Alert Emergency Response System*

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Algorithms & Formulas](#-algorithms--formulas)
- [Project Structure](#-project-structure)
- [User Roles](#-user-roles)
- [Screens & Navigation](#-screens--navigation)
- [Firebase Configuration](#-firebase-configuration)
- [Technologies Used](#-technologies-used)
- [Color Scheme](#-color-scheme)
- [API Documentation](#-api-documentation)

---

## 🌟 Overview

**e-Alert** is a comprehensive emergency response mobile application built with React Native and Expo. The app facilitates real-time communication between citizens in distress and emergency responders including Police (PNP), Fire Department (BFP), Medical Services, and Flood/Rescue teams.

The system uses real-time location tracking, intelligent responder matching algorithms, and instant messaging to ensure the fastest possible emergency response times.

### Key Highlights

- 🆘 **Triple-tap SOS** activation system
- 📍 **Real-time GPS tracking** for users and responders
- 🧮 **Haversine formula** for accurate distance calculation
- ⏱️ **Dynamic ETA calculation** based on distance
- 💬 **Real-time chat** between users and responders
- 🔔 **Instant notifications** for emergency alerts

---

## ✨ Features

### 👤 User Features

| Feature | Description |
|---------|-------------|
| **🆘 SOS Emergency Alert** | Triple-tap SOS activation for 4 emergency types: Police, Fire, Medical, Flood |
| **📍 Real-Time Location Tracking** | Automatic GPS location sharing with assigned responders |
| **🗺️ Live Map View** | Interactive map showing user location, responder location, and route |
| **💬 In-App Chat** | Real-time messaging with assigned emergency responders |
| **📞 Emergency Hotlines** | Comprehensive database of emergency contacts across the Philippines |
| **⏱️ ETA Calculation** | Real-time estimated time of arrival for responders |
| **📊 Emergency History** | View past emergency requests and outcomes |
| **👤 Profile Management** | Complete profile with ID verification and emergency contacts |

### 🚑 Responder Features

| Feature | Description |
|---------|-------------|
| **📢 Emergency Alerts** | Real-time notifications for new emergency requests |
| **🟢 Availability Toggle** | Set online/offline status for accepting emergencies |
| **📍 Location Broadcasting** | Continuous location updates every 30 seconds |
| **💬 Chat with Users** | Direct communication with users in distress |
| **✅ Emergency Completion** | Mark emergencies as resolved with completion summary |
| **📊 Response Statistics** | Track total responses, daily completions, and pending tasks |
| **👤 Professional Profile** | Station name, badge number, and contact information |

### 👨‍💼 Admin Features

| Feature | Description |
|---------|-------------|
| **📊 Dashboard** | Overview of active emergencies and system statistics |
| **👥 User Management** | View user logs and activity |
| **🚑 Responder Management** | Register and manage emergency responders |
| **📜 Emergency History** | Complete history of all emergency incidents |
| **🗺️ Real-Time Monitoring** | Live monitoring of all active emergencies |
| **✅ ID Verification** | Approve/reject user identity documents |

---

### Data Flow

```
User SOS Trigger → EmergencyContext → Firestore (activeEmergencies)
                                           ↓
                                    Query Available Responders
                                           ↓
                              Haversine Distance Calculation
                                           ↓
                                   Find Nearest Responder
                                           ↓
                              Assign Responder & Notify
                                           ↓
                              Real-time Location Updates
                                           ↓
                                   Emergency Completion
```

---

## 🧮 Algorithms & Formulas

### 1. Haversine Formula (Distance Calculation)

The app uses the **Haversine Formula** to calculate the great-circle distance between two points on the Earth's surface (user and responder locations).

#### Mathematical Formula

$$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$

Where:
- $d$ = distance between two points (in km)
- $R$ = Earth's radius (6,371 km)
- $\phi_1, \phi_2$ = latitude of point 1 and point 2 (in radians)
- $\lambda_1, \lambda_2$ = longitude of point 1 and point 2 (in radians)
- $\Delta\phi$ = $\phi_2 - \phi_1$ (difference in latitude)
- $\Delta\lambda$ = $\lambda_2 - \lambda_1$ (difference in longitude)

#### Step-by-Step Breakdown

1. **Convert degrees to radians**: $rad = deg \times \frac{\pi}{180}$
2. **Calculate differences**: $\Delta\phi$ and $\Delta\lambda$
3. **Apply Haversine formula**: Calculate intermediate value $a$
4. **Calculate angular distance**: $c = 2 \times \arctan2(\sqrt{a}, \sqrt{1-a})$
5. **Calculate distance**: $d = R \times c$

#### Implementation

```javascript
/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in km
};

/**
 * Convert degrees to radians
 * @param {number} deg - Degrees
 * @returns {number} Radians
 */
const toRad = (deg) => deg * (Math.PI / 180);
```

#### Example Calculation

```
User Location: 14.5995° N, 120.9842° E (Manila)
Responder Location: 14.5547° N, 121.0244° E (Makati)

Distance ≈ 6.2 km
```

---

### 2. ETA Calculation Algorithm

The Estimated Time of Arrival (ETA) is calculated based on distance and average emergency vehicle speed.

#### Formula

$$ETA = \frac{d}{v} \times 60$$

Where:
- $ETA$ = Estimated time in minutes
- $d$ = Distance in kilometers
- $v$ = Average speed (30 km/h for urban emergency vehicles)

#### Speed Assumptions

| Condition | Speed (km/h) | Rationale |
|-----------|--------------|-----------|
| Urban Traffic | 30 | Heavy traffic conditions |
| Highway | 60 | Less traffic, higher speed |
| Emergency Priority | 40 | With sirens and priority |

#### Implementation

```javascript
/**
 * Calculate ETA based on distance
 * Assumes average speed of 30 km/h for emergency vehicles in urban areas
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted ETA string
 */
const calculateETA = (distanceKm) => {
  const avgSpeedKmH = 30; // Average urban emergency vehicle speed
  const timeInHours = distanceKm / avgSpeedKmH;
  const timeInMinutes = Math.ceil(timeInHours * 60);
  
  if (timeInMinutes < 1) return '< 1 min';
  if (timeInMinutes === 1) return '1 min';
  if (timeInMinutes >= 60) {
    const hours = Math.floor(timeInMinutes / 60);
    const mins = timeInMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${timeInMinutes} mins`;
};
```

#### Example ETAs

| Distance | Calculated ETA |
|----------|----------------|
| 0.5 km | 1 min |
| 2 km | 4 mins |
| 5 km | 10 mins |
| 10 km | 20 mins |
| 30 km | 1h |

---

### 3. Nearest Responder Algorithm

The system uses a **Greedy Nearest Neighbor Algorithm** to find the closest available responder.

#### Algorithm Pseudocode

```
FUNCTION findNearestResponder(emergencyType, userLocation):
    INPUT: 
        - emergencyType: string ('police', 'fire', 'medical', 'flood')
        - userLocation: {latitude, longitude}
    
    OUTPUT:
        - nearestResponder: object with responder details and distance
    
    BEGIN:
        1. Map emergencyType to responderType
        2. Query database for responders WHERE:
           - responderType == mappedType
           - isAvailable == true
        
        3. Initialize:
           - nearestResponder = null
           - shortestDistance = INFINITY
        
        4. FOR EACH responder in queryResults:
              IF responder has valid location THEN:
                  distance = calculateDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      responder.location.latitude,
                      responder.location.longitude
                  )
                  
                  IF distance < shortestDistance THEN:
                      shortestDistance = distance
                      nearestResponder = responder
                      nearestResponder.distance = distance
              END IF
           END FOR
        
        5. RETURN nearestResponder
    END
```

#### Time Complexity

- **Best Case**: O(1) - Only one responder available
- **Average Case**: O(n) - n = number of available responders
- **Worst Case**: O(n) - Must check all responders

#### Implementation

```javascript
/**
 * Find the nearest available responder
 * Time Complexity: O(n) where n = number of available responders
 */
const findNearestResponder = async (emergencyType, userCoords) => {
  const responderType = EMERGENCY_TO_RESPONDER_TYPE[emergencyType];
  
  // Query for available responders of matching type
  const q = query(
    collection(db, 'responders'),
    where('responderType', '==', responderType),
    where('isAvailable', '==', true)
  );
  
  const snapshot = await getDocs(q);
  
  let nearestResponder = null;
  let shortestDistance = Infinity;
  
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    
    if (data.location?.latitude && data.location?.longitude) {
      const distance = calculateDistance(
        userCoords.latitude,
        userCoords.longitude,
        data.location.latitude,
        data.location.longitude
      );
      
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestResponder = {
          id: doc.id,
          ...data,
          distance: shortestDistance,
        };
      }
    }
  });
  
  return nearestResponder;
};
```

---

### 4. Real-Time Location Tracking Algorithm

Continuous location updates with adaptive intervals for responders.

#### Configuration Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Time Interval | 30,000 ms | Update every 30 seconds |
| Distance Interval | 50 m | Update when moved 50 meters |
| Accuracy | High | GPS-level accuracy |

#### Implementation

```javascript
/**
 * Start continuous location tracking for responders
 * Updates location every 30 seconds OR when moved 50 meters
 */
const startLocationTracking = async () => {
  // Request location permissions
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return;

  // Start watching position
  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 30000,    // 30 seconds
      distanceInterval: 50,   // 50 meters
    },
    async (location) => {
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        updatedAt: new Date().toISOString(),
      };
      
      // Update in Firebase for real-time sync
      await updateDoc(responderRef, { location: locationData });
    }
  );
};

/**
 * Stop location tracking
 */
const stopLocationTracking = () => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
};
```

---

### 5. Emergency Type Mapping

Maps user-selected emergency types to responder categories.

```javascript
const EMERGENCY_TO_RESPONDER_TYPE = {
  police: 'police',    // PNP - Philippine National Police
  medical: 'medical',  // Medical/Ambulance services
  fire: 'fireman',     // BFP - Bureau of Fire Protection
  flood: 'flood',      // Rescue/Disaster Response teams
};

// Responder icons for UI display
const RESPONDER_ICONS = {
  police: 'local-police',
  medical: 'medical-services',
  fireman: 'fire-truck',
  flood: 'flood',
};

// Display tags
const RESPONDER_TAGS = {
  police: 'Police',
  medical: 'Medical',
  fireman: 'Fire',
  flood: 'Rescue',
};
```

---

### 6. Distance Formatting Algorithm

Formats distance for user-friendly display.

```javascript
/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    // Show in meters for distances less than 1 km
    return `${Math.round(distanceKm * 1000)} m`;
  }
  // Show in kilometers with one decimal place
  return `${distanceKm.toFixed(1)} km`;
};
```

#### Example Outputs

| Input (km) | Output |
|------------|--------|
| 0.150 | 150 m |
| 0.500 | 500 m |
| 1.234 | 1.2 km |
| 5.678 | 5.7 km |
| 10.000 | 10.0 km |

---

### 7. Relative Time Algorithm

Converts timestamps to human-readable relative time for chat messages and activity feeds.

```javascript
/**
 * Convert timestamp to human-readable relative time
 * @param {Date} date - The date to convert
 * @returns {string} Human-readable relative time
 */
const getRelativeTime = (date) => {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - d;
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffSecs < 30) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return d.toLocaleDateString();
};
```

#### Time Thresholds

| Time Difference | Output Format |
|-----------------|---------------|
| < 30 seconds | "Just now" |
| 30-59 seconds | "Xs ago" |
| 1-59 minutes | "X min(s) ago" |
| 1-23 hours | "X hr(s) ago" |
| 1-6 days | "X day(s) ago" |
| 7+ days | Date format |

---

## 👥 User Roles

### 1. Regular User (Citizen)

| Permission | Access | Description |
|------------|--------|-------------|
| SOS Emergency | ✅ | Trigger emergency alerts |
| View Map | ✅ | See real-time locations |
| Chat with Responder | ✅ | Message assigned responder |
| View Hotlines | ✅ | Access emergency contacts |
| Manage Profile | ✅ | Edit personal information |
| Upload Valid ID | ✅ | For verification |
| Admin Dashboard | ❌ | Not accessible |
| Responder Features | ❌ | Not accessible |

### 2. Responder (Police/Fire/Medical/Rescue)

| Permission | Access | Description |
|------------|--------|-------------|
| Receive Emergencies | ✅ | Get assigned to emergencies |
| View User Location | ✅ | See user's GPS location |
| Chat with User | ✅ | Communicate with users |
| Update Availability | ✅ | Toggle online/offline |
| Complete Emergencies | ✅ | Mark as resolved |
| View Response History | ✅ | See past responses |
| Location Broadcasting | ✅ | Share real-time location |
| Admin Dashboard | ❌ | Not accessible |

### 3. Administrator

| Permission | Access | Description |
|------------|--------|-------------|
| All User Features | ✅ | Full user access |
| Dashboard Analytics | ✅ | View system statistics |
| User Management | ✅ | View/manage users |
| Responder Management | ✅ | Register/manage responders |
| Emergency History | ✅ | View all emergencies |
| Real-Time Monitoring | ✅ | Live emergency tracking |
| ID Verification | ✅ | Approve/reject IDs |

---

## 📱 Screens & Navigation

### Screen Details

| Screen | Description | Key Features |
|--------|-------------|--------------|
| **SignIn** | User authentication | Email/password login, role-based routing |
| **SignUp** | New user registration | Form validation, email verification |
| **ForgotPassword** | Password recovery | Email-based reset |
| **Home** | Main dashboard | Emergency type selection, triple-tap SOS |
| **Locations** | Map view | Real-time tracking, ETA display |
| **Chat** | Messaging | Real-time chat, message history |
| **Hotlines** | Emergency contacts | Searchable directory, click-to-call |
| **Profile** | User settings | Profile editing, ID upload |

### Bottom Navigation (User)

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 Home  │  📍 Locations  │  📞 Hotlines  │  💬 Chat  │  👤 Profile  │
└─────────────────────────────────────────────────────────────┘
```

### Bottom Navigation (Responder)

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 Home  │  📍 Locations  │  📜 History  │  💬 Chat  │  👤 Profile  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technologies Used

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo | 54.0.0 | Development platform & tools |
| React | 19.1.0 | UI library |
| React Navigation | 7.x | Navigation library |
| React Native Maps | 1.20.1 | Map integration (Google Maps) |

### Backend & Services

| Technology | Purpose |
|------------|---------|
| Firebase Authentication | User authentication (email/password) |
| Cloud Firestore | Real-time NoSQL database |
| Firebase Storage | Image/file storage |
| Expo Location | GPS location services |
| Expo Image Picker | Camera and gallery access |

### Development Tools

| Tool | Purpose |
|------|---------|
| Babel | JavaScript transpiler |
| Metro | JavaScript bundler |
| ESLint | Code linting |
| Prettier | Code formatting |

---

## 📡 API Documentation

### Emergency Context API

```javascript
import { useEmergency } from '../context/EmergencyContext';

// Access emergency state and functions
const {
  activeEmergencyType,    // Current emergency type: 'police' | 'fire' | 'medical' | 'flood' | null
  activeResponder,        // Assigned responder details object
  activeEmergencyId,      // Current emergency ID (same as user ID)
  isLoadingEmergency,     // Boolean: Loading state
  isSearchingResponder,   // Boolean: Searching for responder
  userLocation,           // User's GPS coordinates: { latitude, longitude }
  activateEmergency,      // Function: Trigger emergency
  clearEmergency,         // Function: Clear/cancel emergency
} = useEmergency();

// Activate an emergency
const result = await activateEmergency('police');
// Returns: { success: boolean, emergencyId?: string, error?: string }

// Clear emergency
await clearEmergency();
```

### Auth Context API

```javascript
import { useAuth } from '../context/AuthContext';

const {
  user,                   // Firebase user object
  userRole,               // 'user' | 'responder' | 'admin'
  loading,                // Boolean: Auth loading state
  signIn,                 // Function: Sign in
  signUp,                 // Function: Sign up
  logout,                 // Function: Sign out
  resetPassword,          // Function: Send password reset email
  sendVerificationEmail,  // Function: Send email verification
  checkEmailVerified,     // Function: Check verification status
} = useAuth();

// Sign in
const result = await signIn(email, password);
// Returns: { success: boolean, user?: object, role?: string, error?: string }

// Sign up
const result = await signUp(email, password, fullName, contactNumber);
// Returns: { success: boolean, user?: object, error?: string }

// Sign out
const result = await logout();
// Returns: { success: boolean, error?: string }

// Reset password
const result = await resetPassword(email);
// Returns: { success: boolean, error?: string }
```

### Chat Context API

```javascript
import { useChat } from '../context/ChatContext';

const {
  activeConversations,    // Array of conversation objects
  currentConversationId,  // Current active conversation ID
  messages,               // Array of messages in current conversation
  loading,                // Boolean: Loading state
  startConversation,      // Function: Start/get conversation
  sendMessage,            // Function: Send a message
  subscribeToCurrentMessages, // Function: Subscribe to real-time messages
  markAsRead,             // Function: Mark messages as read
} = useChat();

// Start conversation with responder
const conversationId = await startConversation(responder, emergencyId);

// Send message
await sendMessage(conversationId, 'Hello, I need help!', hasRealResponder);

// Subscribe to messages
const unsubscribe = subscribeToCurrentMessages(conversationId, (newMessages) => {
  // Handle new messages
});

// Mark as read
await markAsRead(conversationId);
```

### Firestore Service API

```javascript
import { db } from '../services/firestore';

// Get or create conversation
const conversationId = await getOrCreateConversation(userId, responder, emergencyId);

// Send message
await sendMessage(conversationId, senderId, text, senderType);

// Subscribe to conversations
const unsubscribe = subscribeToConversations(userId, (conversations) => {
  // Handle conversations update
});

// Subscribe to messages
const unsubscribe = subscribeToMessages(conversationId, (messages) => {
  // Handle messages update
});

// Mark messages as read
await markMessagesAsRead(conversationId, 'user'); // or 'responder'
```

### Storage Service API

```javascript
import { 
  pickImageFromLibrary, 
  takePhoto, 
  updateProfileImage,
  uploadValidID,
  deleteValidID 
} from '../services/storage';

// Pick image from library
const imageUri = await pickImageFromLibrary();

// Take photo with camera
const imageUri = await takePhoto();

// Upload profile image
const downloadUrl = await updateProfileImage(userId, imageUri);

// Upload valid ID
const downloadUrl = await uploadValidID(userId, imageUri);

// Delete valid ID
await deleteValidID(userId);
```

---

## 🔧 Utility Functions

### Distance & ETA (Exported from EmergencyContext)

```javascript
import { calculateDistance, calculateETA, formatDistance } from '../context/EmergencyContext';

// Calculate distance between two points
const distance = calculateDistance(lat1, lon1, lat2, lon2);
// Returns: number (km)

// Calculate ETA
const eta = calculateETA(distanceKm);
// Returns: string (e.g., "5 mins", "1h 30m")

// Format distance for display
const formatted = formatDistance(distanceKm);
// Returns: string (e.g., "500 m", "2.5 km")
```

---

<div align="center">

**📚 End of Documentation**

*For installation instructions, see [README.md](README.md)*

</div>
