import React, { useState, useMemo, useEffect } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { doc, getDoc } from 'firebase/firestore';

// Bottom navigation items
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
  { id: 'hotline', name: 'Hotlines', icon: 'call', iconFamily: 'Ionicons' },
  { id: 'chat', name: 'Chat', icon: 'chatbubbles', iconFamily: 'Ionicons' },
  { id: 'profile', name: 'Profile', icon: 'person', iconFamily: 'Ionicons' },
];

// Sample hotline data
const HOTLINES_DATA = [
  // National Hotlines
  { id: 1, name: 'National Emergency Hotline', number: '911', type: 'general', city: 'National', province: 'All', agency: 'All Agencies' },
  { id: 2, name: 'Philippine Red Cross', number: '143', type: 'medical', city: 'National', province: 'All', agency: 'Medical/Ambulance' },
  { id: 3, name: 'NDRRMC Operations Center', number: '(02) 8911-5061', type: 'general', city: 'National', province: 'All', agency: 'Disaster Response' },
  { id: 4, name: 'DOH Health Hotline', number: '1555', type: 'medical', city: 'National', province: 'All', agency: 'Department of Health' },
  // Metro Manila - Manila
  { id: 5, name: 'PNP Hotline - Manila', number: '(02) 8242-7777', type: 'police', city: 'Manila', province: 'Metro Manila', agency: 'PNP' },
  { id: 6, name: 'BFP Hotline - Manila', number: '(02) 8426-0219', type: 'fire', city: 'Manila', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  { id: 7, name: 'Manila Rescue Unit', number: '(02) 8527-0000', type: 'medical', city: 'Manila', province: 'Metro Manila', agency: 'Medical/Ambulance' },
  // Metro Manila - Quezon City
  { id: 8, name: 'PNP Hotline - Quezon City', number: '(02) 8372-0650', type: 'police', city: 'Quezon City', province: 'Metro Manila', agency: 'PNP' },
  { id: 9, name: 'BFP Hotline - Quezon City', number: '(02) 8373-5341', type: 'fire', city: 'Quezon City', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  { id: 10, name: 'QC Rescue Team', number: '(02) 8988-6143', type: 'medical', city: 'Quezon City', province: 'Metro Manila', agency: 'Medical/Ambulance' },
  // Metro Manila - Makati
  { id: 11, name: 'PNP Hotline - Makati', number: '(02) 8870-1500', type: 'police', city: 'Makati', province: 'Metro Manila', agency: 'PNP' },
  { id: 12, name: 'BFP Hotline - Makati', number: '(02) 8844-5131', type: 'fire', city: 'Makati', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  { id: 13, name: 'Makati Rescue', number: '(02) 8870-1900', type: 'medical', city: 'Makati', province: 'Metro Manila', agency: 'Medical/Ambulance' },
  // Metro Manila - Pasig
  { id: 14, name: 'PNP Hotline - Pasig', number: '(02) 8642-2611', type: 'police', city: 'Pasig', province: 'Metro Manila', agency: 'PNP' },
  { id: 15, name: 'BFP Hotline - Pasig', number: '(02) 8642-7171', type: 'fire', city: 'Pasig', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  { id: 16, name: 'Pasig City Rescue', number: '(02) 8631-1234', type: 'medical', city: 'Pasig', province: 'Metro Manila', agency: 'Medical/Ambulance' },
  // Metro Manila - Taguig
  { id: 17, name: 'PNP Hotline - Taguig', number: '(02) 8837-0880', type: 'police', city: 'Taguig', province: 'Metro Manila', agency: 'PNP' },
  { id: 18, name: 'BFP Hotline - Taguig', number: '(02) 8838-7171', type: 'fire', city: 'Taguig', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  { id: 19, name: 'Taguig Rescue', number: '(02) 8789-3200', type: 'medical', city: 'Taguig', province: 'Metro Manila', agency: 'Medical/Ambulance' },
  // Metro Manila - Parañaque
  { id: 20, name: 'PNP Hotline - Parañaque', number: '(02) 8825-0357', type: 'police', city: 'Parañaque', province: 'Metro Manila', agency: 'PNP' },
  { id: 21, name: 'BFP Hotline - Parañaque', number: '(02) 8821-0319', type: 'fire', city: 'Parañaque', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  { id: 22, name: 'Parañaque Rescue', number: '(02) 8825-5555', type: 'medical', city: 'Parañaque', province: 'Metro Manila', agency: 'Medical/Ambulance' },
  // Metro Manila - Las Piñas
  { id: 23, name: 'PNP Hotline - Las Piñas', number: '(02) 8872-5000', type: 'police', city: 'Las Piñas', province: 'Metro Manila', agency: 'PNP' },
  { id: 24, name: 'BFP Hotline - Las Piñas', number: '(02) 8874-4710', type: 'fire', city: 'Las Piñas', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  // Metro Manila - Muntinlupa
  { id: 25, name: 'PNP Hotline - Muntinlupa', number: '(02) 8862-0378', type: 'police', city: 'Muntinlupa', province: 'Metro Manila', agency: 'PNP' },
  { id: 26, name: 'BFP Hotline - Muntinlupa', number: '(02) 8861-3117', type: 'fire', city: 'Muntinlupa', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  // Metro Manila - Caloocan
  { id: 27, name: 'PNP Hotline - Caloocan', number: '(02) 8288-8811', type: 'police', city: 'Caloocan', province: 'Metro Manila', agency: 'PNP' },
  { id: 28, name: 'BFP Hotline - Caloocan', number: '(02) 8287-2966', type: 'fire', city: 'Caloocan', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  // Metro Manila - Malabon
  { id: 29, name: 'PNP Hotline - Malabon', number: '(02) 8283-5050', type: 'police', city: 'Malabon', province: 'Metro Manila', agency: 'PNP' },
  { id: 30, name: 'BFP Hotline - Malabon', number: '(02) 8283-0121', type: 'fire', city: 'Malabon', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  // Metro Manila - Navotas
  { id: 31, name: 'PNP Hotline - Navotas', number: '(02) 8282-2222', type: 'police', city: 'Navotas', province: 'Metro Manila', agency: 'PNP' },
  { id: 32, name: 'BFP Hotline - Navotas', number: '(02) 8282-1234', type: 'fire', city: 'Navotas', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  // Metro Manila - Valenzuela
  { id: 33, name: 'PNP Hotline - Valenzuela', number: '(02) 8292-0666', type: 'police', city: 'Valenzuela', province: 'Metro Manila', agency: 'PNP' },
  { id: 34, name: 'BFP Hotline - Valenzuela', number: '(02) 8293-0311', type: 'fire', city: 'Valenzuela', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  // Metro Manila - Marikina
  { id: 35, name: 'PNP Hotline - Marikina', number: '(02) 8646-1500', type: 'police', city: 'Marikina', province: 'Metro Manila', agency: 'PNP' },
  { id: 36, name: 'BFP Hotline - Marikina', number: '(02) 8646-0888', type: 'fire', city: 'Marikina', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  { id: 37, name: 'Marikina Rescue', number: '(02) 8646-1111', type: 'medical', city: 'Marikina', province: 'Metro Manila', agency: 'Medical/Ambulance' },
  // Metro Manila - San Juan
  { id: 38, name: 'PNP Hotline - San Juan', number: '(02) 8725-5820', type: 'police', city: 'San Juan', province: 'Metro Manila', agency: 'PNP' },
  { id: 39, name: 'BFP Hotline - San Juan', number: '(02) 8724-5151', type: 'fire', city: 'San Juan', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  // Metro Manila - Mandaluyong
  { id: 40, name: 'PNP Hotline - Mandaluyong', number: '(02) 8534-7777', type: 'police', city: 'Mandaluyong', province: 'Metro Manila', agency: 'PNP' },
  { id: 41, name: 'BFP Hotline - Mandaluyong', number: '(02) 8531-0151', type: 'fire', city: 'Mandaluyong', province: 'Metro Manila', agency: 'Bureau of Fire Protection' },
  // Metro Manila - Pateros
  { id: 42, name: 'PNP Hotline - Pateros', number: '(02) 8642-8888', type: 'police', city: 'Pateros', province: 'Metro Manila', agency: 'PNP' },
  // Cebu
  { id: 43, name: 'PNP Hotline - Cebu City', number: '(032) 253-0888', type: 'police', city: 'Cebu City', province: 'Cebu', agency: 'PNP' },
  { id: 44, name: 'BFP Hotline - Cebu City', number: '(032) 253-0151', type: 'fire', city: 'Cebu City', province: 'Cebu', agency: 'Bureau of Fire Protection' },
  { id: 45, name: 'Cebu City Medical Center', number: '(032) 255-8000', type: 'medical', city: 'Cebu City', province: 'Cebu', agency: 'Medical/Ambulance' },
  { id: 46, name: 'PNP Hotline - Mandaue', number: '(032) 344-4444', type: 'police', city: 'Mandaue', province: 'Cebu', agency: 'PNP' },
  { id: 47, name: 'BFP Hotline - Mandaue', number: '(032) 344-0151', type: 'fire', city: 'Mandaue', province: 'Cebu', agency: 'Bureau of Fire Protection' },
  { id: 48, name: 'PNP Hotline - Lapu-Lapu', number: '(032) 340-0117', type: 'police', city: 'Lapu-Lapu', province: 'Cebu', agency: 'PNP' },
  { id: 49, name: 'BFP Hotline - Lapu-Lapu', number: '(032) 340-5555', type: 'fire', city: 'Lapu-Lapu', province: 'Cebu', agency: 'Bureau of Fire Protection' },
  // Davao
  { id: 50, name: 'PNP Hotline - Davao City', number: '(082) 227-3535', type: 'police', city: 'Davao City', province: 'Davao del Sur', agency: 'PNP' },
  { id: 51, name: 'BFP Hotline - Davao City', number: '(082) 221-2222', type: 'fire', city: 'Davao City', province: 'Davao del Sur', agency: 'Bureau of Fire Protection' },
  { id: 52, name: 'Davao Central 911', number: '(082) 911', type: 'general', city: 'Davao City', province: 'Davao del Sur', agency: 'All Agencies' },
  { id: 53, name: 'Davao Medical Center', number: '(082) 227-2731', type: 'medical', city: 'Davao City', province: 'Davao del Sur', agency: 'Medical/Ambulance' },
  // Iloilo
  { id: 54, name: 'PNP Hotline - Iloilo City', number: '(033) 337-5515', type: 'police', city: 'Iloilo City', province: 'Iloilo', agency: 'PNP' },
  { id: 55, name: 'BFP Hotline - Iloilo City', number: '(033) 335-0151', type: 'fire', city: 'Iloilo City', province: 'Iloilo', agency: 'Bureau of Fire Protection' },
  { id: 56, name: 'Iloilo Rescue', number: '(033) 337-8888', type: 'medical', city: 'Iloilo City', province: 'Iloilo', agency: 'Medical/Ambulance' },
  // Bacolod
  { id: 57, name: 'PNP Hotline - Bacolod', number: '(034) 435-1661', type: 'police', city: 'Bacolod City', province: 'Negros Occidental', agency: 'PNP' },
  { id: 58, name: 'BFP Hotline - Bacolod', number: '(034) 434-0151', type: 'fire', city: 'Bacolod City', province: 'Negros Occidental', agency: 'Bureau of Fire Protection' },
  { id: 59, name: 'Bacolod Emergency', number: '(034) 435-9000', type: 'medical', city: 'Bacolod City', province: 'Negros Occidental', agency: 'Medical/Ambulance' },
  // Cagayan de Oro
  { id: 60, name: 'PNP Hotline - CDO', number: '(088) 857-2222', type: 'police', city: 'Cagayan de Oro', province: 'Misamis Oriental', agency: 'PNP' },
  { id: 61, name: 'BFP Hotline - CDO', number: '(088) 857-0151', type: 'fire', city: 'Cagayan de Oro', province: 'Misamis Oriental', agency: 'Bureau of Fire Protection' },
  { id: 62, name: 'CDO Rescue', number: '(088) 858-4000', type: 'medical', city: 'Cagayan de Oro', province: 'Misamis Oriental', agency: 'Medical/Ambulance' },
  // Zamboanga
  { id: 63, name: 'PNP Hotline - Zamboanga', number: '(062) 991-2226', type: 'police', city: 'Zamboanga City', province: 'Zamboanga del Sur', agency: 'PNP' },
  { id: 64, name: 'BFP Hotline - Zamboanga', number: '(062) 991-0151', type: 'fire', city: 'Zamboanga City', province: 'Zamboanga del Sur', agency: 'Bureau of Fire Protection' },
  // General Santos
  { id: 65, name: 'PNP Hotline - GenSan', number: '(083) 552-5252', type: 'police', city: 'General Santos', province: 'South Cotabato', agency: 'PNP' },
  { id: 66, name: 'BFP Hotline - GenSan', number: '(083) 552-0151', type: 'fire', city: 'General Santos', province: 'South Cotabato', agency: 'Bureau of Fire Protection' },
  // Baguio
  { id: 67, name: 'PNP Hotline - Baguio', number: '(074) 442-5174', type: 'police', city: 'Baguio City', province: 'Benguet', agency: 'PNP' },
  { id: 68, name: 'BFP Hotline - Baguio', number: '(074) 442-5171', type: 'fire', city: 'Baguio City', province: 'Benguet', agency: 'Bureau of Fire Protection' },
  { id: 69, name: 'Baguio General Hospital', number: '(074) 442-4216', type: 'medical', city: 'Baguio City', province: 'Benguet', agency: 'Medical/Ambulance' },
  // Dagupan
  { id: 70, name: 'PNP Hotline - Dagupan', number: '(075) 522-4142', type: 'police', city: 'Dagupan', province: 'Pangasinan', agency: 'PNP' },
  { id: 71, name: 'BFP Hotline - Dagupan', number: '(075) 522-0151', type: 'fire', city: 'Dagupan', province: 'Pangasinan', agency: 'Bureau of Fire Protection' },
  // San Fernando (La Union)
  { id: 72, name: 'PNP Hotline - San Fernando LU', number: '(072) 888-5555', type: 'police', city: 'San Fernando', province: 'La Union', agency: 'PNP' },
  { id: 73, name: 'BFP Hotline - San Fernando LU', number: '(072) 888-0151', type: 'fire', city: 'San Fernando', province: 'La Union', agency: 'Bureau of Fire Protection' },
  // Laoag
  { id: 74, name: 'PNP Hotline - Laoag', number: '(077) 772-0027', type: 'police', city: 'Laoag City', province: 'Ilocos Norte', agency: 'PNP' },
  { id: 75, name: 'BFP Hotline - Laoag', number: '(077) 772-0151', type: 'fire', city: 'Laoag City', province: 'Ilocos Norte', agency: 'Bureau of Fire Protection' },
  // Vigan
  { id: 76, name: 'PNP Hotline - Vigan', number: '(077) 722-2966', type: 'police', city: 'Vigan City', province: 'Ilocos Sur', agency: 'PNP' },
  { id: 77, name: 'BFP Hotline - Vigan', number: '(077) 722-0151', type: 'fire', city: 'Vigan City', province: 'Ilocos Sur', agency: 'Bureau of Fire Protection' },
  // Tuguegarao
  { id: 78, name: 'PNP Hotline - Tuguegarao', number: '(078) 844-1500', type: 'police', city: 'Tuguegarao', province: 'Cagayan', agency: 'PNP' },
  { id: 79, name: 'BFP Hotline - Tuguegarao', number: '(078) 844-0151', type: 'fire', city: 'Tuguegarao', province: 'Cagayan', agency: 'Bureau of Fire Protection' },
  // Legazpi
  { id: 80, name: 'PNP Hotline - Legazpi', number: '(052) 480-5911', type: 'police', city: 'Legazpi City', province: 'Albay', agency: 'PNP' },
  { id: 81, name: 'BFP Hotline - Legazpi', number: '(052) 480-0151', type: 'fire', city: 'Legazpi City', province: 'Albay', agency: 'Bureau of Fire Protection' },
  // Naga
  { id: 82, name: 'PNP Hotline - Naga', number: '(054) 472-1814', type: 'police', city: 'Naga City', province: 'Camarines Sur', agency: 'PNP' },
  { id: 83, name: 'BFP Hotline - Naga', number: '(054) 472-0151', type: 'fire', city: 'Naga City', province: 'Camarines Sur', agency: 'Bureau of Fire Protection' },
  // Tacloban
  { id: 84, name: 'PNP Hotline - Tacloban', number: '(053) 321-2046', type: 'police', city: 'Tacloban City', province: 'Leyte', agency: 'PNP' },
  { id: 85, name: 'BFP Hotline - Tacloban', number: '(053) 321-0151', type: 'fire', city: 'Tacloban City', province: 'Leyte', agency: 'Bureau of Fire Protection' },
  { id: 86, name: 'Tacloban Rescue', number: '(053) 832-1000', type: 'medical', city: 'Tacloban City', province: 'Leyte', agency: 'Medical/Ambulance' },
  // Butuan
  { id: 87, name: 'PNP Hotline - Butuan', number: '(085) 342-5046', type: 'police', city: 'Butuan City', province: 'Agusan del Norte', agency: 'PNP' },
  { id: 88, name: 'BFP Hotline - Butuan', number: '(085) 342-0151', type: 'fire', city: 'Butuan City', province: 'Agusan del Norte', agency: 'Bureau of Fire Protection' },
  // Puerto Princesa
  { id: 89, name: 'PNP Hotline - Puerto Princesa', number: '(048) 433-2046', type: 'police', city: 'Puerto Princesa', province: 'Palawan', agency: 'PNP' },
  { id: 90, name: 'BFP Hotline - Puerto Princesa', number: '(048) 433-0151', type: 'fire', city: 'Puerto Princesa', province: 'Palawan', agency: 'Bureau of Fire Protection' },
  // Tagbilaran
  { id: 91, name: 'PNP Hotline - Tagbilaran', number: '(038) 411-3071', type: 'police', city: 'Tagbilaran', province: 'Bohol', agency: 'PNP' },
  { id: 92, name: 'BFP Hotline - Tagbilaran', number: '(038) 411-0151', type: 'fire', city: 'Tagbilaran', province: 'Bohol', agency: 'Bureau of Fire Protection' },
  // Dumaguete
  { id: 93, name: 'PNP Hotline - Dumaguete', number: '(035) 225-4246', type: 'police', city: 'Dumaguete', province: 'Negros Oriental', agency: 'PNP' },
  { id: 94, name: 'BFP Hotline - Dumaguete', number: '(035) 225-0151', type: 'fire', city: 'Dumaguete', province: 'Negros Oriental', agency: 'Bureau of Fire Protection' },
  // Roxas
  { id: 95, name: 'PNP Hotline - Roxas', number: '(036) 621-0314', type: 'police', city: 'Roxas City', province: 'Capiz', agency: 'PNP' },
  { id: 96, name: 'BFP Hotline - Roxas', number: '(036) 621-0151', type: 'fire', city: 'Roxas City', province: 'Capiz', agency: 'Bureau of Fire Protection' },
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
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const { user } = useAuth();

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
            showsVerticalScrollIndicator={true}
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    maxHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
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
    fontSize: 15,
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
});
