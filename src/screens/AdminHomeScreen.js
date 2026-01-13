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
  const [pendingVerifications, setPendingVerifications] = useState([]);
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

  // Fetch pending ID verifications
  useEffect(() => {
    const fetchPendingVerifications = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('updatedAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const pending = [];
          snapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.validIDImage && userData.verificationStatus === 'pending') {
              pending.push({
                id: doc.id,
                ...userData,
              });
            }
          });
          setPendingVerifications(pending);
        });

        return unsubscribe;
      } catch (error) {
        console.log('Error fetching pending verifications:', error);
      }
    };

    const unsubscribe = fetchPendingVerifications();
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
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
          <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="document" size={32} color="#FFFFFF" />
            <Text style={styles.statNumber}>{pendingVerifications.length}</Text>
            <Text style={styles.statLabel}>Pending Verifications</Text>
          </View>
        </View>

        {/* Pending Verifications Section */}
        {pendingVerifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending ID Verifications</Text>
            
            <View style={styles.verificationsContainer}>
              {pendingVerifications.slice(0, 5).map((user, index) => (
                <View key={`${user.id}-${index}`} style={styles.verificationCard}>
                  <View style={styles.verificationHeader}>
                    <View style={styles.userInitials}>
                      <Text style={styles.initialsText}>
                        {(user.firstName?.[0] || 'U') + (user.lastName?.[0] || 'U')}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {user.firstName} {user.lastName}
                      </Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                    <View style={styles.pendingBadgeAdmin}>
                      <Ionicons name="time" size={14} color="#F59E0B" />
                      <Text style={styles.pendingText}>PENDING</Text>
                    </View>
                  </View>
                  <View style={styles.verificationActions}>
                    <TouchableOpacity style={[styles.verifyButton, styles.approveButton]}>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.verifyButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.verifyButton, styles.rejectButton]}>
                      <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.verifyButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginLeft: 12,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  welcomeText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  drawerHeader: {
    backgroundColor: '#DC2626',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  drawerLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  drawerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  drawerMenu: {
    flex: 1,
    paddingTop: 8,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerMenuItemActive: {
    backgroundColor: '#FEF2F2',
    borderBottomColor: '#FEF2F2',
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 14,
  },
  drawerMenuTextActive: {
    color: '#DC2626',
    fontWeight: '600',
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  drawerLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  drawerLogoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  emergenciesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  verificationsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  verificationCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInitials: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  initialsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  pendingBadgeAdmin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
  },
  pendingText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '600',
  },
  verificationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  verifyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  verifyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  emergencyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyInfo: {
    flex: 1,
    marginLeft: 10,
  },
  emergencyType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  emergencyTime: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DC2626',
  },
  emergencyDetails: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    width: 65,
  },
  detailValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 6,
    textAlign: 'center',
  },
});
