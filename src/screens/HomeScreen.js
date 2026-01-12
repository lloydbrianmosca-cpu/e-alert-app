import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar,
  ScrollView,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const BOX_SIZE = (width - 60) / 2;

// Emergency categories
const EMERGENCY_TYPES = [
  {
    id: 'police',
    name: 'Police',
    subtitle: 'PNP Emergency',
    icon: 'user-shield',
    iconFamily: 'FontAwesome5',
    color: '#1E3A8A',
    lightColor: '#DBEAFE',
  },
  {
    id: 'fire',
    name: 'Fireman',
    subtitle: 'BFP Emergency',
    icon: 'fire-extinguisher',
    iconFamily: 'FontAwesome5',
    color: '#DC2626',
    lightColor: '#FEE2E2',
  },
  {
    id: 'medical',
    name: 'Medical',
    subtitle: 'Health Emergency',
    icon: 'hospital',
    iconFamily: 'FontAwesome5',
    color: '#059669',
    lightColor: '#D1FAE5',
  },
  {
    id: 'flood',
    name: 'Flood',
    subtitle: 'Disaster Alert',
    icon: 'water',
    iconFamily: 'Ionicons',
    color: '#0369A1',
    lightColor: '#E0F2FE',
  },
];

// Bottom navigation items
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
  { id: 'hotline', name: 'Hotlines', icon: 'call', iconFamily: 'Ionicons' },
  { id: 'chat', name: 'Chat', icon: 'chatbubbles', iconFamily: 'Ionicons' },
  { id: 'profile', name: 'Profile', icon: 'person', iconFamily: 'Ionicons' },
];

