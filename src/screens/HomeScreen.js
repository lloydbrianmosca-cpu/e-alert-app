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
    icon: 'shield',
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
    color: '#0EA5E9',
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
  };

  const handleSOSPress = () => {
    const selected = EMERGENCY_TYPES.find(t => t.id === selectedType);
    setSosPressed(true);
    
    // Simulate SOS activation
    setTimeout(() => {
      setSosPressed(false);
      alert(`🚨 SOS Alert Sent!\n\nEmergency Type: ${selected.name}\n\nHelp is on the way. Stay calm and stay safe.`);
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
          <Ionicons name="alert-circle" size={28} color="#DC2626" />
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
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToSelection}
            >
              <Ionicons name="arrow-back" size={20} color="#6B7280" />
              <Text style={styles.backButtonText}>Back to selection</Text>
            </TouchableOpacity>

            {/* Selected Emergency Type */}
            <View style={[
              styles.selectedTypeCard,
              { backgroundColor: selectedEmergency?.color }
            ]}>
              <View style={styles.selectedTypeIcon}>
                {selectedEmergency?.iconFamily === 'Ionicons' ? (
                  <Ionicons name={selectedEmergency?.icon} size={32} color="#FFFFFF" />
                ) : (
                  <FontAwesome5 name={selectedEmergency?.icon} size={32} color="#FFFFFF" />
                )}
              </View>
              <View>
                <Text style={styles.selectedTypeName}>{selectedEmergency?.name}</Text>
                <Text style={styles.selectedTypeSubtitle}>{selectedEmergency?.subtitle}</Text>
              </View>
            </View>

            {/* SOS Button */}
            <View style={styles.sosContainer}>
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
                        {sosPressed ? 'SENDING...' : 'PRESS FOR HELP'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>

            <Text style={styles.sosHint}>Press the button to send an emergency alert</Text>
          </>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => setActiveTab(item.id)}
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  selectedTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTypeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedTypeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  sosContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 16,
  },
  sosOuterRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosMiddleRing: {
    width: 175,
    height: 175,
    borderRadius: 87.5,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
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
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  sosSubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    letterSpacing: 1,
  },
  sosHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
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
