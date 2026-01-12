import React, { useState } from 'react';
import { useEffect } from 'react';
import { db } from '../services/firestore';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

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
  });

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
          }));
        }
      }
    };
    fetchProfile();
  }, [user]);
  const [editData, setEditData] = useState(profileData);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSave = async () => {
    setProfileData(editData);
    setIsEditing(false);
    // Save contact number to Firestore
    if (user?.uid) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          contactNumber: editData.contactNumber,
        }, { merge: true });
        Alert.alert('Success', 'Profile updated successfully');
      } catch (err) {
        Alert.alert('Error', 'Failed to update contact number');
      }
    }
  };

  const handleCancel = () => {
    setEditData(profileData);
    setIsEditing(false);
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
    Alert.alert('Upload ID', 'Open document picker to upload ID for verification');
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

  const renderInputField = (label, field, placeholder = '') => (
    <View style={styles.inputFieldContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      {isEditing && field === 'contactNumber' ? (
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

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="person" size={28} color="#FFFFFF" />
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
        {!isEditing && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setEditData(profileData);
              setIsEditing(true);
            }}
          >
            <Ionicons name="pencil" size={20} color="#FFFFFF" />
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
            {profileData.profileImage ? (
              <Image
                source={{ uri: profileData.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.defaultProfileIcon]}>
                <Ionicons name="person" size={60} color="#9CA3AF" />
              </View>
            )}
            {isEditing && (
              <TouchableOpacity style={styles.editImageButton}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.profileName}>
            {user?.displayName || ''}
          </Text>
          <Text style={styles.profileRole}>User • Emergency Responder Ready</Text>
        </View>

        {/* Account Setup Alert */}
        <View style={styles.accountSetupSection}>
          <View style={styles.accountSetupHeader}>
            <Ionicons name="alert-circle" size={24} color="#F59E0B" />
            <View style={styles.accountSetupTextContainer}>
              <Text style={styles.accountSetupTitle}>Set up your account first</Text>
              <Text style={styles.accountSetupSubtitle}>Add a valid ID to use the app</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.uploadIdButton} onPress={handleUploadID}>
            <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
            <Text style={styles.uploadIdButtonText}>Upload Valid ID</Text>
          </TouchableOpacity>
        </View>

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
            <View style={styles.rowContainer}>
              <View style={styles.halfInput}>
                {renderInputField('City', 'city', 'Enter city')}
              </View>
              <View style={styles.halfInput}>
                {renderInputField('Province', 'province', 'Enter province')}
              </View>
            </View>
            {renderInputField('Zip Code', 'zipCode', 'Enter zip code')}
          </View>
        </View>

        {/* Emergency Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>

          <View style={styles.sectionContent}>
            {renderInputField('Contact Person Name', 'emergencyContactName', 'Enter name')}
            {renderInputField('Contact Number', 'emergencyContactNumber', 'Enter phone number')}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
            <Ionicons name="lock-closed" size={20} color="#10B981" />
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

        {/* Save/Cancel Buttons */}
        {isEditing && (
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
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#DC2626',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#DC2626',
  },
  defaultProfileIcon: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  accountSetupSection: {
    marginTop: 20,
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  accountSetupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountSetupTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  accountSetupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  accountSetupSubtitle: {
    fontSize: 13,
    color: '#B45309',
    marginTop: 2,
  },
  uploadIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadIdButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputFieldContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  inputValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    paddingVertical: 12,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  actionSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionButtonSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#059669',
  },
  cancelButton: {
    backgroundColor: '#DC2626',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#DC2626',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passwordIcon: {
    marginRight: 10,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  modalSaveButton: {
    backgroundColor: '#DC2626',
  },
  modalSaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