export default function HomeScreen({ navigation }) {
  const [selectedType, setSelectedType] = useState(null);
  const [showSOS, setShowSOS] = useState(false);
  const [sosPressed, setSosPressed] = useState(false);
  const [sosCount, setSosCount] = useState(0);
  const [activeTab, setActiveTab] = useState('home');
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Pulse animation for SOS button
  React.useEffect(() => {
    if (showSOS) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [showSOS]);

  const handleEmergencyTypeSelect = (type) => {
    setSelectedType(type.id);
    setShowSOS(true);
  };

  const handleBackToSelection = () => {
    setShowSOS(false);
    setSelectedType(null);
    setSosCount(0);
  };

  const handleSOSPress = () => {
    const newCount = sosCount + 1;
    setSosCount(newCount);
    
    if (newCount < 3) {
      return;
    }
    
    const selected = EMERGENCY_TYPES.find(t => t.id === selectedType);
    setSosPressed(true);
    
    // Simulate SOS activation and redirect to Locations
    setTimeout(() => {
      setSosPressed(false);
      setSosCount(0);
      navigation.navigate('Locations', { emergencyType: selectedType });
    }, 1500);
  };

  const renderIcon = (item, size = 32) => {
    const color = selectedType === item.id ? '#FFFFFF' : item.color;
    
    switch (item.iconFamily) {
      case 'FontAwesome5':
        return <FontAwesome5 name={item.icon} size={size} color={color} />;
      case 'Ionicons':
        return <Ionicons name={item.icon} size={size} color={color} />;
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={item.icon} size={size} color={color} />;
      default:
        return <MaterialIcons name={item.icon} size={size} color={color} />;
    }
  };

  const selectedEmergency = EMERGENCY_TYPES.find(t => t.id === selectedType);

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello, <Text style={styles.userName}>User</Text></Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Image
            source={{ uri: 'https://i.pravatar.cc/150?img=8' }}
            style={styles.profileImage}
          />
          <View style={styles.onlineIndicator} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Ionicons name="alert-circle" size={36} color="#DC2626" />
          <Text style={styles.titleText}>E-Alert</Text>
        </View>
        
        {!showSOS ? (
          <>
            <Text style={styles.subtitleText}>Select an emergency type</Text>

            {/* Emergency Type Grid */}
            <View style={styles.gridContainer}>
              {EMERGENCY_TYPES.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.emergencyBox,
                    { backgroundColor: item.lightColor },
                  ]}
                  onPress={() => handleEmergencyTypeSelect(item)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: 'rgba(0,0,0,0.05)' }
                  ]}>
                    {item.iconFamily === 'Ionicons' ? (
                      <Ionicons name={item.icon} size={48} color={item.color} />
                    ) : (
                      <FontAwesome5 name={item.icon} size={48} color={item.color} />
                    )}
                  </View>
                  <Text style={[styles.boxTitle, { color: item.color }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.boxSubtitle, { color: item.color }]}>
                    {item.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Selected Emergency Type - Clickable to go back */}
            <TouchableOpacity 
              style={[
                styles.selectedTypeCard,
                { backgroundColor: selectedEmergency?.color }
              ]}
              onPress={handleBackToSelection}
              activeOpacity={0.8}
            >
              <View style={styles.selectedTypeIcon}>
                {selectedEmergency?.iconFamily === 'Ionicons' ? (
                  <Ionicons name={selectedEmergency?.icon} size={48} color="#FFFFFF" />
                ) : (
                  <FontAwesome5 name={selectedEmergency?.icon} size={48} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.selectedTypeInfo}>
                <Text style={styles.selectedTypeName}>{selectedEmergency?.name}</Text>
                <Text style={styles.selectedTypeSubtitle}>{selectedEmergency?.subtitle}</Text>
                <Text style={styles.selectedTypeHint}>Click here to change emergency type</Text>
              </View>
            </TouchableOpacity>

            {/* SOS Button */}
            <View style={styles.sosContainer}>
              <Text style={styles.sosPressCount}>
                {sosCount}/3 Presses
              </Text>
              <Animated.View style={[
                styles.sosOuterRing,
                { transform: [{ scale: pulseAnim }] }
              ]}>
                <View style={styles.sosMiddleRing}>
                  <TouchableOpacity
                    style={[
                      styles.sosButton,
                      sosPressed && styles.sosButtonPressed,
                    ]}
                    onPress={handleSOSPress}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={sosPressed ? ['#991B1B', '#7F1D1D'] : ['#DC2626', '#B91C1C']}
                      style={styles.sosGradient}
                    >
                      <Text style={styles.sosText}>SOS</Text>
                      <Text style={styles.sosSubtext}>
                        {sosPressed ? 'SENDING...' : `TAP ${3 - sosCount}x`}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>

            <Text style={styles.sosHint}>Press the button 3 times to send emergency alert</Text>

            {/* Emergency Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color="#DC2626" />
                <Text style={styles.infoText}>After pressing the button 3 times, your location will be shared.</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="notifications" size={20} color="#DC2626" />
                <Text style={styles.infoText}>Nearest emergency service will automatically be notified.</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time" size={20} color="#DC2626" />
                <Text style={styles.infoText}>ETA and distance will be shown once button is active.</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => {
              setActiveTab(item.id);
              if (item.id === 'chat') {
                navigation.navigate('Chat');
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
    paddingBottom: 20,
    backgroundColor: '#DC2626',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileButton: {
    position: 'relative',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
  },
  subtitleText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
    justifyContent: 'center',
  },
  emergencyBox: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  boxTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  boxSubtitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectedTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 26,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  selectedTypeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTypeInfo: {
    flex: 1,
  },
  selectedTypeName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  selectedTypeSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  selectedTypeHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 10,
    fontStyle: 'italic',
  },
  sosContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  sosPressCount: {
    fontSize: 25,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 25,
  },
  sosOuterRing: {
    width: 380,
    height: 380,
    borderRadius: 300,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosMiddleRing: {
    width: 300,
    height: 300,
    borderRadius: 300,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButton: {
    width: 300,
    height: 300,
    borderRadius: 330,
    overflow: 'hidden',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  sosButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  sosGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: {
    fontSize: 68,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
  },
  sosSubtext: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    letterSpacing: 2,
  },
  sosHint: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  infoText: {
    fontSize: 18,
    color: '#4B5563',
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
