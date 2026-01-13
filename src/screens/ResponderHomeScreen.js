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
      setStats((prev) => ({
        ...prev,
        totalResponded: history.length,
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
          <View style={styles.profileImagePlaceholder}>
            <Ionicons name="person" size={24} color="#FFFFFF" />
          </View>
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
          <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
            <MaterialCommunityIcons name="check-circle" size={32} color="#10B981" />
            <Text style={styles.statNumber}>{stats.completedToday}</Text>
            <Text style={styles.statLabel}>Completed Today</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
            <MaterialCommunityIcons name="clock-alert" size={32} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats.pendingAssignments}</Text>
            <Text style={styles.statLabel}>Active Assignments</Text>
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
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
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
    paddingHorizontal: 20,
  },
  welcomeSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusContent: {
    alignItems: 'center',
  },
  statusInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  statusWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  statusWarningText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  assignmentsSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emergencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emergencyTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emergencyTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  emergencyUser: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  emergencyLocation: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  emergencyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  viewLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  historyTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
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
  // Profile Incomplete Overlay Styles
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
});
