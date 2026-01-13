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
import { db } from '../services/firestore';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components';

// Bottom navigation items - unified with user screens
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
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
    if (!user?.uid) return;

    const q = query(
      collection(db, 'conversations'),
      where('responderId', '==', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convos = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          // Fetch user info
          let userData = null;
          if (data.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', data.userId));
              if (userDoc.exists()) {
                userData = userDoc.data();
              }
            } catch (e) {
              console.log('Error fetching user:', e);
            }
          }
          return {
            id: docSnap.id,
            ...data,
            userName: userData
              ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User'
              : 'Unknown User',
            userAvatar: userData?.profileImage || null,
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
    });

    return () => unsubscribe();
  }, [user, route?.params?.emergencyId]);

  // Listen for messages in selected conversation
  useEffect(() => {
    if (!selectedConversation?.id) return;

    const q = query(
      collection(db, 'conversations', selectedConversation.id, 'messages'),
      orderBy('createdAt', 'asc')
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
    });

    return () => unsubscribe();
  }, [selectedConversation]);

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
        createdAt: serverTimestamp(),
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
      case 'chat':
        break;
      case 'profile':
        navigation.navigate('ResponderProfile');
        break;
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
            {msg.createdAt ? getRelativeTime(msg.createdAt) : ''}
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
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />

      {/* Header - Unified with user screens */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {selectedConversation ? (
            <>
              <TouchableOpacity
                onPress={() => setSelectedConversation(null)}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>{selectedConversation.userName}</Text>
                <Text style={styles.headerSubtitle}>
                  {selectedConversation.emergencyType?.toUpperCase()} Emergency
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('ResponderLocations', {
                    emergencyId: selectedConversation.emergencyId,
                  })
                }
                style={styles.locationButton}
              >
                <Ionicons name="location" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
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
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#DC2626',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  locationButton: {
    padding: 4,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTypeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  conversationTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  conversationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  conversationMessage: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
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
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emergencyTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyChatText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  messageContainer: {
    marginBottom: 12,
  },
  messageLeft: {
    alignItems: 'flex-start',
  },
  messageRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  messageBubbleLeft: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageBubbleRight: {
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  messageTextRight: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeRight: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#111827',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Profile Incomplete Overlay Styles
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
