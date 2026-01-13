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
  FlatList,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useCall } from '../context/CallContext';
import { db } from '../services/firestore';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components';

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
  police: '#1E3A8A',
  medical: '#059669',
  fire: '#DC2626',
  flood: '#0369A1',
};

// Helper function for relative time
const getRelativeTime = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
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

export default function ResponderChatsScreen({ navigation, route }) {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(true);
  const [responderData, setResponderData] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const scrollViewRef = useRef(null);

  // Check if profile is complete
  const checkProfileComplete = (data) => {
    if (!data) return false;
    const requiredFields = ['firstName', 'lastName', 'contactNumber', 'stationName', 'hotlineNumber'];
    return requiredFields.every(field => data[field] && data[field].trim() !== '');
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

  // Listen for conversations
  useEffect(() => {
    if (!user?.uid) {
      setConversations([]);
      setSelectedConversation(null);
      setMessages([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('responderId', '==', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convos = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          // Fetch user info - use participantId (the actual field name)
          let userData = null;
          if (data.participantId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', data.participantId));
              if (userDoc.exists()) {
                userData = userDoc.data();
              }
            } catch (e) {
              console.log('Error fetching user:', e);
            }
          }
          
          // Use participantName from conversation data, or fetch from user doc, or fallback
          const userName = data.participantName || 
            (userData ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() : null) || 
            'Unknown User';
            
          return {
            id: docSnap.id,
            ...data,
            userName: userName,
            userAvatar: userData?.profileImage || null,
            userContactNumber: userData?.contactNumber || data.userContactNumber || null,
          };
        })
      );
      setConversations(convos);
      setIsLoading(false);

      // If we have an emergency ID from params, find and select that conversation
      if (route?.params?.emergencyId) {
        const convo = convos.find((c) => c.emergencyId === route.params.emergencyId);
        if (convo) {
          setSelectedConversation(convo);
        }
      }
    }, (error) => {
      // Ignore permission errors on sign out
      if (error.code === 'permission-denied') {
        return;
      }
      console.log('Error subscribing to conversations:', error);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid, route?.params?.emergencyId]);

  // Listen for messages in selected conversation
  useEffect(() => {
    if (!selectedConversation?.id || !user?.uid) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'conversations', selectedConversation.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setMessages(msgs);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Mark messages as read
      markMessagesAsRead();
    }, (error) => {
      // Ignore permission errors on sign out
      if (error.code === 'permission-denied') {
        return;
      }
      console.log('Error listening to messages:', error);
    });

    return () => {
      unsubscribe();
    };
  }, [selectedConversation?.id, user?.uid]);

  useEffect(() => {
    fetchResponderData();
  }, [user]);

  // Mark messages as read
  const markMessagesAsRead = async () => {
    if (!selectedConversation?.id || !user?.uid) return;

    try {
      const convoRef = doc(db, 'conversations', selectedConversation.id);
      await updateDoc(convoRef, {
        responderUnread: 0,
      });
    } catch (error) {
      console.log('Error marking messages as read:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation?.id || isSending) return;

    setIsSending(true);
    const text = messageText.trim();
    setMessageText('');

    try {
      // Add message to conversation
      await addDoc(collection(db, 'conversations', selectedConversation.id, 'messages'), {
        text,
        senderId: user.uid,
        senderType: 'responder',
        timestamp: serverTimestamp(),
        read: false,
      });

      // Update conversation with last message
      await updateDoc(doc(db, 'conversations', selectedConversation.id), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        userUnread: (selectedConversation.userUnread || 0) + 1,
      });
    } catch (error) {
      console.log('Error sending message:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to send message',
      });
      setMessageText(text); // Restore message
    } finally {
      setIsSending(false);
    }
  };

  // Handle tab navigation
  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
    switch (tabId) {
      case 'home':
        navigation.navigate('ResponderHome');
        break;
      case 'locations':
        navigation.navigate('ResponderLocations');
        break;
      case 'history':
        navigation.navigate('ResponderEmergencyHistory');
        break;
      case 'chat':
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

  // Render conversation list item
  const renderConversationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        selectedConversation?.id === item.id && styles.conversationItemSelected,
      ]}
      onPress={() => setSelectedConversation(item)}
    >
      <View style={styles.avatarContainer}>
        {item.userAvatar ? (
          <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: `${PRIMARY_COLOR}20` }]}>
            <Ionicons name="person" size={24} color={PRIMARY_COLOR} />
          </View>
        )}
        <View
          style={[
            styles.emergencyTypeDot,
            { backgroundColor: EMERGENCY_COLORS[item.emergencyType] || '#DC2626' },
          ]}
        />
      </View>
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>{item.userName}</Text>
          <Text style={styles.conversationTime}>
            {item.lastMessageAt ? getRelativeTime(item.lastMessageAt) : ''}
          </Text>
        </View>
        <View style={styles.conversationPreview}>
          <Text style={styles.conversationMessage} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Text>
          {item.responderUnread > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: PRIMARY_COLOR }]}>
              <Text style={styles.unreadText}>{item.responderUnread}</Text>
            </View>
          )}
        </View>
        <View
          style={[
            styles.emergencyTag,
            { backgroundColor: `${EMERGENCY_COLORS[item.emergencyType] || '#DC2626'}15` },
          ]}
        >
          <Text
            style={[
              styles.emergencyTagText,
              { color: EMERGENCY_COLORS[item.emergencyType] || '#DC2626' },
            ]}
          >
            {item.emergencyType?.toUpperCase() || 'EMERGENCY'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render message item
  const renderMessage = (msg, index) => {
    const isMe = msg.senderType === 'responder';
    // Handle timestamp - it could be a Firestore Timestamp or already a Date
    const msgTime = msg.timestamp?.toDate ? msg.timestamp.toDate() : msg.timestamp;
    return (
      <View
        key={msg.id || index}
        style={[styles.messageContainer, isMe ? styles.messageRight : styles.messageLeft]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe
              ? [styles.messageBubbleRight, { backgroundColor: PRIMARY_COLOR }]
              : styles.messageBubbleLeft,
          ]}
        >
          <Text style={[styles.messageText, isMe && styles.messageTextRight]}>{msg.text}</Text>
          <Text style={[styles.messageTime, isMe && styles.messageTimeRight]}>
            {msgTime ? getRelativeTime(msgTime) : ''}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading chats...</Text>
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
          {selectedConversation ? (
            <>
              <TouchableOpacity
                onPress={() => setSelectedConversation(null)}
                style={styles.backButton}
              >
                <Ionicons name="chevron-back" size={28} color="#1D1D1F" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>{selectedConversation.userName}</Text>
                <Text style={styles.headerSubtitle}>
                  {selectedConversation.emergencyType?.toUpperCase()} Emergency
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleCallUser(
                  selectedConversation.participantId,
                  selectedConversation.userName,
                  selectedConversation.emergencyId
                )}
                style={styles.callButton}
              >
                <Ionicons name="call" size={22} color="#10B981" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('ResponderLocations', {
                    emergencyId: selectedConversation.emergencyId,
                  })
                }
                style={styles.locationButton}
              >
                <Ionicons name="location" size={24} color="#DC2626" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons name="chatbubbles" size={24} color="#DC2626" />
              <Text style={styles.headerTitle}>Messages</Text>
              <View style={{ width: 24 }} />
            </>
          )}
        </View>
      </View>

      {/* Content */}
      {selectedConversation ? (
        // Chat View
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <MaterialCommunityIcons name="message-text-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyChatText}>No messages yet</Text>
                <Text style={styles.emptyChatSubtext}>
                  Send a message to start the conversation
                </Text>
              </View>
            ) : (
              messages.map((msg, index) => renderMessage(msg, index))
            )}
          </ScrollView>

          {/* Quick Chats for Responder */}
          <View style={styles.quickChatsContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.quickChatsScroll}
            >
              {[
                'On my way!',
                'I have arrived',
                'Stay where you are',
                'Are you safe?',
              ].map((quickMsg, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickChatButton}
                  onPress={() => setMessageText(quickMsg)}
                >
                  <Text style={styles.quickChatText}>{quickMsg}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: messageText.trim() ? PRIMARY_COLOR : '#D1D5DB' },
              ]}
              onPress={sendMessage}
              disabled={!messageText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        // Conversations List
        <View style={styles.listContainer}>
          {conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="chat-remove-outline" size={80} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Conversations</Text>
              <Text style={styles.emptySubtitle}>
                When you're assigned to an emergency, you can chat with the user here
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              renderItem={renderConversationItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
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
              Please complete your profile information (name, contact number, station name, and hotline) before accessing chats.
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
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#86868B',
    marginTop: 2,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 14,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  conversationItemSelected: {
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  emergencyTypeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#F5F5F7',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  conversationTime: {
    fontSize: 12,
    color: '#86868B',
    fontWeight: '500',
  },
  conversationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationMessage: {
    flex: 1,
    fontSize: 14,
    color: '#1D1D1F',
    fontWeight: '400',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emergencyTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  emergencyTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 14,
    paddingBottom: 6,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyChatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 14,
  },
  emptyChatSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 3,
  },
  messageContainer: {
    marginBottom: 10,
  },
  messageLeft: {
    alignItems: 'flex-start',
  },
  messageRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 14,
    padding: 10,
  },
  messageBubbleLeft: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageBubbleRight: {
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 18,
  },
  messageTextRight: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  messageTimeRight: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  quickChatsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingVertical: 8,
  },
  quickChatsScroll: {
    paddingHorizontal: 10,
    gap: 6,
  },
  quickChatButton: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginRight: 6,
  },
  quickChatText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
