import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firestore';
import { auth } from '../services/firebase';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import * as Location from 'expo-location';

// Map emergency types to responder types
const EMERGENCY_TO_RESPONDER_TYPE = {
  police: 'police',
  medical: 'medical',
  fire: 'fireman',
  flood: 'flood',
};

// Responder icons for display
const RESPONDER_ICONS = {
  police: 'local-police',
  medical: 'medical-services',
  fireman: 'fire-truck',
  flood: 'flood',
};

// Responder tags for display
const RESPONDER_TAGS = {
  police: 'Police',
  medical: 'Medical',
  fireman: 'Fire',
  flood: 'Rescue',
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

/**
 * Calculate ETA based on distance
 * Assumes average speed of 30 km/h for emergency vehicles in urban areas
 */
const calculateETA = (distanceKm) => {
  const avgSpeedKmH = 30; // Average speed in urban traffic for emergency vehicles
  const timeInHours = distanceKm / avgSpeedKmH;
  const timeInMinutes = Math.ceil(timeInHours * 60);
  
  if (timeInMinutes < 1) return '< 1 min';
  if (timeInMinutes === 1) return '1 min';
  if (timeInMinutes >= 60) {
    const hours = Math.floor(timeInMinutes / 60);
    const mins = timeInMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${timeInMinutes} mins`;
};

/**
 * Format distance for display
 */
const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
};

const EmergencyContext = createContext({
  activeEmergencyType: null,
  activeResponder: null,
  activeEmergencyId: null,
  isLoadingEmergency: true,
  isSearchingResponder: false,
  userLocation: null,
  activateEmergency: () => {},
  clearEmergency: () => {},
  getResponderData: () => null,
});

export function EmergencyProvider({ children }) {
  const [activeEmergencyType, setActiveEmergencyType] = useState(null);
  const [activeResponder, setActiveResponder] = useState(null);
  const [activeEmergencyId, setActiveEmergencyId] = useState(null);
  const [isLoadingEmergency, setIsLoadingEmergency] = useState(true);
  const [isSearchingResponder, setIsSearchingResponder] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // Get user's current location
  const getUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return null;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(coords);
      return coords;
    } catch (error) {
      console.log('Error getting location:', error);
      return null;
    }
  };

  /**
   * Find the nearest available responder of a specific type
   */
  const findNearestResponder = async (emergencyType, userCoords) => {
    const responderType = EMERGENCY_TO_RESPONDER_TYPE[emergencyType];
    
    try {
      // Query for available responders of the matching type
      const respondersRef = collection(db, 'responders');
      const q = query(
        respondersRef,
        where('responderType', '==', responderType),
        where('isAvailable', '==', true)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No available responders found for type:', responderType);
        return null;
      }

      let nearestResponder = null;
      let shortestDistance = Infinity;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        
        // Check if responder has location data
        if (data.location?.latitude && data.location?.longitude) {
          const distance = calculateDistance(
            userCoords.latitude,
            userCoords.longitude,
            data.location.latitude,
            data.location.longitude
          );

          if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestResponder = {
              id: doc.id,
              ...data,
              distance: shortestDistance,
            };
          }
        } else {
          // If responder doesn't have location, still consider them but with a default distance
          // This ensures responders without GPS can still be assigned
          if (!nearestResponder) {
            nearestResponder = {
              id: doc.id,
              ...data,
              distance: 5, // Default 5km if no location
            };
            shortestDistance = 5;
          }
        }
      });

      return nearestResponder;
    } catch (error) {
      console.log('Error finding responders:', error);
      return null;
    }
  };

  /**
   * Format responder data for display
   */
  const formatResponderData = (responder, emergencyType, distanceKm) => {
    if (!responder) return null;

    const eta = calculateETA(distanceKm);
    const formattedDistance = formatDistance(distanceKm);

    return {
      id: responder.id,
      name: `${responder.firstName || ''} ${responder.lastName || ''}`.trim() || 'Unknown Responder',
      building: responder.stationName || responder.station || 'Station',
      hotline: responder.hotlineNumber || responder.contactNumber || 'N/A',
      badge: responder.badgeNumber || `${responder.responderType?.toUpperCase()}-${responder.id?.slice(-4) || '0000'}`,
      avatar: responder.avatar || `https://ui-avatars.com/api/?name=${responder.firstName}+${responder.lastName}&background=random`,
      vehicle: responder.vehicle || `Emergency Vehicle`,
      eta: eta,
      distance: formattedDistance,
      distanceKm: distanceKm,
      icon: RESPONDER_ICONS[responder.responderType] || 'local-police',
      tag: RESPONDER_TAGS[responder.responderType] || 'Responder',
      location: responder.location || null,
      contactNumber: responder.contactNumber || '',
      responderType: responder.responderType,
    };
  };

  // Load active emergency from Firestore on user login
  useEffect(() => {
    const loadActiveEmergency = async () => {
      if (!currentUser?.uid) {
        setActiveEmergencyType(null);
        setActiveResponder(null);
        setActiveEmergencyId(null);
        setIsLoadingEmergency(false);
        return;
      }

      try {
        const emergencyRef = doc(db, 'activeEmergencies', currentUser.uid);
        
        // Set up real-time listener for emergency updates
        const unsubscribe = onSnapshot(emergencyRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setActiveEmergencyType(data.emergencyType);
            setActiveEmergencyId(currentUser.uid);
            
            if (data.userLocation) {
              setUserLocation(data.userLocation);
            }

            // If there's an assigned responder, fetch their current data
            if (data.assignedResponderId) {
              const responderDoc = await getDoc(doc(db, 'responders', data.assignedResponderId));
              if (responderDoc.exists()) {
                const responderData = responderDoc.data();
                let distance = data.responderDistance || 5;
                
                // Recalculate distance if we have both locations
                if (data.userLocation && responderData.location) {
                  distance = calculateDistance(
                    data.userLocation.latitude,
                    data.userLocation.longitude,
                    responderData.location.latitude,
                    responderData.location.longitude
                  );
                }
                
                const formattedResponder = formatResponderData(
                  { id: data.assignedResponderId, ...responderData },
                  data.emergencyType,
                  distance
                );
                setActiveResponder(formattedResponder);
              }
            } else if (data.responder) {
              // Use stored responder data as fallback
              setActiveResponder(data.responder);
            }
          } else {
            setActiveEmergencyType(null);
            setActiveResponder(null);
            setActiveEmergencyId(null);
          }
          setIsLoadingEmergency(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.log('Error loading active emergency:', error);
        setIsLoadingEmergency(false);
      }
    };

    loadActiveEmergency();
  }, [currentUser]);

  const activateEmergency = async (type) => {
    const user = auth.currentUser;
    if (!user?.uid) {
      console.log('No user logged in - cannot activate emergency');
      return { success: false, error: 'Not logged in' };
    }

    setIsSearchingResponder(true);
    setActiveEmergencyType(type);

    try {
      // First, ensure user exists in users collection
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          email: user.email || '',
          displayName: user.displayName || '',
          createdAt: new Date().toISOString(),
        }, { merge: true });
        console.log('Created user document');
      }

      // Get user's current location
      const coords = await getUserLocation();
      
      if (!coords) {
        console.log('Could not get user location');
        setIsSearchingResponder(false);
        return { success: false, error: 'Could not get location' };
      }

      // Find nearest available responder
      let nearestResponder = null;
      try {
        nearestResponder = await findNearestResponder(type, coords);
      } catch (responderError) {
        console.log('Error finding responder (continuing without):', responderError);
      }
      
      let responderData = null;
      let assignedResponderId = null;

      if (nearestResponder) {
        responderData = formatResponderData(nearestResponder, type, nearestResponder.distance);
        assignedResponderId = nearestResponder.id;
        setActiveResponder(responderData);
      } else {
        console.log('No available responders found');
      }

      // Save emergency to Firestore FIRST
      const emergencyRef = doc(db, 'activeEmergencies', user.uid);
      const dataToSave = {
        emergencyType: type,
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || '',
        status: 'active',
        createdAt: serverTimestamp(),
        userLocation: coords,
        assignedResponderId: assignedResponderId,
        responderDistance: nearestResponder?.distance || null,
        responder: responderData,
      };

      await setDoc(emergencyRef, dataToSave);
      console.log('Emergency saved to database successfully');

      // THEN mark responder as busy (after emergency is saved)
      if (nearestResponder) {
        try {
          await updateDoc(doc(db, 'responders', nearestResponder.id), {
            isAvailable: false,
            currentEmergencyId: user.uid,
            updatedAt: new Date().toISOString(),
          });
          console.log('Responder marked as busy');
        } catch (responderUpdateError) {
          console.log('Error updating responder status:', responderUpdateError);
          // Don't fail the whole operation if this fails
        }
      }

      setIsSearchingResponder(false);
      return { 
        success: true, 
        responder: responderData,
        hasResponder: !!nearestResponder,
      };
    } catch (error) {
      console.log('Error activating emergency:', error);
      setIsSearchingResponder(false);
      return { success: false, error: error.message };
    }
  };

  const clearEmergency = async () => {
    const user = auth.currentUser;
    
    // If there's an assigned responder, mark them as available again
    if (activeResponder?.id) {
      try {
        await updateDoc(doc(db, 'responders', activeResponder.id), {
          isAvailable: true,
          currentEmergencyId: null,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.log('Error updating responder availability:', error);
      }
    }

    setActiveEmergencyType(null);
    setActiveResponder(null);
    setActiveEmergencyId(null);
    setUserLocation(null);

    // Delete from Firestore
    if (user?.uid) {
      try {
        const emergencyRef = doc(db, 'activeEmergencies', user.uid);
        await deleteDoc(emergencyRef);
        console.log('Emergency cleared from database successfully');
      } catch (error) {
        console.log('Error clearing emergency from database:', error);
      }
    }
  };

  const getResponderData = (type) => {
    return activeResponder;
  };

  return (
    <EmergencyContext.Provider value={{ 
      activeEmergencyType, 
      activeResponder,
      activeEmergencyId,
      isLoadingEmergency,
      isSearchingResponder,
      userLocation,
      activateEmergency, 
      clearEmergency,
      getResponderData,
    }}>
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  return useContext(EmergencyContext);
}

// Export utility functions for use in other components
export { calculateDistance, calculateETA, formatDistance };

export default EmergencyContext;
