import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.55;

const menuItems = [
  { id: 'dashboard', title: 'Dashboard', icon: 'grid', screen: 'AdminHome' },
  { id: 'responder-signup', title: 'Responder Sign Up', icon: 'person-add', screen: 'ResponderSignUp' },
  { id: 'user-logs', title: 'User Logs', icon: 'list', screen: 'UserLogs' },
  { id: 'emergency-history', title: 'Emergency History', icon: 'time', screen: 'EmergencyHistory' },
  { id: 'realtime-monitoring', title: 'Real Time Monitoring', icon: 'pulse', screen: 'RealtimeMonitoring' },
  { id: 'responder-management', title: 'Responder Management', icon: 'people-circle', screen: 'ResponderManagement' },
];

export default function RealtimeMonitoringScreen({ navigation }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { user, logout } = useAuth();

  // Fetch active emergencies from Firestore with real-time updates
  useEffect(() => {
    setIsLoading(true);
    const emergenciesRef = collection(db, 'activeEmergencies');
    
    const unsubscribe = onSnapshot(emergenciesRef, (snapshot) => {
      const emergenciesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      
      // Sort by createdAt (newest first)
      emergenciesData.sort((a, b) => b.createdAt - a.createdAt);
      
      setActiveEmergencies(emergenciesData);
      setIsLoading(false);
    }, (error) => {
      console.log('Error fetching emergencies:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Pulse animation for active emergencies
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // In real app, data refreshes via onSnapshot
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleDrawer = () => {
    const toValue = drawerOpen ? -DRAWER_WIDTH : 0;
    Animated.timing(drawerAnim, {
      toValue,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setDrawerOpen(!drawerOpen);
  };

  const handleMenuPress = (screen) => {
    toggleDrawer();
    if (screen && screen !== 'RealtimeMonitoring') {
      navigation.navigate(screen);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('SignIn');
  };

  const getEmergencyColor = (type) => {
    switch (type) {
      case 'police': return '#1E3A8A';
      case 'fire': return '#DC2626';
      case 'medical': return '#059669';
      case 'flood': return '#0369A1';
      default: return '#6B7280';
    }
  };

  const getEmergencyIcon = (type) => {
    switch (type) {
      case 'police': return 'local-police';
      case 'fire': return 'local-fire-department';
      case 'medical': return 'medical-services';
      case 'flood': return 'flood';
      default: return 'warning';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    return `${Math.floor(diff / 60)} hr ago`;
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { color: '#DC2626', bgColor: '#FEE2E2', text: 'PENDING', icon: 'alert-circle' };
      case 'responding':
        return { color: '#F59E0B', bgColor: '#FEF3C7', text: 'RESPONDING', icon: 'car' };
      case 'on-scene':
        return { color: '#059669', bgColor: '#D1FAE5', text: 'ON SCENE', icon: 'location' };
      default:
        return { color: '#6B7280', bgColor: '#F3F4F6', text: 'UNKNOWN', icon: 'help-circle' };
    }
  };

  const pendingCount = activeEmergencies.filter(e => e.status === 'pending').length;
  const respondingCount = activeEmergencies.filter(e => e.status === 'responding').length;

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

      {/* Drawer Overlay */}
      {drawerOpen && (
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={toggleDrawer}
        />
      )}

      {/* Navigation Drawer */}
      <Animated.View 
        style={[
          styles.drawer,
          { transform: [{ translateX: drawerAnim }] }
        ]}
      >
        <View style={styles.drawerHeader}>
          <View style={styles.drawerLogoContainer}>
            <Ionicons name="shield-checkmark" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.drawerTitle}>E-Alert Admin</Text>
          <Text style={styles.drawerSubtitle}>{user?.email}</Text>
        </View>
        
        <ScrollView style={styles.drawerMenu}>
          {menuItems.map((item) => {
            const isActive = item.id === 'realtime-monitoring';
            return (
              <TouchableOpacity 
                key={item.id}
                style={[styles.drawerMenuItem, isActive && styles.drawerMenuItemActive]}
                onPress={() => handleMenuPress(item.screen)}
              >
                <Ionicons name={item.icon} size={24} color="#DC2626" />
                <Text style={[styles.drawerMenuText, isActive && styles.drawerMenuTextActive]}>{item.title}</Text>
                {!isActive && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.drawerFooter}>
          <TouchableOpacity style={styles.drawerLogout} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
            <Text style={styles.drawerLogoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={toggleDrawer}>
          <Ionicons name="menu" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Real-time Monitoring</Text>
          <View style={styles.liveIndicator}>
            <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#DC2626' }]}>
          <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
          <Ionicons name="car" size={24} color="#FFFFFF" />
          <Text style={styles.statNumber}>{respondingCount}</Text>
          <Text style={styles.statLabel}>Responding</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#059669' }]}>
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          <Text style={styles.statNumber}>{activeEmergencies.length}</Text>
          <Text style={styles.statLabel}>Total Active</Text>
        </View>
      </View>

      {/* Emergency List */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Active Emergencies</Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DC2626" />
            <Text style={styles.loadingText}>Loading emergencies...</Text>
          </View>
        ) : activeEmergencies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={60} color="#059669" />
            <Text style={styles.emptyText}>No Active Emergencies</Text>
            <Text style={styles.emptySubtext}>All clear! No emergencies at this time.</Text>
          </View>
        ) : (
          <View style={styles.emergenciesContainer}>
            {activeEmergencies.map((emergency) => {
              const statusInfo = getStatusInfo(emergency.status);
              return (
                <View 
                  key={emergency.id} 
                  style={[
                    styles.emergencyCard,
                    { borderLeftColor: getEmergencyColor(emergency.emergencyType) }
                  ]}
                >
                  <View style={styles.emergencyHeader}>
                    <View style={[
                      styles.emergencyIconContainer,
                      { backgroundColor: getEmergencyColor(emergency.emergencyType) }
                    ]}>
                      <MaterialIcons 
                        name={getEmergencyIcon(emergency.emergencyType)} 
                        size={24} 
                        color="#FFFFFF" 
                      />
                    </View>
                    <View style={styles.emergencyInfo}>
                      <Text style={styles.emergencyType}>
                        {emergency.emergencyType?.toUpperCase()} EMERGENCY
                      </Text>
                      <Text style={styles.emergencyTime}>
                        {formatTime(emergency.createdAt)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                      <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.text}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.emergencyDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="person" size={16} color="#6B7280" />
                      <Text style={styles.detailLabel}>Reporter:</Text>
                      <Text style={styles.detailValue}>{emergency.userName || 'Unknown'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="location" size={16} color="#6B7280" />
                      <Text style={styles.detailLabel}>Location:</Text>
                      <Text style={styles.detailValue}>{emergency.location || 'N/A'}</Text>
                    </View>
                    {emergency.responder && (
                      <View style={styles.detailRow}>
                        <Ionicons name="medkit" size={16} color="#6B7280" />
                        <Text style={styles.detailLabel}>Responder:</Text>
                        <Text style={styles.detailValue}>{emergency.responder.name}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.viewButton}>
                      <Ionicons name="eye" size={18} color="#DC2626" />
                      <Text style={styles.viewButtonText}>View Details</Text>
                    </TouchableOpacity>
                    {!emergency.responder && (
                      <TouchableOpacity style={styles.assignButton}>
                        <Ionicons name="person-add" size={18} color="#FFFFFF" />
                        <Text style={styles.assignButtonText}>Assign</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#FFFFFF',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    backgroundColor: '#DC2626',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  drawerLogoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  drawerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  drawerMenu: {
    flex: 1,
    paddingTop: 10,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerMenuItemActive: {
    backgroundColor: '#FEE2E2',
    borderBottomColor: '#FEE2E2',
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 15,
  },
  drawerMenuTextActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  drawerLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  drawerLogoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#DC2626',
  },
  menuButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 44,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  emergenciesContainer: {
    gap: 12,
    paddingBottom: 20,
  },
  emergencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  emergencyTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emergencyDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    width: 80,
  },
  detailValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
    gap: 6,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  assignButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    gap: 6,
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
