import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components';

const { width, height } = Dimensions.get('window');

// Bottom navigation items - unified with user screens
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
  { id: 'chat', name: 'Chat', icon: 'chatbubbles', iconFamily: 'Ionicons' },
  { id: 'profile', name: 'Profile', icon: 'person', iconFamily: 'Ionicons' },
];

// Primary color - unified with user screens
const PRIMARY_COLOR = '#DC2626';

// Emergency type colors
const EMERGENCY_COLORS = {
  police: '#1E3A8A',
  medical: '#059669',
  fire: '#DC2626',
  flood: '#0369A1',
};

export default function ResponderLocationsScreen({ navigation, route }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('locations');
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [responderData, setResponderData] = useState(null);
  const [assignedEmergencies, setAssignedEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(route?.params?.emergency || null);
  const mapRef = useRef(null);

  // Default location (Pasay City, Philippines)
  const defaultLocation = {
    latitude: 14.5378,
    longitude: 120.9893,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  // Fetch responder data
  const fetchResponderData = async () => {
    if (!user?.uid) return;

    try {
      const docRef = doc(db, 'responders', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setResponderData(docSnap.data());
      }
    } catch (error) {
      console.log('Error fetching responder data:', error);
    }
  };

  // Listen for assigned emergencies
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'activeEmergencies'),
      where('assignedResponder', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const emergencies = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAssignedEmergencies(emergencies);
      
      // If we have an emergency from params, update it with latest data
      if (selectedEmergency) {
        const updated = emergencies.find((e) => e.id === selectedEmergency.id);
        if (updated) {
          setSelectedEmergency(updated);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Get user's current location
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          setUserLocation(defaultLocation);
          setIsLoading(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      } catch (error) {
        console.log('Error getting location:', error);
        setUserLocation(defaultLocation);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    fetchResponderData();
  }, [user]);

  // Center on responder's current location
  const centerOnMe = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion(
        {
          ...userLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  };

  // Fit all markers in view
  const fitAllMarkers = () => {
    if (mapRef.current && userLocation && assignedEmergencies.length > 0) {
      const coordinates = [
        userLocation,
        ...assignedEmergencies
          .filter((e) => e.location?.latitude && e.location?.longitude)
          .map((e) => e.location),
      ];

      if (coordinates.length > 1) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
          animated: true,
        });
      }
    }
  };

  // Navigate to emergency location
  const navigateToEmergency = (emergency) => {
    setSelectedEmergency(emergency);
    if (mapRef.current && emergency.location) {
      mapRef.current.animateToRegion(
        {
          ...emergency.location,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  };

  // Handle tab navigation
  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
    switch (tabId) {
      case 'home':
        navigation.navigate('ResponderHome');
        break;
      case 'locations':
        break;
      case 'chat':
        navigation.navigate('ResponderChats');
        break;
      case 'profile':
        navigation.navigate('ResponderProfile');
        break;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />

      {/* Header - Unified with user screens */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ResponderHome')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Location Tracking</Text>
          <TouchableOpacity onPress={fitAllMarkers} style={styles.fitButton}>
            <MaterialIcons name="zoom-out-map" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={userLocation || defaultLocation}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {/* Responder's current location marker */}
          {userLocation && (
            <Marker coordinate={userLocation} title="Your Location" anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.responderMarker}>
                <View style={[styles.responderMarkerInner, { backgroundColor: PRIMARY_COLOR }]}>
                  <MaterialCommunityIcons name="account" size={20} color="#FFFFFF" />
                </View>
              </View>
            </Marker>
          )}

          {/* Emergency markers */}
          {assignedEmergencies
            .filter((e) => e.location?.latitude && e.location?.longitude)
            .map((emergency) => (
              <React.Fragment key={emergency.id}>
                <Marker
                  coordinate={emergency.location}
                  title={emergency.userName || 'User in Emergency'}
                  description={emergency.address || 'Location'}
                  onPress={() => navigateToEmergency(emergency)}
                >
                  <View
                    style={[
                      styles.emergencyMarker,
                      {
                        backgroundColor: EMERGENCY_COLORS[emergency.type] || '#DC2626',
                        borderColor:
                          selectedEmergency?.id === emergency.id ? '#FFFFFF' : 'transparent',
                        borderWidth: selectedEmergency?.id === emergency.id ? 3 : 0,
                      },
                    ]}
                  >
                    <MaterialIcons name="sos" size={20} color="#FFFFFF" />
                  </View>
                </Marker>

                {/* Route line from responder to emergency */}
                {userLocation && selectedEmergency?.id === emergency.id && (
                  <Polyline
                    coordinates={[userLocation, emergency.location]}
                    strokeColor={EMERGENCY_COLORS[emergency.type] || '#DC2626'}
                    strokeWidth={4}
                    lineDashPattern={[10, 5]}
                  />
                )}
              </React.Fragment>
            ))}
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: PRIMARY_COLOR }]}
            onPress={centerOnMe}
          >
            <MaterialIcons name="my-location" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Emergency List */}
        {assignedEmergencies.length > 0 && (
          <View style={styles.emergencyList}>
            <Text style={styles.listTitle}>Active Emergencies ({assignedEmergencies.length})</Text>
            {assignedEmergencies.map((emergency) => (
              <TouchableOpacity
                key={emergency.id}
                style={[
                  styles.emergencyItem,
                  selectedEmergency?.id === emergency.id && styles.emergencyItemSelected,
                ]}
                onPress={() => navigateToEmergency(emergency)}
              >
                <View
                  style={[
                    styles.emergencyItemDot,
                    { backgroundColor: EMERGENCY_COLORS[emergency.type] || '#DC2626' },
                  ]}
                />
                <View style={styles.emergencyItemInfo}>
                  <Text style={styles.emergencyItemType}>{emergency.type?.toUpperCase()}</Text>
                  <Text style={styles.emergencyItemUser} numberOfLines={1}>
                    {emergency.userName || 'Unknown User'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() =>
                    navigation.navigate('ResponderChats', { emergencyId: emergency.id })
                  }
                >
                  <Ionicons name="chatbubble" size={18} color={PRIMARY_COLOR} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No Emergencies State */}
        {assignedEmergencies.length === 0 && (
          <View style={styles.noEmergencies}>
            <MaterialCommunityIcons name="map-marker-check" size={48} color="#9CA3AF" />
            <Text style={styles.noEmergenciesText}>No active emergencies</Text>
            <Text style={styles.noEmergenciesSubtext}>
              Assigned emergencies will appear on the map
            </Text>
          </View>
        )}
      </View>

      {/* Selected Emergency Details */}
      {selectedEmergency && (
        <View style={styles.emergencyDetails}>
          <View style={styles.detailsHeader}>
            <View
              style={[
                styles.detailsTypeBadge,
                { backgroundColor: EMERGENCY_COLORS[selectedEmergency.type] || '#DC2626' },
              ]}
            >
              <Text style={styles.detailsTypeText}>{selectedEmergency.type?.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedEmergency(null)}>
              <Ionicons name="close-circle" size={28} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.detailsUser}>{selectedEmergency.userName || 'Unknown User'}</Text>
          <Text style={styles.detailsAddress} numberOfLines={2}>
            📍 {selectedEmergency.address || 'Address not available'}
          </Text>
          <View style={styles.detailsActions}>
            <TouchableOpacity
              style={[styles.detailsButton, { backgroundColor: PRIMARY_COLOR }]}
              onPress={() =>
                navigation.navigate('ResponderChats', { emergencyId: selectedEmergency.id })
              }
            >
              <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
              <Text style={styles.detailsButtonText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.detailsButton, styles.detailsButtonOutline, { borderColor: PRIMARY_COLOR }]}
            >
              <MaterialIcons name="phone" size={18} color={PRIMARY_COLOR} />
              <Text style={[styles.detailsButtonText, { color: PRIMARY_COLOR }]}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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

      <Toast config={toastConfig} />
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
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#DC2626',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fitButton: {
    padding: 4,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  responderMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  responderMarkerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  emergencyMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 200,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emergencyList: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    maxHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emergencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  emergencyItemSelected: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  emergencyItemDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  emergencyItemInfo: {
    flex: 1,
  },
  emergencyItemType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  emergencyItemUser: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  chatButton: {
    padding: 8,
  },
  noEmergencies: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noEmergenciesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  noEmergenciesSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  emergencyDetails: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailsTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsUser: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  detailsAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  detailsActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  detailsButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
