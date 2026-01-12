import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { 
  getStatistics, 
  getAllEmergencies, 
  getAllUsers,
  updateUserRole,
  updateEmergencyStatus,
  USER_ROLES 
} from '../services/firestore';

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

export default function AdminDashboardScreen({ navigation }) {
  const { user, userProfile, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [emergencies, setEmergencies] = useState([]);
  const [users, setUsers] = useState([]);

  const fetchData = async () => {
    try {
      const [statsResult, emergenciesResult, usersResult] = await Promise.all([
        getStatistics(),
        getAllEmergencies(),
        getAllUsers(),
      ]);

      if (statsResult.success) setStats(statsResult.data);
      if (emergenciesResult.success) setEmergencies(emergenciesResult.data);
      if (usersResult.success) setUsers(usersResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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
            // Navigation happens automatically via AuthContext
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

  const handleUpdateRole = async (userId, newRole) => {
    Alert.alert(
      'Update Role',
      `Change user role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm',
          onPress: async () => {
            const result = await updateUserRole(userId, newRole);
            if (result.success) {
              fetchData();
            }
          }
        },
      ]
    );
  };

  const renderDashboard = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
          <Ionicons name="people" size={32} color="#4F46E5" />
          <Text style={[styles.statNumber, { color: '#4F46E5' }]}>
            {stats?.totalUsers || 0}
          </Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
          <Ionicons name="alert-circle" size={32} color="#DC2626" />
          <Text style={[styles.statNumber, { color: '#DC2626' }]}>
            {stats?.totalEmergencies || 0}
          </Text>
          <Text style={styles.statLabel}>Emergencies</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
          <Ionicons name="shield-checkmark" size={32} color="#059669" />
          <Text style={[styles.statNumber, { color: '#059669' }]}>
            {stats?.totalResponders || 0}
          </Text>
          <Text style={styles.statLabel}>Responders</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="time" size={32} color="#D97706" />
          <Text style={[styles.statNumber, { color: '#D97706' }]}>
            {stats?.emergenciesByStatus?.pending || 0}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Emergency Status Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Status</Text>
        <View style={styles.statusOverview}>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS.pending }]} />
            <Text style={styles.statusText}>Pending: {stats?.emergenciesByStatus?.pending || 0}</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS.assigned }]} />
            <Text style={styles.statusText}>Assigned: {stats?.emergenciesByStatus?.assigned || 0}</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS.in_progress }]} />
            <Text style={styles.statusText}>In Progress: {stats?.emergenciesByStatus?.inProgress || 0}</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS.resolved }]} />
            <Text style={styles.statusText}>Resolved: {stats?.emergenciesByStatus?.resolved || 0}</Text>
          </View>
        </View>
      </View>

      {/* Recent Emergencies */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Emergencies</Text>
          <TouchableOpacity onPress={() => setActiveTab('emergencies')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {emergencies.slice(0, 5).map((emergency) => (
          <View key={emergency.id} style={styles.emergencyCard}>
            <View style={[styles.emergencyTypeIcon, { backgroundColor: EMERGENCY_COLORS[emergency.type] || '#6B7280' }]}>
              <MaterialIcons 
                name={emergency.type === 'police' ? 'local-police' : 
                      emergency.type === 'medical' ? 'medical-services' :
                      emergency.type === 'fire' ? 'local-fire-department' : 'flood'} 
                size={20} 
                color="#FFFFFF" 
              />
            </View>
            <View style={styles.emergencyInfo}>
              <Text style={styles.emergencyType}>{emergency.type?.toUpperCase()}</Text>
              <Text style={styles.emergencyUser}>{emergency.userName || 'Unknown User'}</Text>
              <Text style={styles.emergencyTime}>
                {emergency.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[emergency.status] || '#6B7280' }]}>
              <Text style={styles.statusBadgeText}>{emergency.status}</Text>
            </View>
          </View>
        ))}
        {emergencies.length === 0 && (
          <Text style={styles.emptyText}>No emergencies yet</Text>
        )}
      </View>
    </ScrollView>
  );

  const renderEmergencies = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.pageTitle}>All Emergencies</Text>
      {emergencies.map((emergency) => (
        <View key={emergency.id} style={styles.fullEmergencyCard}>
          <View style={styles.emergencyCardHeader}>
            <View style={[styles.emergencyTypeIcon, { backgroundColor: EMERGENCY_COLORS[emergency.type] || '#6B7280' }]}>
              <MaterialIcons 
                name={emergency.type === 'police' ? 'local-police' : 
                      emergency.type === 'medical' ? 'medical-services' :
                      emergency.type === 'fire' ? 'local-fire-department' : 'flood'} 
                size={24} 
                color="#FFFFFF" 
              />
            </View>
            <View style={styles.emergencyInfoFull}>
              <Text style={styles.emergencyTypeFull}>{emergency.type?.toUpperCase()} Emergency</Text>
              <Text style={styles.emergencyUserFull}>{emergency.userName || 'Unknown User'}</Text>
            </View>
            <View style={[styles.statusBadgeFull, { backgroundColor: STATUS_COLORS[emergency.status] || '#6B7280' }]}>
              <Text style={styles.statusBadgeTextFull}>{emergency.status}</Text>
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
            {emergency.responderId && (
              <View style={styles.detailRow}>
                <Ionicons name="person" size={16} color="#6B7280" />
                <Text style={styles.detailText}>
                  Responder: {emergency.responderData?.name || 'Assigned'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.emergencyActions}>
            {emergency.status === 'pending' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                onPress={() => handleUpdateStatus(emergency.id, 'assigned')}
              >
                <Text style={styles.actionBtnText}>Assign</Text>
              </TouchableOpacity>
            )}
            {emergency.status === 'assigned' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
                onPress={() => handleUpdateStatus(emergency.id, 'in_progress')}
              >
                <Text style={styles.actionBtnText}>Start</Text>
              </TouchableOpacity>
            )}
            {emergency.status === 'in_progress' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => handleUpdateStatus(emergency.id, 'resolved')}
              >
                <Text style={styles.actionBtnText}>Resolve</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#6B7280' }]}
              onPress={() => handleUpdateStatus(emergency.id, 'cancelled')}
            >
              <Text style={styles.actionBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {emergencies.length === 0 && (
        <Text style={styles.emptyText}>No emergencies found</Text>
      )}
    </ScrollView>
  );

  const renderUsers = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.pageTitle}>All Users</Text>
      {users.map((u) => (
        <View key={u.id} style={styles.userCard}>
          <Image
            source={{ uri: u.avatar || `https://i.pravatar.cc/150?u=${u.id}` }}
            style={styles.userAvatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{u.fullName || 'No Name'}</Text>
            <Text style={styles.userEmail}>{u.email}</Text>
            <View style={[styles.roleBadge, { 
              backgroundColor: u.role === 'admin' ? '#DC2626' : 
                              u.role === 'responder' ? '#059669' : '#3B82F6' 
            }]}>
              <Text style={styles.roleBadgeText}>{u.role?.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.userActions}>
            {u.role !== 'admin' && (
              <TouchableOpacity 
                style={styles.roleBtn}
                onPress={() => {
                  Alert.alert(
                    'Change Role',
                    'Select new role:',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'User', onPress: () => handleUpdateRole(u.id, USER_ROLES.USER) },
                      { text: 'Responder', onPress: () => handleUpdateRole(u.id, USER_ROLES.RESPONDER) },
                      { text: 'Admin', onPress: () => handleUpdateRole(u.id, USER_ROLES.ADMIN) },
                    ]
                  );
                }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
      {users.length === 0 && (
        <Text style={styles.emptyText}>No users found</Text>
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#B91C1C" />

      {/* Header - Matching User Home Screen */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerGreeting}>Hello, <Text style={styles.headerRole}>Admin</Text></Text>
            <Text style={styles.headerName}>{userProfile?.fullName || 'Administrator'}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.avatarContainer}>
            <Image
              source={{ uri: userProfile?.avatar || `https://i.pravatar.cc/150?u=${user?.uid}` }}
              style={styles.avatar}
            />
            <View style={styles.onlineIndicator} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Ionicons name="grid" size={20} color={activeTab === 'dashboard' ? '#DC2626' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'emergencies' && styles.tabActive]}
          onPress={() => setActiveTab('emergencies')}
        >
          <Ionicons name="alert-circle" size={20} color={activeTab === 'emergencies' ? '#DC2626' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'emergencies' && styles.tabTextActive]}>Emergencies</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons name="people" size={20} color={activeTab === 'users' ? '#DC2626' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Users</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'emergencies' && renderEmergencies()}
      {activeTab === 'users' && renderUsers()}
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
  header: {
    backgroundColor: '#DC2626',
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  headerRole: {
    fontWeight: '700',
  },
  headerName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FEE2E2',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#DC2626',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  statusOverview: {
    gap: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#4B5563',
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
  },
  emergencyTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  emergencyUser: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  emergencyTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
  },
  fullEmergencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  emergencyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyInfoFull: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTypeFull: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  emergencyUserFull: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadgeFull: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeTextFull: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  emergencyDetails: {
    marginTop: 12,
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
  detailText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  emergencyActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userActions: {
    marginLeft: 8,
  },
  roleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
