import React, { useState } from 'react';
import { useEffect } from 'react';
import { db } from '../services/firestore';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
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
  uploadValidID,
  deleteValidID,
} from '../services/storage';

// Bottom navigation items
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
  { id: 'hotline', name: 'Hotlines', icon: 'call', iconFamily: 'Ionicons' },
  { id: 'chat', name: 'Chat', icon: 'chatbubbles', iconFamily: 'Ionicons' },
  { id: 'profile', name: 'Profile', icon: 'person', iconFamily: 'Ionicons' },
];

export default function ProfileScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    firstName: user?.displayName
      ? user.displayName.split(' ').slice(0, -1).join(' ')
      : '',
    lastName: user?.displayName
      ? user.displayName.split(' ').slice(-1)[0]
      : '',
    email: user?.email || '',
    contactNumber: '',
    profileImage: null,
    validIDImage: null,
    verificationStatus: 'pending', // 'pending', 'verified', 'rejected'
    // Address fields
    address: '',
    region: '',
    province: '',
    city: '',

  });

  // Dropdown options based on selections
  const [provinceOptions, setProvinceOptions] = useState([{ label: 'Select Province', value: '' }]);
  const [cityOptions, setCityOptions] = useState([{ label: 'Select City/Municipality', value: '' }]);

  // Fetch contact number from Firestore on mount or user change
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.uid) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData(prev => ({
            ...prev,
            contactNumber: data.contactNumber || '',
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactNumber: data.emergencyContactNumber || '',
            // Address fields
            address: data.address || '',
            region: data.region || '',
            province: data.province || '',
            city: data.city || '',
            profileImage: data.profileImage || null,
            validIDImage: data.validIDImage || null,
            verificationStatus: data.verificationStatus || 'pending',
          }));
          // Set dropdown options based on saved data
          if (data.region) {
            setProvinceOptions(getProvincesByRegion(data.region));
          }
          if (data.province) {
            setCityOptions(getCitiesByProvince(data.province));
          }
        }
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, [user]);
  const [editData, setEditData] = useState(profileData);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showIDModal, setShowIDModal] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingID, setIsUploadingID] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sync editData when profileData is fetched or changed
  useEffect(() => {
    if (!isEditing) {
      setEditData(profileData);
    }
  }, [profileData]);

  // Validate all required fields are filled (except profileImage)
  const validateProfileData = () => {
    const requiredFields = [
      { field: 'firstName', label: 'First Name' },
      { field: 'lastName', label: 'Last Name' },
      { field: 'email', label: 'Email' },
      { field: 'contactNumber', label: 'Contact Number' },
      { field: 'address', label: 'Street Address' },
      { field: 'region', label: 'Region' },
      { field: 'province', label: 'Province' },
      { field: 'city', label: 'City/Municipality' },
      { field: 'emergencyContactName', label: 'Emergency Contact Name' },
      { field: 'emergencyContactNumber', label: 'Emergency Contact Number' },
    ];

    const emptyFields = requiredFields.filter(
      ({ field }) => !editData[field] || editData[field].trim() === ''
    );

    if (emptyFields.length > 0) {
      const fieldNames = emptyFields.map(f => f.label).join(', ');
      Toast.show({
        type: 'error',
        text1: 'Required Fields Missing',
        text2: `Please fill in: ${fieldNames}`,
        visibilityTime: 4000,
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    // Validate all required fields before saving
    if (!validateProfileData()) {
      return;
    }

    setIsUploadingImage(true);
    setIsEditing(false);
    
    // Save contact number and emergency contact info to Firestore
    if (user?.uid) {
      try {
        const updateData = {
          firstName: editData.firstName,
          lastName: editData.lastName,
          email: editData.email,
          contactNumber: editData.contactNumber,
          emergencyContactName: editData.emergencyContactName,
          emergencyContactNumber: editData.emergencyContactNumber,
          // Address fields
          address: editData.address,
          region: editData.region,
          province: editData.province,
          city: editData.city,
          verificationStatus: editData.verificationStatus || 'pending',
        };
        
        // Handle profile image upload if it's a new local image
        if (editData.profileImage && editData.profileImage !== profileData.profileImage) {
          console.log('Uploading new profile image...');
          console.log('Old image:', profileData.profileImage);
          console.log('New image:', editData.profileImage);
          
          // Check if it's a local URI (needs to be uploaded)
          // Local URIs start with file:// on native, or are cache paths
          const isLocalUri = editData.profileImage.startsWith('file://') || 
                            !editData.profileImage.startsWith('http');
          
          console.log('Is local URI:', isLocalUri);
          
          if (isLocalUri) {
            try {
              // Use the stored image asset if available, otherwise create one from URI
              const imageAsset = editData._imageAsset || { uri: editData.profileImage };
              
              // Upload the new image to Firebase Storage
              const downloadURL = await updateProfileImage(
                user.uid,
                'user',
                imageAsset,
                profileData.profileImage,
                null // updateFirestore will be done below
              );
              console.log('Image uploaded successfully:', downloadURL);
              updateData.profileImage = downloadURL;
            } catch (uploadError) {
              console.log('Error uploading image:', uploadError);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to upload profile picture',
              });
              setIsUploadingImage(false);
              setIsEditing(true);
              return;
            }
          } else {
            updateData.profileImage = editData.profileImage;
          }
        } else if (editData.profileImage) {
          updateData.profileImage = editData.profileImage;
        }

        // Handle valid ID upload if it's a new local image
        if (editData.validIDImage && editData.validIDImage !== profileData.validIDImage) {
          console.log('Uploading valid ID...');
          
          // Check if it's a local URI
          const isLocalUri = editData.validIDImage.startsWith('file://') || 
                            !editData.validIDImage.startsWith('http');
          
          if (isLocalUri) {
            try {
              const idAsset = editData._idImageAsset || { uri: editData.validIDImage };
              const idDownloadURL = await uploadValidID(user.uid, idAsset);
              console.log('Valid ID uploaded:', idDownloadURL);
              
              // Delete old ID if it exists
              if (profileData.validIDImage) {
                await deleteValidID(profileData.validIDImage);
              }
              
              updateData.validIDImage = idDownloadURL;
              updateData.verificationStatus = 'pending'; // Reset to pending
            } catch (uploadError) {
              console.log('Error uploading valid ID:', uploadError);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to upload valid ID',
              });
              setIsUploadingImage(false);
              setIsEditing(true);
              return;
            }
          } else {
            updateData.validIDImage = editData.validIDImage;
          }
        } else if (editData.validIDImage) {
          updateData.validIDImage = editData.validIDImage;
        }

        await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });
        
        // Refetch from Firestore to ensure we have the latest data
        const docRef = doc(db, 'users', user.uid);
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
        
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile updated successfully',
        });
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to update profile info',
        });
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const handleCancel = () => {
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

  const handlePickIDImage = async () => {
    try {
      setIsUploadingID(true);
      const image = await pickImageFromLibrary();
      
      if (image) {
        // Store both the URI and the full image asset
        setEditData(prev => ({
          ...prev,
          validIDImage: image.uri,
          _idImageAsset: image,
          verificationStatus: 'pending', // Reset to pending when new ID uploaded
        }));
        setShowIDModal(false);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to pick ID image',
      });
    } finally {
      setIsUploadingID(false);
    }
  };

  const handleTakeIDPhoto = async () => {
    try {
      setIsUploadingID(true);
      const image = await takePhoto();
      
      if (image) {
        // Store both the URI and the full image asset
        setEditData(prev => ({
          ...prev,
          validIDImage: image.uri,
          _idImageAsset: image,
          verificationStatus: 'pending', // Reset to pending when new ID uploaded
        }));
        setShowIDModal(false);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to take ID photo',
      });
    } finally {
      setIsUploadingID(false);
    }
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitPasswordChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    // Simulate password change
    Alert.alert('Success', 'Password changed successfully');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordModal(false);
  };

  const handleCancelPasswordChange = () => {
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordModal(false);
  };

  const handleUploadID = () => {
    setShowIDModal(true);
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: () => navigation.replace('SignIn')
        },
      ]
    );
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle dropdown changes with cascading logic
  const handleDropdownChange = (field, value) => {
    if (field === 'region') {
      setEditData(prev => ({
        ...prev,
        region: value,
        province: '',
        city: '',
      }));
      setProvinceOptions(getProvincesByRegion(value));
      setCityOptions([{ label: 'Select City/Municipality', value: '' }]);
    } else if (field === 'province') {
      setEditData(prev => ({
        ...prev,
        province: value,
        city: '',
      }));
      setCityOptions(getCitiesByProvince(value));
    } else if (field === 'city') {
      setEditData(prev => ({
        ...prev,
        city: value,
      }));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const renderInputField = (label, field, placeholder = '') => (
    <View style={styles.inputFieldContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      {isEditing ? (
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={editData[field]}
          onChangeText={(value) => handleInputChange(field, value)}
        />
      ) : (
        <Text style={styles.inputValue}>{profileData[field] || 'Not set'}</Text>
      )}
    </View>
  );

  const renderDropdown = (label, field, options, isDisabled = false) => {
    const currentValue = isEditing ? editData[field] : profileData[field];
    const displayLabel = options.find(opt => opt.value === currentValue)?.label || 'Not set';
    
    return (
      <View style={styles.inputFieldContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        {isEditing ? (
          <View style={[
            styles.pickerContainer,
            isDisabled && styles.pickerContainerDisabled
          ]}>
            <Picker
              selectedValue={editData[field] || ''}
              onValueChange={(value) => handleDropdownChange(field, value)}
              style={styles.picker}
              enabled={!isDisabled}
              dropdownIconColor={isDisabled ? '#D1D5DB' : '#6B7280'}
            >
              {options.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                  color={option.value === '' ? '#9CA3AF' : '#1F2937'}
                />
              ))}
            </Picker>
          </View>
        ) : (
          <Text style={styles.inputValue}>{displayLabel !== 'Select Region' && displayLabel !== 'Select Province' && displayLabel !== 'Select City/Municipality' ? displayLabel : 'Not set'}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="person" size={26} color="#DC2626" />
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
        {isEditing ? (
          <TouchableOpacity
            style={styles.cancelHeaderButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelHeaderText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setEditData(profileData);
              setIsEditing(true);
            }}
          >
            <Ionicons name="pencil" size={20} color="#1D1D1F" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <View style={styles.profileImageContainer}>
            {(isEditing ? editData.profileImage : profileData.profileImage) ? (
              <Image
                source={{ uri: isEditing ? editData.profileImage : profileData.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.defaultProfileIcon]}>
                <Ionicons name="person" size={60} color="#9CA3AF" />
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
            {user?.displayName || ''}
          </Text>
        </View>

        {/* Show full form only when editing */}
        {isEditing ? (
          <>
            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.sectionContent}>
                {renderInputField('First Name', 'firstName', 'Enter first name')}
                {renderInputField('Last Name', 'lastName', 'Enter last name')}
                {renderInputField('Email Address', 'email', 'Enter email')}
                {renderInputField('Contact Number', 'contactNumber', 'Enter contact number')}
              </View>
            </View>

            {/* Address Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Address Information</Text>
              <View style={styles.sectionContent}>
                {renderInputField('Street Address', 'address', 'Enter street address')}
                {renderDropdown('Region', 'region', REGIONS, false)}
                {renderDropdown('Province', 'province', provinceOptions, !editData?.region)}
                {renderDropdown('City/Municipality', 'city', cityOptions, !editData?.province)}
              </View>
            </View>

            {/* Emergency Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              <View style={styles.sectionContent}>
                {renderInputField('Emergency Contact Person Name', 'emergencyContactName', 'Enter name')}
                {renderInputField('Emergency Contact Number', 'emergencyContactNumber', 'Enter phone number')}
              </View>
            </View>

            {/* Save/Cancel Buttons */}
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Account Section - Simplified View */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
              
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => {
                  setEditData(profileData);
                  setIsEditing(true);
                }}
              >
                <Ionicons name="person-circle" size={22} color="#3B82F6" />
                <View style={styles.actionButtonText}>
                  <Text style={styles.actionButtonTitle}>Edit Profile</Text>
                  <Text style={styles.actionButtonSubtitle}>Update your personal information</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
                <Ionicons name="lock-closed" size={22} color="#10B981" />
                <View style={styles.actionButtonText}>
                  <Text style={styles.actionButtonTitle}>Change Password</Text>
                  <Text style={styles.actionButtonSubtitle}>Update your password</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out" size={20} color="#FFFFFF" />
                <Text style={styles.logoutButtonText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={handleCancelPasswordChange}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="lock-closed" size={32} color="#DC2626" />
              <Text style={styles.modalTitle}>Change Password</Text>
              <Text style={styles.modalSubtitle}>Enter your current and new password</Text>
            </View>

            <View style={styles.passwordInputContainer}>
              <Ionicons name="key" size={20} color="#6B7280" style={styles.passwordIcon} />
              <TextInput
                style={styles.passwordInput}
                placeholder="Current Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showCurrentPassword}
                value={passwordData.currentPassword}
                onChangeText={(value) => handlePasswordChange('currentPassword', value)}
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                <Ionicons name={showCurrentPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordInputContainer}>
              <Ionicons name="lock-closed" size={20} color="#6B7280" style={styles.passwordIcon} />
              <TextInput
                style={styles.passwordInput}
                placeholder="New Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showNewPassword}
                value={passwordData.newPassword}
                onChangeText={(value) => handlePasswordChange('newPassword', value)}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordInputContainer}>
              <Ionicons name="lock-closed" size={20} color="#6B7280" style={styles.passwordIcon} />
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm New Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirmPassword}
                value={passwordData.confirmPassword}
                onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={handleCancelPasswordChange}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSubmitPasswordChange}
              >
                <Text style={styles.modalSaveButtonText}>Change Password</Text>
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
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImageModal(false)}
        >
          <TouchableOpacity 
            style={styles.imageModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowImageModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>

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
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => setShowImageModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Valid ID Upload Modal */}
      <Modal
        visible={showIDModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowIDModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowIDModal(false)}
        >
          <TouchableOpacity 
            style={styles.imageModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowIDModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <Ionicons name="document" size={32} color="#DC2626" />
              <Text style={styles.modalTitle}>Upload Valid ID</Text>
              <Text style={styles.modalSubtitle}>Choose a clear photo of your valid ID</Text>
            </View>

            {editData.validIDImage && !editData.validIDImage.startsWith('http') ? (
              <>
                <View style={styles.idPreview}>
                  <Image
                    source={{ uri: editData.validIDImage }}
                    style={styles.idPreviewImage}
                  />
                  <View style={styles.idPreviewTextContainer}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <Text style={styles.idPreviewText}>ID Selected!</Text>
                  </View>
                  <Text style={styles.idInstructionText}>⚠️ Scroll down and tap "Save Changes" to upload</Text>
                </View>

                <TouchableOpacity
                  style={[styles.modalButton, styles.doneButton]}
                  onPress={() => setShowIDModal(false)}
                >
                  <Text style={styles.doneButtonText}>Got it</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.imageOption}
                  onPress={handleTakeIDPhoto}
                  disabled={isUploadingID}
                >
                  <Ionicons name="camera" size={28} color="#DC2626" />
                  <Text style={styles.imageOptionText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.imageOption}
                  onPress={handlePickIDImage}
                  disabled={isUploadingID}
                >
                  <Ionicons name="images" size={28} color="#DC2626" />
                  <Text style={styles.imageOptionText}>Choose from Library</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setShowIDModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Toast config={toastConfig} topOffset={60} />

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => {
              setActiveTab(item.id);
              if (item.id === 'home') {
                navigation.navigate('Home');
              } else if (item.id === 'chat') {
                navigation.navigate('Chat');
              } else if (item.id === 'locations') {
                navigation.navigate('Locations');
              } else if (item.id === 'hotline') {
                navigation.navigate('Hotlines');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === item.id ? item.icon : `${item.icon}-outline`}
              size={24}
              color={activeTab === item.id ? '#DC2626' : '#6B7280'}
            />
            <Text style={[styles.navLabel, activeTab === item.id && styles.navLabelActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
    marginTop: 12,
    fontSize: 15,
    color: '#86868B',
    fontWeight: '400',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.4,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelHeaderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
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
  defaultProfileIcon: {
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
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
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.4,
  },
  profileRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileRole: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },
  accountSetupSection: {
    marginTop: 16,
    marginHorizontal: 20,
    padding: 14,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  accountSetupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  accountSetupTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  accountSetupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  accountSetupSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 1,
  },
  uploadIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    height: 40,
    borderRadius: 8,
    gap: 6,
  },
  uploadIdButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#86868B',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  inputFieldContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1D1D1F',
  },
  inputValue: {
    fontSize: 16,
    color: '#1D1D1F',
    fontWeight: '500',
  },
  pickerContainer: {
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  pickerContainerDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  picker: {
    height: 46,
    color: '#111827',
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  actionSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionButtonText: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    height: 48,
    borderRadius: 12,
    marginTop: 6,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 10,
    gap: 6,
  },
  saveButton: {
    backgroundColor: '#059669',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 8,
    paddingBottom: 28,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    width: '100%',
    maxWidth: 360,
  },
  imageModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    width: '88%',
    maxWidth: 340,
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
    color: '#111827',
    marginLeft: 12,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 10,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passwordIcon: {
    marginRight: 8,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalSaveButton: {
    backgroundColor: '#DC2626',
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  idPreview: {
    marginVertical: 14,
    alignItems: 'center',
  },
  idPreviewImage: {
    width: 220,
    height: 140,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  idPreviewTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  idPreviewText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  idInstructionText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  doneButton: {
    backgroundColor: '#059669',
    width: '100%',
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
