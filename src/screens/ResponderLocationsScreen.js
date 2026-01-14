import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { db } from '../services/firestore';
import { doc, getDoc, collection, query, where, onSnapshot, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components';
import { getRouteDirections, formatRouteDistance, formatRouteDuration } from '../services/routing';

const { width, height } = Dimensions.get('window');

// Bottom navigation items - unified with user screens
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
  { id: 'history', name: 'History', icon: 'time', iconFamily: 'Ionicons' },
  { id: 'chat', name: 'Chat', icon: 'chatbubbles', iconFamily: 'Ionicons' },
  { id: 'profile', name: 'Profile', icon: 'person', iconFamily: 'Ionicons' },
];

// Primary color - unified with user screens
const PRIMARY_COLOR = '#DC2626';

// Emergency type colors
const EMERGENCY_COLORS = {
  medical: '#059669',
  fire: '#DC2626',
  flood: '#0369A1',
};

export default function ResponderLocationsScreen({ navigation, route }) {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [activeTab, setActiveTab] = useState('locations');
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [responderData, setResponderData] = useState(null);
  const [assignedEmergencies, setAssignedEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(route?.params?.emergency || null);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const mapRef = useRef(null);
  const hasAutoFitted = useRef(false);
  
  // Route navigation state
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const lastRouteUpdate = useRef(null);

  // Check if profile is complete
  const checkProfileComplete = (data) => {
    if (!data) return false;
    const requiredFields = ['firstName', 'lastName', 'contactNumber', 'stationName', 'hotlineNumber'];
    return requiredFields.every(field => data[field] && data[field].trim() !== '');
  };

  // Calculate distance between two coordinates in meters using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Get distance to selected emergency
  const getDistanceToEmergency = () => {
    if (!userLocation || !selectedEmergency?.location) return null;
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      selectedEmergency.location.latitude,
      selectedEmergency.location.longitude
    );
    return distance;
  };

  // Check if responder is close enough to complete emergency (within 100 meters)
  const isCloseEnough = () => {
    const distance = getDistanceToEmergency();
    return distance !== null && distance <= 100; // 100 meters threshold
  };

  // Format distance for display
  const formatDistance = (meters) => {
    if (meters === null) return 'Unknown';
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  // Complete emergency
  const handleCompleteEmergency = async () => {
    if (!selectedEmergency) return;

    const distance = getDistanceToEmergency();
    const closeEnough = isCloseEnough();

    if (!closeEnough) {
      Alert.alert(
        'Too Far Away',
        `You must be within 100 meters of the emergency location to mark it as done. You are currently ${formatDistance(distance)} away.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Complete Emergency',
      'Are you sure you want to mark this emergency as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            try {
              // Save to emergency history
              const historyData = {
                ...selectedEmergency,
                // Add user ID for user history queries
                userId: selectedEmergency.userId || selectedEmergency.id,
                completedAt: serverTimestamp(),
                completedBy: user.uid,
                responderName: responderData ? `${responderData.firstName} ${responderData.lastName}` : 'Unknown',
                status: 'completed',
              };
              
              console.log('Saving emergency history:', historyData);
              
              const historyRef = await addDoc(collection(db, 'emergencyHistory'), historyData);
              console.log('Emergency history saved with ID:', historyRef.id);

              // Delete from active emergencies
              await deleteDoc(doc(db, 'activeEmergencies', selectedEmergency.id));
              console.log('Active emergency deleted:', selectedEmergency.id);

              Toast.show({
                type: 'success',
                text1: 'Emergency Completed',
                text2: 'The emergency has been marked as done.',
              });

              setSelectedEmergency(null);
            } catch (error) {
              console.log('Error completing emergency:', error);
              console.log('Error code:', error.code);
              console.log('Error message:', error.message);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to complete emergency. Please try again.',
              });
            }
          },
        },
      ]
    );
  };

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
        const data = docSnap.data();
        setResponderData(data);
        
        // Check profile completeness
        const profileComplete = checkProfileComplete(data);
        setIsProfileComplete(profileComplete);
      }
    } catch (error) {
      console.log('Error fetching responder data:', error);
    }
  };

  // Listen for assigned emergencies
  useEffect(() => {
    if (!user?.uid) {
      setAssignedEmergencies([]);
      return;
    }

    const q = query(
      collection(db, 'activeEmergencies'),
      where('assignedResponderId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const emergenciesRaw = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Map userLocation to location for consistency
          location: data.userLocation || null,
          // Map emergencyType to type for consistency
          type: data.emergencyType || 'emergency',
        };
      });
      // Deduplicate by id
      const emergencies = emergenciesRaw.filter(
        (emergency, index, self) => index === self.findIndex((e) => e.id === emergency.id)
      );
      setAssignedEmergencies(emergencies);
      
      // If we have an emergency from params, update it with latest data
      if (selectedEmergency) {
        const updated = emergencies.find((e) => e.id === selectedEmergency.id);
        if (updated) {
          setSelectedEmergency(updated);
        } else {
          // Emergency was completed/removed, clear selection
          setSelectedEmergency(null);
        }
      }
      
      // If coming from params with emergencyId, select that emergency
      if (route?.params?.emergencyId && !selectedEmergency) {
        const emergency = emergencies.find((e) => e.id === route.params.emergencyId);
        if (emergency) {
          setSelectedEmergency(emergency);
          navigateToEmergency(emergency);
        }
      }
      // Auto-select the first emergency if none selected and there's only one
      else if (!selectedEmergency && emergencies.length === 1) {
        setSelectedEmergency(emergencies[0]);
        navigateToEmergency(emergencies[0]);
      }
    }, (error) => {
      // Ignore permission errors on sign out and index building errors
      if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
        setAssignedEmergencies([]);
        return;
      }
      console.log('Error listening to emergencies:', error);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

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

  // Center on responder's current location with maximum zoom
  const centerOnMe = () => {
    if (mapRef.current && userLocation) {
      const maxZoom = 0.002; // Maximum zoom level (smaller = more zoomed in)
      mapRef.current.animateToRegion(
        {
          ...userLocation,
          latitudeDelta: maxZoom,
          longitudeDelta: maxZoom,
        },
        1000
      );
    }
  };

  // Zoom in function
  const zoomIn = () => {
    if (mapRef.current) {
      mapRef.current.getCamera().then(camera => {
        mapRef.current.animateCamera({
          center: camera.center,
          zoom: camera.zoom + 1,
        }, { duration: 300 });
      });
    }
  };

  // Zoom out function
  const zoomOut = () => {
    if (mapRef.current) {
      mapRef.current.getCamera().then(camera => {
        mapRef.current.animateCamera({
          center: camera.center,
          zoom: Math.max(camera.zoom - 1, 0),
        }, { duration: 300 });
      });
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

  // Fetch route directions when emergency is selected or location changes
  const fetchRouteToEmergency = useCallback(async () => {
    if (!userLocation || !selectedEmergency?.location) {
      setRouteCoordinates([]);
      setRouteDistance(null);
      setRouteDuration(null);
      return;
    }

    // Prevent too frequent updates (minimum 10 seconds between updates)
    const now = Date.now();
    if (lastRouteUpdate.current && now - lastRouteUpdate.current < 10000) {
      return;
    }

    setIsLoadingRoute(true);
    try {
      const result = await getRouteDirections(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: selectedEmergency.location.latitude, longitude: selectedEmergency.location.longitude }
      );

      if (result && result.coordinates.length > 0) {
        setRouteCoordinates(result.coordinates);
        setRouteDistance(result.distance);
        setRouteDuration(result.duration);
        lastRouteUpdate.current = now;
      } else {
        // Fallback to straight line if API fails
        setRouteCoordinates([userLocation, selectedEmergency.location]);
        setRouteDistance(null);
        setRouteDuration(null);
      }
    } catch (error) {
      console.log('Error fetching route:', error);
      // Fallback to straight line
      setRouteCoordinates([userLocation, selectedEmergency.location]);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [userLocation, selectedEmergency]);

  // Fetch route when emergency is selected
  useEffect(() => {
    if (selectedEmergency && userLocation) {
      fetchRouteToEmergency();
    } else {
      setRouteCoordinates([]);
      setRouteDistance(null);
      setRouteDuration(null);
    }
  }, [selectedEmergency?.id, userLocation?.latitude, userLocation?.longitude]);

  // Update route every 30 seconds while emergency is selected
  useEffect(() => {
    if (!selectedEmergency || !userLocation) return;

    const interval = setInterval(() => {
      lastRouteUpdate.current = null; // Reset to allow update
      fetchRouteToEmergency();
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedEmergency?.id, fetchRouteToEmergency]);

  // Handle tab navigation
  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
    switch (tabId) {
      case 'home':
        navigation.navigate('ResponderHome');
        break;
      case 'locations':
        break;
      case 'history':
        navigation.navigate('ResponderEmergencyHistory');
        break;
      case 'chat':
        navigation.navigate('ResponderChats');
        break;
      case 'profile':
        navigation.navigate('ResponderProfile');
        break;
    }
  };

  // Handle call user (in-app voice call)
  const handleCallUser = async (userId, userName, emergencyId) => {
    if (!userId) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Make Call',
        text2: 'User information is not available',
      });
      return;
    }

    const result = await startCall(userId, userName, emergencyId);
    
    if (result.success) {
      navigation.navigate('VoiceCall');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Call Failed',
        text2: result.error || 'Unable to start call',
      });
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
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header - Unified with user screens */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="location" size={24} color="#DC2626" />
            <Text style={styles.headerTitle}>Location Tracking</Text>
          </View>
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
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={true}
          rotateEnabled={true}
        >
          {/* Responder's current location marker */}
          {userLocation && (
            <Marker 
              coordinate={userLocation} 
              title="Your Location" 
              anchor={{ x: 0.5, y: 0.5 }}
            >
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
            .map((emergency, index) => (
              <React.Fragment key={`marker-${emergency.id}-${index}`}>
                <Marker
                  coordinate={emergency.location}
                  title={emergency.userName || 'User in Emergency'}
                  description={emergency.userAddress || 'Location'}
                  onPress={() => navigateToEmergency(emergency)}
                  anchor={{ x: 0.5, y: 0.5 }}
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

                {/* Road navigation route from responder to emergency */}
                {userLocation && selectedEmergency?.id === emergency.id && routeCoordinates.length > 0 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor={EMERGENCY_COLORS[emergency.type] || '#DC2626'}
                    strokeWidth={5}
                  />
                )}
              </React.Fragment>
            ))}
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          {/* Zoom In Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.zoomButton]}
            onPress={zoomIn}
          >
            <Ionicons name="add" size={24} color="#374151" />
          </TouchableOpacity>
          
          {/* Zoom Out Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.zoomButton]}
            onPress={zoomOut}
          >
            <Ionicons name="remove" size={24} color="#374151" />
          </TouchableOpacity>
          
          {/* My Location Button */}
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: PRIMARY_COLOR, marginTop: 8 }]}
            onPress={centerOnMe}
          >
            <MaterialIcons name="my-location" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Emergency List */}
        {assignedEmergencies.length > 0 && (
          <View style={styles.emergencyList}>
            <Text style={styles.listTitle}>Active Emergencies ({assignedEmergencies.length})</Text>
            {assignedEmergencies.map((emergency, index) => (
              <TouchableOpacity
                key={`list-${emergency.id}-${index}`}
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
                  style={styles.callButtonSmall}
                  onPress={() => handleCallUser(
                    emergency.userId,
                    emergency.userName,
                    emergency.id
                  )}
                >
                  <Ionicons name="call" size={16} color="#10B981" />
                </TouchableOpacity>
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
            <Text style={styles.detailsUser}>{selectedEmergency.userName || 'Unknown User'}</Text>
            <TouchableOpacity onPress={() => setSelectedEmergency(null)}>
              <Ionicons name="close-circle" size={32} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          
          {/* Road Navigation Info */}
          <View style={styles.distanceInfo}>
            <MaterialIcons name="directions" size={20} color="#374151" />
            <Text style={styles.distanceText}>
              Distance: {routeDistance ? formatRouteDistance(routeDistance) : formatDistance(getDistanceToEmergency())}
            </Text>
            {isCloseEnough() && (
              <View style={styles.nearbyBadge}>
                <Text style={styles.nearbyText}>NEARBY</Text>
              </View>
            )}
          </View>
          
          {/* ETA - Estimated Time of Arrival */}
          {routeDuration && (
            <View style={styles.etaInfo}>
              <MaterialIcons name="schedule" size={20} color="#059669" />
              <Text style={styles.etaText}>
                ETA: {formatRouteDuration(routeDuration)}
              </Text>
              {isLoadingRoute && (
                <ActivityIndicator size="small" color="#059669" style={{ marginLeft: 8 }} />
              )}
            </View>
          )}
          
          {/* User Contact Info */}
          {selectedEmergency.userContactNumber && (
            <Text style={styles.detailsContact}>
              📱 {selectedEmergency.userContactNumber}
            </Text>
          )}
          
          <Text style={styles.detailsAddress} numberOfLines={2}>
            📍 {selectedEmergency.userAddress || 'Address not available'}
          </Text>
          
          {/* Emergency Contact */}
          {selectedEmergency.emergencyContactName && (
            <View style={styles.emergencyContactInfo}>
              <Text style={styles.emergencyContactLabel}>Emergency Contact:</Text>
              <Text style={styles.emergencyContactText}>
                {selectedEmergency.emergencyContactName} - {selectedEmergency.emergencyContactNumber}
              </Text>
            </View>
          )}
          
          <View style={styles.detailsActions}>
            <TouchableOpacity
              style={[styles.detailsButton, { backgroundColor: PRIMARY_COLOR }]}
              onPress={() =>
                navigation.navigate('ResponderChats', { emergencyId: selectedEmergency.id })
              }
            >
              <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
              <Text style={styles.detailsButtonText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.detailsButton, styles.detailsButtonOutline, { borderColor: '#10B981' }]}
              onPress={() => handleCallUser(
                selectedEmergency.userId,
                selectedEmergency.userName,
                selectedEmergency.id
              )}
            >
              <MaterialIcons name="phone" size={20} color="#10B981" />
              <Text style={[styles.detailsButtonText, { color: '#10B981' }]}>Call</Text>
            </TouchableOpacity>
          </View>
          
          {/* Emergency Done Button */}
          <TouchableOpacity
            style={[
              styles.emergencyDoneButton,
              !isCloseEnough() && styles.emergencyDoneButtonDisabled,
            ]}
            onPress={handleCompleteEmergency}
            disabled={!isCloseEnough()}
          >
            <MaterialIcons 
              name="check-circle" 
              size={24} 
              color={isCloseEnough() ? '#FFFFFF' : '#9CA3AF'} 
            />
            <Text style={[
              styles.emergencyDoneButtonText,
              !isCloseEnough() && styles.emergencyDoneButtonTextDisabled,
            ]}>
              {isCloseEnough() ? 'Emergency Done' : `Get closer (${formatDistance(getDistanceToEmergency())} away)`}
            </Text>
          </TouchableOpacity>
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

      {/* Profile Incomplete Overlay */}
      {!isProfileComplete && !isLoading && (
        <View style={styles.overlayContainer}>
          <View style={styles.overlayContent}>
            <View style={styles.overlayIconContainer}>
              <Ionicons name="person-circle" size={80} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.overlayTitle}>Complete Your Profile</Text>
            <Text style={styles.overlaySubtitle}>
              Please complete your profile information (name, contact number, station name, and hotline) before accessing locations.
            </Text>
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={() => navigation.navigate('ResponderProfile')}
              activeOpacity={0.8}
            >
              <Ionicons name="person" size={20} color="#FFFFFF" />
              <Text style={styles.overlayButtonText}>Go to Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Toast config={toastConfig} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#9CA3AF',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.4,
  },
  fitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  responderMarker: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responderMarkerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  emergencyMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapControls: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    gap: 6,
  },
  controlButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emergencyList: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 6,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 3,
  },
  emergencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  emergencyItemSelected: {
    backgroundColor: '#F9FAFB',
    borderRadius: 5,
    marginHorizontal: -5,
    paddingHorizontal: 5,
  },
  emergencyItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  emergencyItemInfo: {
    flex: 1,
  },
  emergencyItemType: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  emergencyItemUser: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 1,
  },
  callButtonSmall: {
    padding: 5,
    marginRight: 3,
  },
  chatButton: {
    padding: 5,
  },
  noEmergencies: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noEmergenciesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 10,
  },
  noEmergenciesSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 3,
    textAlign: 'center',
  },
  emergencyDetails: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#F3F4F6',
    maxHeight: 280,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailsTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  detailsTypeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  detailsUser: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 5,
    gap: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  etaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 5,
    gap: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  etaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    flex: 1,
  },
  nearbyBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  nearbyText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  detailsContact: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 2,
    fontWeight: '500',
  },
  detailsAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  emergencyContactInfo: {
    backgroundColor: '#FEF2F2',
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  emergencyContactLabel: {
    fontSize: 10,
    color: '#991B1B',
    fontWeight: '600',
    marginBottom: 1,
  },
  emergencyContactText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  detailsActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  detailsButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emergencyDoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 5,
  },
  emergencyDoneButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  emergencyDoneButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emergencyDoneButtonTextDisabled: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F7',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 11,
    color: '#86868B',
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#DC2626',
    fontWeight: '600',
  },
  // Profile Incomplete Overlay Styles
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  overlayIconContainer: {
    marginBottom: 16,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  overlaySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  overlayButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
