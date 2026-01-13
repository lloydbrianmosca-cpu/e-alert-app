import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  subscribeToConversations, 
  getOrCreateConversation, 
  sendMessage as sendFirebaseMessage,
  subscribeToMessages,
  sendMockResponderReply,
  markMessagesAsRead
} from '../services/firestore';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [activeConversations, setActiveConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Subscribe to user's conversations
  useEffect(() => {
    if (!user?.uid) {
      setActiveConversations([]);
      return;
    }

    const unsubscribe = subscribeToConversations(user.uid, (conversations) => {
      setActiveConversations(conversations);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Start or join a conversation with a responder
  const startConversation = async (responder, emergencyId = null) => {
    if (!user?.uid) return null;
    
    setLoading(true);
    try {
      const conversationId = await getOrCreateConversation(user.uid, responder, emergencyId);
      setCurrentConversationId(conversationId);
      return conversationId;
    } catch (error) {
      console.error('Error starting conversation:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to messages in current conversation
  const subscribeToCurrentMessages = (conversationId, callback) => {
    if (!conversationId) return () => {};
    
    return subscribeToMessages(conversationId, callback);
  };

  // Send a message
  const sendMessage = async (conversationId, text, hasRealResponder = false) => {
    if (!user?.uid || !conversationId || !text.trim()) return;

    try {
      await sendFirebaseMessage(conversationId, user.uid, text.trim(), 'user');
      
      // Only simulate responder reply if there's no real responder
      if (!hasRealResponder) {
        setTimeout(async () => {
          try {
            await sendMockResponderReply(conversationId, 'responder');
          } catch (error) {
            console.error('Error sending mock reply:', error);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Mark messages as read for user
  const markAsRead = async (conversationId) => {
    if (!conversationId) return;
    try {
      await markMessagesAsRead(conversationId, 'user');
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Legacy function for backwards compatibility
  const addOrUpdateConversation = (responder, lastMessage) => {
    // This is now handled automatically by Firebase subscription
    console.log('addOrUpdateConversation called - now handled by Firebase');
  };

  const clearConversations = () => {
    setActiveConversations([]);
    setCurrentConversationId(null);
    setMessages([]);
  };

  return (
    <ChatContext.Provider
      value={{
        activeConversations,
        currentConversationId,
        messages,
        loading,
        startConversation,
        sendMessage,
        subscribeToCurrentMessages,
        addOrUpdateConversation,
        clearConversations,
        markAsRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
