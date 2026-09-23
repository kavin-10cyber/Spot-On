import React, { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Navbar from '../Components/navbar';
import { styles } from './BookingsListStyles';
import { supabase } from '../../../config/supabase';
import { realtimeService } from '../../../services/realtimeService';

const BookingsList = ({ onNavigateToScreen }) => {
  const [searchText, setSearchText]       = useState('');
  const [activeChip, setActiveChip]       = useState('All');
  const [bookings, setBookings]           = useState([]);
  const [loading, setLoading]             = useState(true);

  // Modals state
  const [selectedBooking, setSelectedBooking] = useState(null); // For View Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [actionBooking, setActionBooking]     = useState(null); // For Action Confirmation Modal
  const [actionType, setActionType]           = useState('CHECK_IN'); // 'CHECK_IN' | 'CHECK_OUT'
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionLoading, setActionLoading]     = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // ── 1. Fetch live bookings from Supabase public.bookings ─────────────────
  const loadBookingsFromDB = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          users (full_name, phone, email),
          parking_locations (name, address),
          parking_slots (slot_number, floor_level),
          vehicles (vehicle_number, vehicle_type, model_name)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((b) => {
          const name = b.users?.full_name || 'Walk-in Customer';
          const parts = name.trim().split(' ');
          const initials = parts.length > 1 
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : name.slice(0, 2).toUpperCase();

          let statusLabel = 'Expected';
          let avatarBg    = '#FEF3C7';
          let avatarColor = '#D97706';

          if (b.status === 'CHECKED_IN') {
            statusLabel = 'Parked';
            avatarBg    = '#EFF6FF';
            avatarColor = '#1D64C6';
          } else if (b.status === 'COMPLETED') {
            statusLabel = 'Completed';
            avatarBg    = '#DCFCE7';
            avatarColor = '#15803D';
          } else if (b.status === 'CANCELLED') {
            statusLabel = 'Cancelled';
            avatarBg    = '#FEE2E2';
            avatarColor = '#EF4444';
          }

          const startDt = new Date(b.start_time);
          const endDt   = new Date(b.end_time);

          const startStr = startDt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const endStr   = endDt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const dateStr  = startDt.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

          return {
            id:           String(b.booking_id),
            rawId:        b.booking_id,
            code:         b.booking_code,
            name:         name,
            phone:        b.users?.phone || 'N/A',
            initials:     initials,
            avatarBg:     avatarBg,
            avatarColor:  avatarColor,
            lpn:          b.vehicles?.vehicle_number || 'N/A',
            model:        b.vehicles?.model_name || b.vehicles?.vehicle_type || 'Standard 4-Wheeler',
            status:       statusLabel,
            rawStatus:    b.status,
            slot:         b.parking_slots?.slot_number ? `Slot ${b.parking_slots.slot_number}` : 'A-101',
            slotId:       b.slot_id,
            location:     b.parking_locations?.name || 'BIT College Campus Parking',
            timeWindow:   `${startStr} - ${endStr}`,
            dateStr:      dateStr,
            amount:       `₹${Number(b.total_amount || 60).toFixed(2)}`,
            raw:          b,
          };
        });

        setBookings(mapped);
      }
    } catch (e) {
      console.log('BookingsList load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookingsFromDB();

    // Real-time: reload when any booking or slot updates
    const channel = realtimeService.subscribeToBookings(() => {
      loadBookingsFromDB();
    });

    return () => realtimeService.unsubscribe(channel);
  }, [loadBookingsFromDB]);

  // ── 2. Filter Helpers ────────────────────────────────────────────────────
  const getFilteredBookings = () => {
    return bookings.filter((b) => {
      const q = searchText.trim().toLowerCase();
      const matchesSearch = !q ||
        b.name.toLowerCase().includes(q) ||
        b.lpn.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.slot.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (activeChip === 'All') return true;
      if (activeChip === 'Arriving') return b.status === 'Expected';
      if (activeChip === 'Parked') return b.status === 'Parked';
      if (activeChip === 'Completed') return b.status === 'Completed';

      return true;
    });
  };

  // ── 3. Handle Actions (Check-In / Check-Out Modal Trigger) ───────────────
  const openActionModal = (booking) => {
    const isCheckIn = booking.status === 'Expected';
    setActionBooking(booking);
    setActionType(isCheckIn ? 'CHECK_IN' : 'CHECK_OUT');
    setActionSuccessMsg('');
    setShowActionModal(true);
  };

  const handleConfirmCheckInOut = async () => {
    if (!actionBooking) return;
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const bId = actionBooking.rawId;
      const sId = actionBooking.slotId;

      if (actionType === 'CHECK_IN') {
        // Update booking to CHECKED_IN
        await supabase
          .from('bookings')
          .update({ status: 'CHECKED_IN', actual_check_in: now })
          .eq('booking_id', bId);

        // Update slot to OCCUPIED
        if (sId) {
          await supabase.from('parking_slots').update({ status: 'OCCUPIED' }).eq('slot_id', sId);
        }

        // Log entry scan
        await supabase.from('verification_logs').insert([{
          booking_id: bId,
          verified_by_staff_id: 1,
          action: 'ENTRY_SCAN',
          status: 'SUCCESS',
          remarks: `Manual check-in confirmed for vehicle ${actionBooking.lpn}`,
        }]);

        setActionSuccessMsg(`Vehicle ${actionBooking.lpn} successfully checked in to ${actionBooking.slot}!`);
      } else {
        // Update booking to COMPLETED
        await supabase
          .from('bookings')
          .update({ status: 'COMPLETED', actual_check_out: now })
          .eq('booking_id', bId);

        // Update slot to AVAILABLE
        if (sId) {
          await supabase.from('parking_slots').update({ status: 'AVAILABLE' }).eq('slot_id', sId);
        }

        // Log exit scan
        await supabase.from('verification_logs').insert([{
          booking_id: bId,
          verified_by_staff_id: 1,
          action: 'EXIT_SCAN',
          status: 'SUCCESS',
          remarks: `Manual check-out confirmed for vehicle ${actionBooking.lpn}`,
        }]);

        setActionSuccessMsg(`Vehicle ${actionBooking.lpn} checked out and ${actionBooking.slot} released!`);
      }

      await loadBookingsFromDB();

      // Auto-close modal after success message
      setTimeout(() => {
        setShowActionModal(false);
        setActionSuccessMsg('');
      }, 1600);
    } catch (e) {
      console.error('Check-in/out error:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const openViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const filteredBookings = getFilteredBookings();

  return (
    <View style={styles.container}>
      <StatusBar translucent={false} backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuBtn}>
            <Feather name="menu" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SpotOn Staff</Text>
        </View>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120' }}
          style={styles.avatar}
        />
      </View>

      {/* Search and Filters panel */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Search by name, plate, code or slot..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
          />
        </View>

        {/* Filter Chips row */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.chipsScroll}
        >
          {['All', 'Arriving', 'Parked', 'Completed'].map((chip) => (
            <TouchableOpacity
              key={chip}
              style={[
                styles.chip,
                activeChip === chip ? styles.chipActive : styles.chipInactive
              ]}
              onPress={() => setActiveChip(chip)}
              activeOpacity={0.8}
            >
              <Text style={activeChip === chip ? styles.chipTextActive : styles.chipTextInactive}>
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List of DB bookings */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0052cc" />
            <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Loading live database bookings...</Text>
          </View>
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map((b) => (
            <View key={b.id} style={styles.bookingCard}>
              <View style={styles.cardHeaderRow}>
                {/* Left Profile Initial */}
                <View style={[styles.initialCircle, { backgroundColor: b.avatarBg }]}>
                  <Text style={[styles.initialText, { color: b.avatarColor }]}>{b.initials}</Text>
                </View>
                {/* Middle details */}
                <View style={styles.cardHeaderDetails}>
                  <Text style={styles.cardCustomerName}>{b.name}</Text>
                  <Text style={styles.cardVehicleMeta}>{b.lpn} • {b.model}</Text>
                </View>
                {/* Status indicator badge */}
                <View style={[
                  styles.statusBadge,
                  b.status === 'Parked' && styles.badgeParked,
                  b.status === 'Expected' && styles.badgeExpected,
                  b.status === 'Completed' && styles.badgeParked,
                  b.status === 'Cancelled' && styles.badgeOverdue,
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    b.status === 'Parked' && styles.badgeTextParked,
                    b.status === 'Expected' && styles.badgeTextExpected,
                    b.status === 'Completed' && styles.badgeTextParked,
                    b.status === 'Cancelled' && styles.badgeTextOverdue,
                  ]}>
                    {b.status}
                  </Text>
                </View>
              </View>

              {/* Inner Details Container */}
              <View style={styles.innerPanel}>
                <View style={styles.innerMetaCol}>
                  <View style={styles.innerMetaRow}>
                    <Feather name="map-pin" size={14} color="#0052cc" style={{ marginRight: 6 }} />
                    <Text style={styles.innerMetaLabel}>SLOT</Text>
                  </View>
                  <Text style={styles.innerMetaValue}>{b.slot}</Text>
                </View>

                <View style={styles.innerMetaCol}>
                  <View style={styles.innerMetaRow}>
                    <Feather name="clock" size={14} color="#0052cc" style={{ marginRight: 6 }} />
                    <Text style={styles.innerMetaLabel}>TIME WINDOW</Text>
                  </View>
                  <Text style={styles.innerMetaValue}>{b.dateStr} • {b.timeWindow}</Text>
                </View>
              </View>

              {/* Action row buttons */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity 
                  style={styles.outlineBtn}
                  onPress={() => openViewDetails(b)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.outlineBtnText}>View Details</Text>
                </TouchableOpacity>

                {(b.status === 'Expected' || b.status === 'Parked') && (
                  <TouchableOpacity 
                    style={[
                      styles.primaryActionBtn,
                      b.status === 'Parked' && { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#A7F3D0' }
                    ]}
                    onPress={() => openActionModal(b)}
                    activeOpacity={0.85}
                  >
                    <Text style={[
                      styles.primaryActionBtnText,
                      b.status === 'Parked' && { color: '#15803D' }
                    ]}>
                      {b.status === 'Expected' ? 'Check In' : 'Check Out'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-search-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyText}>No matching bookings found in database.</Text>
          </View>
        )}
      </ScrollView>

      {/* ── 1. View Booking Details Modal ─────────────────────────────────── */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowDetailsModal(false)}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: '80%',
            }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>Booking Details</Text>
                <Text style={{ fontSize: 13, color: '#0052cc', fontWeight: '800', marginTop: 2 }}>
                  {selectedBooking?.code}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedBooking && (
                <View style={{ gap: 14 }}>
                  <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 }}>CUSTOMER</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{selectedBooking.name}</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Phone: {selectedBooking.phone}</Text>
                  </View>

                  <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 }}>VEHICLE & SLOT</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>Plate: {selectedBooking.lpn}</Text>
                    <Text style={{ fontSize: 13, color: '#475569', fontWeight: '600', marginTop: 2 }}>
                      {selectedBooking.model}  •  {selectedBooking.slot}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Facility: {selectedBooking.location}</Text>
                  </View>

                  <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 }}>SCHEDULE & FEE</Text>
                    <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700', marginTop: 2 }}>
                      {selectedBooking.dateStr} | {selectedBooking.timeWindow}
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#16A34A', marginTop: 4 }}>
                      Total Fee: {selectedBooking.amount} (Paid)
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={{
                width: '100%',
                height: 48,
                backgroundColor: '#0052cc',
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 20,
              }}
              onPress={() => setShowDetailsModal(false)}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>Close Details</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── 2. Check-In / Check-Out Confirmation Modal ────────────────────── */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          activeOpacity={1}
          onPress={() => setShowActionModal(false)}
        >
          <View
            style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center' }}
            onStartShouldSetResponder={() => true}
          >
            {actionSuccessMsg ? (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <MaterialCommunityIcons name="check-circle" size={54} color="#16A34A" style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', textAlign: 'center' }}>
                  {actionSuccessMsg}
                </Text>
              </View>
            ) : (
              <>
                <MaterialCommunityIcons
                  name={actionType === 'CHECK_IN' ? 'car-door-lock' : 'car-key'}
                  size={48}
                  color="#0052cc"
                  style={{ marginBottom: 14 }}
                />
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
                  Confirm {actionType === 'CHECK_IN' ? 'Check-In' : 'Check-Out'}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20 }}>
                  Are you sure you want to {actionType === 'CHECK_IN' ? 'check-in' : 'check-out'} vehicle{' '}
                  <Text style={{ fontWeight: '800', color: '#0F172A' }}>{actionBooking?.lpn}</Text> at{' '}
                  <Text style={{ fontWeight: '800', color: '#0052cc' }}>{actionBooking?.slot}</Text>?
                </Text>

                <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                  <TouchableOpacity
                    style={{ flex: 1, height: 46, backgroundColor: '#F1F5F9', borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setShowActionModal(false)}
                    disabled={actionLoading}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, height: 46, backgroundColor: actionType === 'CHECK_IN' ? '#0052cc' : '#16A34A', borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}
                    onPress={handleConfirmCheckInOut}
                    disabled={actionLoading}
                  >
                    {actionLoading && <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />}
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                      {actionLoading ? 'Processing...' : actionType === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Global navbar active on Bookings tab */}
      <Navbar 
        activeTab="Bookings"
        onTabPress={(tab) => {
          if (tab === 'Dashboard') {
            onNavigateToScreen('Dashboard');
          } else if (tab === 'Scanner') {
            onNavigateToScreen('QRScanner');
          }
        }}
      />
    </View>
  );
};

export default BookingsList;
