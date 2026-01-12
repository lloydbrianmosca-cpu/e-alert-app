import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firestore';
import { auth } from '../services/firebase';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Responder data based on emergency type
const RESPONDER_DATA = {
  police: {
    name: 'Officer Juan Cruz',
    building: 'Pasay City Police Station',
    hotline: '(02) 8551-2507',
    badge: 'PNP-2451',
    avatar: 'https://i.pravatar.cc/150?img=12',
    vehicle: 'Patrol Car 7',
    eta: '3 mins',
    distance: '1.2 km',
    icon: 'local-police',
    tag: 'Police',
  },
  medical: {
    name: 'Dr. Maria Santos',
    building: 'Pasay General Hospital',
    hotline: '(02) 8831-5241',
    badge: 'DOH-8892',
    avatar: 'https://i.pravatar.cc/150?img=45',
    vehicle: 'Ambulance Unit 3',
    eta: '5 mins',
    distance: '2.4 km',
    icon: 'medical-services',
    tag: 'Medical',
  },
  fire: {
    name: 'Firefighter Mike Reyes',
    building: 'Pasay City Fire Station',
    hotline: '(02) 8831-0099',
    badge: 'BFP-3341',
    avatar: 'https://i.pravatar.cc/150?img=33',
    vehicle: 'Fire Truck 5',
    eta: '4 mins',
    distance: '1.8 km',
    icon: 'fire-truck',
    tag: 'Fire',
  },
  flood: {
    name: 'Rescue Officer Anna Lee',
    building: 'NDRRMC Rescue Center',
    hotline: '(02) 8911-5061',
    badge: 'NDRRMC-5512',
    avatar: 'https://i.pravatar.cc/150?img=28',
    vehicle: 'Rescue Boat 2',
    eta: '6 mins',
    distance: '3.1 km',
    icon: 'flood',
    tag: 'Rescue',
  },
};

const EmergencyContext = createContext({
  activeEmergencyType: null,
  activeResponder: null,
  isLoadingEmergency: true,
  activateEmergency: () => {},
  clearEmergency: () => {},
  getResponderData: () => null,
});

export function EmergencyProvider({ children }) {
  const [activeEmergencyType, setActiveEmergencyType] = useState(null);
  const [activeResponder, setActiveResponder] = useState(null);
  const [isLoadingEmergency, setIsLoadingEmergency] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // Load active emergency from Firestore on user login
  useEffect(() => {
    const loadActiveEmergency = async () => {
      if (!currentUser?.uid) {
        setActiveEmergencyType(null);
        setActiveResponder(null);
        setIsLoadingEmergency(false);
        return;
      }

      try {
        const emergencyRef = doc(db, 'activeEmergencies', currentUser.uid);
        const emergencySnap = await getDoc(emergencyRef);

        if (emergencySnap.exists()) {
          const data = emergencySnap.data();
          setActiveEmergencyType(data.emergencyType);
          setActiveResponder(RESPONDER_DATA[data.emergencyType] || null);
        } else {
          setActiveEmergencyType(null);
          setActiveResponder(null);
        }
      } catch (error) {
        console.log('Error loading active emergency:', error);
      } finally {
        setIsLoadingEmergency(false);
      }
    };

    loadActiveEmergency();
  }, [currentUser]);

  const activateEmergency = async (type) => {
    setActiveEmergencyType(type);
    setActiveResponder(RESPONDER_DATA[type] || null);

    // Save to Firestore - use auth.currentUser directly to avoid stale closure
    const user = auth.currentUser;
    console.log('Activating emergency - User UID:', user?.uid);
    console.log('Emergency type:', type);
    
    if (user?.uid) {
      try {
        const emergencyRef = doc(db, 'activeEmergencies', user.uid);
        console.log('Document path:', 'activeEmergencies/' + user.uid);
        
        const dataToSave = {
          emergencyType: type,
          userId: user.uid,
          userEmail: user.email || '',
          userName: user.displayName || '',
          status: 'active',
          createdAt: serverTimestamp(),
          responder: RESPONDER_DATA[type] || null,
        };
        console.log('Data to save:', JSON.stringify(dataToSave, null, 2));
        
        await setDoc(emergencyRef, dataToSave);
        console.log('Emergency saved to database successfully');
      } catch (error) {
        console.log('Error saving emergency to database:', error);
      }
    } else {
      console.log('No user logged in - cannot save emergency');
    }
  };

  const clearEmergency = async () => {
    setActiveEmergencyType(null);
    setActiveResponder(null);

    // Delete from Firestore - use auth.currentUser directly to avoid stale closure
    const user = auth.currentUser;
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
    return RESPONDER_DATA[type] || null;
  };

  return (
    <EmergencyContext.Provider value={{ 
      activeEmergencyType, 
      activeResponder,
      isLoadingEmergency,
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

export default EmergencyContext;
