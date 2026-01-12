import React, { createContext, useContext, useState } from 'react';

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

  const addOrUpdateConversation = (responder, lastMessage) => {
    setActiveConversations(prev => {
      const existingIndex = prev.findIndex(
        conv => conv.responderName === responder.name
      );

      const conversationData = {
        id: existingIndex >= 0 ? prev[existingIndex].id : Date.now(),
        responderName: responder.name,
        responderType: responder.tag,
        responderAvatar: responder.avatar,
        responderBuilding: responder.building,
        lastMessage: lastMessage,
        timestamp: 'Just now',
        unreadCount: 0,
        isOnline: true,
        emergencyType: responder.emergencyType,
      };

      if (existingIndex >= 0) {
        // Update existing conversation
        const updated = [...prev];
        updated[existingIndex] = conversationData;
        return updated;
      } else {
        // Add new conversation at the top
        return [conversationData, ...prev];
      }
    });
  };

  const clearConversations = () => {
    setActiveConversations([]);
  };

  return (
    <ChatContext.Provider
      value={{
        activeConversations,
        addOrUpdateConversation,
        clearConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
