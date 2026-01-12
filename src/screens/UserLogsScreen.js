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
  Modal,
  Alert,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components';

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

const ROLE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'user', label: 'Users' },
  { id: 'responder', label: 'Responders' },
  { id: 'admin', label: 'Admins' },
];

const RESPONDER_TYPE_FILTERS = [
  { id: 'all', label: 'All Types' },
  { id: 'police', label: 'Police' },
  { id: 'fireman', label: 'Fireman' },
  { id: 'medical', label: 'Medical' },
  { id: 'flood', label: 'Flood' },
];

const ROLES = ['user', 'responder', 'admin'];
const RESPONDER_TYPES = ['police', 'fireman', 'medical', 'flood'];

export default function UserLogsScreen({ navigation }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedResponderTypeFilter, setSelectedResponderTypeFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    role: 'user',
    responderType: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedRoleFilter, selectedResponderTypeFilter, users]);

  const applyFilters = () => {
    let filtered = [...users];
    
    // Apply role filter
    if (selectedRoleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === selectedRoleFilter);
    }
    
    // Apply responder type filter (only for responders)
    if (selectedResponderTypeFilter !== 'all') {
      filtered = filtered.filter(u => u.responderType === selectedResponderTypeFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(u => 
        u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredUsers(filtered);
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch from users collection
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        source: 'users',
      }));

      // Fetch from responders collection
      const respondersRef = collection(db, 'responders');
      const respondersQuery = query(respondersRef, orderBy('createdAt', 'desc'));
      const respondersSnapshot = await getDocs(respondersQuery);
      const respondersData = respondersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: 'responder',
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        source: 'responders',
      }));

      // Combine and remove duplicates by email
      const allUsers = [...usersData, ...respondersData];
      const uniqueUsers = allUsers.reduce((acc, current) => {
        const existing = acc.find(item => item.email === current.email);
        if (!existing) {
          acc.push(current);
        } else if (current.source === 'responders') {
          // Prefer responder data if exists
          const index = acc.indexOf(existing);
          acc[index] = { ...existing, ...current };
        }
        return acc;
      }, []);

      // Sort by createdAt
      uniqueUsers.sort((a, b) => b.createdAt - a.createdAt);
      
      setUsers(uniqueUsers);
      setFilteredUsers(uniqueUsers);
    } catch (error) {
      console.log('Error fetching users:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch users',
      });
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

  const getResponderTypeInfo = (type) => {
    switch (type) {
      case 'police':
        return { color: '#1E3A8A', label: 'Police', icon: 'shield-checkmark' };
      case 'fireman':
        return { color: '#DC2626', label: 'Fireman', icon: 'flame' };
      case 'medical':
        return { color: '#059669', label: 'Medical', icon: 'medkit' };
      case 'flood':
        return { color: '#0369A1', label: 'Flood', icon: 'water' };
      default:
        return { color: '#6B7280', label: 'Unknown', icon: 'person' };
    }
  };

  // CRUD Operations
  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      displayName: '',
      email: '',
      role: 'user',
      responderType: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (userData) => {
    setEditingUser(userData);
    setFormData({
      displayName: userData.displayName || '',
      email: userData.email || '',
      role: userData.role || 'user',
      responderType: userData.responderType || '',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    setFormData({
      displayName: '',
      email: '',
      role: 'user',
      responderType: '',
    });
  };

  const handleSave = async () => {
    if (!formData.displayName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Display name is required',
      });
      return;
    }

    if (!formData.email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Email is required',
      });
      return;
    }

    if (formData.role === 'responder' && !formData.responderType) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please select a responder type',
      });
      return;
    }

    setIsSaving(true);

    try {
      if (editingUser) {
        // Update existing user
        const collectionName = editingUser.source === 'responders' ? 'responders' : 'users';
        const userRef = doc(db, collectionName, editingUser.id);
        
        const updateData = {
          displayName: formData.displayName.trim(),
          email: formData.email.trim(),
          role: formData.role,
        };

        if (formData.role === 'responder') {
          updateData.responderType = formData.responderType;
        }

        await updateDoc(userRef, updateData);

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'User updated successfully',
        });
      } else {
        // Add new user
        const collectionName = formData.role === 'responder' ? 'responders' : 'users';
        const newUserData = {
          displayName: formData.displayName.trim(),
          email: formData.email.trim(),
          role: formData.role,
          createdAt: serverTimestamp(),
        };

        if (formData.role === 'responder') {
          newUserData.responderType = formData.responderType;
          newUserData.isAvailable = false;
        }

        await addDoc(collection(db, collectionName), newUserData);

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'User added successfully',
        });
      }

      closeModal();
      await fetchUsers();
    } catch (error) {
      console.log('Error saving user:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save user',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (userData) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userData.displayName || userData.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const collectionName = userData.source === 'responders' ? 'responders' : 'users';
              await deleteDoc(doc(db, collectionName, userData.id));
              
              Toast.show({
                type: 'success',
                text1: 'Deleted',
                text2: 'User deleted successfully',
              });
              
              await fetchUsers();
            } catch (error) {
              console.log('Error deleting user:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete user',
              });
            }
          },
        },
      ]
    );
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
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
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

      {/* Role Filters */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Role:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {ROLE_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                selectedRoleFilter === filter.id && styles.filterButtonActive
              ]}
              onPress={() => setSelectedRoleFilter(filter.id)}
            >
              <Text style={[
                styles.filterText,
                selectedRoleFilter === filter.id && styles.filterTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Responder Type Filters (only show when filtering responders) */}
      {(selectedRoleFilter === 'all' || selectedRoleFilter === 'responder') && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Type:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {RESPONDER_TYPE_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  selectedResponderTypeFilter === filter.id && styles.filterButtonActive
                ]}
                onPress={() => setSelectedResponderTypeFilter(filter.id)}
              >
                <Text style={[
                  styles.filterText,
                  selectedResponderTypeFilter === filter.id && styles.filterTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* User Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#6B7280' }]}>
            {users.filter(u => u.role === 'user' || !u.role).length}
          </Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#059669' }]}>
            {users.filter(u => u.role === 'responder').length}
          </Text>
          <Text style={styles.statLabel}>Responders</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#DC2626' }]}>
            {users.filter(u => u.role === 'admin').length}
          </Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.resultsCount}>
        <Text style={styles.resultsText}>
          Showing {filteredUsers.length} of {users.length} users
        </Text>
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
              {searchQuery || selectedRoleFilter !== 'all' || selectedResponderTypeFilter !== 'all'
                ? 'Try adjusting your filters' 
                : 'No registered users yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.usersContainer}>
            {filteredUsers.map((userData) => (
              <View key={`${userData.source}-${userData.id}`} style={styles.userCard}>
                <View style={styles.userCardHeader}>
                  <View style={[
                    styles.userAvatar,
                    { backgroundColor: getRoleBadgeColor(userData.role) }
                  ]}>
                    <Text style={styles.userAvatarText}>
                      {userData.displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{userData.displayName || 'Unknown User'}</Text>
                    <Text style={styles.userEmail}>{userData.email}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(userData.role) }]}>
                    <Text style={styles.roleText}>{userData.role?.toUpperCase() || 'USER'}</Text>
                  </View>
                </View>

                {/* Responder Type Badge */}
                {userData.role === 'responder' && userData.responderType && (
                  <View style={styles.responderTypeRow}>
                    <View style={[
                      styles.responderTypeBadge,
                      { backgroundColor: getResponderTypeInfo(userData.responderType).color + '20' }
                    ]}>
                      <Ionicons 
                        name={getResponderTypeInfo(userData.responderType).icon} 
                        size={14} 
                        color={getResponderTypeInfo(userData.responderType).color} 
                      />
                      <Text style={[
                        styles.responderTypeText,
                        { color: getResponderTypeInfo(userData.responderType).color }
                      ]}>
                        {getResponderTypeInfo(userData.responderType).label}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.userCardFooter}>
                  <Text style={styles.userDate}>Joined: {formatDate(userData.createdAt)}</Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => openEditModal(userData)}
                    >
                      <Ionicons name="create-outline" size={18} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDelete(userData)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingUser ? 'Edit User' : 'Add User'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Display Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter display name"
                  placeholderTextColor="#9CA3AF"
                  value={formData.displayName}
                  onChangeText={(text) => setFormData({ ...formData, displayName: text })}
                />
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter email"
                  placeholderTextColor="#9CA3AF"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Role Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role</Text>
                <View style={styles.roleSelector}>
                  {ROLES.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleSelectorButton,
                        formData.role === role && styles.roleSelectorButtonActive
                      ]}
                      onPress={() => setFormData({ ...formData, role, responderType: '' })}
                    >
                      <Text style={[
                        styles.roleSelectorText,
                        formData.role === role && styles.roleSelectorTextActive
                      ]}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Responder Type (only for responders) */}
              {formData.role === 'responder' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Responder Type</Text>
                  <View style={styles.responderTypeSelector}>
                    {RESPONDER_TYPES.map((type) => {
                      const typeInfo = getResponderTypeInfo(type);
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.responderTypeSelectorButton,
                            formData.responderType === type && {
                              backgroundColor: typeInfo.color,
                              borderColor: typeInfo.color,
                            }
                          ]}
                          onPress={() => setFormData({ ...formData, responderType: type })}
                        >
                          <Ionicons 
                            name={typeInfo.icon} 
                            size={20} 
                            color={formData.responderType === type ? '#FFFFFF' : typeInfo.color} 
                          />
                          <Text style={[
                            styles.responderTypeSelectorText,
                            formData.responderType === type && { color: '#FFFFFF' }
                          ]}>
                            {typeInfo.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingUser ? 'Update' : 'Add'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast config={toastConfig} />
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
  addButton: {
    padding: 8,
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
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 10,
  },
  filterScroll: {
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#DC2626',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  resultsCount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
  },
  resultsText: {
    fontSize: 12,
    color: '#6B7280',
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
    textAlign: 'center',
  },
  usersContainer: {
    gap: 12,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 18,
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
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
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
  responderTypeRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  responderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  responderTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  userDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  roleSelectorButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  roleSelectorButtonActive: {
    backgroundColor: '#DC2626',
  },
  roleSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleSelectorTextActive: {
    color: '#FFFFFF',
  },
  responderTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  responderTypeSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  responderTypeSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
