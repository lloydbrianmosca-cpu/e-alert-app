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
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
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
      await updateDoc(responderRef, {
        isAvailable: !currentStatus,
      });
      
      // Update local state
      setResponders(prev => 
        prev.map(r => 
          r.id === responderId ? { ...r, isAvailable: !currentStatus } : r
        )
      );

      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: `Responder is now ${!currentStatus ? 'available' : 'unavailable'}`,
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

  const availableCount = responders.filter(r => r.isAvailable).length;
  const unavailableCount = responders.filter(r => !r.isAvailable).length;

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
                      value={responder.isAvailable}
                      onValueChange={() => toggleAvailability(responder.id, responder.isAvailable)}
                      trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
                      thumbColor={responder.isAvailable ? '#059669' : '#9CA3AF'}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
});
