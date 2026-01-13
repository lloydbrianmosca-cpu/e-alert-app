import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { doc, getDoc } from 'firebase/firestore';

// Helper function for relative time (used globally)
const getRelativeTime = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffSecs < 30) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString();
};

// Component for real-time updating timestamp
const RelativeTime = ({ date, style }) => {
  const [timeString, setTimeString] = useState(getRelativeTime(date));
  
  useEffect(() => {
    // Update immediately
    setTimeString(getRelativeTime(date));
    
    // Update every 10 seconds for real-time feel
    const interval = setInterval(() => {
      setTimeString(getRelativeTime(date));
    }, 10000);
    
    return () => clearInterval(interval);
  }, [date]);
  
  return <Text style={style}>{timeString}</Text>;
};

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

export default function ChatScreen({ navigation, route }) {
  const responder = route?.params?.responder;
  const { 
    activeConversations, 
    startConversation, 
    sendMessage: sendChatMessage, 
    subscribeToCurrentMessages,
    markAsRead,
    loading: chatLoading 
  } = useChat();
  const [activeTab, setActiveTab] = useState('chat');
  const [message, setMessage] = useState('');
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasRealResponder, setHasRealResponder] = useState(false);
  const scrollViewRef = useRef(null);

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

  // Initialize conversation and subscribe to messages when responder is present
  useEffect(() => {
    if (!responder || !user?.uid) {
      setIsLoadingMessages(false);
      return;
    }

    let unsubscribe = () => {};

    const initConversation = async () => {
      setIsLoadingMessages(true);
      try {
        // Check if responder has a real ID (is a real responder account)
        const isRealResponder = !!responder.id;
        setHasRealResponder(isRealResponder);
        
        const convId = await startConversation(responder);
        console.log('Conversation initialized with ID:', convId, 'Real responder:', isRealResponder);
        if (convId) {
          setConversationId(convId);
          
          // Mark messages as read when entering conversation
          await markAsRead(convId);
          
          unsubscribe = subscribeToCurrentMessages(convId, (msgs) => {
            setMessages(msgs);
            setIsLoadingMessages(false);
            // Mark as read when new messages arrive
            markAsRead(convId);
          });
        } else {
          console.error('Failed to create conversation');
          setIsLoadingMessages(false);
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
        setIsLoadingMessages(false);
      }
    };

    initConversation();

    return () => unsubscribe();
  }, [responder, user?.uid]);

  const getEmergencyColor = (type) => {
    return EMERGENCY_COLORS[type] || '#6B7280';
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // If no conversationId yet, wait for it
    if (!conversationId) {
      console.log('No conversation ID yet, waiting...');
      return;
    }
    
    const messageText = message.trim();
    setMessage('');
    setIsSending(true);
    
    try {
      // Pass whether there's a real responder to avoid mock replies
      await sendChatMessage(conversationId, messageText, hasRealResponder);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the message if sending failed
      setMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render conversation view when responder is passed
  if (responder) {
    return (
      <View style={styles.container}>
        <ExpoStatusBar style="light" />
        <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

        {/* Conversation Header */}
        <View style={[styles.header, { backgroundColor: '#DC2626' }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Image
            source={{ uri: responder.avatar }}
            style={styles.headerAvatar}
          />
          <View style={styles.headerInfo}>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerName}>{responder.name}</Text>
              <View style={[styles.responderTag, { backgroundColor: getEmergencyColor(responder.emergencyType) }]}>
                <Text style={styles.responderTagText}>{responder.tag}</Text>
              </View>
            </View>
            <Text style={styles.headerBuilding}>{responder.building}</Text>
          </View>
          <TouchableOpacity style={styles.callHeaderButton}>
            <Ionicons name="call" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {isLoadingMessages ? (
              <View style={styles.loadingMessages}>
                <ActivityIndicator size="large" color="#DC2626" />
                <Text style={styles.loadingMessagesText}>Loading messages...</Text>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.noMessagesContainer}>
                <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
                <Text style={styles.noMessagesText}>No messages yet</Text>
                <Text style={styles.noMessagesSubtext}>Send a message to start the conversation</Text>
              </View>
            ) : (
              messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    msg.senderType === 'user' ? styles.userMessage : styles.responderMessage,
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    msg.senderType === 'user' ? styles.userMessageText : styles.responderMessageText,
                  ]}>
                    {msg.text}
                  </Text>
                  <RelativeTime 
                    date={msg.timestamp} 
                    style={[
                      styles.messageTime,
                      msg.senderType === 'user' ? styles.userMessageTime : styles.responderMessageTime,
                    ]} 
                  />
                </View>
              ))
            )}
          </ScrollView>

          {/* Quick Chats */}
          <View style={styles.quickChatsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChatsScroll}>
              {['Please help ASAP!', 'I\'m safe now', 'Need more time', 'Where are you?', 'Thank you!'].map((quickMsg, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickChatButton}
                  onPress={() => setMessage(quickMsg)}
                >
                  <Text style={styles.quickChatText}>{quickMsg}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder={conversationId ? "Type a message..." : "Connecting..."}
              placeholderTextColor="#9CA3AF"
              value={message}
              onChangeText={setMessage}
              multiline
              editable={!!conversationId && !isSending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!conversationId || isSending || !message.trim()) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!conversationId || isSending || !message.trim()}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

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
        // Navigate to individual chat with responder - include responder ID
        navigation.push('Chat', {
          responder: {
            id: conversation.responderId, // Include the responder ID for proper conversation linking
            name: conversation.responderName,
            avatar: conversation.responderAvatar,
            building: conversation.responderBuilding,
            tag: conversation.responderType,
            emergencyType: conversation.emergencyType,
          }
        });
      }}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: conversation.responderAvatar }}
          style={styles.avatar}
        />
        <View style={styles.onlineBadge} />
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
          <RelativeTime date={conversation.lastMessageAt} style={styles.timestamp} />
        </View>
        <Text style={styles.responderType}>{conversation.responderType}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {conversation.lastMessage || 'No messages yet'}
        </Text>
      </View>

      {(conversation.userUnread > 0) && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{conversation.userUnread}</Text>
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
        {activeConversations.length > 0 && (
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
        {activeConversations.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Active Conversations ({activeConversations.length})
            </Text>
            {activeConversations.map((conversation) =>
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
              } else if (item.id === 'locations') {
                navigation.navigate('Locations');
              } else if (item.id === 'hotline') {
                navigation.navigate('Hotlines');
              } else if (item.id === 'profile') {
                navigation.navigate('Profile');
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
    backgroundColor: '#FFFFFF',
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
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  emergencyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  responderType: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 3,
  },
  lastMessage: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  unreadBadge: {
    backgroundColor: '#DC2626',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    alignSelf: 'center',
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  backHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  backHomeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 28,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#DC2626',
    fontWeight: '600',
  },
  // Conversation View Styles
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  responderTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  responderTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerBuilding: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  callHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 14,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '78%',
    marginBottom: 10,
    padding: 10,
    borderRadius: 14,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DC2626',
    borderBottomRightRadius: 4,
  },
  responderMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  responderMessageText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  responderMessageTime: {
    color: '#9CA3AF',
  },
  quickChatsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingVertical: 8,
  },
  quickChatsScroll: {
    paddingHorizontal: 12,
    gap: 6,
  },
  quickChatButton: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  quickChatText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#DC2626',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 10,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  loadingMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingMessagesText: {
    marginTop: 10,
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  noMessagesText: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  noMessagesSubtext: {
    marginTop: 6,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
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
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
    width: '100%',
  },
  overlayButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
