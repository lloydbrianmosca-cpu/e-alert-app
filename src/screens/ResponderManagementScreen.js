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
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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

export default function ResponderManagementScreen({ navigation }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [responders, setResponders] = useState([]);
  const [filteredResponders, setFilteredResponders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const { user, logout } = useAuth();

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResponder, setEditingResponder] = useState(null);
  const [editData, setEditData] = useState({
    displayName: '',
    email: '',
    contactNumber: '',
    responderType: '',
    stationName: '',
    hotlineNumber: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchResponders();
  }, []);

  useEffect(() => {
    filterResponders();
  }, [searchQuery, selectedFilter, responders]);

  const fetchResponders = async () => {
    try {
      setIsLoading(true);
      const respondersRef = collection(db, 'responders');
      const q = query(respondersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const respondersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      setResponders(respondersData);
      setFilteredResponders(respondersData);
    } catch (error) {
      console.log('Error fetching responders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterResponders = () => {
    let filtered = responders;
    
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(r => r.responderType === selectedFilter);
    }
    
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(r => 
        r.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredResponders(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchResponders();
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
    if (screen && screen !== 'ResponderManagement') {
      navigation.navigate(screen);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('SignIn');
  };

  const toggleAvailability = async (responderId, currentStatus) => {
    try {
      const responderRef = doc(db, 'responders', responderId);
      const newStatus = !currentStatus;
      await updateDoc(responderRef, {
        isAvailable: newStatus,
        updatedAt: new Date().toISOString(),
      });
      
      // Update local state
      setResponders(prev => 
        prev.map(r => 
          r.id === responderId ? { ...r, isAvailable: newStatus } : r
        )
      );

      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: `Responder is now ${newStatus ? 'Available' : 'Unavailable'}`,
      });
    } catch (error) {
      console.log('Error updating availability:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Could not update responder status',
      });
    }
  };

  // Open edit modal
  const handleEditResponder = (responder) => {
    setEditingResponder(responder);
    setEditData({
      displayName: responder.displayName || '',
      email: responder.email || '',
      contactNumber: responder.contactNumber || '',
      responderType: responder.responderType || '',
      stationName: responder.stationName || '',
      hotlineNumber: responder.hotlineNumber || '',
    });
    setShowEditModal(true);
  };

  // Save edited responder
  const handleSaveEdit = async () => {
    if (!editingResponder?.id) return;

    // Validate required fields
    if (!editData.displayName?.trim() || !editData.email?.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields',
        text2: 'Name and Email are required',
      });
      return;
    }

    setIsSaving(true);
    try {
      const responderRef = doc(db, 'responders', editingResponder.id);
      await updateDoc(responderRef, {
        displayName: editData.displayName.trim(),
        email: editData.email.trim(),
        contactNumber: editData.contactNumber?.trim() || '',
        responderType: editData.responderType || '',
        stationName: editData.stationName?.trim() || '',
        hotlineNumber: editData.hotlineNumber?.trim() || '',
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      setResponders(prev =>
        prev.map(r =>
          r.id === editingResponder.id
            ? { ...r, ...editData, updatedAt: new Date().toISOString() }
            : r
        )
      );

      setShowEditModal(false);
      setEditingResponder(null);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Responder updated successfully',
      });
    } catch (error) {
      console.log('Error updating responder:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Could not update responder',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete responder
  const handleDeleteResponder = (responder) => {
    Alert.alert(
      'Delete Responder',
      `Are you sure you want to delete ${responder.displayName || 'this responder'}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const responderRef = doc(db, 'responders', responder.id);
              await deleteDoc(responderRef);

              // Update local state
              setResponders(prev => prev.filter(r => r.id !== responder.id));

              Toast.show({
                type: 'success',
                text1: 'Deleted',
                text2: 'Responder has been removed',
              });
            } catch (error) {
              console.log('Error deleting responder:', error);
              Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: 'Could not delete responder',
              });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getResponderTypeInfo = (type) => {
    switch (type) {
      case 'police':
        return { color: '#1E3A8A', bgColor: '#DBEAFE', icon: 'shield-checkmark', label: 'Police' };
      case 'fireman':
        return { color: '#DC2626', bgColor: '#FEE2E2', icon: 'flame', label: 'Fireman' };
      case 'medical':
        return { color: '#059669', bgColor: '#D1FAE5', icon: 'medkit', label: 'Medical' };
      case 'flood':
        return { color: '#0369A1', bgColor: '#E0F2FE', icon: 'water', label: 'Flood Response' };
      default:
        return { color: '#6B7280', bgColor: '#F3F4F6', icon: 'person', label: 'Unknown' };
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'police', label: 'Police' },
    { id: 'fireman', label: 'Fireman' },
    { id: 'medical', label: 'Medical' },
    { id: 'flood', label: 'Flood' },
  ];

  const availableCount = responders.filter(r => r.isAvailable === true).length;
  const unavailableCount = responders.filter(r => r.isAvailable !== true).length;

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
            const isActive = item.id === 'responder-management';
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
        <Text style={styles.headerTitle}>Responder Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('ResponderSignUp')}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search responders..."
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

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{responders.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#059669' }]}>{availableCount}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#DC2626' }]}>{unavailableCount}</Text>
          <Text style={styles.statLabel}>Unavailable</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                selectedFilter === filter.id && styles.filterButtonActive
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Text style={[
                styles.filterText,
                selectedFilter === filter.id && styles.filterTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Responders List */}
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
            <Text style={styles.loadingText}>Loading responders...</Text>
          </View>
        ) : filteredResponders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#9CA3AF" />
            <Text style={styles.emptyText}>No responders found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Register responders to see them here'}
            </Text>
            <TouchableOpacity 
              style={styles.addResponderButton}
              onPress={() => navigation.navigate('ResponderSignUp')}
            >
              <Ionicons name="person-add" size={20} color="#FFFFFF" />
              <Text style={styles.addResponderText}>Add Responder</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.respondersContainer}>
            {filteredResponders.map((responder) => {
              const typeInfo = getResponderTypeInfo(responder.responderType);
              return (
                <View key={responder.id} style={styles.responderCard}>
                  <View style={styles.responderHeader}>
                    <View style={[styles.responderAvatar, { backgroundColor: typeInfo.bgColor }]}>
                      <Ionicons name={typeInfo.icon} size={24} color={typeInfo.color} />
                    </View>
                    <View style={styles.responderInfo}>
                      <Text style={styles.responderName}>
                        {responder.displayName || 'Unknown'}
                      </Text>
                      <Text style={styles.responderEmail}>{responder.email}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: typeInfo.bgColor }]}>
                        <Text style={[styles.typeText, { color: typeInfo.color }]}>
                          {typeInfo.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.responderDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>
                        Joined: {formatDate(responder.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.availabilityRow}>
                    <View style={styles.availabilityInfo}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: responder.isAvailable ? '#059669' : '#DC2626' }
                      ]} />
                      <Text style={styles.availabilityText}>
                        {responder.isAvailable ? 'Available' : 'Unavailable'}
                      </Text>
                    </View>
                    <Switch
                      value={responder.isAvailable === true}
                      onValueChange={() => toggleAvailability(responder.id, responder.isAvailable)}
                      trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
                      thumbColor={responder.isAvailable ? '#059669' : '#9CA3AF'}
                    />
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditResponder(responder)}
                    >
                      <Ionicons name="pencil" size={18} color="#3B82F6" />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteResponder(responder)}
                      disabled={isDeleting}
                    >
                      <Ionicons name="trash" size={18} color="#DC2626" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Responder</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setEditingResponder(null);
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Display Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editData.displayName}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, displayName: text }))}
                  placeholder="Enter name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editData.email}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, email: text }))}
                  placeholder="Enter email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editData.contactNumber}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, contactNumber: text }))}
                  placeholder="Enter contact number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Responder Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editData.responderType}
                    onValueChange={(value) => setEditData(prev => ({ ...prev, responderType: value }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Type" value="" />
                    <Picker.Item label="Police" value="police" />
                    <Picker.Item label="Fireman" value="fireman" />
                    <Picker.Item label="Medical" value="medical" />
                    <Picker.Item label="Flood Response" value="flood" />
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Station Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editData.stationName}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, stationName: text }))}
                  placeholder="Enter station name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hotline Number</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editData.hotlineNumber}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, hotlineNumber: text }))}
                  placeholder="Enter hotline number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingResponder(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
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
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#DC2626',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
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
  addResponderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  addResponderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  respondersContainer: {
    gap: 12,
  },
  responderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  responderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  responderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  responderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  responderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  responderEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  responderDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#DC2626',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    minWidth: 120,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
