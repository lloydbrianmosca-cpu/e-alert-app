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
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.userName}>{firstName || 'User'}</Text>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 15,
    color: '#86868B',
    fontWeight: '400',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  profileButton: {
    position: 'relative',
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F5F5F7',
  },
  profileImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  selectTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D1D1F',
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitleText: {
    fontSize: 15,
    color: '#86868B',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  emergencyBox: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    marginBottom: 12,
    marginHorizontal: 6,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  boxTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  boxSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#86868B',
  },
  selectedTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    gap: 14,
  },
  selectedTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTypeInfo: {
    flex: 1,
  },
  selectedTypeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedTypeSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  selectedTypeHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 6,
  },
  sosContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  sosPressCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 20,
  },
  sosOuterRing: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(220, 38, 38, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosMiddleRing: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  sosButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  sosGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  sosSubtext: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    letterSpacing: 1,
  },
  sosHint: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
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
    paddingHorizontal: 8,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F7',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 11,
    color: '#86868B',
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  overlayIconContainer: {
    marginBottom: 20,
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  overlaySubtitle: {
    fontSize: 15,
    color: '#86868B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  overlayButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  // Active Emergency Card Styles
  activeEmergencyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  activeEmergencyHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  activeStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  responderInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 14,
  },
  responderAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  responderDetails: {
    marginLeft: 12,
    flex: 1,
  },
  responderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  responderTag: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  responderInfoRows: {
    gap: 10,
  },
  responderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  responderInfoLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    width: 65,
  },
  responderInfoValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
  },
  etaValue: {
    color: '#059669',
    fontWeight: '700',
  },
  emergencyActionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  viewLocationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#DC2626',
  },
  viewLocationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelAlertButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelAlertButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  noResponderSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noResponderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginTop: 10,
  },
  noResponderSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
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
  },
  completionHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 10,
  },
  completionDetails: {
    width: '100%',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  completionActions: {
    width: '100%',
    gap: 10,
  },
  modalButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#DC2626',
  },
  modalButtonSecondary: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});
