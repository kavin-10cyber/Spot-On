import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Navbar from '../Components/navbar';
import { styles } from './dashboardstyles';
import { parkingService } from '../../../services/parkingService';
import { realtimeService } from '../../../services/realtimeService';

const Dashboard = ({
  onNavigateToScanner,
  onNavigateToManualBooking,
  onNavigateToScreen
}) => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [liveSlots, setLiveSlots] = useState({
    available: 0,
    occupied: 0,
    reserved: 0,
    total: 0,
  });

  // DB Recent Activity & Logs State
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs]   = useState(true);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logFilter, setLogFilter]         = useState('all'); // 'all' | 'entry' | 'exit' | 'failed'

  // ── Load Occupancy Stats & Live DB Verification Logs ───────────────────────
  const fetchActivityLogs = async () => {
    try {
      const { supabase } = await import('../../../config/supabase');
      
      // 1. Fetch verification_logs joined with bookings, parking_slots & vehicles
      const { data: logs, error } = await supabase
        .from('verification_logs')
        .select(`
          *,
          bookings (
            booking_code,
            parking_slots (slot_number),
            vehicles (vehicle_number)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && logs && logs.length > 0) {
        const mapped = logs.map((l) => {
          const dt = new Date(l.created_at || Date.now());
          const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

          return {
            id:          String(l.log_id),
            lpn:         l.bookings?.vehicles?.vehicle_number || 'TN-38-AB-1234',
            code:        l.bookings?.booking_code || 'PN-BK-0000',
            slotNum:     l.bookings?.parking_slots?.slot_number || 'A-101',
            type:        l.action === 'ENTRY_SCAN' ? 'in' : 'out',
            action:      l.action,
            status:      l.status || 'SUCCESS',
            details:     `Slot ${l.bookings?.parking_slots?.slot_number || 'A-101'} • ${timeStr}`,
            fullTime:    `${dateStr} • ${timeStr}`,
            remarks:     l.remarks || 'Verification attempt logged',
          };
        });
        setActivityLogs(mapped);
      } else {
        // Fallback to recent bookings if verification_logs is empty
        const { data: recentBookings } = await supabase
          .from('bookings')
          .select('*, parking_slots(slot_number), vehicles(vehicle_number)')
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentBookings && recentBookings.length > 0) {
          const mapped = recentBookings.map((b) => {
            const dt = new Date(b.created_at || Date.now());
            const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

            return {
              id:       String(b.booking_id),
              lpn:      b.vehicles?.vehicle_number || 'TN-38-AB-1234',
              code:     b.booking_code,
              slotNum:  b.parking_slots?.slot_number || 'A-101',
              type:     'in',
              action:   'ENTRY_SCAN',
              status:   b.status === 'CONFIRMED' ? 'SUCCESS' : b.status,
              details:  `Slot ${b.parking_slots?.slot_number || 'A-101'} • ${timeStr}`,
              fullTime: `${dateStr} • ${timeStr}`,
              remarks:  `Booking ${b.booking_code} created`,
            };
          });
          setActivityLogs(mapped);
        }
      }
    } catch (e) {
      console.log('Dashboard fetchActivityLogs error:', e.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    async function loadSlots() {
      try {
        const res = await parkingService.getOccupancySummary();
        if (res.success && res.data && res.data.length > 0) {
          const totals = res.data.reduce(
            (acc, loc) => ({
              available: acc.available + (loc.available_slots || 0),
              occupied:  acc.occupied + (loc.occupied_slots || 0),
              reserved:  acc.reserved + (loc.reserved_slots || 0),
              total:     acc.total + (loc.total_slots || 0),
            }),
            { available: 0, occupied: 0, reserved: 0, total: 0 }
          );
          setLiveSlots(totals);
        }
      } catch (e) {
        console.log('Dashboard slot load error:', e);
      }
    }

    loadSlots();
    fetchActivityLogs();

    // Real-time: Re-fetch occupancy summary & activity logs when DB tables update
    const slotChannel = realtimeService.subscribeToSlots(1, () => {
      loadSlots();
    });

    const bookingChannel = realtimeService.subscribeToBookings(() => {
      loadSlots();
      fetchActivityLogs();
    });

    return () => {
      realtimeService.unsubscribe(slotChannel);
      realtimeService.unsubscribe(bookingChannel);
    };
  }, []);

  const handleNotificationPress = () => {
    Alert.alert('Notifications', 'No new notifications at this time.');
  };

  const handleScanQRPress = () => {
    if (onNavigateToScanner) {
      onNavigateToScanner();
    }
  };

  const handleManualBookingPress = () => {
    if (onNavigateToManualBooking) {
      onNavigateToManualBooking();
    }
  };

  const handleActiveBookingsPress = () => {
    if (onNavigateToScreen) {
      onNavigateToScreen('Bookings');
    }
  };

  const handleViewLogPress = () => {
    setShowLogsModal(true);
  };

  // Filtered logs for the View Log modal
  const getFilteredLogs = () => {
    return activityLogs.filter((log) => {
      const q = logSearchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        log.lpn.toLowerCase().includes(q) || 
        log.code.toLowerCase().includes(q) || 
        log.slotNum.toLowerCase().includes(q) ||
        log.remarks.toLowerCase().includes(q);

      let matchesFilter = true;
      if (logFilter === 'entry') matchesFilter = log.type === 'in';
      else if (logFilter === 'exit') matchesFilter = log.type === 'out';
      else if (logFilter === 'failed') matchesFilter = log.status !== 'SUCCESS';

      return matchesSearch && matchesFilter;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfoRow}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120' }}
            style={styles.avatar}
          />
          <View style={styles.userTextContainer}>
            <Text style={styles.userName}>Vikram Patel</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={11} color="#64748B" style={styles.locationIcon} />
              <Text style={styles.locationText}>BIT College Campus Parking</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity style={styles.notificationButton} onPress={handleNotificationPress}>
          <Feather name="bell" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Dashboard</Text>
          <Text style={styles.subtitle}>Facility Oversight • Real-time Operations</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          {/* Row 1 */}
          <View style={styles.cardRow}>
            {/* Available Slots */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Feather name="check-circle" size={20} color="#16A34A" />
                <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.badgeText, { color: '#16A34A' }]}>Live</Text>
                </View>
              </View>
              <Text style={styles.cardValue}>{liveSlots.available}</Text>
              <Text style={styles.cardLabel}>AVAILABLE SLOTS</Text>
            </View>

            {/* Occupied Slots */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="car-outline" size={22} color="#2563EB" />
                <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={[styles.badgeText, { color: '#2563EB' }]}>Busy</Text>
                </View>
              </View>
              <Text style={styles.cardValue}>{liveSlots.occupied}</Text>
              <Text style={styles.cardLabel}>OCCUPIED SLOTS</Text>
            </View>
          </View>

          {/* Row 2 */}
          <View style={styles.cardRow}>
            {/* Reserved Slots */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="parking" size={22} color="#D97706" />
                <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.badgeText, { color: '#D97706' }]}>Active</Text>
                </View>
              </View>
              <Text style={styles.cardValue}>{liveSlots.reserved}</Text>
              <Text style={styles.cardLabel}>RESERVED SLOTS</Text>
            </View>

            {/* Today's Total */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Feather name="bar-chart-2" size={22} color="#4B5563" />
              </View>
              <Text style={styles.cardValue}>{liveSlots.total.toLocaleString()}</Text>
              <Text style={styles.cardLabel}>TODAY'S TOTAL</Text>
            </View>
          </View>
        </View>

        {/* Operational Controls Section */}
        <Text style={styles.sectionTitle}>Operational Controls</Text>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.scanButton} onPress={handleScanQRPress} activeOpacity={0.85}>
            <MaterialCommunityIcons name="qrcode-scan" size={26} color="#FFFFFF" />
            <Text style={styles.scanButtonText}>Scan QR</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.manualButton} onPress={handleManualBookingPress} activeOpacity={0.85}>
            <Feather name="edit" size={24} color="#1F2937" />
            <Text style={styles.manualButtonText}>Manual Booking</Text>
          </TouchableOpacity>
        </View>

        {/* Active Bookings Button */}
        <TouchableOpacity style={styles.activeBookingsButton} onPress={handleActiveBookingsPress} activeOpacity={0.85}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={24} color="#1F2937" />
          <Text style={styles.activeBookingsText}>Active Bookings</Text>
        </TouchableOpacity>

        {/* Recent Activity Section (Live Database Integrated) */}
        <View style={styles.recentActivityHeader}>
          <Text style={styles.recentActivityTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={handleViewLogPress} activeOpacity={0.7}>
            <Text style={styles.viewLogButton}>View Logs ({activityLogs.length})</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityContainer}>
          {activityLogs.slice(0, 5).map((activity, index) => {
            const isEntry = activity.type === 'in' || activity.action === 'ENTRY_SCAN';
            const isFailed = activity.status === 'EXPIRED' || activity.status === 'FAILED' || activity.status === 'REJECTED';

            let iconBg    = isEntry ? '#DCFCE7' : '#DBEAFE';
            let iconClr   = isEntry ? '#16A34A' : '#2563EB';
            let badgeBg   = isEntry ? '#DCFCE7' : '#DBEAFE';
            let badgeClr  = isEntry ? '#15803D' : '#1D64C6';
            let statusTxt = isEntry ? 'Checked In' : 'Checked Out';

            if (isFailed) {
              iconBg    = '#FEE2E2';
              iconClr   = '#EF4444';
              badgeBg   = '#FEE2E2';
              badgeClr  = '#B91C1C';
              statusTxt = activity.status === 'EXPIRED' ? 'Expired' : 'Failed';
            }

            return (
              <React.Fragment key={activity.id}>
                {index > 0 && <View style={styles.activityItemSpacer} />}
                <View style={styles.activityItem}>
                  <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                    <Feather 
                      name={isFailed ? 'alert-triangle' : isEntry ? 'log-in' : 'log-out'} 
                      size={18} 
                      color={iconClr} 
                    />
                  </View>
                  <View style={styles.activityTextContainer}>
                    <Text style={styles.activityLPN}>LPN: {activity.lpn}</Text>
                    <Text style={styles.activityDetails}>{activity.details}</Text>
                  </View>
                  <View style={[styles.activityStatusContainer, { backgroundColor: badgeBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }]}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: badgeClr }}>
                      {statusTxt}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            );
          })}
          {activityLogs.length === 0 && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#94A3B8', fontSize: 13 }}>No recent activity logged yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── View Full Verification & Activity Logs Modal ───────────────────── */}
      <Modal
        visible={showLogsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLogsModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowLogsModal(false)}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              height: '85%',
              padding: 20,
            }}
            onStartShouldSetResponder={() => true}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>Activity & Verification Logs</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Live Supabase DB Audit Logs ({getFilteredLogs().length} records)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowLogsModal(false)}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {[
                { key: 'all',    label: 'All Logs' },
                { key: 'entry',  label: 'Entry' },
                { key: 'exit',   label: 'Exit' },
                { key: 'failed', label: 'Failed' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setLogFilter(f.key)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 12,
                    backgroundColor: logFilter === f.key ? '#0052cc' : '#EFF6FF',
                    borderWidth: 1,
                    borderColor: logFilter === f.key ? '#003d99' : '#BFDBFE',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: logFilter === f.key ? '#fff' : '#0052cc' }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Scrollable Log Rows */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {getFilteredLogs().map((item) => {
                const isEntry = item.type === 'in' || item.action === 'ENTRY_SCAN';
                const isFailed = item.status === 'EXPIRED' || item.status === 'FAILED' || item.status === 'REJECTED';

                let iconBg    = isEntry ? '#DCFCE7' : '#DBEAFE';
                let iconClr   = isEntry ? '#16A34A' : '#2563EB';
                let badgeBg   = isEntry ? '#DCFCE7' : '#DBEAFE';
                let badgeClr  = isEntry ? '#15803D' : '#1D64C6';
                let statusTxt = isEntry ? 'Checked In' : 'Checked Out';
                let actionTxt = isEntry ? 'Entry Scan' : 'Exit Scan';

                if (isFailed) {
                  iconBg    = '#FEE2E2';
                  iconClr   = '#EF4444';
                  badgeBg   = '#FEE2E2';
                  badgeClr  = '#B91C1C';
                  statusTxt = item.status === 'EXPIRED' ? 'Expired Pass' : 'Scan Failed';
                }

                return (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      padding: 14,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: iconBg,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 8,
                          }}
                        >
                          <Feather
                            name={isFailed ? 'alert-triangle' : isEntry ? 'log-in' : 'log-out'}
                            size={15}
                            color={iconClr}
                          />
                        </View>
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{item.lpn}</Text>
                          <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '700' }}>{actionTxt}</Text>
                        </View>
                      </View>
                      <View
                        style={{
                          backgroundColor: badgeBg,
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color: badgeClr,
                          }}
                        >
                          {statusTxt}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600', marginBottom: 4 }}>
                      Code: <Text style={{ color: '#0052cc', fontWeight: '800' }}>{item.code}</Text> • Slot: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{item.slotNum}</Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>{item.remarks}</Text>
                    <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, textAlign: 'right' }}>
                      {item.fullTime}
                    </Text>
                  </View>
                );
              })}
              {getFilteredLogs().length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Feather name="inbox" size={32} color="#CBD5E1" />
                  <Text style={{ marginTop: 10, color: '#94A3B8', fontSize: 13 }}>No verification log entries found.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bottom Navigation Tab Bar */}
      <Navbar
        activeTab={activeTab}
        onTabPress={(tab) => {
          setActiveTab(tab);
          if (tab === 'Scanner' && onNavigateToScanner) {
            onNavigateToScanner();
          } else if (onNavigateToScreen) {
            onNavigateToScreen(tab);
          }
        }}
      />
    </SafeAreaView>
  );
};

export default Dashboard;
