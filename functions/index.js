const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/**
 * Scheduled function to delete expired conversations
 * Runs every day at midnight
 */
exports.deleteExpiredConversations = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    
    console.log('Running expired conversations cleanup...');
    
    try {
      // Query conversations that have expired
      const expiredConversations = await db
        .collection('conversations')
        .where('expiresAt', '<=', now)
        .get();
      
      if (expiredConversations.empty) {
        console.log('No expired conversations found.');
        return null;
      }
      
      console.log(`Found ${expiredConversations.size} expired conversations to delete.`);
      
      // Delete each expired conversation and its messages subcollection
      const deletePromises = expiredConversations.docs.map(async (conversationDoc) => {
        const conversationId = conversationDoc.id;
        
        // First, delete all messages in the subcollection
        const messagesSnapshot = await db
          .collection('conversations')
          .doc(conversationId)
          .collection('messages')
          .get();
        
        const messageDeletePromises = messagesSnapshot.docs.map((messageDoc) => 
          messageDoc.ref.delete()
        );
        
        await Promise.all(messageDeletePromises);
        console.log(`Deleted ${messagesSnapshot.size} messages from conversation ${conversationId}`);
        
        // Then delete the conversation document
        await conversationDoc.ref.delete();
        console.log(`Deleted conversation: ${conversationId}`);
      });
      
      await Promise.all(deletePromises);
      
      console.log('Expired conversations cleanup completed successfully.');
      return null;
    } catch (error) {
      console.error('Error deleting expired conversations:', error);
      throw error;
    }
  });

/**
 * HTTP endpoint to manually trigger cleanup (for testing)
 * Can be called via: https://[region]-[project-id].cloudfunctions.net/manualCleanup
 */
exports.manualCleanup = functions.https.onRequest(async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  
  const now = admin.firestore.Timestamp.now();
  
  try {
    const expiredConversations = await db
      .collection('conversations')
      .where('expiresAt', '<=', now)
      .get();
    
    if (expiredConversations.empty) {
      res.json({ message: 'No expired conversations found.', deleted: 0 });
      return;
    }
    
    let deletedCount = 0;
    
    for (const conversationDoc of expiredConversations.docs) {
      const conversationId = conversationDoc.id;
      
      // Delete messages subcollection
      const messagesSnapshot = await db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .get();
      
      for (const messageDoc of messagesSnapshot.docs) {
        await messageDoc.ref.delete();
      }
      
      // Delete conversation
      await conversationDoc.ref.delete();
      deletedCount++;
    }
    
    res.json({ 
      message: 'Cleanup completed successfully.', 
      deleted: deletedCount 
    });
  } catch (error) {
    console.error('Error during manual cleanup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Callable function to delete a user from Firebase Auth
 * Only admins can call this function
 */
exports.deleteUserAuth = functions.https.onCall(async (data, context) => {
  // Check if the caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to delete users.'
    );
  }

  const callerUid = context.auth.uid;
  
  // Check if caller is an admin
  const callerDoc = await db.collection('users').doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can delete users.'
    );
  }

  const { userId, collectionName } = data;
  
  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'User ID is required.'
    );
  }

  try {
    // Delete from Firebase Auth
    await admin.auth().deleteUser(userId);
    console.log(`Successfully deleted user ${userId} from Firebase Auth`);
    
    // Delete from Firestore
    const collection = collectionName === 'responders' ? 'responders' : 'users';
    await db.collection(collection).doc(userId).delete();
    console.log(`Successfully deleted user ${userId} from Firestore ${collection}`);
    
    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Error deleting user:', error);
    
    // If auth deletion fails but it's because user doesn't exist in auth, still try to delete from Firestore
    if (error.code === 'auth/user-not-found') {
      try {
        const collection = collectionName === 'responders' ? 'responders' : 'users';
        await db.collection(collection).doc(userId).delete();
        return { success: true, message: 'User document deleted (auth account not found)' };
      } catch (firestoreError) {
        throw new functions.https.HttpsError('internal', firestoreError.message);
      }
    }
    
    throw new functions.https.HttpsError('internal', error.message);
  }
});
