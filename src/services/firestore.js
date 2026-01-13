import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDocs,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { app } from './firebase';

const db = getFirestore(app);

// Helper to calculate expiration date (3 days from now)
const getExpirationDate = () => {
  const now = new Date();
  now.setDate(now.getDate() + 3); // Add 3 days
  return Timestamp.fromDate(now);
};

// Chat-related functions

/**
 * Create or get a conversation between user and responder
 * @param {string} userId - The user's UID
 * @param {object} responder - Responder object with id, name, tag, avatar, building, emergencyType
 * @param {string} emergencyId - Optional: The emergency ID to link the conversation
 */
export const getOrCreateConversation = async (userId, responder, emergencyId = null) => {
  // Use responder.id if available, otherwise fall back to name-based ID
  const responderId = responder.id || responder.name?.replace(/\s+/g, '_') || 'unknown';
  
  // Create a unique conversation ID using both user and responder IDs
  const conversationId = `${userId}_${responderId}`;
  const conversationRef = doc(db, 'conversations', conversationId);
  
  const conversationSnap = await getDoc(conversationRef);
  
  if (!conversationSnap.exists()) {
    // Fetch user data for the conversation
    let userData = null;
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        userData = userDoc.data();
      }
    } catch (e) {
      console.log('Error fetching user data:', e);
    }

    // Fetch responder data to get latest profileImage if responder has a real ID
    let responderData = {
      name: responder.name,
      type: responder.tag,
      avatar: responder.avatar,
      building: responder.building,
      emergencyType: responder.emergencyType,
    };

    if (responderId && responder.id) {
      try {
        const responderDoc = await getDoc(doc(db, 'responders', responder.id));
        if (responderDoc.exists()) {
          const respData = responderDoc.data();
          responderData = {
            name: respData.firstName ? `${respData.firstName} ${respData.lastName}`.trim() : responder.name,
            type: respData.responderType || responder.tag,
            avatar: respData.profileImage || responder.avatar, // Use profileImage if available
            building: respData.stationName || responder.building,
            emergencyType: responder.emergencyType,
          };
        }
      } catch (e) {
        console.log('Error fetching responder data:', e);
      }
    }

    await setDoc(conversationRef, {
      id: conversationId,
      participantId: userId, // User ID
      participantName: userData ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() : 'User',
      participantEmail: userData?.email || '',
      participantAvatar: userData?.profileImage || null, // Store user's profile picture
      responderId: responder.id || null, // Real responder's UID
      responderName: responderData.name,
      responderType: responderData.type,
      responderAvatar: responderData.avatar,
      responderBuilding: responderData.building,
      emergencyType: responderData.emergencyType,
      emergencyId: emergencyId || userId, // Link to emergency
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      userUnread: 0, // Unread count for user
      responderUnread: 0, // Unread count for responder
      expiresAt: getExpirationDate(), // Auto-delete after 3 days
      status: 'active',
    });
  } else {
    // Reset expiration when conversation is accessed
    // Also update responder ID if it was missing before
    const updateData = {
      expiresAt: getExpirationDate(),
    };
    
    // If responder ID is now available but wasn't before, update it
    const existingData = conversationSnap.data();
    if (!existingData.responderId && responder.id) {
      updateData.responderId = responder.id;
      
      // Also fetch and update responder's latest profile image
      try {
        const responderDoc = await getDoc(doc(db, 'responders', responder.id));
        if (responderDoc.exists()) {
          const respData = responderDoc.data();
          updateData.responderAvatar = respData.profileImage || existingData.responderAvatar;
          updateData.responderName = respData.firstName ? `${respData.firstName} ${respData.lastName}`.trim() : existingData.responderName;
          updateData.responderType = respData.responderType || existingData.responderType;
        }
      } catch (e) {
        console.log('Error updating responder profile:', e);
      }
    }
    
    await updateDoc(conversationRef, updateData);
  }
  
  return conversationId;
};

/**
 * Send a message in a conversation
 * @param {string} conversationId - The conversation ID
 * @param {string} senderId - The sender's user ID
 * @param {string} text - The message text
 * @param {string} senderType - 'user' or 'responder'
 */
export const sendMessage = async (conversationId, senderId, text, senderType = 'user') => {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  
  const messageData = {
    text,
    senderId,
    senderType, // 'user' or 'responder'
    timestamp: serverTimestamp(),
    read: false,
  };
  
  const docRef = await addDoc(messagesRef, messageData);
  
  // Update last message and unread counts in conversation
  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationSnap = await getDoc(conversationRef);
  const conversationData = conversationSnap.data() || {};
  
  // Increment unread count for the OTHER party
  const updateData = {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
  };
  
  if (senderType === 'user') {
    // User sent message, increment responder's unread count
    updateData.responderUnread = (conversationData.responderUnread || 0) + 1;
  } else {
    // Responder sent message, increment user's unread count
    updateData.userUnread = (conversationData.userUnread || 0) + 1;
  }
  
  await updateDoc(conversationRef, updateData);
  
  return docRef.id;
};

/**
 * Subscribe to messages in a conversation
 */
