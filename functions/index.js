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
