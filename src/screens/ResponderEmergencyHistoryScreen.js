import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Dimensions,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const { width } = Dimensions.get('window');

// Bottom navigation items - unified with responder screens
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
  { id: 'history', name: 'History', icon: 'time', iconFamily: 'Ionicons' },
  { id: 'chat', name: 'Chat', icon: 'chatbubbles', iconFamily: 'Ionicons' },
  { id: 'profile', name: 'Profile', icon: 'person', iconFamily: 'Ionicons' },
];

// Primary color - unified with user screens
const PRIMARY_COLOR = '#DC2626';

// Responder type colors
const RESPONDER_COLORS = {
  police: '#1E3A8A',
  medical: '#059669',
  fireman: '#DC2626',
  rescue: '#0369A1',
  fire: '#DC2626',
  flood: '#0369A1',
};

export default function ResponderEmergencyHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [emergencies, setEmergencies] = useState([]);
  const [filteredEmergencies, setFilteredEmergencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Listen for emergency history
  useEffect(() => {
    if (!user?.uid) {
      setEmergencies([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'emergencyHistory'),
      where('completedBy', '==', user.uid),
      orderBy('completedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt) || new Date(),
        completedAt: doc.data().completedAt?.toDate?.() || new Date(doc.data().completedAt) || new Date(),
      }));
      setEmergencies(history);
      setFilteredEmergencies(history);
      setIsLoading(false);
    }, (error) => {
      if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
        setEmergencies([]);
        setFilteredEmergencies([]);
      }
      console.log('Error listening to emergency history:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Filter emergencies when search or filter changes
  useEffect(() => {
    filterEmergencies();
  }, [searchQuery, selectedFilter, emergencies]);

  const filterEmergencies = () => {
    let filtered = emergencies;

    if (selectedFilter !== 'all') {
      filtered = filtered.filter((e) => 
        (e.emergencyType || e.type)?.toLowerCase() === selectedFilter.toLowerCase()
      );
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((e) =>
        e.userName?.toLowerCase().includes(query) ||
        e.userEmail?.toLowerCase().includes(query) ||
        e.userAddress?.toLowerCase().includes(query) ||
        (e.emergencyType || e.type)?.toLowerCase().includes(query)
      );
    }

    setFilteredEmergencies(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    // The onSnapshot will automatically refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
    switch (tabId) {
      case 'home':
        navigation.navigate('ResponderHome');
        break;
      case 'locations':
        navigation.navigate('ResponderLocations');
        break;
      case 'history':
        break;
      case 'chat':
        navigation.navigate('ResponderChats');
        break;
      case 'profile':
        navigation.navigate('ResponderProfile');
        break;
    }
  };

  const getEmergencyColor = (type) => {
    const normalizedType = type?.toLowerCase();
    switch (normalizedType) {
      case 'police': return '#1E3A8A';
      case 'fire':
      case 'fireman': return '#DC2626';
      case 'medical': return '#059669';
      case 'flood':
      case 'rescue': return '#0369A1';
      default: return '#6B7280';
    }
  };

  const getEmergencyIcon = (type) => {
    const normalizedType = type?.toLowerCase();
    switch (normalizedType) {
      case 'police': return 'local-police';
      case 'fire':
      case 'fireman': return 'local-fire-department';
      case 'medical': return 'medical-services';
      case 'flood':
      case 'rescue': return 'flood';
      default: return 'warning';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);
    const diff = Math.floor((endDate - startDate) / 1000 / 60);
    if (diff < 0) return 'N/A';
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
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="time" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Emergency History</Text>
        </View>
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

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{emergencies.length}</Text>
          <Text style={styles.statLabel}>Total Responded</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {emergencies.filter(e => {
              const date = e.completedAt instanceof Date ? e.completedAt : new Date(e.completedAt);
              return date.toDateString() === new Date().toDateString();
            }).length}
          </Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {emergencies.filter(e => {
              const date = e.completedAt instanceof Date ? e.completedAt : new Date(e.completedAt);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return date >= weekAgo;
            }).length}
          </Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>

      {/* Emergency List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY_COLOR]} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : filteredEmergencies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={60} color="#9CA3AF" />
            <Text style={styles.emptyText}>No emergency records found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Completed emergencies will appear here'}
            </Text>
          </View>
        ) : (
          <View style={styles.emergenciesContainer}>
            {filteredEmergencies.map((emergency, index) => (
              <View
                key={`responder-history-${emergency.id}-${index}`}
                style={[
                  styles.emergencyCard,
                  { borderLeftColor: getEmergencyColor(emergency.emergencyType || emergency.type) }
                ]}
              >
                <View style={styles.emergencyHeader}>
                  <View style={[
                    styles.emergencyIconContainer,
                    { backgroundColor: getEmergencyColor(emergency.emergencyType || emergency.type) }
                  ]}>
                    <MaterialIcons
                      name={getEmergencyIcon(emergency.emergencyType || emergency.type)}
                      size={24}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.emergencyInfo}>
                    <Text style={styles.emergencyType}>
                      {(emergency.emergencyType || emergency.type)?.toUpperCase()} EMERGENCY
                    </Text>
                    <Text style={styles.emergencyTime}>
                      {formatDate(emergency.completedAt)}
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
                    <Ionicons name="location" size={16} color="#6B7280" />
                    <Text style={styles.detailLabel}>Location:</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {emergency.userAddress || emergency.address || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="timer" size={16} color="#6B7280" />
                    <Text style={styles.detailLabel}>Duration:</Text>
                    <Text style={styles.detailValue}>
                      {calculateDuration(emergency.createdAt, emergency.completedAt)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={16} color="#6B7280" />
                    <Text style={styles.detailLabel}>Started:</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(emergency.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: PRIMARY_COLOR,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: PRIMARY_COLOR,
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
    fontSize: 15,
    color: '#1F2937',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
  },
  filterButtonActive: {
    backgroundColor: PRIMARY_COLOR,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
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
    marginBottom: 10,
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
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 3,
  },
  statusText: {
    fontSize: 10,
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
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  paginationButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paginationButtonActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  paginationButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#F3F4F6',
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  paginationButtonTextActive: {
    color: '#FFFFFF',
  },
  paginationButtonTextDisabled: {
    color: '#9CA3AF',
  },
  pageInfo: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 10,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 28,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
  },
  navLabelActive: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
});
