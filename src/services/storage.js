import { storage } from './firebase';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

/**
 * Request permission to access photo library
 */
export const requestPhotoPermission = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
};

/**
 * Request permission to access camera
 */
export const requestCameraPermission = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
};

/**
 * Pick an image from photo library
 */
export const pickImageFromLibrary = async () => {
  try {
    const hasPermission = await requestPhotoPermission();
    if (!hasPermission) {
      throw new Error('Photo library permission denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.log('Error picking image:', error);
    throw error;
  }
};

/**
 * Take a photo with camera
 */
export const takePhoto = async () => {
  try {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.log('Error taking photo:', error);
    throw error;
  }
};

/**
 * Upload profile image to Firebase Storage
 * @param {string} userId - The user's ID
 * @param {string} userType - 'user' or 'responder'
 * @param {object} imageAsset - Image asset from ImagePicker
 */
export const uploadProfileImage = async (userId, userType, imageAsset) => {
  try {
    if (!imageAsset || !imageAsset.uri) {
      throw new Error('Invalid image asset');
    }

    // Create a reference to the file
    const fileName = `${userType}/${userId}/profile-${Date.now()}.jpg`;
    const storageRef = ref(storage, fileName);

    // Read the file as a blob
    const response = await fetch(imageAsset.uri);
    const blob = await response.blob();

    // Upload the file
    const snapshot = await uploadBytes(storageRef, blob);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.log('Error uploading profile image:', error);
    throw error;
  }
};

/**
 * Delete profile image from Firebase Storage
 * @param {string} userId - The user's ID
 * @param {string} userType - 'user' or 'responder'
 * @param {string} imageUrl - The full download URL of the image
 */
export const deleteProfileImage = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    
    // Decode the URL to get the file path
    const decodedUrl = decodeURIComponent(imageUrl);
    const filePath = decodedUrl.split('/o/')[1]?.split('?')[0];
    
    if (!filePath) {
      console.log('Could not extract file path from URL');
      return;
    }

    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
  } catch (error) {
    console.log('Error deleting profile image:', error);
    // Don't throw - deletion errors shouldn't break the app
  }
};

/**
 * Update profile image in Firestore and Storage
 * @param {string} userId - The user's ID
 * @param {string} userType - 'user' or 'responder'
 * @param {object} imageAsset - Image asset from ImagePicker
 * @param {string} currentImageUrl - Current image URL (for deletion)
 * @param {function} updateFirestore - Function to update Firestore document
 */
export const updateProfileImage = async (
  userId,
  userType,
  imageAsset,
  currentImageUrl,
  updateFirestore
) => {
  try {
    // Upload new image
    const newImageUrl = await uploadProfileImage(userId, userType, imageAsset);
    
    // Update Firestore with new URL
    if (updateFirestore) {
      await updateFirestore(newImageUrl);
    }

    // Delete old image if it exists
    if (currentImageUrl) {
      await deleteProfileImage(currentImageUrl);
    }

    return newImageUrl;
  } catch (error) {
    console.log('Error updating profile image:', error);
    throw error;
  }
};
