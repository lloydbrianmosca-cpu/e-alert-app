import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { app } from './firebase';

const db = getFirestore(app);

// User roles
export const USER_ROLES = {
  USER: 'user',
  RESPONDER: 'responder',
  ADMIN: 'admin',
};

// ==================== USER MANAGEMENT ====================

// Create user profile with role
export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      role: userData.role || USER_ROLES.USER,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { success: true, data: { id: userSnap.id, ...userSnap.data() } };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};

// Update user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};

// Get all users (admin only)
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: users };
  } catch (error) {
    console.error('Error getting all users:', error);
    return { success: false, error: error.message };
  }
};

// Get users by role
export const getUsersByRole = async (role) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', role));
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: users };
  } catch (error) {
    console.error('Error getting users by role:', error);
    return { success: false, error: error.message };
  }
};

// Update user role (admin only)
export const updateUserRole = async (userId, newRole) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: error.message };
  }
};

// ==================== EMERGENCY MANAGEMENT ====================

// Create emergency request
export const createEmergency = async (emergencyData) => {
  try {
    const emergenciesRef = collection(db, 'emergencies');
    const docRef = await addDoc(emergenciesRef, {
      ...emergencyData,
      status: 'pending', // pending, assigned, in_progress, resolved, cancelled
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating emergency:', error);
    return { success: false, error: error.message };
  }
};

// Get emergency by ID
export const getEmergency = async (emergencyId) => {
  try {
    const emergencyRef = doc(db, 'emergencies', emergencyId);
    const emergencySnap = await getDoc(emergencyRef);
    
    if (emergencySnap.exists()) {
      return { success: true, data: { id: emergencySnap.id, ...emergencySnap.data() } };
    }
    return { success: false, error: 'Emergency not found' };
  } catch (error) {
    console.error('Error getting emergency:', error);
    return { success: false, error: error.message };
  }
};

// Get all emergencies (admin/responder)
export const getAllEmergencies = async (status = null) => {
  try {
    const emergenciesRef = collection(db, 'emergencies');
    let q;
    
    if (status) {
      q = query(emergenciesRef, where('status', '==', status), orderBy('createdAt', 'desc'));
    } else {
      q = query(emergenciesRef, orderBy('createdAt', 'desc'));
    }
    
    const querySnapshot = await getDocs(q);
    
    const emergencies = [];
    querySnapshot.forEach((doc) => {
      emergencies.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: emergencies };
  } catch (error) {
    console.error('Error getting emergencies:', error);
    return { success: false, error: error.message };
  }
};

// Get emergencies for a specific user
export const getUserEmergencies = async (userId) => {
  try {
    const emergenciesRef = collection(db, 'emergencies');
    const q = query(emergenciesRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const emergencies = [];
    querySnapshot.forEach((doc) => {
      emergencies.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: emergencies };
  } catch (error) {
    console.error('Error getting user emergencies:', error);
    return { success: false, error: error.message };
  }
};

// Get emergencies assigned to a responder
export const getResponderEmergencies = async (responderId) => {
  try {
    const emergenciesRef = collection(db, 'emergencies');
    // Simple query without orderBy to avoid needing composite index
    const q = query(emergenciesRef, where('responderId', '==', responderId));
    const querySnapshot = await getDocs(q);
    
    const emergencies = [];
    querySnapshot.forEach((doc) => {
      emergencies.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort client-side by createdAt descending
    emergencies.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    
    return { success: true, data: emergencies };
  } catch (error) {
    console.error('Error getting responder emergencies:', error);
    return { success: false, error: error.message };
  }
};

// Update emergency status
export const updateEmergencyStatus = async (emergencyId, status, additionalData = {}) => {
  try {
    const emergencyRef = doc(db, 'emergencies', emergencyId);
    await updateDoc(emergencyRef, {
      status,
      ...additionalData,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating emergency status:', error);
    return { success: false, error: error.message };
  }
};

// Assign responder to emergency
export const assignResponder = async (emergencyId, responderId, responderData) => {
  try {
    const emergencyRef = doc(db, 'emergencies', emergencyId);
    await updateDoc(emergencyRef, {
      responderId,
      responderData,
      status: 'assigned',
      assignedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error assigning responder:', error);
    return { success: false, error: error.message };
  }
};

// ==================== RESPONDER MANAGEMENT ====================

// Agency/Department mapping
export const RESPONDER_AGENCIES = {
  police: 'PNP',
  fire: 'BFP',
  medical: 'Medical',
  flood: 'MDRRMO',
};

// Get agency name from emergency type
const getAgencyFromType = (emergencyType) => {
  return RESPONDER_AGENCIES[emergencyType] || emergencyType?.toUpperCase();
};

// Initialize agency document if it doesn't exist
const initializeAgency = async (agencyName) => {
  try {
    const agencyRef = doc(db, 'responders', agencyName);
    const agencySnap = await getDoc(agencyRef);
    
    if (!agencySnap.exists()) {
      await setDoc(agencyRef, {
        name: agencyName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error initializing agency:', error);
    return { success: false, error: error.message };
  }
};

// Create responder profile under agency
export const createResponderProfile = async (userId, responderData) => {
  try {
    const agencyName = getAgencyFromType(responderData.emergencyType);
    
    // Initialize agency if needed
    await initializeAgency(agencyName);
    
    // Create responder under agency/members subcollection
    const responderRef = doc(db, 'responders', agencyName, 'members', userId);
    await setDoc(responderRef, {
      ...responderData,
      userId,
      agency: agencyName,
      isAvailable: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating responder profile:', error);
    return { success: false, error: error.message };
  }
};

// Get responder profile
export const getResponderProfile = async (userId, emergencyType = null) => {
  try {
    // If emergency type is provided, look in specific agency
    if (emergencyType) {
      const agencyName = getAgencyFromType(emergencyType);
      const responderRef = doc(db, 'responders', agencyName, 'members', userId);
      const responderSnap = await getDoc(responderRef);
      
      if (responderSnap.exists()) {
        return { success: true, data: { id: responderSnap.id, ...responderSnap.data() } };
      }
    }
    
    // Search all agencies for the responder
    const agencies = Object.values(RESPONDER_AGENCIES);
    for (const agency of agencies) {
      const responderRef = doc(db, 'responders', agency, 'members', userId);
      const responderSnap = await getDoc(responderRef);
      
      if (responderSnap.exists()) {
        return { success: true, data: { id: responderSnap.id, ...responderSnap.data() } };
      }
    }
    
    return { success: false, error: 'Responder profile not found' };
  } catch (error) {
    console.error('Error getting responder profile:', error);
    return { success: false, error: error.message };
  }
};

// Update responder availability
export const updateResponderAvailability = async (userId, isAvailable, emergencyType = null) => {
  try {
    // Find the responder first
    const profileResult = await getResponderProfile(userId, emergencyType);
    if (!profileResult.success) {
      return { success: false, error: 'Responder not found' };
    }
    
    const agencyName = profileResult.data.agency;
    const responderRef = doc(db, 'responders', agencyName, 'members', userId);
    await updateDoc(responderRef, {
      isAvailable,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating responder availability:', error);
    return { success: false, error: error.message };
  }
};

// Get available responders by type/agency
export const getAvailableResponders = async (emergencyType) => {
  try {
    const agencyName = getAgencyFromType(emergencyType);
    const membersRef = collection(db, 'responders', agencyName, 'members');
    const q = query(membersRef, where('isAvailable', '==', true));
    const querySnapshot = await getDocs(q);
    
    const responders = [];
    querySnapshot.forEach((doc) => {
      responders.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: responders };
  } catch (error) {
    console.error('Error getting available responders:', error);
    return { success: false, error: error.message };
  }
};

// Get all members of an agency
export const getAgencyMembers = async (agencyName) => {
  try {
    const membersRef = collection(db, 'responders', agencyName, 'members');
    const querySnapshot = await getDocs(membersRef);
    
    const members = [];
    querySnapshot.forEach((doc) => {
      members.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by createdAt descending
    members.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    
    return { success: true, data: members };
  } catch (error) {
    console.error('Error getting agency members:', error);
    return { success: false, error: error.message };
  }
};

// Get all agencies with their member counts
export const getAllAgencies = async () => {
  try {
    const agencies = [];
    
    for (const [type, agencyName] of Object.entries(RESPONDER_AGENCIES)) {
      const membersRef = collection(db, 'responders', agencyName, 'members');
      const querySnapshot = await getDocs(membersRef);
      
      const members = [];
      let availableCount = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        members.push({ id: doc.id, ...data });
        if (data.isAvailable) availableCount++;
      });
      
      agencies.push({
        id: agencyName,
        name: agencyName,
        type,
        totalMembers: members.length,
        availableMembers: availableCount,
        members,
      });
    }
    
    return { success: true, data: agencies };
  } catch (error) {
    console.error('Error getting all agencies:', error);
    return { success: false, error: error.message };
  }
};

// ==================== REAL-TIME LISTENERS ====================

// Listen to emergencies in real-time (for admin dashboard)
export const subscribeToEmergencies = (callback) => {
  const emergenciesRef = collection(db, 'emergencies');
  const q = query(emergenciesRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const emergencies = [];
    snapshot.forEach((doc) => {
      emergencies.push({ id: doc.id, ...doc.data() });
    });
    callback(emergencies);
  });
};

// Listen to pending emergencies (for responders)
export const subscribeToPendingEmergencies = (emergencyType, callback) => {
  const emergenciesRef = collection(db, 'emergencies');
  // Simplified query - filter by type only, then filter status client-side
  const q = query(
    emergenciesRef, 
    where('type', '==', emergencyType)
  );
  
  return onSnapshot(q, (snapshot) => {
    const emergencies = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Filter for pending or assigned status client-side
      if (data.status === 'pending' || data.status === 'assigned') {
        emergencies.push({ id: doc.id, ...data });
      }
    });
    // Sort client-side by createdAt descending
    emergencies.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    callback(emergencies);
  }, (error) => {
    console.error('Error in pending emergencies listener:', error);
    callback([]);
  });
};

// ==================== STATISTICS (ADMIN) ====================

export const getStatistics = async () => {
  try {
    // Get counts
    const usersSnap = await getDocs(collection(db, 'users'));
    const emergenciesSnap = await getDocs(collection(db, 'emergencies'));
    const respondersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'responder')));
    
    // Count by status
    let pending = 0, assigned = 0, inProgress = 0, resolved = 0;
    emergenciesSnap.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'pending') pending++;
      else if (data.status === 'assigned') assigned++;
      else if (data.status === 'in_progress') inProgress++;
      else if (data.status === 'resolved') resolved++;
    });
    
    return {
      success: true,
      data: {
        totalUsers: usersSnap.size,
        totalEmergencies: emergenciesSnap.size,
        totalResponders: respondersSnap.size,
        emergenciesByStatus: {
          pending,
          assigned,
          inProgress,
          resolved,
        },
      },
    };
  } catch (error) {
    console.error('Error getting statistics:', error);
    return { success: false, error: error.message };
  }
};

export { db };
