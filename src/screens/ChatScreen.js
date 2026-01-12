import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Sample chat data - uncomment to test with data
/*
const SAMPLE_CONVERSATIONS = [
  {
    id: 1,
    responderName: 'Officer Juan Cruz',
    responderType: 'Police',
    responderAvatar: 'https://i.pravatar.cc/150?img=12',
    lastMessage: 'We are on our way. ETA 3 minutes.',
    timestamp: '2 min ago',
    unreadCount: 2,
    isOnline: true,
    emergencyType: 'police',
  },
  {
    id: 2,
    responderName: 'Dr. Maria Santos',
    responderType: 'Medical',
    responderAvatar: 'https://i.pravatar.cc/150?img=45',
    lastMessage: 'Please stay calm. Help is coming.',
    timestamp: '5 min ago',
    unreadCount: 0,
    isOnline: true,
    emergencyType: 'medical',
  },
  {
    id: 3,
    responderName: 'Firefighter Mike Reyes',
    responderType: 'Fireman',
    responderAvatar: 'https://i.pravatar.cc/150?img=33',
    lastMessage: 'We received your location. Stay safe.',
    timestamp: '15 min ago',
    unreadCount: 1,
    isOnline: false,
    emergencyType: 'fire',
  },
];
*/

const EMERGENCY_COLORS = {
  police: '#1E3A8A',
  medical: '#059669',
  fire: '#DC2626',
  flood: '#0369A1',
};

// Bottom navigation items
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
  { id: 'hotline', name: 'Hotlines', icon: 'call', iconFamily: 'Ionicons' },
  { id: 'chat', name: 'Chat', icon: 'chatbubbles', iconFamily: 'Ionicons' },
  { id: 'profile', name: 'Profile', icon: 'person', iconFamily: 'Ionicons' },
];

export default function ChatScreen({ navigation }) {
  // Set to empty array for empty state, or use SAMPLE_CONVERSATIONS for testing
  const [conversations, setConversations] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');

  const getEmergencyColor = (type) => {
    return EMERGENCY_COLORS[type] || '#6B7280';
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="chatbubbles-outline" size={80} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>No Active Conversations</Text>
      <Text style={styles.emptySubtitle}>
        When you send an emergency alert, responders will be able to chat with you here.
      </Text>
      <TouchableOpacity
        style={styles.backHomeButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Ionicons name="home" size={20} color="#FFFFFF" />
        <Text style={styles.backHomeText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConversationItem = (conversation) => (
    <TouchableOpacity
      key={conversation.id}
      style={styles.conversationCard}
      activeOpacity={0.7}
      onPress={() => {
        // TODO: Navigate to individual chat screen
        console.log('Open chat with:', conversation.responderName);
      }}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: conversation.responderAvatar }}
          style={styles.avatar}
        />
        {conversation.isOnline && <View style={styles.onlineBadge} />}
        <View
          style={[
            styles.emergencyBadge,
            { backgroundColor: getEmergencyColor(conversation.emergencyType) },
          ]}
        >
          <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.responderName}>{conversation.responderName}</Text>
          <Text style={styles.timestamp}>{conversation.timestamp}</Text>
        </View>
        <Text style={styles.responderType}>{conversation.responderType}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {conversation.lastMessage}
        </Text>
      </View>

      {conversation.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="chatbubbles" size={28} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Emergency Chats</Text>
        </View>
        {conversations.length > 0 && (
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="search" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {conversations.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Active Conversations ({conversations.length})
            </Text>
            {conversations.map((conversation) =>
              renderConversationItem(conversation)
            )}
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
              if (item.id === 'home') {
                navigation.navigate('Home');
              } else if (item.id === 'chat') {
                // Already on chat screen
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
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  emergencyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  responderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  responderType: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#DC2626',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    alignSelf: 'center',
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyIconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  backHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  backHomeText: {
    fontSize: 16,
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
});
