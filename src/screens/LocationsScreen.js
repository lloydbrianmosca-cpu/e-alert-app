import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Bottom navigation items
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
  { id: 'hotline', name: 'Hotlines', icon: 'call', iconFamily: 'Ionicons' },
  { id: 'chat', name: 'Chat', icon: 'chatbubbles', iconFamily: 'Ionicons' },
  { id: 'profile', name: 'Profile', icon: 'person', iconFamily: 'Ionicons' },
];

const EMERGENCY_COLORS = {
  police: '#1E3A8A',
  medical: '#059669',
  fire: '#DC2626',
  flood: '#0369A1',
};

export default function LocationsScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState('locations');
  
  // Get emergency type from route params (passed from HomeScreen)
  const emergencyType = route?.params?.emergencyType || 'police';
  
  // Mock responder data based on emergency type
  const responderData = {
    police: {
      name: 'Officer Juan Cruz',
      badge: 'PNP-2451',
      avatar: 'https://i.pravatar.cc/150?img=12',
      vehicle: 'Patrol Car 7',
      eta: '3 mins',
      distance: '1.2 km',
      icon: 'user-shield',
    },
    medical: {
      name: 'Dr. Maria Santos',
      badge: 'DOH-8892',
      avatar: 'https://i.pravatar.cc/150?img=45',
      vehicle: 'Ambulance Unit 3',
      eta: '5 mins',
      distance: '2.4 km',
      icon: 'hospital',
    },
    fire: {
      name: 'Firefighter Mike Reyes',
      badge: 'BFP-3341',
      avatar: 'https://i.pravatar.cc/150?img=33',
      vehicle: 'Fire Truck 5',
      eta: '4 mins',
      distance: '1.8 km',
      icon: 'fire-extinguisher',
    },
    flood: {
      name: 'Rescue Officer Anna Lee',
      badge: 'NDRRMC-5512',
      avatar: 'https://i.pravatar.cc/150?img=28',
      vehicle: 'Rescue Boat 2',
      eta: '6 mins',
      distance: '3.1 km',
      icon: 'water',
    },
  };

  const responder = responderData[emergencyType];
  const emergencyColor = EMERGENCY_COLORS[emergencyType];

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#DC2626' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="navigate" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Responder Location</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Mock Map */}
      <View style={styles.mapContainer}>
        <LinearGradient
          colors={['#E0E7FF', '#F3F4F6']}
          style={styles.mockMap}
        >
          {/* Grid lines to simulate map */}
          <View style={styles.gridOverlay}>
            {[...Array(8)].map((_, i) => (
              <View key={`h-${i}`} style={styles.gridLineHorizontal} />
            ))}
            {[...Array(8)].map((_, i) => (
              <View key={`v-${i}`} style={styles.gridLineVertical} />
            ))}
          </View>

          {/* Your Location Pin */}
          <View style={styles.userLocation}>
            <View style={[styles.userLocationPulse, { backgroundColor: emergencyColor + '40' }]} />
            <View style={[styles.userLocationDot, { backgroundColor: emergencyColor }]}>
              <Ionicons name="person" size={16} color="#FFFFFF" />
            </View>
          </View>

          {/* Responder Location Pin */}
          <View style={styles.responderLocation}>
            <View style={[styles.responderLocationPulse, { backgroundColor: emergencyColor + '30' }]} />
            <View style={[styles.responderPin, { backgroundColor: emergencyColor }]}>
              <Ionicons name="car" size={20} color="#FFFFFF" />
            </View>
          </View>

          {/* Route Line */}
          <View style={[styles.routeLine, { backgroundColor: emergencyColor }]} />

          {/* Map Labels */}
          <View style={styles.mapLabel}>
            <Text style={styles.mapLabelText}>Your Location</Text>
          </View>
        </LinearGradient>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="add" size={20} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="remove" size={20} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, styles.locateButton]}>
            <Ionicons name="locate" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Alert Banner */}
        <View style={[styles.alertBanner, { backgroundColor: emergencyColor }]}>
          <Ionicons name="warning" size={20} color="#FFFFFF" />
          <Text style={styles.alertText}>Emergency responder is on the way!</Text>
        </View>
      </View>

      {/* Responder Info Card */}
      <View style={styles.responderCard}>
        <View style={styles.responderHeader}>
          <View style={styles.responderMain}>
            <Image
              source={{ uri: responder.avatar }}
              style={styles.responderAvatar}
            />
            <View style={styles.responderInfo}>
              <Text style={styles.responderName}>{responder.name}</Text>
              <Text style={styles.responderBadge}>{responder.badge}</Text>
              <View style={styles.vehicleContainer}>
                <Ionicons name="car-sport" size={14} color="#6B7280" />
                <Text style={styles.vehicleText}>{responder.vehicle}</Text>
              </View>
            </View>
            <View style={[styles.responderTypeBadge, { backgroundColor: emergencyColor }]}>
              {emergencyType === 'flood' ? (
                <Ionicons name={responder.icon} size={24} color="#FFFFFF" />
              ) : (
                <FontAwesome5 name={responder.icon} size={24} color="#FFFFFF" />
              )}
            </View>
          </View>
        </View>

        {/* ETA and Distance */}
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: emergencyColor + '15' }]}>
            <Ionicons name="time" size={28} color={emergencyColor} />
            <Text style={[styles.statValue, { color: emergencyColor }]}>{responder.eta}</Text>
            <Text style={styles.statLabel}>Estimated Time</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: emergencyColor + '15' }]}>
            <Ionicons name="navigate" size={28} color={emergencyColor} />
            <Text style={[styles.statValue, { color: emergencyColor }]}>{responder.distance}</Text>
            <Text style={styles.statLabel}>Distance Away</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, styles.callButton]}>
            <Ionicons name="call" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Call Responder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.chatButton]}>
            <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>
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
                // Already on locations
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === item.id ? item.icon : `${item.icon}-outline`}
              size={24}
              color={activeTab === item.id ? '#DC2626' : '#6B7280'}
            />
            <Text style={[
              styles.navLabel,
              activeTab === item.id && styles.navLabelActive
            ]}>
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mockMap: {
    flex: 1,
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  gridLineHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#CBD5E1',
    opacity: 0.3,
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
    backgroundColor: '#CBD5E1',
    opacity: 0.3,
  },
  userLocation: {
    position: 'absolute',
    bottom: '30%',
    left: '40%',
    alignItems: 'center',
  },
  userLocationPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.4,
  },
  userLocationDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  responderLocation: {
    position: 'absolute',
    top: '25%',
    right: '25%',
    alignItems: 'center',
  },
  responderLocationPulse: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    opacity: 0.3,
  },
  responderPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  routeLine: {
    position: 'absolute',
    top: '28%',
    right: '28%',
    width: 180,
    height: 3,
    transform: [{ rotate: '45deg' }],
    opacity: 0.5,
  },
  mapLabel: {
    position: 'absolute',
    bottom: '26%',
    left: '35%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 16,
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locateButton: {
    backgroundColor: '#DC2626',
  },
  alertBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  responderCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  responderHeader: {
    marginBottom: 16,
  },
  responderMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  responderAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  responderInfo: {
    flex: 1,
    marginLeft: 16,
  },
  responderName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 2,
  },
  responderBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  vehicleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  responderTypeBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  callButton: {
    backgroundColor: '#10B981',
  },
  chatButton: {
    backgroundColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
