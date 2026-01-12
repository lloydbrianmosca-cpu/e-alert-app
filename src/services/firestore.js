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
 */
export const getOrCreateConversation = async (userId, responder) => {
  const conversationId = `${userId}_${responder.name.replace(/\s+/g, '_')}`;
  const conversationRef = doc(db, 'conversations', conversationId);
  
  const conversationSnap = await getDoc(conversationRef);
  
  if (!conversationSnap.exists()) {
    await setDoc(conversationRef, {
      id: conversationId,
      participantId: userId,
      responderName: responder.name,
      responderType: responder.tag,
      responderAvatar: responder.avatar,
      responderBuilding: responder.building,
      emergencyType: responder.emergencyType,
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      unreadCount: 0,
      expiresAt: getExpirationDate(), // Auto-delete after 3 days
    });
  } else {
    // Reset expiration when conversation is accessed
    await updateDoc(conversationRef, {
      expiresAt: getExpirationDate(),
    });
  }
  
  return conversationId;
};

/**
 * Send a message in a conversation
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
  
  // Update last message in conversation
  const conversationRef = doc(db, 'conversations', conversationId);
  await updateDoc(conversationRef, {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
  });
  
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
  });
};

/**
 * Subscribe to user's conversations
 */
export const subscribeToConversations = (userId, callback) => {
  const conversationsRef = collection(db, 'conversations');
  const q = query(
    conversationsRef, 
    where('participantId', '==', userId),
    orderBy('lastMessageAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastMessageAt: doc.data().lastMessageAt?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    }));
    callback(conversations);
  });
};

/**
 * Send a mock responder reply (simulates responder response)
 */
export const sendMockResponderReply = async (conversationId, responderName) => {
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