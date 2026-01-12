import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Switch,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { 
  getResponderEmergencies,
  getResponderProfile,
  updateResponderAvailability,
  updateEmergencyStatus,
  subscribeToPendingEmergencies,
} from '../services/firestore';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

const EMERGENCY_COLORS = {
  police: '#1E3A8A',
  medical: '#059669',
  fire: '#DC2626',
  flood: '#0369A1',
};

const STATUS_COLORS = {
  pending: '#F59E0B',
  assigned: '#3B82F6',
  in_progress: '#8B5CF6',
  resolved: '#10B981',
  cancelled: '#6B7280',
};

const EMERGENCY_ICONS = {
  police: 'local-police',
  medical: 'medical-services',
  fire: 'local-fire-department',
  flood: 'flood',
};

// Bottom navigation items - same as user
const NAV_ITEMS = [
  { id: 'home', name: 'Dashboard', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
  { id: 'hotline', name: 'Hotlines', icon: 'call', iconFamily: 'Ionicons' },
  { id: 'chat', name: 'Chat', icon: 'chatbubbles', iconFamily: 'Ionicons' },
  { id: 'profile', name: 'Profile', icon: 'person', iconFamily: 'Ionicons' },
];

export default function ResponderDashboardScreen({ navigation }) {
  const { user, userProfile, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [responderProfile, setResponderProfile] = useState(null);
  const [myEmergencies, setMyEmergencies] = useState([]);
  const [pendingEmergencies, setPendingEmergencies] = useState([]);
  const [activeTab, setActiveTab] = useState('assigned');
  const [activeNavTab, setActiveNavTab] = useState('home');
  
  // Map state
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 14.5547,
    longitude: 121.0010,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Get current location
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setMapLoading(false);
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        setLocation(currentLocation);
        setRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
        setMapLoading(false);
      } catch (error) {
        console.error('Error getting location:', error);
        setMapLoading(false);
      }
    })();
  }, []);

  const fetchData = async () => {
    try {
      if (user && userProfile?.emergencyType) {
        const [profileResult, emergenciesResult] = await Promise.all([
          getResponderProfile(user.uid, userProfile.emergencyType),
          getResponderEmergencies(user.uid),
        ]);

        if (profileResult.success) {
          setResponderProfile(profileResult.data);
          setIsAvailable(profileResult.data.isAvailable);
        }
        if (emergenciesResult.success) {
          setMyEmergencies(emergenciesResult.data);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userProfile?.emergencyType) {
      fetchData();
      
      const unsubscribe = subscribeToPendingEmergencies(
        userProfile.emergencyType,
        (emergencies) => {
          setPendingEmergencies(emergencies);
        }
      );
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, [user, userProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAvailabilityToggle = async (value) => {
    setIsAvailable(value);
    await updateResponderAvailability(user.uid, value);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };

  const handleAcceptEmergency = async (emergencyId) => {
    Alert.alert(
      'Accept Emergency',
      'Are you sure you want to respond to this emergency?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept',
          onPress: async () => {
            const result = await updateEmergencyStatus(emergencyId, 'in_progress', {
              responderId: user.uid,
              responderData: {
                name: userProfile?.fullName,
                email: userProfile?.email,
                emergencyType: userProfile?.emergencyType,
              },
            });
            if (result.success) {
              fetchData();
            }
          }
        },
      ]
    );
  };

  const handleUpdateStatus = async (emergencyId, newStatus) => {
    const result = await updateEmergencyStatus(emergencyId, newStatus);
    if (result.success) {
      fetchData();
    }
  };

  const renderEmergencyCard = (emergency, showAccept = false) => (
    <View key={emergency.id} style={styles.emergencyCard}>
      <View style={styles.emergencyHeader}>
        <View style={[styles.emergencyTypeIcon, { backgroundColor: EMERGENCY_COLORS[emergency.type] || '#6B7280' }]}>
          <MaterialIcons 
            name={EMERGENCY_ICONS[emergency.type] || 'warning'} 
            size={24} 
            color="#FFFFFF" 
          />
        </View>
        <View style={styles.emergencyInfo}>
          <Text style={styles.emergencyType}>{emergency.type?.toUpperCase()} Emergency</Text>
          <Text style={styles.emergencyUser}>{emergency.userName || 'Unknown User'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[emergency.status] || '#6B7280' }]}>
          <Text style={styles.statusBadgeText}>{emergency.status}</Text>
        </View>
      </View>

      <View style={styles.emergencyDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            {emergency.location?.address || 'Location not available'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            {emergency.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
          </Text>
        </View>
        {emergency.userPhone && (
          <View style={styles.detailRow}>
            <Ionicons name="call" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{emergency.userPhone}</Text>
          </View>
        )}
      </View>

      <View style={styles.emergencyActions}>
        {showAccept && emergency.status === 'pending' && (
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
            onPress={() => handleAcceptEmergency(emergency.id)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Accept</Text>
          </TouchableOpacity>
        )}
        {emergency.status === 'in_progress' && (
          <>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
              onPress={() => navigation.navigate('Locations', { emergencyId: emergency.id })}
            >
              <Ionicons name="navigate" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
              onPress={() => handleUpdateStatus(emergency.id, 'resolved')}
            >
              <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Resolve</Text>
            </TouchableOpacity>
          </>
        )}
        {emergency.status === 'assigned' && (
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
            onPress={() => handleUpdateStatus(emergency.id, 'in_progress')}
          >
            <Ionicons name="play" size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Start Response</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const activeEmergencies = myEmergencies.filter(e => e.status === 'in_progress' || e.status === 'assigned');
  const completedEmergencies = myEmergencies.filter(e => e.status === 'resolved');

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

      {/* Header - Same as User HomeScreen */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello, <Text style={styles.userName}>{userProfile?.fullName || 'Responder'}</Text></Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={handleLogout}>
          <Image
            source={{ uri: `https://i.pravatar.cc/150?u=${user?.uid}` }}
            style={styles.profileImage}
          />
          <View style={[styles.onlineIndicator, { backgroundColor: isAvailable ? '#10B981' : '#EF4444' }]} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Role Badge */}
        <View style={styles.roleBadge}>
          <MaterialIcons name={EMERGENCY_ICONS[userProfile?.emergencyType] || 'badge'} size={20} color="#FFFFFF" />
          <Text style={styles.roleBadgeText}>{userProfile?.emergencyType?.toUpperCase()} RESPONDER</Text>
        </View>

        {/* Status Card with Availability Toggle */}
        <View style={styles.statusCard}>
          <View style={styles.statusLeft}>
            <Image
              source={{ uri: `https://i.pravatar.cc/150?u=${user?.uid}` }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.responderName}>{userProfile?.fullName || 'Responder'}</Text>
              <Text style={styles.responderBadge}>{responderProfile?.badge || 'Badge ID'}</Text>
            </View>
          </View>
          <View style={styles.availabilityContainer}>
            <Text style={[styles.availabilityLabel, { color: isAvailable ? '#059669' : '#EF4444' }]}>
              {isAvailable ? 'Available' : 'Unavailable'}
            </Text>
            <Switch
              value={isAvailable}
              onValueChange={handleAvailabilityToggle}
              trackColor={{ false: '#FEE2E2', true: '#D1FAE5' }}
              thumbColor={isAvailable ? '#059669' : '#EF4444'}
            />
          </View>
        </View>

        {/* Map Section */}
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <Ionicons name="location" size={18} color="#DC2626" />
            <Text style={styles.mapTitle}>Your Current Location</Text>
          </View>
          {mapLoading ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="small" color="#DC2626" />
              <Text style={styles.mapLoadingText}>Loading map...</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              region={region}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {location && (
                <Marker
                  coordinate={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }}
                  title="Your Location"
                  description={userProfile?.emergencyType?.toUpperCase() + ' Responder'}
                >
                  <View style={styles.responderMarker}>
                    <MaterialIcons name="person-pin" size={32} color="#DC2626" />
                  </View>
                </Marker>
              )}
            </MapView>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statNumber, { color: '#D97706' }]}>{activeEmergencies.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.statNumber, { color: '#059669' }]}>{completedEmergencies.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statNumber, { color: '#DC2626' }]}>{pendingEmergencies.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Tab Navigation for Emergencies */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'assigned' && styles.tabActive]}
            onPress={() => setActiveTab('assigned')}
          >
            <Text style={[styles.tabText, activeTab === 'assigned' && styles.tabTextActive]}>
              Assigned ({activeEmergencies.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Pending ({pendingEmergencies.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Cards */}
        <View style={styles.emergencyList}>
          {activeTab === 'assigned' && (
            <>
              {activeEmergencies.length > 0 ? (
                activeEmergencies.map(emergency => renderEmergencyCard(emergency))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No Active Assignments</Text>
                  <Text style={styles.emptySubtitle}>Check pending emergencies for new requests</Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'pending' && (
            <>
              {pendingEmergencies.length > 0 ? (
                pendingEmergencies.map(emergency => renderEmergencyCard(emergency, true))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No Pending Emergencies</Text>
                  <Text style={styles.emptySubtitle}>All emergencies are being handled</Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <>
              {completedEmergencies.length > 0 ? (
                completedEmergencies.map(emergency => renderEmergencyCard(emergency))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No History Yet</Text>
                  <Text style={styles.emptySubtitle}>Completed emergencies will appear here</Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation - Same as User HomeScreen */}
      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => {
              setActiveNavTab(item.id);
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
              name={activeNavTab === item.id ? item.icon : `${item.icon}-outline`} 
              size={24} 
              color={activeNavTab === item.id ? '#DC2626' : '#6B7280'} 
            />
            <Text style={[
              styles.navLabel,
              activeNavTab === item.id && styles.navLabelActive
            ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  // Header - Same as User HomeScreen
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
  // Role Badge
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  // Status Card
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  responderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  responderBadge: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  availabilityContainer: {
    alignItems: 'center',
  },
  availabilityLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  // Map Section
  mapContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  map: {
    width: '100%',
    height: 180,
  },
  mapLoading: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  mapLoadingText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  responderMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#DC2626',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  // Emergency List
  emergencyList: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  emergencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  emergencyUser: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  emergencyDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  emergencyActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  // Bottom Navigation - Same as User HomeScreen
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 4,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
});
