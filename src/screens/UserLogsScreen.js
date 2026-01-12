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
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

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

export default function UserLogsScreen({ navigation }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(u => 
        u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.log('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
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
    if (screen && screen !== 'UserLogs') {
      navigation.navigate(screen);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('SignIn');
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return '#DC2626';
      case 'responder': return '#059669';
      default: return '#6B7280';
    }
  };

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
            const isActive = item.id === 'user-logs';
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
        <Text style={styles.headerTitle}>User Logs</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* User Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{users.filter(u => u.role === 'user').length}</Text>
          <Text style={styles.statLabel}>Regular Users</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{users.filter(u => u.role === 'responder').length}</Text>
          <Text style={styles.statLabel}>Responders</Text>
        </View>
      </View>

      {/* Users List */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DC2626" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#9CA3AF" />
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'No registered users yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.usersContainer}>
            {filteredUsers.map((userData) => (
              <View key={userData.id} style={styles.userCard}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {userData.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{userData.displayName || 'Unknown User'}</Text>
                  <Text style={styles.userEmail}>{userData.email}</Text>
                  <Text style={styles.userDate}>Joined: {formatDate(userData.createdAt)}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(userData.role) }]}>
                  <Text style={styles.roleText}>{userData.role?.toUpperCase() || 'USER'}</Text>
                </View>
              </View>
            ))}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 44,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#DC2626',
    paddingTop: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DC2626',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
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
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  usersContainer: {
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  userDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
