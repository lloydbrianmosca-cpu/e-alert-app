import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const BOX_SIZE = (width - 60) / 2;

// Emergency categories
const EMERGENCY_TYPES = [
  {
    id: 'police',
    name: 'Police',
    subtitle: 'PNP Emergency',
    icon: 'local-police',
    iconFamily: 'MaterialIcons',
    color: '#1E3A8A',
    lightColor: '#DBEAFE',
  },
  {
    id: 'fire',
    name: 'Fireman',
    subtitle: 'BFP Emergency',
    icon: 'fire-truck',
    iconFamily: 'MaterialIcons',
    color: '#DC2626',
    lightColor: '#FEE2E2',
  },
  {
    id: 'medical',
    name: 'Medical',
    subtitle: 'Health Emergency',
    icon: 'medical-services',
    iconFamily: 'MaterialIcons',
    color: '#059669',
    lightColor: '#D1FAE5',
  },
  {
    id: 'flood',
    name: 'Flood',
    subtitle: 'Disaster Alert',
    icon: 'flood',
    iconFamily: 'MaterialIcons',
    color: '#0369A1',
    lightColor: '#E0F2FE',
  },
];

// Bottom navigation items
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
  { id: 'hotline', name: 'Hotlines', icon: 'call', iconFamily: 'Ionicons' },
  { id: 'chat', name: 'Chat', icon: 'chatbubbles', iconFamily: 'Ionicons' },
  { id: 'profile', name: 'Profile', icon: 'person', iconFamily: 'Ionicons' },
];

