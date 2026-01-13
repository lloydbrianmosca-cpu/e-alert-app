import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Switch,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Image,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components';

const { width } = Dimensions.get('window');

// Bottom navigation items - unified with user screens
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
  { id: 'history', name: 'History', icon: 'time', iconFamily: 'Ionicons' },
  { id: 'chat', name: 'Chat', icon: 'chatbubbles', iconFamily: 'Ionicons' },
  { id: 'profile', name: 'Profile', icon: 'person', iconFamily: 'Ionicons' },
];

// Primary color - unified with user screens
const PRIMARY_COLOR = '#DC2626';

// Responder type colors (for badges only)
const RESPONDER_COLORS = {
  police: '#1E3A8A',
  medical: '#059669',
  fireman: '#DC2626',
  rescue: '#0369A1',
};

const RESPONDER_ICONS = {
  police: 'shield-checkmark',
  medical: 'medkit',
  fireman: 'flame',
  rescue: 'boat',
};

export default function ResponderHomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responderData, setResponderData] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [assignedEmergencies, setAssignedEmergencies] = useState([]);
  const [emergencyHistory, setEmergencyHistory] = useState([]);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const locationSubscription = useRef(null);
  const [stats, setStats] = useState({
    totalResponded: 0,
    pendingAssignments: 0,
    completedToday: 0,
  });

  // Check if profile is complete
  const checkProfileComplete = (data) => {
    if (!data) return false;
    const requiredFields = ['firstName', 'lastName', 'contactNumber', 'stationName', 'hotlineNumber'];
    return requiredFields.every(field => data[field] && data[field].trim() !== '');
  };

  // Fetch responder profile data
  const fetchResponderData = async () => {
    if (!user?.uid) return;

    try {
      const docRef = doc(db, 'responders', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setResponderData(data);
        setProfileImage(data.profileImage || null);
        setIsAvailable(data.isAvailable !== undefined ? data.isAvailable : false);
        
        // Check profile completeness
        const profileComplete = checkProfileComplete(data);
        setIsProfileComplete(profileComplete);
      }
    } catch (error) {
      console.log('Error fetching responder data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load profile data',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Listen for assigned emergencies
  useEffect(() => {
    if (!user?.uid) {
      setAssignedEmergencies([]);
      return;
    }

    const q = query(
      collection(db, 'activeEmergencies'),
      where('assignedResponderId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const emergencies = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAssignedEmergencies(emergencies);
      setStats((prev) => ({
        ...prev,
        pendingAssignments: emergencies.length,
      }));
    }, (error) => {
      // Ignore permission errors on sign out and index building errors
      if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
        setAssignedEmergencies([]);
        return;
      }
      console.log('Error listening to emergencies:', error);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  // Listen for emergency history
  useEffect(() => {
    if (!user?.uid) {
      setEmergencyHistory([]);
      return;
    }

    const q = query(
      collection(db, 'emergencyHistory'),
      where('completedBy', '==', user.uid),
      orderBy('completedAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEmergencyHistory(history);
      
      // Calculate completed today (resets at 12AM)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedTodayCount = history.filter((emergency) => {
        const completedAt = emergency.completedAt?.toDate?.() || new Date(emergency.completedAt);
        return completedAt >= today;
      }).length;
      
      setStats((prev) => ({
        ...prev,
        totalResponded: history.length,
        completedToday: completedTodayCount,
      }));
    }, (error) => {
      // Ignore permission errors on sign out and index errors
      if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
        setEmergencyHistory([]);
        return;
      }
      console.log('Error listening to emergency history:', error);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  useEffect(() => {
    fetchResponderData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchResponderData();
  };

  // Toggle availability status
  const toggleAvailability = async (value) => {
    if (!user?.uid) return;

    // Prevent turning off if there's an active emergency
    if (!value && assignedEmergencies.length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Change Status',
        text2: 'You have an active emergency. Complete it first.',
      });
      return;
    }

    try {
      const docRef = doc(db, 'responders', user.uid);
      
      // If becoming available, also update location
      let locationData = {};
      if (value) {
        const location = await updateCurrentLocation();
        if (location) {
          locationData = { location };
        }
        // Start location tracking when available
        startLocationTracking();
      } else {
        // Stop location tracking when unavailable
        stopLocationTracking();
      }
      
      await updateDoc(docRef, {
        isAvailable: value,
        ...locationData,
        updatedAt: new Date().toISOString(),
      });
      setIsAvailable(value);
      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: `You are now ${value ? 'Available' : 'Unavailable'}`,
      });
    } catch (error) {
      console.log('Error updating status:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update status',
      });
    }
  };

  // Get and update current location
  const updateCurrentLocation = async () => {
    if (!user?.uid) return null;

    try {
      setIsUpdatingLocation(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Location Permission',
          text2: 'Please enable location to be visible to users',
        });
        return null;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        updatedAt: new Date().toISOString(),
      };

      setCurrentLocation(locationData);

      // Update location in Firebase
      const docRef = doc(db, 'responders', user.uid);
      await updateDoc(docRef, {
        location: locationData,
      });

      return locationData;
    } catch (error) {
      console.log('Error updating location:', error);
      return null;
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // Start continuous location tracking
  const startLocationTracking = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // Update location every 30 seconds
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // 30 seconds
          distanceInterval: 50, // or 50 meters
        },
        async (location) => {
          if (!user?.uid) return;

          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            updatedAt: new Date().toISOString(),
          };

          setCurrentLocation(locationData);

          // Update in Firebase
          try {
            const docRef = doc(db, 'responders', user.uid);
            await updateDoc(docRef, {
              location: locationData,
            });
          } catch (error) {
            console.log('Error updating location in tracking:', error);
          }
        }
      );
    } catch (error) {
      console.log('Error starting location tracking:', error);
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Start tracking if already available
  useEffect(() => {
    if (isAvailable && user?.uid) {
      updateCurrentLocation();
      startLocationTracking();
    }
  }, [isAvailable, user]);

  // Handle tab navigation
  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
    switch (tabId) {
      case 'home':
        break;
      case 'locations':
        navigation.navigate('ResponderLocations');
        break;
      case 'history':
        navigation.navigate('ResponderEmergencyHistory');
        break;
      case 'chat':
        navigation.navigate('ResponderChats');
        break;
      case 'profile':
        navigation.navigate('ResponderProfile');
        break;
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'SignIn' }],
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to sign out',
      });
    }
  };

  // Get responder type color
  const getResponderColor = () => {
    if (!responderData?.responderType) return '#1E3A8A';
    return RESPONDER_COLORS[responderData.responderType.toLowerCase()] || '#1E3A8A';
  };

  // Get responder type icon
  const getResponderIcon = () => {
    if (!responderData?.responderType) return 'shield-checkmark';
    return RESPONDER_ICONS[responderData.responderType.toLowerCase()] || 'shield-checkmark';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const responderTypeColor = getResponderColor();

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />

      {/* Header - Unified with user screens */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello, <Text style={styles.userName}>{responderData?.firstName || 'Responder'}</Text></Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('ResponderProfile')}>
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
          <View style={styles.onlineIndicator} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY_COLOR]} />
        }
      >
        {/* Responder Type Badge */}
        <View style={styles.welcomeSection}>
          <View style={[styles.typeBadge, { backgroundColor: responderTypeColor }]}>
            <Ionicons name={getResponderIcon()} size={16} color="#FFFFFF" />
            <Text style={styles.typeBadgeText}>
              {responderData?.responderType || 'Responder'}
            </Text>
          </View>
        </View>

        {/* Availability Toggle Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Your Status</Text>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: assignedEmergencies.length > 0 ? '#F59E0B' : (isAvailable ? '#10B981' : '#EF4444') },
              ]}
            />
          </View>
          <View style={styles.statusContent}>
            <View style={styles.statusInfo}>
              <MaterialCommunityIcons
                name={assignedEmergencies.length > 0 ? 'account-clock' : (isAvailable ? 'account-check' : 'account-cancel')}
                size={48}
                color={assignedEmergencies.length > 0 ? '#F59E0B' : (isAvailable ? '#10B981' : '#EF4444')}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: assignedEmergencies.length > 0 ? '#F59E0B' : (isAvailable ? '#10B981' : '#EF4444') },
                ]}
              >
                {assignedEmergencies.length > 0 ? 'ONGOING' : (isAvailable ? 'AVAILABLE' : 'UNAVAILABLE')}
              </Text>
              <Text style={styles.statusSubtext}>
                {assignedEmergencies.length > 0
                  ? 'You have an active emergency assignment'
                  : (isAvailable
                    ? 'You can receive emergency assignments'
                    : 'You will not receive new assignments')}
              </Text>
            </View>
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>
                {assignedEmergencies.length > 0 ? 'Status Locked' : 'Toggle Status'}
              </Text>
              <Switch
                value={isAvailable}
                onValueChange={toggleAvailability}
                trackColor={{ false: '#D1D5DB', true: assignedEmergencies.length > 0 ? '#FCD34D' : '#86EFAC' }}
                thumbColor={assignedEmergencies.length > 0 ? '#F59E0B' : (isAvailable ? '#10B981' : '#9CA3AF')}
                ios_backgroundColor="#D1D5DB"
                disabled={assignedEmergencies.length > 0}
              />
            </View>
          </View>
          {assignedEmergencies.length > 0 && (
            <View style={styles.statusWarning}>
              <Ionicons name="information-circle" size={18} color="#F59E0B" />
              <Text style={styles.statusWarningText}>
                Complete your active emergency to change status
              </Text>
            </View>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="check-circle" size={32} color="#10B981" />
            <Text style={styles.statNumber}>{stats.completedToday}</Text>
            <Text style={styles.statLabel}>Completed Today</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="history" size={32} color="#3B82F6" />
            <Text style={styles.statNumber}>{stats.totalResponded}</Text>
            <Text style={styles.statLabel}>Total History</Text>
          </View>
        </View>

        {/* Emergency History Section */}
        <View style={styles.assignmentsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency History</Text>
            {emergencyHistory.length > 3 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ResponderEmergencyHistory')}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {emergencyHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="history" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No emergency history</Text>
              <Text style={styles.emptySubtext}>
                Completed emergencies will appear here
              </Text>
            </View>
          ) : (
            emergencyHistory.slice(0, 3).map((emergency, index) => (
              <View
                key={`history-${emergency.id}-${index}`}
                style={styles.historyCard}
              >
                <View style={styles.emergencyHeader}>
                  <View
                    style={[
                      styles.emergencyTypeBadge,
                      { backgroundColor: RESPONDER_COLORS[emergency.emergencyType || emergency.type] || '#1E3A8A' },
                    ]}
                  >
                    <Text style={styles.emergencyTypeText}>
                      {(emergency.emergencyType || emergency.type)?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                </View>
                <Text style={styles.emergencyUser}>
                  User: {emergency.userName || 'Unknown User'}
                </Text>
                <Text style={styles.emergencyLocation} numberOfLines={1}>
                  📍 {emergency.userAddress || emergency.address || 'Location not available'}
                </Text>
                <Text style={styles.historyTime}>
                  {emergency.completedAt
                    ? new Date(emergency.completedAt.toDate?.() || emergency.completedAt).toLocaleString()
                    : 'N/A'}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => handleTabPress(item.id)}
          >
            <Ionicons
              name={activeTab === item.id ? item.icon : `${item.icon}-outline`}
              size={24}
              color={activeTab === item.id ? PRIMARY_COLOR : '#6B7280'}
            />
            <Text
              style={[
                styles.navLabel,
                activeTab === item.id && styles.navLabelActive,
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Profile Incomplete Overlay */}
      {!isProfileComplete && !isLoading && (
        <View style={styles.overlayContainer}>
          <View style={styles.overlayContent}>
            <View style={styles.overlayIconContainer}>
              <Ionicons name="person-circle" size={80} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.overlayTitle}>Complete Your Profile</Text>
            <Text style={styles.overlaySubtitle}>
              Please complete your profile information (name, contact number, station name, and hotline) before accessing the app.
            </Text>
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={() => navigation.navigate('ResponderProfile')}
              activeOpacity={0.8}
            >
              <Ionicons name="person" size={20} color="#FFFFFF" />
              <Text style={styles.overlayButtonText}>Go to Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Toast config={toastConfig} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#DC2626',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileButton: {
    position: 'relative',
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    paddingHorizontal: 20,
  },
  welcomeSection: {
    marginTop: 16,
    marginBottom: 14,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusContent: {
    alignItems: 'center',
  },
  statusInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 10,
  },
  statusSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  toggleLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  statusWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  statusWarningText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
    textAlign: 'center',
  },
  assignmentsSection: {
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  emptyState: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 14,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  emergencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  emergencyTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  emergencyTypeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  emergencyTime: {
    fontSize: 11,
    color: '#6B7280',
  },
  emergencyUser: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 3,
  },
  emergencyLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  emergencyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewLocationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  completedText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  historyTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 3,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 28,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#DC2626',
    fontWeight: '600',
  },
  // Profile Incomplete Overlay Styles
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  overlayIconContainer: {
    marginBottom: 16,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  overlaySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  overlayButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