export const subscribeToMessages = (conversationId, callback) => {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    }));
    callback(messages);
  }, (error) => {
    // Ignore permission errors on sign out
    if (error.code === 'permission-denied') {
      callback([]);
      return;
    }
    console.error('Error subscribing to messages:', error);
    callback([]);
  });
};

/**
 * Subscribe to user's conversations
 * Also refreshes responder profile images from their documents
 */
export const subscribeToConversations = (userId, callback) => {
  const conversationsRef = collection(db, 'conversations');
  const q = query(
    conversationsRef, 
    where('participantId', '==', userId),
    orderBy('lastMessageAt', 'desc')
  );
  
  return onSnapshot(q, async (snapshot) => {
    const conversations = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let responderAvatar = data.responderAvatar;
        
        // Fetch latest profile image from responder document if available
        if (data.responderId) {
          try {
            const responderDoc = await getDoc(doc(db, 'responders', data.responderId));
            if (responderDoc.exists()) {
              const respData = responderDoc.data();
              if (respData.profileImage) {
                responderAvatar = respData.profileImage;
                // Update conversation with latest avatar (async, don't wait)
                updateDoc(doc(db, 'conversations', docSnap.id), {
                  responderAvatar: respData.profileImage,
                }).catch(() => {}); // Silent fail
              }
            }
          } catch (e) {
            // Silent fail - use cached avatar
          }
        }
        
        return {
          id: docSnap.id,
          ...data,
          responderAvatar,
          lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      })
    );
    callback(conversations);
  }, (error) => {
    // Ignore permission errors on sign out
    if (error.code === 'permission-denied') {
      callback([]);
      return;
    }
    console.error('Error subscribing to conversations:', error);
    callback([]);
  });
};

/**
 * Subscribe to responder's assigned conversations (for responder accounts)
 * Also refreshes user profile images from their documents
 */
export const subscribeToResponderConversations = (responderId, callback) => {
  const conversationsRef = collection(db, 'conversations');
  const q = query(
    conversationsRef, 
    where('responderId', '==', responderId),
    orderBy('lastMessageAt', 'desc')
  );
  
  return onSnapshot(q, async (snapshot) => {
    const conversations = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let participantAvatar = data.participantAvatar;
        
        // Fetch latest profile image from user document if available
        if (data.participantId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.participantId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.profileImage) {
                participantAvatar = userData.profileImage;
                // Update conversation with latest avatar (async, don't wait)
                updateDoc(doc(db, 'conversations', docSnap.id), {
                  participantAvatar: userData.profileImage,
                }).catch(() => {}); // Silent fail
              }
            }
          } catch (e) {
            // Silent fail - use cached avatar
          }
        }
        
        return {
          id: docSnap.id,
          ...data,
          participantAvatar,
          lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      })
    );
    callback(conversations);
  }, (error) => {
    // Ignore permission errors on sign out
    if (error.code === 'permission-denied') {
      callback([]);
      return;
    }
    console.error('Error subscribing to responder conversations:', error);
    callback([]);
  });
};

/**
 * Assign a responder to an existing conversation
 */
export const assignResponderToConversation = async (conversationId, responderId) => {
  const conversationRef = doc(db, 'conversations', conversationId);
  await updateDoc(conversationRef, {
    responderId: responderId,
  });
};

/**
 * Mark messages as read for a user or responder
 * @param {string} conversationId - The conversation ID
 * @param {string} readerType - 'user' or 'responder'
 */
export const markMessagesAsRead = async (conversationId, readerType = 'user') => {
  const conversationRef = doc(db, 'conversations', conversationId);
  
  const updateData = {};
  if (readerType === 'user') {
    updateData.userUnread = 0;
  } else {
    updateData.responderUnread = 0;
  }
  
  await updateDoc(conversationRef, updateData);
};

/**
 * Get a conversation by user and responder IDs
 * @param {string} userId - The user's UID
 * @param {string} responderId - The responder's UID
 */
export const getConversationByParticipants = async (userId, responderId) => {
  const conversationId = `${userId}_${responderId}`;
  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationSnap = await getDoc(conversationRef);
  
  if (conversationSnap.exists()) {
    return {
      id: conversationSnap.id,
      ...conversationSnap.data(),
    };
  }
  return null;
};

/**
 * Send a mock responder reply (simulates responder response)
 * Only used for testing when no real responder is available
 */
export const sendMockResponderReply = async (conversationId, responderName) => {
  // Get the conversation to check if there's a real responder
  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationSnap = await getDoc(conversationRef);
  
  if (conversationSnap.exists()) {
    const data = conversationSnap.data();
    // Only send mock reply if there's no real responder
    if (data.responderId) {
      console.log('Real responder exists, skipping mock reply');
      return;
    }
  }
  
  const replies = [
    'Thank you for the update. We are almost there.',
    'Please stay calm and remain where you are.',
    'We have your location. Help is on the way.',
    'Understood. Our team is responding now.',
    'Stay safe. We will be there shortly.',
  ];
  
  const randomReply = replies[Math.floor(Math.random() * replies.length)];
  
  await sendMessage(conversationId, responderName, randomReply, 'responder');
};

export { db };