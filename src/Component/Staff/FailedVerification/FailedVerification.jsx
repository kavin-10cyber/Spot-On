import React from 'react';
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Navbar from '../Components/navbar';
import { styles } from './FailedVerificationStyles';

const FailedVerification = ({
  visible,
  onClose,
  onScanAgain,
  onManualBooking,
  onNavigateToDashboard,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Verification Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color="#0052cc" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Verification</Text>
          </View>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120' }}
            style={styles.avatar}
          />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Success Exclamation Circle */}
          <View style={styles.errorCircle}>
            <View style={styles.errorIcon}>
              <Feather name="alert-circle" size={56} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.title}>QR Code Invalid</Text>
          <Text style={styles.subtitle}>
            Booking Not Found. Please verify with the customer or try scanning again.
          </Text>

          {/* Action Buttons */}
          <TouchableOpacity 
            style={styles.scanAgainBtn}
            onPress={onScanAgain}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.scanAgainBtnText}>Scan Again</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.manualBtn}
            onPress={onManualBooking}
            activeOpacity={0.85}
          >
            <Feather name="edit-3" size={18} color="#0F172A" style={{ marginRight: 8 }} />
            <Text style={styles.manualBtnText}>Manual Booking</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.reportBtn}
            onPress={() => Alert.alert('Report Issue', 'Report has been sent to technical support.')}
            activeOpacity={0.75}
          >
            <Feather name="alert-triangle" size={16} color="#DC2626" />
            <Text style={styles.reportBtnText}>Report Issue</Text>
          </TouchableOpacity>

          {/* Quick Tip Box */}
          <View style={styles.tipCard}>
            <View style={styles.tipIconContainer}>
              <Feather name="help-circle" size={20} color="#475569" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Quick Tip</Text>
              <Text style={styles.tipText}>
                Check if the user is at the correct terminal or if the booking is for a different date.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Global Bottom Tab Bar */}
        <Navbar
          activeTab="Scanner"
          onTabPress={(tab) => {
            if (tab === 'Dashboard') {
              if (onNavigateToDashboard) {
                onNavigateToDashboard();
              } else {
                onClose();
              }
            } else {
              onClose();
            }
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

export default FailedVerification;
