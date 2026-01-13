import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.55;

export default function AdminHomeScreen({ navigation }) {
  // Mock data for active emergencies
  const mockEmergencies = [
    {
      id: '1',
      emergencyType: 'fire',
      userName: 'Juan Dela Cruz',
      userEmail: 'juan.delacruz@email.com',
      createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      responder: null,
    },
    {
      id: '2',
      emergencyType: 'medical',
      userName: 'Maria Santos',
      userEmail: 'maria.santos@email.com',
      createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      responder: { name: 'Dr. Jose Rizal' },
    },
    {
      id: '3',
      emergencyType: 'police',
      userName: 'Pedro Reyes',
      userEmail: 'pedro.reyes@email.com',
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      responder: null,
    },
    {
      id: '4',
      emergencyType: 'flood',
      userName: 'Ana Garcia',
      userEmail: 'ana.garcia@email.com',
      createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      responder: { name: 'Rescue Team Alpha' },
    },
    {
      id: '5',
      emergencyType: 'fire',
      userName: 'Carlos Mendoza',
      userEmail: 'carlos.mendoza@email.com',
      createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      responder: null,
    },
  ];

  const [activeEmergencies, setActiveEmergencies] = useState(mockEmergencies);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerAnimation] = useState(new Animated.Value(-DRAWER_WIDTH));
  const { user, logout } = useAuth();

  const toggleDrawer = () => {
    if (drawerOpen) {
      Animated.timing(drawerAnimation, {
        toValue: -DRAWER_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setDrawerOpen(false));
    } else {
      setDrawerOpen(true);
      Animated.timing(drawerAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  };

  const menuItems = [
    { id: 'dashboard', title: 'Dashboard', icon: 'grid', screen: 'AdminHome' },
    { id: 'responder-signup', title: 'Responder Sign Up', icon: 'person-add', screen: 'ResponderSignUp' },
    { id: 'user-logs', title: 'User Logs', icon: 'list', screen: 'UserLogs' },
    { id: 'emergency-history', title: 'Emergency History', icon: 'time', screen: 'EmergencyHistory' },
    { id: 'realtime-monitoring', title: 'Real Time Monitoring', icon: 'pulse', screen: 'RealtimeMonitoring' },
    { id: 'responder-management', title: 'Responder Management', icon: 'people-circle', screen: 'ResponderManagement' },
  ];

  const handleMenuPress = (screen) => {
    toggleDrawer();
    if (screen !== 'AdminHome') {
      navigation.navigate(screen);
    }
  };

  // Fetch active emergencies
  useEffect(() => {
    const emergenciesRef = collection(db, 'activeEmergencies');
    const q = query(emergenciesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const emergencies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      setActiveEmergencies(emergencies);
      setIsLoading(false);
    }, (error) => {
      console.log('Error fetching emergencies:', error);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Fetch total users count
  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        setTotalUsers(snapshot.size);
      } catch (error) {
        console.log('Error fetching user count:', error);
      }
    };
    fetchUserCount();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Data refreshes automatically via onSnapshot
    setTimeout(() => setRefreshing(false), 1000);
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
    const diff = Math.floor((now - date) / 1000 / 60); // minutes
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={toggleDrawer}>
          <Ionicons name="menu" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.greeting}>Admin Dashboard</Text>
          <Text style={styles.welcomeText}>Welcome, {user?.displayName || 'Admin'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

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
          { transform: [{ translateX: drawerAnimation }] }
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
            const isActive = item.id === 'dashboard';
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

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#DC2626' }]}>
            <Ionicons name="warning" size={32} color="#FFFFFF" />
            <Text style={styles.statNumber}>{activeEmergencies.length}</Text>
            <Text style={styles.statLabel}>Active Emergencies</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#059669' }]}>
            <Ionicons name="people" size={32} color="#FFFFFF" />
            <Text style={styles.statNumber}>{totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
        </View>

        {/* Active Emergencies Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Emergencies</Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DC2626" />
            </View>
          ) : activeEmergencies.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#10B981" />
              <Text style={styles.emptyText}>No Active Emergencies</Text>
              <Text style={styles.emptySubtext}>All clear! No emergencies at this time.</Text>
            </View>
          ) : (
            <View style={styles.emergenciesContainer}>
              {activeEmergencies.slice(0, 3).map((emergency, index) => (
                <View 
                  key={`emergency-${emergency.id}-${index}`} 
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
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>ACTIVE</Text>
                    </View>
                  </View>
                  
                  <View style={styles.emergencyDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="person" size={16} color="#6B7280" />
                      <Text style={styles.detailLabel}>User:</Text>
                      <Text style={styles.detailValue}>{emergency.userName || 'Unknown'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="mail" size={16} color="#6B7280" />
                      <Text style={styles.detailLabel}>Email:</Text>
                      <Text style={styles.detailValue}>{emergency.userEmail || 'N/A'}</Text>
                    </View>
                    {emergency.responder && (
                      <View style={styles.detailRow}>
                        <Ionicons name="medkit" size={16} color="#6B7280" />
                        <Text style={styles.detailLabel}>Responder:</Text>
                        <Text style={styles.detailValue}>{emergency.responder.name}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
              
              {activeEmergencies.length > 3 && (
                <TouchableOpacity style={styles.seeAllButton}>
                  <Text style={styles.seeAllText}>See All ({activeEmergencies.length})</Text>
                  <Ionicons name="chevron-forward" size={18} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('UserLogs')}>
              <Ionicons name="list" size={28} color="#DC2626" />
              <Text style={styles.actionText}>Manage User</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('ResponderSignUp')}>
              <Ionicons name="person-add" size={28} color="#DC2626" />
              <Text style={styles.actionText}>Register Responder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('ResponderManagement')}>
              <Ionicons name="people-circle" size={28} color="#DC2626" />
              <Text style={styles.actionText}>Manage Responders</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 15,
    paddingBottom: 20,
    backgroundColor: '#DC2626',
  },
  menuButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  logoutButton: {
    padding: 10,
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
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginRight: 4,
  },
  emergencyCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
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
    width: 70,
  },
  detailValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    textAlign: 'center',
  },
});
