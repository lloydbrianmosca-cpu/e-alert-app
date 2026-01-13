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
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';

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

export default function EmergencyHistoryScreen({ navigation }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [emergencies, setEmergencies] = useState([]);
  const [filteredEmergencies, setFilteredEmergencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const { user, logout } = useAuth();

  // Fetch emergency history from Firestore with real-time listener
  useEffect(() => {
    const unsubscribe = fetchEmergencyHistory();
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    filterEmergencies();
  }, [searchQuery, selectedFilter, emergencies]);

  const fetchEmergencyHistory = async () => {
    try {
      setIsLoading(true);
      const historyRef = collection(db, 'emergencyHistory');
      const q = query(historyRef, orderBy('createdAt', 'desc'));
      
      // Set up real-time listener for emergency updates
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const historyData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          resolvedAt: doc.data().resolvedAt?.toDate() || new Date(),
        }));
        
        setEmergencies(historyData);
        setFilteredEmergencies(historyData);
        setIsLoading(false);
      }, (error) => {
        console.log('Error listening to emergency history:', error);
        setIsLoading(false);
      });
      
      return unsubscribe;
    } catch (error) {
      console.log('Error setting up emergency history listener:', error);
      setIsLoading(false);
    }
  };

  const filterEmergencies = () => {
    let filtered = emergencies;
    
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(e => e.emergencyType === selectedFilter);
    }
    
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(e => 
        e.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.responder?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredEmergencies(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmergencyHistory();
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
    if (screen && screen !== 'EmergencyHistory') {
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

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start, end) => {
    const diff = Math.floor((end - start) / 1000 / 60);
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'fire', label: 'Fire' },
    { id: 'medical', label: 'Medical' },
    { id: 'police', label: 'Police' },
    { id: 'flood', label: 'Flood' },
  ];

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
            const isActive = item.id === 'emergency-history';
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
        <Text style={styles.headerTitle}>Emergency History</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search emergencies..."
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

      {/* Emergency List */}
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
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : filteredEmergencies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={60} color="#9CA3AF" />
            <Text style={styles.emptyText}>No emergency records found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Emergency history will appear here'}
            </Text>
          </View>
        ) : (
          <View style={styles.emergenciesContainer}>
            {filteredEmergencies.map((emergency, index) => (
              <View 
                key={`history-${emergency.id}-${index}`} 
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
                      {formatDate(emergency.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.statusText}>RESOLVED</Text>
                  </View>
                </View>
                
                <View style={styles.emergencyDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="person" size={16} color="#6B7280" />
                    <Text style={styles.detailLabel}>User:</Text>
                    <Text style={styles.detailValue}>{emergency.userName || 'Unknown'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="medkit" size={16} color="#6B7280" />
                    <Text style={styles.detailLabel}>Responder:</Text>
                    <Text style={styles.detailValue}>{emergency.responder?.name || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="timer" size={16} color="#6B7280" />
                    <Text style={styles.detailLabel}>Duration:</Text>
                    <Text style={styles.detailValue}>
                      {calculateDuration(emergency.createdAt, emergency.resolvedAt)}
                    </Text>
                  </View>
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
    backgroundColor: '#FFFFFF',
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
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  drawerLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  drawerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 3,
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
    borderBottomColor: '#F9FAFB',
  },
  drawerMenuItemActive: {
    backgroundColor: '#FEF2F2',
    borderBottomColor: '#FEF2F2',
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#DC2626',
  },
  menuButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    padding: 14,
    backgroundColor: '#DC2626',
    paddingTop: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 14,
  },
  loadingContainer: {
    padding: 50,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#9CA3AF',
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 14,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },
  emergenciesContainer: {
    gap: 10,
  },
  emergencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  emergencyTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#059669',
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
    color: '#9CA3AF',
    fontWeight: '500',
    width: 70,
  },
  detailValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
});
