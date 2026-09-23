import React, { useState } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { styles } from './AdminProfileStyles';

const AdminProfile = ({ onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('Rajesh Kumar');
  const [email, setEmail] = useState('admin@spoton.in');
  const [phone, setPhone] = useState('+91 98450 12345');
  const [role, setRole] = useState('Super Admin');
  const [shift, setShift] = useState('Morning (08:00 AM - 04:00 PM)');

  const handleSave = () => {
    setIsEditing(false);
    Alert.alert('Profile Updated', 'Your profile details have been saved successfully.');
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from the Admin Portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: () => {
            if (onLogout) {
              onLogout();
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      
      {/* Top Status Bar Offset View */}
      <View style={styles.statusBarBg} />

      {/* Header Content Row */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}> </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Visual */}
        <View style={styles.profileHeaderCard}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120' }}
            style={styles.avatar}
          />
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileRole}>{role}</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>System Online</Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <View style={styles.statsCard}>
            <Text style={styles.statsVal}>12</Text>
            <Text style={styles.statsLbl}>Lots Managed</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsVal}>48 hrs</Text>
            <Text style={styles.statsLbl}>Hours Active</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsVal}>99.9%</Text>
            <Text style={styles.statsLbl}>Uptime</Text>
          </View>
        </View>

        {/* Details Form Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>Personal Information</Text>
            <TouchableOpacity 
              onPress={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
            >
              <Text style={styles.editBtnText}>{isEditing ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>FULL NAME</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
            ) : (
              <Text style={styles.valueText}>{name}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.valueText}>{email}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CONTACT NUMBER</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.valueText}>{phone}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>SHIFT ASSIGNMENT</Text>
            <Text style={styles.valueText}>{shift}</Text>
          </View>

          <View style={[styles.fieldGroup, { borderBottomWidth: 0 }]}>
            <Text style={styles.label}>ACCESS PRIVILEGES</Text>
            <Text style={styles.valueText}>Read, Write, Edit (All Lots)</Text>
          </View>
        </View>

        {/* Actions section */}
        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={handleLogoutPress}
          activeOpacity={0.8}
        >
          <FeatherIcon name="log-out" size={18} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Sign Out of Portal</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminProfile;
