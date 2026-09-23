import React from 'react';
import {
  SafeAreaView,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { styles } from './ProfileScreenStyles';

const ProfileScreen = ({ onLogout, onNavigateToBookings }) => {
  const menuItems = [
    {
      id: 'bookings',
      label: 'My Bookings',
      icon: 'file-text',
      onPress: onNavigateToBookings,
    },
    {
      id: 'payments',
      label: 'Payment Methods',
      icon: 'credit-card',
      onPress: () => {},
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'bell',
      onPress: () => {},
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: 'shield',
      onPress: () => {},
    },
    {
      id: 'support',
      label: 'Help & Support',
      icon: 'help-circle',
      onPress: () => {},
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      onPress: () => {},
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: 'log-out',
      onPress: onLogout,
      isDanger: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>P</Text>
          </View>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} activeOpacity={0.7}>
          <FeatherIcon name="edit-2" size={18} color="#1A1D20" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }}
              style={styles.avatarImage}
            />
            <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.8}>
              <FeatherIcon name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>Aarav Sharma</Text>
          <Text style={styles.userMeta}>Tata Nexon • TN-38-AB-1234</Text>
        </View>

        {/* Account Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ACCOUNT INFORMATION</Text>

          <View style={[styles.infoRow, { marginBottom: 16 }]}>
            <View style={styles.infoIconBg}>
              <FeatherIcon name="mail" size={18} color="#1A5FB4" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>aarav.sharma@gmail.com</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBg}>
              <FeatherIcon name="phone" size={18} color="#1A5FB4" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>+91 98765 43210</Text>
            </View>
          </View>
        </View>

        {/* Menu list Card */}
        <View style={[styles.card, { paddingVertical: 6 }]}>
          {menuItems.map((item, index) => {
            const isLast = index === menuItems.length - 1;
            return (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.menuRow}
                  activeOpacity={0.7}
                  onPress={item.onPress}
                >
                  <View style={styles.menuRowLeft}>
                    <FeatherIcon
                      name={item.icon}
                      size={20}
                      color={item.isDanger ? '#DC2626' : '#4B5563'}
                      style={styles.menuIcon}
                    />
                    <Text style={[styles.menuText, item.isDanger && styles.menuTextLogout]}>
                      {item.label}
                    </Text>
                  </View>
                  {!item.isDanger && (
                    <FeatherIcon name="chevron-right" size={18} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
                {!isLast && <View style={styles.menuDivider} />}
              </View>
            );
          })}
        </View>

        {/* App Version Footer */}
        <Text style={styles.appVersion}>SPOTON v2.4.0 (PRO)</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
