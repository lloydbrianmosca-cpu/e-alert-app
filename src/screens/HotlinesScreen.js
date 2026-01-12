import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  FlatList,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Bottom navigation items
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
  { id: 'hotline', name: 'Hotlines', icon: 'call', iconFamily: 'Ionicons' },
  { id: 'chat', name: 'Chat', icon: 'chatbubbles', iconFamily: 'Ionicons' },
  { id: 'profile', name: 'Profile', icon: 'person', iconFamily: 'Ionicons' },
];

// Sample hotline data - will be expanded
const HOTLINES_DATA = [
  {
    id: 1,
    name: 'National Emergency Hotline',
    number: '911',
    type: 'general',
    city: 'National',
    province: 'All',
    agency: 'All Agencies',
  },
  {
    id: 2,
    name: 'PNP Hotline - Manila',
    number: '(02) 8 242-7777',
    type: 'police',
    city: 'Manila',
    province: 'Metro Manila',
    agency: 'PNP',
  },
  {
    id: 3,
    name: 'BFP Hotline - Manila',
    number: '(02) 8 426-0219',
    type: 'fire',
    city: 'Manila',
    province: 'Metro Manila',
    agency: 'Bureau of Fire Protection',
  },
  {
    id: 4,
    name: 'Philippine Red Cross - Metro Manila',
    number: '143',
    type: 'medical',
    city: 'Manila',
    province: 'Metro Manila',
    agency: 'Medical/Ambulance',
  },
  {
    id: 5,
    name: 'PNP Hotline - Quezon City',
    number: '(02) 8 372-0650',
    type: 'police',
    city: 'Quezon City',
    province: 'Metro Manila',
    agency: 'PNP',
  },
  {
    id: 6,
    name: 'BFP Hotline - Quezon City',
    number: '(02) 8 373-5341',
    type: 'fire',
    city: 'Quezon City',
    province: 'Metro Manila',
    agency: 'Bureau of Fire Protection',
  },
  {
    id: 7,
    name: 'PNP Hotline - Cebu',
    number: '(032) 253-0888',
    type: 'police',
    city: 'Cebu City',
    province: 'Cebu',
    agency: 'PNP',
  },
  {
    id: 8,
    name: 'BFP Hotline - Davao',
    number: '(082) 221-2222',
    type: 'fire',
    city: 'Davao City',
    province: 'Davao del Sur',
    agency: 'Bureau of Fire Protection',
  },
];

const AGENCY_TYPES = [
  { id: 'all', label: 'All Agencies', icon: 'shield' },
  { id: 'police', label: 'Police', icon: 'local-police' },
  { id: 'fire', label: 'Fire Station', icon: 'fire-truck' },
  { id: 'medical', label: 'Medical', icon: 'medical-services' },
];

export default function HotlinesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('hotline');
  const [searchText, setSearchText] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('all');

  const filteredHotlines = useMemo(() => {
    return HOTLINES_DATA.filter((hotline) => {
      const matchesSearch =
        hotline.name.toLowerCase().includes(searchText.toLowerCase()) ||
        hotline.city.toLowerCase().includes(searchText.toLowerCase()) ||
        hotline.province.toLowerCase().includes(searchText.toLowerCase()) ||
        hotline.number.includes(searchText);

      const matchesAgency =
        selectedAgency === 'all' || hotline.type === selectedAgency;

      return matchesSearch && matchesAgency;
    });
  }, [searchText, selectedAgency]);

  const getAgencyColor = (type) => {
    switch (type) {
      case 'police':
        return '#1E3A8A';
      case 'fire':
        return '#DC2626';
      case 'medical':
        return '#059669';
      default:
        return '#6B7280';
    }
  };

  const getAgencyIcon = (type) => {
    switch (type) {
      case 'police':
        return 'local-police';
      case 'fire':
        return 'fire-truck';
      case 'medical':
        return 'medical-services';
      default:
        return 'shield';
    }
  };

  const renderHotlineCard = ({ item }) => (
    <TouchableOpacity
      style={styles.hotlineCard}
      onPress={() => {
        // TODO: Open phone call or copy number
      }}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.hotlineIconContainer,
          { backgroundColor: getAgencyColor(item.type) + '20' },
        ]}
      >
        <MaterialIcons
          name={getAgencyIcon(item.type)}
          size={28}
          color={getAgencyColor(item.type)}
        />
      </View>

      <View style={styles.hotlineContent}>
        <Text style={styles.hotlineName}>{item.name}</Text>
        <Text style={styles.hotlineAgency}>{item.agency}</Text>
        <View style={styles.locationContainer}>
          <Ionicons name="location" size={12} color="#6B7280" />
          <Text style={styles.locationText}>
            {item.city}, {item.province}
          </Text>
        </View>
      </View>

      <View style={styles.hotlineRight}>
        <Text style={[styles.hotlineNumber, { color: getAgencyColor(item.type) }]}>
          {item.number}
        </Text>
        <TouchableOpacity style={styles.callButton}>
          <Ionicons name="call" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="call" size={28} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Emergency Hotlines</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by city, province, or hotline..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Agency Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {AGENCY_TYPES.map((agency) => (
          <TouchableOpacity
            key={agency.id}
            style={[
              styles.filterButton,
              selectedAgency === agency.id && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedAgency(agency.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={
                agency.id === 'police'
                  ? 'shield'
                  : agency.id === 'fire'
                    ? 'flame'
                    : agency.id === 'medical'
                      ? 'heart'
                      : 'shield'
              }
              size={16}
              color={selectedAgency === agency.id ? '#FFFFFF' : '#DC2626'}
            />
            <Text
              style={[
                styles.filterButtonText,
                selectedAgency === agency.id && styles.filterButtonTextActive,
              ]}
            >
              {agency.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Hotlines List */}
      <View style={styles.content}>
        {filteredHotlines.length > 0 ? (
          <FlatList
            data={filteredHotlines}
            renderItem={renderHotlineCard}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No hotlines found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search or filter criteria
            </Text>
          </View>
        )}
      </View>

      {/* Info Note */}
      <View style={styles.infoNote}>
        <Ionicons name="information-circle" size={20} color="#DC2626" />
        <Text style={styles.infoText}>
          More hotlines will be added soon. Last updated: Jan 2026
        </Text>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => {
              setActiveTab(item.id);
              if (item.id === 'home') {
                navigation.navigate('Home');
              } else if (item.id === 'chat') {
                navigation.navigate('Chat');
              } else if (item.id === 'locations') {
                navigation.navigate('Locations');
              } else if (item.id === 'profile') {
                navigation.navigate('Profile');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === item.id ? item.icon : `${item.icon}-outline`}
              size={24}
              color={activeTab === item.id ? '#DC2626' : '#6B7280'}
            />
            <Text style={[styles.navLabel, activeTab === item.id && styles.navLabelActive]}>
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
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#DC2626',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    backgroundColor: 'transparent',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  hotlineCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  hotlineIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hotlineContent: {
    flex: 1,
  },
  hotlineName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  hotlineAgency: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  hotlineRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  hotlineNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  infoText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '500',
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#DC2626',
    fontWeight: '600',
  },
});