export default function HomeScreen({ navigation }) {
  const [selectedType, setSelectedType] = useState(null);
  const [showSOS, setShowSOS] = useState(false);
  const [sosPressed, setSosPressed] = useState(false);
  const [sosCount, setSosCount] = useState(0);
  const [activeTab, setActiveTab] = useState('home');
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const { activeEmergencyType, activeResponder, activateEmergency, clearEmergency, isSearchingResponder } = useEmergency();
  const { user } = useAuth();

  // Required profile fields
  const requiredFields = [
    'firstName', 'lastName', 'email', 'contactNumber',
    'address', 'region', 'province', 'city',
    'emergencyContactName', 'emergencyContactNumber'
  ];

  // Check if profile is complete
  const checkProfileComplete = async () => {
    if (!user?.uid) {
      setIsCheckingProfile(false);
      return;
    }

    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Set first name from profile data or displayName
        const userFirstName = data.firstName || user?.displayName?.split(' ')[0] || '';
        setFirstName(userFirstName);
        setProfileImage(data.profileImage || null);
        
        // Check if all required fields are filled
        const isComplete = requiredFields.every(field => {
          if (field === 'firstName') {
            return user?.displayName?.split(' ').slice(0, -1).join(' ')?.trim();
          }
          if (field === 'lastName') {
            return user?.displayName?.split(' ').slice(-1)[0]?.trim();
          }
          if (field === 'email') {
            return user?.email?.trim();
          }
          return data[field] && data[field].trim() !== '';
        });

        setShowProfileOverlay(!isComplete);
      } else {
        // No profile data exists yet
        setShowProfileOverlay(true);
      }
    } catch (error) {
      console.log('Error checking profile:', error);
      setShowProfileOverlay(true);
    } finally {
      setIsCheckingProfile(false);
    }
  };

  // Check profile on mount and when returning to screen
  useEffect(() => {
    checkProfileComplete();
  }, [user]);

  // Re-check when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkProfileComplete();
      
      // Set up real-time listener for active emergency
      if (user?.uid) {
        const emergencyRef = doc(db, 'emergencies', user.uid);
        const unsubscribeEmergency = onSnapshot(emergencyRef, (docSnap) => {
          if (docSnap.exists()) {
            const emergencyData = docSnap.data();
            setActiveEmergency(emergencyData);
            
            // Show completion summary if emergency is completed
            if (emergencyData.status === 'completed') {
              setShowCompletionSummary(true);
            }
          } else {
            setActiveEmergency(null);
            setShowCompletionSummary(false);
          }
        }, (error) => {
          console.log('Error listening to emergency:', error);
        });
        
        return () => {
          unsubscribeEmergency();
        };
      }
    });
    return unsubscribe;
  }, [navigation, user]);

  // Pulse animation for SOS button
  React.useEffect(() => {
    if (showSOS) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [showSOS]);

  // Ensure SOS view persists when there's an active emergency
  React.useEffect(() => {
    if (activeEmergencyType) {
      setSelectedType(activeEmergencyType);
      setShowSOS(true);
    }
  }, [activeEmergencyType]);

  const handleEmergencyTypeSelect = (type) => {
    setSelectedType(type.id);
    setShowSOS(true);
  };

  const handleBackToSelection = () => {
    setShowSOS(false);
    setSelectedType(null);
    setSosCount(0);
  };

  const handleSOSPress = async () => {
    const newCount = sosCount + 1;
    setSosCount(newCount);
    
    if (newCount < 3) {
      return;
    }
    
    const selected = EMERGENCY_TYPES.find(t => t.id === selectedType);
    setSosPressed(true);
    
    // Activate emergency and find responder
    try {
      const result = await activateEmergency(selectedType);
      
      setTimeout(() => {
        setSosPressed(false);
        setSosCount(0);
        navigation.navigate('Locations', { emergencyType: selectedType });
      }, 1500);
    } catch (error) {
      console.log('Error activating emergency:', error);
      setSosPressed(false);
      setSosCount(0);
    }
  };

  const renderIcon = (item, size = 32) => {
    const color = selectedType === item.id ? '#FFFFFF' : item.color;
    
    switch (item.iconFamily) {
      case 'FontAwesome5':
        return <FontAwesome5 name={item.icon} size={size} color={color} />;
      case 'Ionicons':
        return <Ionicons name={item.icon} size={size} color={color} />;
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={item.icon} size={size} color={color} />;
      default:
        return <MaterialIcons name={item.icon} size={size} color={color} />;
    }
  };

  const selectedEmergency = EMERGENCY_TYPES.find(t => t.id === selectedType);

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello, <Text style={styles.userName}>{firstName || 'User'}</Text></Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!showSOS ? (
          <>
            {/* Title */}
            <Text style={styles.selectTitle}>Select an Emergency Type</Text>

            {/* Emergency Type Grid - 2 by 2 */}
            <View style={styles.gridContainer}>
              {EMERGENCY_TYPES.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.emergencyBox,
                    { backgroundColor: item.lightColor },
                    idx % 2 === 0 ? { marginRight: 8 } : { marginLeft: 8 },
                    { marginBottom: 16 },
                  ]}
                  onPress={() => handleEmergencyTypeSelect(item)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: 'rgba(0,0,0,0.05)' }
                  ]}>
                    {renderIcon(item, 48)}
                  </View>
                  <Text style={[styles.boxTitle, { color: item.color }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.boxSubtitle, { color: item.color }]}>
                    {item.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Selected Emergency Type - Clickable to go back */}
            <TouchableOpacity 
              style={[
                styles.selectedTypeCard,
                { backgroundColor: selectedEmergency?.color }
              ]}
              onPress={handleBackToSelection}
              activeOpacity={0.8}
            >
              <View style={styles.selectedTypeIcon}>
                {renderIcon(selectedEmergency, 48)}
              </View>
              <View style={styles.selectedTypeInfo}>
                <Text style={styles.selectedTypeName}>{selectedEmergency?.name}</Text>
                <Text style={styles.selectedTypeSubtitle}>{selectedEmergency?.subtitle}</Text>
                <Text style={styles.selectedTypeHint}>Click here to change emergency type</Text>
              </View>
            </TouchableOpacity>

            {/* Show Active Emergency Card OR SOS Button */}
            {activeEmergencyType ? (
              <>
                {/* Active Emergency Status Card */}
                <View style={styles.activeEmergencyCard}>
                  <View style={styles.activeEmergencyHeader}>
                    <View style={styles.activeStatusBadge}>
                      <View style={styles.activeStatusDot} />
                      <Text style={styles.activeStatusText}>
                        {isSearchingResponder ? 'SEARCHING RESPONDER...' : 'ACTIVE EMERGENCY'}
                      </Text>
                    </View>
                  </View>
                  
                  {activeResponder ? (
                    <>
                      <View style={styles.responderInfoSection}>
                        <Image
                          source={{ uri: activeResponder.avatar }}
                          style={styles.responderAvatar}
                        />
                        <View style={styles.responderDetails}>
                          <Text style={styles.responderName}>{activeResponder.name}</Text>
                          <Text style={styles.responderTag}>{activeResponder.tag} Responder</Text>
                        </View>
                      </View>

                      <View style={styles.responderInfoRows}>
                        <View style={styles.responderInfoRow}>
                          <Ionicons name="business" size={18} color="#6B7280" />
                          <Text style={styles.responderInfoLabel}>Station:</Text>
                          <Text style={styles.responderInfoValue}>{activeResponder.building}</Text>
                        </View>
                        <View style={styles.responderInfoRow}>
                          <Ionicons name="call" size={18} color="#6B7280" />
                          <Text style={styles.responderInfoLabel}>Hotline:</Text>
                          <Text style={styles.responderInfoValue}>{activeResponder.hotline}</Text>
                        </View>
                        <View style={styles.responderInfoRow}>
                          <Ionicons name="time" size={18} color="#6B7280" />
                          <Text style={styles.responderInfoLabel}>ETA:</Text>
                          <Text style={[styles.responderInfoValue, styles.etaValue]}>{activeResponder.eta}</Text>
                        </View>
                        <View style={styles.responderInfoRow}>
                          <Ionicons name="navigate" size={18} color="#6B7280" />
                          <Text style={styles.responderInfoLabel}>Distance:</Text>
                          <Text style={styles.responderInfoValue}>{activeResponder.distance}</Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={styles.noResponderSection}>
                      <Ionicons name="search" size={48} color="#DC2626" />
                      <Text style={styles.noResponderTitle}>Finding Nearest Responder</Text>
                      <Text style={styles.noResponderSubtitle}>
                        No available responders found yet. Please wait or try again.
                      </Text>
                    </View>
                  )}

                  <View style={styles.emergencyActionButtons}>
                    <TouchableOpacity
                      style={styles.viewLocationButton}
                      onPress={() => navigation.navigate('Locations')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="map" size={18} color="#FFFFFF" />
                      <Text style={styles.viewLocationButtonText}>View on Map</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelAlertButton}
                      onPress={() => {
                        clearEmergency();
                        setShowSOS(false);
                        setSelectedType(null);
                        setSosCount(0);
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="close-circle" size={18} color="#DC2626" />
                      <Text style={styles.cancelAlertButtonText}>Cancel Alert</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* SOS Button */}
                <View style={styles.sosContainer}>
                  <Text style={styles.sosPressCount}>
                    {sosCount}/3 Presses
                  </Text>
                  <Animated.View style={[
                    styles.sosOuterRing,
                    { transform: [{ scale: pulseAnim }] }
                  ]}>
                    <View style={styles.sosMiddleRing}>
                      <TouchableOpacity
                        style={[
                          styles.sosButton,
                          sosPressed && styles.sosButtonPressed,
                        ]}
                        onPress={handleSOSPress}
                        activeOpacity={0.9}
                      >
                        <LinearGradient
                          colors={sosPressed ? ['#991B1B', '#7F1D1D'] : ['#DC2626', '#B91C1C']}
                          style={styles.sosGradient}
                        >
                          <Text style={styles.sosText}>SOS</Text>
                          <Text style={styles.sosSubtext}>
                            {sosPressed ? 'SENDING...' : `TAP ${3 - sosCount}x`}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                </View>

                <Text style={styles.sosHint}>Press the button 3 times to send emergency alert</Text>

                {/* Emergency Info Card */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={20} color="#DC2626" />
                    <Text style={styles.infoText}>After pressing the button 3 times, your location will be shared.</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="notifications" size={20} color="#DC2626" />
                    <Text style={styles.infoText}>Nearest emergency service will automatically be notified.</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="time" size={20} color="#DC2626" />
                    <Text style={styles.infoText}>ETA and distance will be shown once button is active.</Text>
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Emergency Completion Summary Modal */}
      <Modal
        visible={showCompletionSummary && activeEmergency?.status === 'completed'}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => {
          setShowCompletionSummary(false);
          clearEmergency();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completionModal}>
            <View style={styles.completionHeader}>
              <Ionicons name="checkmark-circle" size={60} color="#10B981" />
              <Text style={styles.completionTitle}>Emergency Completed</Text>
            </View>

            <View style={styles.completionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>
                  {activeEmergency?.emergencyType?.toUpperCase()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Responder:</Text>
                <Text style={styles.detailValue}>
                  {activeEmergency?.responderName || 'N/A'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration:</Text>
                <Text style={styles.detailValue}>
                  {activeEmergency?.duration || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.completionActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  setShowCompletionSummary(false);
                  clearEmergency();
                }}
              >
                <Text style={styles.modalButtonText}>Back to Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => navigation.navigate('EmergencyHistory')}
              >
                <Text style={styles.modalButtonSecondaryText}>View History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => {
              setActiveTab(item.id);
              if (item.id === 'chat') {
                navigation.navigate('Chat');
              } else if (item.id === 'locations') {
                navigation.navigate('Locations');
              } else if (item.id === 'hotline') {
                navigation.navigate('Hotlines');
              } else if (item.id === 'profile') {
                navigation.navigate('Profile');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={activeTab === item.id ? item.icon : `${item.icon}-outline`} 
              size={24} 
              color={activeTab === item.id ? '#DC2626' : '#6B7280'} 
            />
            <Text style={[
              styles.navLabel,
              activeTab === item.id && styles.navLabelActive
            ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Profile Incomplete Overlay */}
      {showProfileOverlay && !isCheckingProfile && (
        <View style={styles.overlayContainer}>
          <View style={styles.overlayContent}>
            <View style={styles.overlayIconContainer}>
              <Ionicons name="person-circle" size={80} color="#DC2626" />
            </View>
            <Text style={styles.overlayTitle}>Complete Your Profile</Text>
            <Text style={styles.overlaySubtitle}>
              Please fill up your profile information first before using emergency services. This helps responders locate and assist you better.
            </Text>
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <Ionicons name="person" size={20} color="#FFFFFF" />
              <Text style={styles.overlayButtonText}>Go to Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#DC2626',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileButton: {
    position: 'relative',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  selectTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  subtitleText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  emergencyBox: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  boxTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  boxSubtitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectedTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 26,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  selectedTypeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTypeInfo: {
    flex: 1,
  },
  selectedTypeName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  selectedTypeSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  selectedTypeHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 10,
    fontStyle: 'italic',
  },
  sosContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  sosPressCount: {
    fontSize: 25,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 25,
  },
  sosOuterRing: {
    width: 380,
    height: 380,
    borderRadius: 300,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosMiddleRing: {
    width: 300,
    height: 300,
    borderRadius: 300,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButton: {
    width: 300,
    height: 300,
    borderRadius: 330,
    overflow: 'hidden',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  sosButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  sosGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: {
    fontSize: 68,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
  },
  sosSubtext: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    letterSpacing: 2,
  },
  sosHint: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  infoText: {
    fontSize: 18,
    color: '#4B5563',
    fontWeight: '500',
    flex: 1,
  },
  activeEmergencyContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 12,
  },
  viewEmergencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DC2626',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewEmergencyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  cancelEmergencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  cancelEmergencyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#DC2626',
    fontWeight: '600',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  overlayIconContainer: {
    marginBottom: 20,
  },
  overlayTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  overlaySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 10,
    width: '100%',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  overlayButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Active Emergency Card Styles
  activeEmergencyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  activeEmergencyHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  activeStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  activeStatusText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 1,
  },
  responderInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  responderAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#DC2626',
  },
  responderDetails: {
    marginLeft: 14,
    flex: 1,
  },
  responderName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  responderTag: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  responderInfoRows: {
    gap: 12,
  },
  responderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  responderInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    width: 70,
  },
  responderInfoValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
  },
  etaValue: {
    color: '#059669',
    fontWeight: '700',
  },
  emergencyActionButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  viewLocationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  viewLocationButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelAlertButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  cancelAlertButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  noResponderSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noResponderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
  },
  noResponderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  completionHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 12,
  },
  completionDetails: {
    width: '100%',
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '700',
  },
  completionActions: {
    width: '100%',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#DC2626',
  },
  modalButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
});
