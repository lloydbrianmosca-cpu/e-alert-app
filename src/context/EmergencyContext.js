import React, { createContext, useContext, useState } from 'react';

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
  activateEmergency: () => {},
  clearEmergency: () => {},
  getResponderData: () => null,
});

export function EmergencyProvider({ children }) {
  const [activeEmergencyType, setActiveEmergencyType] = useState(null);
  const [activeResponder, setActiveResponder] = useState(null);

  const activateEmergency = (type) => {
    setActiveEmergencyType(type);
    setActiveResponder(RESPONDER_DATA[type] || null);
  };

  const clearEmergency = () => {
    setActiveEmergencyType(null);
    setActiveResponder(null);
  };

  const getResponderData = (type) => {
    return RESPONDER_DATA[type] || null;
  };

  return (
    <EmergencyContext.Provider value={{ 
      activeEmergencyType, 
      activeResponder,
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
