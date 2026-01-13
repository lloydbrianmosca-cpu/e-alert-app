import React, { useState, useEffect } from 'react';
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
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components';

const { width } = Dimensions.get('window');

// Bottom navigation items - unified with user screens
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
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
  const [stats, setStats] = useState({
    totalResponded: 0,
    pendingAssignments: 0,
    completedToday: 0,
  });

  // Fetch responder profile data
  const fetchResponderData = async () => {
    if (!user?.uid) return;

    try {
      const docRef = doc(db, 'responders', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setResponderData(data);
        setIsAvailable(data.status === 'available');
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
    if (!user?.uid) return;

    const q = query(
      collection(db, 'activeEmergencies'),
      where('assignedResponder', '==', user.uid),
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
    });

    return () => unsubscribe();
  }, [user]);

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

    try {
      const docRef = doc(db, 'responders', user.uid);
      await updateDoc(docRef, {
        status: value ? 'available' : 'unavailable',
        lastStatusUpdate: new Date().toISOString(),
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

  // Handle tab navigation
  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
    switch (tabId) {
      case 'home':
        break;
      case 'locations':
        navigation.navigate('ResponderLocations');
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
                { backgroundColor: isAvailable ? '#10B981' : '#EF4444' },
              ]}
            />
          </View>
          <View style={styles.statusContent}>
            <View style={styles.statusInfo}>
              <MaterialCommunityIcons
                name={isAvailable ? 'account-check' : 'account-cancel'}
                size={48}
                color={isAvailable ? '#10B981' : '#EF4444'}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isAvailable ? '#10B981' : '#EF4444' },
                ]}
              >
                {isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
              </Text>
              <Text style={styles.statusSubtext}>
                {isAvailable
                  ? 'You can receive emergency assignments'
                  : 'You will not receive new assignments'}
              </Text>
            </View>
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Toggle Status</Text>
              <Switch
                value={isAvailable}
                onValueChange={toggleAvailability}
                trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                thumbColor={isAvailable ? '#10B981' : '#9CA3AF'}
                ios_backgroundColor="#D1D5DB"
              />
            </View>
          </View>
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

        {/* Active Assignments Section */}
        <View style={styles.assignmentsSection}>
          <Text style={styles.sectionTitle}>Active Assignments</Text>
          {assignedEmergencies.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No active assignments</Text>
              <Text style={styles.emptySubtext}>
                {isAvailable
                  ? 'You will be notified when a new emergency is assigned'
                  : 'Set your status to Available to receive assignments'}
              </Text>
            </View>
          ) : (
            assignedEmergencies.map((emergency) => (
              <TouchableOpacity
                key={emergency.id}
                style={styles.emergencyCard}
                onPress={() => navigation.navigate('ResponderLocations', { emergency })}
              >
                <View style={styles.emergencyHeader}>
                  <View
                    style={[
                      styles.emergencyTypeBadge,
                      { backgroundColor: RESPONDER_COLORS[emergency.type] || '#1E3A8A' },
                    ]}
                  >
                    <Text style={styles.emergencyTypeText}>
                      {emergency.type?.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.emergencyTime}>
                    {emergency.createdAt
                      ? new Date(emergency.createdAt.toDate?.() || emergency.createdAt).toLocaleTimeString()
                      : 'N/A'}
                  </Text>
                </View>
                <Text style={styles.emergencyUser}>
                  From: {emergency.userName || 'Unknown User'}
                </Text>
                <Text style={styles.emergencyLocation} numberOfLines={2}>
                  📍 {emergency.address || 'Location not available'}
                </Text>
                <View style={styles.emergencyAction}>
                  <Text style={styles.viewLocationText}>View Location</Text>
                  <Ionicons name="chevron-forward" size={20} color={PRIMARY_COLOR} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ResponderLocations')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#EBF5FF' }]}>
                <Ionicons name="map" size={24} color="#1E3A8A" />
              </View>
              <Text style={styles.actionText}>View Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ResponderChats')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="chatbubbles" size={24} color="#059669" />
              </View>
              <Text style={styles.actionText}>Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ResponderProfile')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="person" size={24} color="#D97706" />
              </View>
              <Text style={styles.actionText}>My Profile</Text>
            </TouchableOpacity>
          </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
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
    marginBottom: 12,
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
  quickActions: {
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
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
});
