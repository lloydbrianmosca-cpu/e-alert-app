import React, { createContext, useContext, useState } from 'react';

const EmergencyContext = createContext({
  activeEmergencyType: null,
  activateEmergency: () => {},
  clearEmergency: () => {},
});

export function EmergencyProvider({ children }) {
  const [activeEmergencyType, setActiveEmergencyType] = useState(null);

  const activateEmergency = (type) => {
    setActiveEmergencyType(type);
  };

  const clearEmergency = () => {
    setActiveEmergencyType(null);
  };

  return (
    <EmergencyContext.Provider value={{ activeEmergencyType, activateEmergency, clearEmergency }}>
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  return useContext(EmergencyContext);
}

export default EmergencyContext;
