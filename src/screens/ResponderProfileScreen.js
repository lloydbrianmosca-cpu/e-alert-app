import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components';
import {
  REGIONS,
  getProvincesByRegion,
  getCitiesByProvince,
} from '../constants/addressData';
import {
  pickImageFromLibrary,
  takePhoto,
  updateProfileImage,
} from '../services/storage';

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

// Responder type colors (for badges only)
const RESPONDER_COLORS = {
  police: '#1E3A8A',
  medical: '#059669',
  fireman: '#DC2626',
  rescue: '#0369A1',
};

const RESPONDER_ICONS = {
  police: 'shield-checkmark',
  medical: 'medkit',
  fireman: 'flame',
  rescue: 'boat',
};

export default function ResponderProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    responderType: '',
    stationName: '',
    stationAddress: '',
    hotlineNumber: '',
    region: '',
    province: '',
    city: '',
    isAvailable: true,
    profileImage: null,
  });
  const [editData, setEditData] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Dropdown options
  const [provinceOptions, setProvinceOptions] = useState([{ label: 'Select Province', value: '' }]);
  const [cityOptions, setCityOptions] = useState([{ label: 'Select City/Municipality', value: '' }]);

  // Sync editData when profileData changes
  useEffect(() => {
    if (!isEditing) {
      setEditData(profileData);
    }
  }, [profileData]);

  // Fetch responder profile data
  const fetchProfileData = async () => {
    if (!user?.uid) return;

    try {
      const docRef = doc(db, 'responders', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const profile = {
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || user?.email || '',
          contactNumber: data.contactNumber || '',
          responderType: data.responderType || '',
          stationName: data.stationName || data.station || '',
          stationAddress: data.stationAddress || data.address || '',
          hotlineNumber: data.hotlineNumber || '',
          region: data.region || '',
          province: data.province || '',
          city: data.city || '',
          isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
          profileImage: data.profileImage || null,
        };
        setProfileData(profile);
        setEditData(profile);

        // Set dropdown options based on saved data
        if (data.region) {
          setProvinceOptions(getProvincesByRegion(data.region));
        }
        if (data.province) {
          setCityOptions(getCitiesByProvince(data.province));
        }
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load profile data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  // Handle region change
  const handleRegionChange = (value) => {
    setEditData((prev) => ({
      ...prev,
      region: value,
      province: '',
      city: '',
    }));
    setProvinceOptions(getProvincesByRegion(value));
    setCityOptions([{ label: 'Select City/Municipality', value: '' }]);
  };

  // Handle province change
  const handleProvinceChange = (value) => {
    setEditData((prev) => ({
      ...prev,
      province: value,
      city: '',
    }));
    setCityOptions(getCitiesByProvince(value));
  };

  // Save profile changes
  const handleSave = async () => {
    if (!user?.uid) return;

    // Validate required fields (same as profile completeness check)
    const requiredFields = ['firstName', 'lastName', 'contactNumber', 'stationName', 'hotlineNumber'];
    const emptyFields = requiredFields.filter((field) => !editData[field]?.trim());

    if (emptyFields.length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields Missing',
        text2: 'Please fill in: Name, Contact, Station Name, and Hotline',
      });
      return;
    }

    setIsSaving(true);

    try {
      const updateData = {
        ...editData,
        email: user.email,
        updatedAt: new Date().toISOString(),
      };

      // Handle profile image upload if it's a new local image
      if (editData.profileImage && editData.profileImage !== profileData.profileImage) {
        // Check if it's a local URI (needs to be uploaded)
        // Local URIs start with file:// on native, or are cache paths
        const isLocalUri = editData.profileImage.startsWith('file://') || 
                          !editData.profileImage.startsWith('http');
        
        if (isLocalUri) {
          try {
            // Use the stored image asset if available, otherwise create one from URI
            const imageAsset = editData._imageAsset || { uri: editData.profileImage };
            
            // Upload the new image to Firebase Storage
            const downloadURL = await updateProfileImage(
              user.uid,
              'responder',
              imageAsset,
              profileData.profileImage,
              null // updateFirestore will be done below
            );
            updateData.profileImage = downloadURL;
          } catch (uploadError) {
            console.log('Error uploading image:', uploadError);
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Failed to upload profile picture',
            });
            setIsSaving(false);
            return;
          }
        }
      }

      const docRef = doc(db, 'responders', user.uid);
      
      // Use setDoc with merge to handle both create and update
      await setDoc(docRef, updateData, { merge: true });

      // Refetch from Firestore to ensure we have the latest data
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const freshData = docSnap.data();
        setProfileData(prev => ({
          ...prev,
          ...freshData,
        }));
      } else {
        setProfileData(updateData);
      }
      
      setIsEditing(false);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile updated successfully',
      });
    } catch (error) {
      console.log('Error saving profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save profile',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditData(profileData);
    setIsEditing(false);
  };

  const handlePickImage = async () => {
    try {
      setIsUploadingImage(true);
      const image = await pickImageFromLibrary();
      
      if (image) {
        // Store both the URI and the full image asset
        setEditData(prev => ({
          ...prev,
          profileImage: image.uri,
          _imageAsset: image, // Store the full asset for upload
        }));
        setShowImageModal(false);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to pick image',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setIsUploadingImage(true);
      const image = await takePhoto();
      
      if (image) {
        // Store both the URI and the full image asset
        setEditData(prev => ({
          ...prev,
          profileImage: image.uri,
          _imageAsset: image, // Store the full asset for upload
        }));
        setShowImageModal(false);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to take photo',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all password fields',
      });
      return;
    }

    if (newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'New password must be at least 6 characters',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'New passwords do not match',
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);

      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Password changed successfully',
      });
    } catch (error) {
      console.log('Error changing password:', error);
      let errorMessage = 'Failed to change password';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak';
      }
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'SignIn' }],
            });
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Failed to sign out',
            });
          }
        },
      },
    ]);
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
        navigation.navigate('ResponderChats');
        break;
      case 'profile':
        break;
    }
  };

  // Get responder type color (for badges)
  const getResponderTypeColor = () => {
    if (!profileData?.responderType) return '#1E3A8A';
    return RESPONDER_COLORS[profileData.responderType.toLowerCase()] || '#1E3A8A';
  };

  // Get responder icon
  const getResponderIcon = () => {
    if (!profileData?.responderType) return 'shield-checkmark';
    return RESPONDER_ICONS[profileData.responderType.toLowerCase()] || 'shield-checkmark';
  };

  const responderTypeColor = getResponderTypeColor();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading profile...</Text>
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
          <Ionicons name="person" size={26} color="#DC2626" />
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
        {isEditing ? (
          <TouchableOpacity onPress={handleCancelEdit} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            style={styles.editButton}
          >
            <Ionicons name="pencil" size={20} color="#86868B" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            {(isEditing ? editData.profileImage : profileData.profileImage) ? (
              <Image
                source={{ uri: isEditing ? editData.profileImage : profileData.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.avatarContainer, { backgroundColor: `${responderTypeColor}20` }]}>
                <Ionicons name={getResponderIcon()} size={48} color={responderTypeColor} />
              </View>
            )}
            {isEditing && (
              <TouchableOpacity 
                style={styles.editImageButton}
                onPress={() => setShowImageModal(true)}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.profileName}>
            {profileData.firstName} {profileData.lastName}
          </Text>
          <Text style={styles.profileSubtitle}>Responder</Text>
        </View>

        {/* Status & Responder Type Section - Always visible */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status & Type</Text>

          {/* Availability Toggle */}
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <Ionicons 
                name={profileData.isAvailable ? 'checkmark-circle' : 'close-circle'} 
                size={24} 
                color={profileData.isAvailable ? '#10B981' : '#EF4444'} 
              />
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusLabel}>Availability Status</Text>
                <Text style={[styles.statusValue, { color: profileData.isAvailable ? '#10B981' : '#EF4444' }]}>
                  {profileData.isAvailable ? 'Available' : 'Unavailable'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.statusToggle, { backgroundColor: profileData.isAvailable ? '#10B981' : '#EF4444' }]}
              onPress={async () => {
                if (!user?.uid) return;
                setIsTogglingStatus(true);
                try {
                  const newStatus = !profileData.isAvailable;
                  const docRef = doc(db, 'responders', user.uid);
                  await updateDoc(docRef, { isAvailable: newStatus, updatedAt: new Date().toISOString() });
                  setProfileData(prev => ({ ...prev, isAvailable: newStatus }));
                  setEditData(prev => ({ ...prev, isAvailable: newStatus }));
                  Toast.show({
                    type: 'success',
                    text1: 'Status Updated',
                    text2: `You are now ${newStatus ? 'Available' : 'Unavailable'}`,
                  });
                } catch (error) {
                  console.log('Error updating status:', error);
                  Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update status' });
                } finally {
                  setIsTogglingStatus(false);
                }
              }}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.statusToggleText}>
                  {profileData.isAvailable ? 'Go Unavailable' : 'Go Available'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Responder Type (Read-only) */}
          <View style={styles.responderTypeRow}>
            <View style={styles.responderTypeInfo}>
              <View style={[styles.responderTypeIcon, { backgroundColor: `${responderTypeColor}20` }]}>
                <Ionicons name={getResponderIcon()} size={20} color={responderTypeColor} />
              </View>
              <View>
                <Text style={styles.responderTypeLabel}>Responder Type</Text>
                <Text style={styles.responderTypeValue}>
                  {profileData.responderType ? profileData.responderType.charAt(0).toUpperCase() + profileData.responderType.slice(1) : 'Not Set'}
                </Text>
              </View>
            </View>
            <Text style={styles.responderTypeNote}>Contact admin to change</Text>
          </View>
        </View>

        {/* Show full form only when editing */}
        {isEditing ? (
          <>
            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editData.firstName}
                  onChangeText={(text) => setEditData((prev) => ({ ...prev, firstName: text }))}
                  placeholder="Enter first name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editData.lastName}
                  onChangeText={(text) => setEditData((prev) => ({ ...prev, lastName: text }))}
                  placeholder="Enter last name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={profileData.email}
                  editable={false}
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number *</Text>
                <TextInput
                  style={styles.input}
                  value={editData.contactNumber}
                  onChangeText={(text) => setEditData((prev) => ({ ...prev, contactNumber: text }))}
                  placeholder="Enter contact number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Station/Unit Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Station/Unit Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Station/Unit Name</Text>
                <TextInput
                  style={styles.input}
                  value={editData.stationName}
                  onChangeText={(text) => setEditData((prev) => ({ ...prev, stationName: text }))}
                  placeholder="e.g., Metro Fire Station 1"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Station Hotline Number</Text>
                <TextInput
                  style={styles.input}
                  value={editData.hotlineNumber}
                  onChangeText={(text) => setEditData((prev) => ({ ...prev, hotlineNumber: text }))}
                  placeholder="Enter station hotline"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Station Location */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Station Location</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Station Address</Text>
                <TextInput
                  style={styles.input}
                  value={editData.stationAddress}
                  onChangeText={(text) => setEditData((prev) => ({ ...prev, stationAddress: text }))}
                  placeholder="Enter station address"
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Region</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editData.region}
                    onValueChange={handleRegionChange}
                    style={styles.picker}
                  >
                    {REGIONS.map((region) => (
                      <Picker.Item key={region.value} label={region.label} value={region.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Province</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editData.province}
                    onValueChange={handleProvinceChange}
                    style={styles.picker}
                    enabled={!!editData.region}
                  >
                    {provinceOptions.map((province) => (
                      <Picker.Item key={province.value} label={province.label} value={province.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>City/Municipality</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editData.city}
                    onValueChange={(value) => setEditData((prev) => ({ ...prev, city: value }))}
                    style={styles.picker}
                    enabled={!!editData.province}
                  >
                    {cityOptions.map((city) => (
                      <Picker.Item key={city.value} label={city.label} value={city.value} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButtonLarge, { backgroundColor: PRIMARY_COLOR }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButtonLarge}
              onPress={handleCancelEdit}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Account Section - Simplified View */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>

              <TouchableOpacity
                style={styles.actionButtonStyled}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="person-circle" size={22} color="#3B82F6" />
                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonTitle}>Edit Profile</Text>
                  <Text style={styles.actionButtonSubtitle}>Update your personal information</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButtonStyled}
                onPress={() => setShowPasswordModal(true)}
              >
                <Ionicons name="lock-closed" size={22} color="#10B981" />
                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonTitle}>Change Password</Text>
                  <Text style={styles.actionButtonSubtitle}>Update your password</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                <Ionicons name="log-out" size={20} color="#FFFFFF" />
                <Text style={styles.logoutButtonText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Password Change Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <View style={styles.passwordInputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordData.currentPassword}
                  onChangeText={(text) =>
                    setPasswordData((prev) => ({ ...prev, currentPassword: text }))
                  }
                  secureTextEntry={!showCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showCurrentPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.passwordInputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordData.newPassword}
                  onChangeText={(text) =>
                    setPasswordData((prev) => ({ ...prev, newPassword: text }))
                  }
                  secureTextEntry={!showNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.passwordInputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordData.confirmPassword}
                  onChangeText={(text) =>
                    setPasswordData((prev) => ({ ...prev, confirmPassword: text }))
                  }
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: PRIMARY_COLOR }]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Selection Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imageModalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="image" size={32} color="#DC2626" />
              <Text style={styles.modalTitle}>Select Profile Picture</Text>
            </View>

            <TouchableOpacity 
              style={styles.imageOption}
              onPress={handleTakePhoto}
              disabled={isUploadingImage}
            >
              <Ionicons name="camera" size={28} color="#DC2626" />
              <Text style={styles.imageOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.imageOption}
              onPress={handlePickImage}
              disabled={isUploadingImage}
            >
              <Ionicons name="images" size={28} color="#DC2626" />
              <Text style={styles.imageOptionText}>Choose from Library</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowImageModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.4,
  },
  headerButton: {
    padding: 6,
  },
  headerButtonText: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '600',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#F5F5F7',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  profileSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  badgeNumber: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusTextContainer: {
    marginLeft: 10,
  },
  statusLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 100,
    alignItems: 'center',
  },
  statusToggleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  responderTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  responderTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  responderTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  responderTypeLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  responderTypeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  responderTypeNote: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1D1D1F',
  },
  inputDisabled: {
    backgroundColor: '#FFFFFF',
    color: '#86868B',
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 46,
    color: '#111827',
  },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  saveButtonLarge: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButtonLarge: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  actionButtonStyled: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
  },
  actionButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  actionButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  imageModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 320,
  },
  imageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 14,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  passwordInputGroup: {
    marginBottom: 14,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  eyeButton: {
    padding: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalSaveButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
});
