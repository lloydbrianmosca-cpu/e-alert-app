import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useEmergency, calculateDistance, calculateETA, formatDistance } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';

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

// Responder icons based on type
const RESPONDER_ICONS = {
  police: 'local-police',
  medical: 'medical-services',
  fireman: 'fire-truck',
  fire: 'fire-truck',
  flood: 'flood',
};

export default function LocationsScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState('locations');
  const { activeEmergencyType, activeResponder, clearEmergency, userLocation: emergencyUserLocation, isSearchingResponder } = useEmergency();
  const [userLocation, setUserLocation] = useState(null);
  const [responderLocation, setResponderLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const { user } = useAuth();
  
  // Real-time ETA and distance
  const [realtimeETA, setRealtimeETA] = useState(null);
  const [realtimeDistance, setRealtimeDistance] = useState(null);

  // Required profile fields
  const requiredFields = [
    'firstName', 'lastName', 'email', 'contactNumber',
    'address', 'region', 'province', 'city',
    'emergencyContactName', 'emergencyContactNumber'
  ];

  // Check if profile is complete
  const checkProfileComplete = async () => {
    if (!user?.uid) {
      setIsCheckingProfile(false);
      return;
    }

    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        const isComplete = requiredFields.every(field => {
          if (field === 'firstName') {
            return user?.displayName?.split(' ').slice(0, -1).join(' ')?.trim();
          }
          if (field === 'lastName') {
            return user?.displayName?.split(' ').slice(-1)[0]?.trim();
          }
          if (field === 'email') {
            return user?.email?.trim();
          }
          return data[field] && data[field].trim() !== '';
        });

        setShowProfileOverlay(!isComplete);
      } else {
        setShowProfileOverlay(true);
      }
    } catch (error) {
      console.log('Error checking profile:', error);
      setShowProfileOverlay(true);
    } finally {
      setIsCheckingProfile(false);
    }
  };

  useEffect(() => {
    checkProfileComplete();
  }, [user]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkProfileComplete();
    });
    return unsubscribe;
  }, [navigation, user]);
  
  // Check if emergency is active (SOS was pressed 3 times)
  const isEmergencyActive = !!activeEmergencyType || !!route?.params?.emergencyType;
  const emergencyType = activeEmergencyType || route?.params?.emergencyType || 'police';

  // Default location (Pasay City, Philippines)
  const defaultLocation = {
    latitude: 14.5378,
    longitude: 120.9893,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // Get user's current location
  useEffect(() => {
    (async () => {
      try {
        // Use emergency user location if available
        if (emergencyUserLocation) {
          setUserLocation({
            ...emergencyUserLocation,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          setLoading(false);
          return;
        }

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          setUserLocation(defaultLocation);
          setLoading(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch (error) {
        console.log('Error getting location:', error);
        setUserLocation(defaultLocation);
      } finally {
        setLoading(false);
      }
    })();
  }, [emergencyUserLocation]);

  // Update responder location from activeResponder and initialize ETA/distance
  useEffect(() => {
    if (activeResponder?.location) {
      setResponderLocation({
        latitude: activeResponder.location.latitude,
        longitude: activeResponder.location.longitude,
      });
      
      // Initialize real-time values from activeResponder
      if (activeResponder.eta) setRealtimeETA(activeResponder.eta);
      if (activeResponder.distance) setRealtimeDistance(activeResponder.distance);
    } else if (activeResponder && userLocation) {
      // If no location data, estimate based on distance
      // Place responder marker at an offset from user
      const estimatedDistance = activeResponder.distanceKm || 2;
      const latOffset = estimatedDistance * 0.009; // Roughly 1km = 0.009 degrees latitude
      const lonOffset = estimatedDistance * 0.009;
      setResponderLocation({
        latitude: userLocation.latitude + latOffset,
        longitude: userLocation.longitude + lonOffset / 2,
      });
      
      // Initialize from stored values
      if (activeResponder.eta) setRealtimeETA(activeResponder.eta);
      if (activeResponder.distance) setRealtimeDistance(activeResponder.distance);
    }
  }, [activeResponder, userLocation]);

  // Listen for responder location updates in real-time and calculate ETA/distance
  useEffect(() => {
    if (!activeResponder?.id) return;

    const unsubscribe = onSnapshot(doc(db, 'responders', activeResponder.id), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.location) {
          const newResponderLocation = {
            latitude: data.location.latitude,
            longitude: data.location.longitude,
          };
          setResponderLocation(newResponderLocation);
          
          // Calculate real-time distance and ETA if we have user location
          if (userLocation) {
            const distanceKm = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              newResponderLocation.latitude,
              newResponderLocation.longitude
            );
            setRealtimeDistance(formatDistance(distanceKm));
            setRealtimeETA(calculateETA(distanceKm));
            
            // Update emergency document with real-time distance (only if emergency is active)
            if (user?.uid && isEmergencyActive) {
              try {
                // Check if emergency document exists first
                const emergencyRef = doc(db, 'activeEmergencies', user.uid);
                const emergencySnap = await getDoc(emergencyRef);
                if (emergencySnap.exists()) {
                  await updateDoc(emergencyRef, {
                    responderDistance: distanceKm,
                    responderLocation: newResponderLocation,
                    lastUpdated: new Date().toISOString(),
                  });
                }
              } catch (error) {
                console.log('Error updating emergency distance:', error);
              }
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, [activeResponder?.id, userLocation, user?.uid, isEmergencyActive]);

  // Center map on user location
  const centerOnUser = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  // Fit both markers in view
  const fitAllMarkers = () => {
    if (mapRef.current && userLocation && responderLocation && isEmergencyActive) {
      mapRef.current.fitToCoordinates(
        [userLocation, responderLocation],
        {
          edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
          animated: true,
        }
      );
    }
  };

  useEffect(() => {
    if (!loading && isEmergencyActive && responderLocation) {
      setTimeout(fitAllMarkers, 500);
    }
  }, [loading, isEmergencyActive, responderLocation]);

  // Get responder display info - use real-time ETA/distance when available
  const responder = activeResponder ? {
    ...activeResponder,
    eta: realtimeETA || activeResponder.eta,
    distance: realtimeDistance || activeResponder.distance,
  } : {
    name: 'Searching...',
    building: 'Finding nearest responder',
    hotline: 'N/A',
    eta: '--',
    distance: '--',
    icon: RESPONDER_ICONS[emergencyType] || 'local-police',
    tag: emergencyType?.charAt(0).toUpperCase() + emergencyType?.slice(1),
    avatar: 'https://ui-avatars.com/api/?name=Responder&background=random',
  };

  const emergencyColor = EMERGENCY_COLORS[emergencyType];

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#DC2626' }]}>
        <View style={styles.headerContent}>
          <Ionicons name="navigate" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Responder Location</Text>
        </View>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DC2626" />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={userLocation || defaultLocation}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
          >
            {/* User Location Marker */}
            {userLocation && (
              <Marker
                coordinate={userLocation}
                title="Your Location"
                description="You are here"
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={true}
              >
                <View style={styles.userMarker}>
                  <View style={[styles.userMarkerOuter, { backgroundColor: '#DC262640' }]} />
                  <View style={styles.userMarkerInner}>
                    <Ionicons name="person" size={16} color="#FFFFFF" />
                  </View>
                </View>
              </Marker>
            )}

            {/* Responder Location Marker */}
            {isEmergencyActive && responderLocation && (
              <>
                <Marker
                  coordinate={responderLocation}
                  title={responder.name}
                  description={`${responder.tag} - ${responder.eta} away`}
                  anchor={{ x: 0.5, y: 1 }}
                  tracksViewChanges={true}
                >
                  <View style={styles.responderMarkerContainer}>
                    {/* Name Label */}
                    <View style={[styles.responderNameLabel, { backgroundColor: emergencyColor }]}>
                      <Text style={styles.responderNameText} numberOfLines={1}>
                        {responder.name}
                      </Text>
                    </View>
                    {/* Marker Icon */}
                    <View style={styles.responderMarker}>
                      <View style={[styles.responderMarkerOuter, { backgroundColor: emergencyColor + '30' }]} />
                      <View style={[styles.responderMarkerInner, { backgroundColor: emergencyColor }]}>
                        <Ionicons name="car" size={18} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                </Marker>

                {/* Route Line */}
                <Polyline
                  coordinates={[userLocation, responderLocation]}
                  strokeColor={emergencyColor}
                  strokeWidth={4}
                  lineDashPattern={[10, 5]}
                />
              </>
            )}
          </MapView>
        )}

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => {
              if (mapRef.current && userLocation) {
                const currentRegion = userLocation;
                mapRef.current.animateToRegion({
                  ...currentRegion,
                  latitudeDelta: currentRegion.latitudeDelta * 0.5,
                  longitudeDelta: currentRegion.longitudeDelta * 0.5,
                }, 300);
              }
            }}
          >
            <Ionicons name="add" size={20} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => {
              if (mapRef.current && userLocation) {
                const currentRegion = userLocation;
                mapRef.current.animateToRegion({
                  ...currentRegion,
                  latitudeDelta: currentRegion.latitudeDelta * 2,
                  longitudeDelta: currentRegion.longitudeDelta * 2,
                }, 300);
              }
            }}
          >
            <Ionicons name="remove" size={20} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.controlButton, styles.locateButton]}
            onPress={centerOnUser}
          >
            <Ionicons name="locate" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {isEmergencyActive && (
          /* Alert Banner */
          <View style={[styles.alertBanner, { backgroundColor: emergencyColor }]}>
            <Ionicons name="warning" size={20} color="#FFFFFF" />
            <Text style={styles.alertText}>Emergency responder is on the way!</Text>
          </View>
        )}
      </View>

      {isEmergencyActive ? (
        /* Responder Info Card - shown when emergency is active */
        <View style={styles.responderCard}>
          <View style={styles.responderHeader}>
            <View style={styles.responderMain}>
              <Image
                source={{ uri: responder.avatar }}
                style={styles.responderAvatar}
            />
            <View style={styles.responderInfo}>
              <Text style={styles.responderName}>{responder.name}</Text>
              <Text style={styles.responderBuilding}>{responder.building}</Text>
              <View style={styles.hotlineContainer}>
                <Ionicons name="call" size={14} color="#6B7280" />
                <Text style={styles.hotlineText}>{responder.hotline}</Text>
              </View>
            </View>
            <View style={[styles.responderTypeBadge, { backgroundColor: emergencyColor }]}>
              <MaterialIcons name={responder.icon} size={24} color="#FFFFFF" />
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
          <TouchableOpacity 
            style={[styles.actionButton, styles.chatButton]}
            onPress={() => navigation.navigate('Chat', {
              responder: {
                id: responder.id, // Include responder's actual ID
                name: responder.name,
                avatar: responder.avatar,
                building: responder.building,
                tag: responder.tag,
                emergencyType: emergencyType,
              }
            })}
          >
            <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        {/* Cancel Emergency Button */}
        <TouchableOpacity
          style={styles.cancelEmergencyButton}
          onPress={() => {
            clearEmergency();
            navigation.navigate('Home');
          }}
        >
          <Ionicons name="close-circle" size={20} color="#FFFFFF" />
          <Text style={styles.cancelEmergencyText}>Cancel Emergency</Text>
        </TouchableOpacity>
      </View>
      ) : (
        /* Default View - No active emergency */
        <View style={styles.defaultCard}>
          <Text style={styles.defaultTitle}>No Active Emergency</Text>
          <Text style={styles.defaultSubtitle}>
            Your location is displayed on the map. Use the buttons below to access emergency services.
          </Text>
          
          <View style={styles.defaultButtons}>
            <TouchableOpacity 
              style={[styles.defaultButton, styles.sosButton]}
              onPress={() => navigation.navigate('Home')}
            >
              <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
              <Text style={styles.defaultButtonText}>SOS Emergency</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.defaultButton, styles.chatButtonDefault]}
              onPress={() => navigation.navigate('Chat')}
            >
              <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
              <Text style={styles.defaultButtonText}>Open Chat</Text>
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
            onPress={() => {
              setActiveTab(item.id);
              if (item.id === 'home') {
                navigation.navigate('Home');
              } else if (item.id === 'chat') {
                navigation.navigate('Chat');
              } else if (item.id === 'hotline') {
                navigation.navigate('Hotlines');
              } else if (item.id === 'profile') {
                navigation.navigate('Profile');
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

      {/* Profile Incomplete Overlay */}
      {showProfileOverlay && !isCheckingProfile && (
        <View style={styles.overlayContainer}>
          <View style={styles.overlayContent}>
            <View style={styles.overlayIconContainer}>
              <Ionicons name="person-circle" size={80} color="#DC2626" />
            </View>
            <Text style={styles.overlayTitle}>Complete Your Profile</Text>
            <Text style={styles.overlaySubtitle}>
              Please fill up your profile information first before using emergency services. This helps responders locate and assist you better.
            </Text>
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <Ionicons name="person" size={20} color="#FFFFFF" />
              <Text style={styles.overlayButtonText}>Go to Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  userMarker: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerOuter: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    top: 5,
    left: 5,
  },
  userMarkerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#DC2626',
  },
  responderMarker: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responderMarkerContainer: {
    alignItems: 'center',
  },
  responderNameLabel: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
    maxWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  responderNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  responderMarkerOuter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    top: 5,
    left: 5,
  },
  responderMarkerInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
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
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  cancelEmergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  cancelEmergencyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
  responderBuilding: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  hotlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hotlineText: {
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
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  overlayIconContainer: {
    marginBottom: 20,
  },
  overlayTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  overlaySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 10,
    width: '100%',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  overlayButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  defaultCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    alignItems: 'center',
  },
  defaultTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  defaultSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  defaultButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  defaultButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  sosButton: {
    backgroundColor: '#DC2626',
  },
  chatButtonDefault: {
    backgroundColor: '#3B82F6',
  },
  defaultButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
