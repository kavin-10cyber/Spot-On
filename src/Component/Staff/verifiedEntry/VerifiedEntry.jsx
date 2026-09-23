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
import { styles } from './VerifiedEntryStyles';

const VerifiedEntry = ({
  visible,
  ticket,
  onClose,
  onConfirm,
  actionSuccess,
  successMsg,
  onNavigateToDashboard,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={() => {
        if (!actionSuccess) onClose();
      }}
    >
      <SafeAreaView style={styles.verifiedScreenContainer} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* Verified Header */}
        <View style={styles.verifiedHeader}>
          <View style={styles.verifiedUserInfoRow}>
            {/* <Image
              source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120' }}
              style={styles.verifiedAvatar}
            /> */}
            <Text style={styles.verifiedBrandTitle}>SpotOn</Text>
          </View>
          <TouchableOpacity style={styles.verifiedBellButton} onPress={() => Alert.alert('Notifications', 'No new notifications.')}>
            <Feather name="bell" size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.verifiedScrollContent} showsVerticalScrollIndicator={false}>
          {/* Success Checkmark Circle */}
          <View style={styles.checkmarkOuterCircle}>
            <View style={styles.checkmarkInnerCircle}>
              <Feather name="check" size={40} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.verifiedTitleText}>Booking Verified</Text>
          <Text style={styles.verifiedSubtitleText}>Identity and reservation confirmed</Text>

          {/* Detail Ticket Card */}
          {ticket && (
            <View style={styles.verifiedCard}>
              {/* Customer name & Vehicle */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderCol}>
                  <Text style={styles.cardMetaLabel}>CUSTOMER NAME</Text>
                  <Text style={styles.cardMetaValue}>{ticket.name}</Text>
                </View>
                <View style={[styles.cardHeaderCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.cardMetaLabel}>VEHICLE</Text>
                  <Text style={styles.cardMetaValue}>{ticket.lpn}</Text>
                </View>
              </View>

              {/* Dashed Separator */}
              <View style={styles.dashedDividerContainer}>
                <View style={styles.dashedLine} />
              </View>

              {/* Parking details */}
              <View style={styles.cardDetailRow}>
                <View>
                  <Text style={styles.cardMetaLabel}>PARKING LOT</Text>
                  <Text style={styles.cardDetailBold}>{ticket.lot || 'Central Plaza'}</Text>
                  <Text style={styles.cardDetailSub}>{ticket.zone || 'Zone A'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardMetaLabel}>SLOT NUMBER</Text>
                  <View style={styles.slotBlueBadge}>
                    <Text style={styles.slotBlueBadgeText}>{ticket.slotNum || 'A-12'}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.cardDetailRow, { marginTop: 12 }]}>
                <View>
                  <Text style={styles.cardMetaLabel}>BOOKING TIME</Text>
                  <Text style={styles.cardDetailText}>{ticket.time || '10:00 AM - 12:00 PM'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardMetaLabel}>PAYMENT STATUS</Text>
                  <View style={styles.statusGreenBadge}>
                    <Text style={styles.statusGreenBadgeText}>✓ {ticket.payment || 'PAID'}</Text>
                  </View>
                </View>
              </View>

              {/* Bottom Gray Pill */}
              <View style={styles.grayPillBox}>
                <Text style={styles.grayPillText}>{ticket.code}</Text>
              </View>
            </View>
          )}

          {/* Actions Buttons */}
          {actionSuccess ? (
            <View style={styles.successBanner}>
              <Feather name="check" size={18} color="#16A34A" />
              <Text style={styles.successBannerText}>{successMsg}</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.allowEntryBtn}
                onPress={onConfirm}
                activeOpacity={0.85}
              >
                <Feather name="check" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.allowEntryBtnText}>
                  {ticket?.type === 'in' ? 'Allow Entry' : 'Allow Exit'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.viewDetailsBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.viewDetailsBtnText}>View Full Details</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* Bottom Tab Bar Display */}
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

export default VerifiedEntry;
