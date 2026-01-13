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
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firestore';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components';
import {
  REGIONS,
  getProvincesByRegion,
  getCitiesByProvince,
} from '../constants/addressData';

// Bottom navigation items - unified with user screens
const NAV_ITEMS = [
  { id: 'home', name: 'Home', icon: 'home', iconFamily: 'Ionicons' },
  { id: 'locations', name: 'Locations', icon: 'location', iconFamily: 'Ionicons' },
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
  const { user, signOut } = useAuth();
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
    badgeNumber: '',
    stationName: '',
    stationAddress: '',
    hotlineNumber: '',
    region: '',
    province: '',
    city: '',
    isAvailable: true,
  });
  const [editData, setEditData] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
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
          badgeNumber: data.badgeNumber || '',
          stationName: data.stationName || data.station || '',
          stationAddress: data.stationAddress || data.address || '',
          hotlineNumber: data.hotlineNumber || '',
          region: data.region || '',
          province: data.province || '',
          city: data.city || '',
          isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
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

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'contactNumber'];
    const emptyFields = requiredFields.filter((field) => !editData[field]?.trim());

    if (emptyFields.length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields Missing',
        text2: 'Please fill in all required fields',
      });
      return;
    }

    setIsSaving(true);

    try {
      const docRef = doc(db, 'responders', user.uid);
      await updateDoc(docRef, {
        ...editData,
        updatedAt: new Date().toISOString(),
      });

      setProfileData(editData);
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
            await signOut();
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
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />

      {/* Header - Unified with user screens */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="person" size={28} color="#FFFFFF" />
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
            <Ionicons name="pencil" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatarContainer, { backgroundColor: `${responderTypeColor}20` }]}>
            <Ionicons name={getResponderIcon()} size={48} color={responderTypeColor} />
          </View>
          <Text style={styles.profileName}>
            {profileData.firstName} {profileData.lastName}
          </Text>
          <Text style={styles.profileSubtitle}>Responder</Text>
          {profileData.badgeNumber && (
            <Text style={styles.badgeNumber}>Badge: {profileData.badgeNumber}</Text>
          )}
        </View>

        {/* Status & Responder Type Section */}
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

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>First Name *</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={isEditing ? editData.firstName : profileData.firstName}
              onChangeText={(text) => setEditData((prev) => ({ ...prev, firstName: text }))}
              editable={isEditing}
              placeholder="Enter first name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Last Name *</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={isEditing ? editData.lastName : profileData.lastName}
              onChangeText={(text) => setEditData((prev) => ({ ...prev, lastName: text }))}
              editable={isEditing}
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
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={isEditing ? editData.contactNumber : profileData.contactNumber}
              onChangeText={(text) => setEditData((prev) => ({ ...prev, contactNumber: text }))}
              editable={isEditing}
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
            <Text style={styles.inputLabel}>Badge Number</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={isEditing ? editData.badgeNumber : profileData.badgeNumber}
              onChangeText={(text) => setEditData((prev) => ({ ...prev, badgeNumber: text }))}
              editable={isEditing}
              placeholder="Enter badge number"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Station/Unit Name</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={isEditing ? editData.stationName : profileData.stationName}
              onChangeText={(text) => setEditData((prev) => ({ ...prev, stationName: text }))}
              editable={isEditing}
              placeholder="e.g., Metro Fire Station 1, City General Hospital"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Station Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Station Location</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Station Address</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={isEditing ? editData.stationAddress : profileData.stationAddress}
              onChangeText={(text) => setEditData((prev) => ({ ...prev, stationAddress: text }))}
              editable={isEditing}
              placeholder="Enter station/unit address"
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>

          {isEditing ? (
            <>
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
                      <Picker.Item
                        key={province.value}
                        label={province.label}
                        value={province.value}
                      />
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
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Region</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={profileData.region}
                  editable={false}
                  placeholder="Region"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Province</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={profileData.province}
                  editable={false}
                  placeholder="Province"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>City/Municipality</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={profileData.city}
                  editable={false}
                  placeholder="City/Municipality"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </>
          )}
        </View>

        {/* Hotline Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hotline Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Station Hotline Number</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={isEditing ? editData.hotlineNumber : profileData.hotlineNumber}
              onChangeText={(text) => setEditData((prev) => ({ ...prev, hotlineNumber: text }))}
              editable={isEditing}
              placeholder="Enter station hotline number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: PRIMARY_COLOR }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Account Actions */}
        {!isEditing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowPasswordModal(true)}
            >
              <Ionicons name="lock-closed-outline" size={22} color="#374151" />
              <Text style={styles.actionButtonText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={22} color="#DC2626" />
              <Text style={[styles.actionButtonText, { color: '#DC2626' }]}>Sign Out</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
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
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#DC2626',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerButton: {
    padding: 4,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 8,
  },
  badgeNumber: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusTextContainer: {
    marginLeft: 12,
  },
  statusLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusToggle: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 110,
    alignItems: 'center',
  },
  statusToggleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  responderTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  responderTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  responderTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  responderTypeLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  responderTypeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  responderTypeNote: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#111827',
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButton: {
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  passwordInputGroup: {
    marginBottom: 16,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  eyeButton: {
    padding: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalSaveButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '600',
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
});
