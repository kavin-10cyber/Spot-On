import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { styles } from './DashBoardStyles';
import { adminService } from '../../../services/adminService';
import { parkingService } from '../../../services/parkingService';
import { realtimeService } from '../../../services/realtimeService';

const DashBoard = ({ setActiveTab }) => {
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'System Alert', message: 'Backup completed successfully.', time: '5m ago' },
    { id: '2', title: 'New Registration', message: 'Staff member Vikram registered.', time: '1h ago' },
  ]);
  const [showNotifications, setShowNotifications]   = useState(false);
  const [showBookingsModal, setShowBookingsModal]   = useState(false);
  const [showUsersModal, setShowUsersModal]         = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showLotsModal, setShowLotsModal]           = useState(false);
  const [showLogsModal, setShowLogsModal]           = useState(false);
  const [logSearchQuery, setLogSearchQuery]         = useState('');
  const [logFilter, setLogFilter]                   = useState('all'); // 'all' | 'entry' | 'exit' | 'failed'

  // DB Activity Logs state
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs]   = useState(true);

  // Live stats from Supabase Table DB
  const [dashStats, setDashStats] = useState({
    totalLots: 0,
    totalSlots: 0,
    availableSlots: 0,
    todaysRevenue: 0,
  });

  // Modals Data
  const bookingsData = [
    { id: 'BK-9921', user: 'Aarav Sharma', slot: 'Lot A-102', time: '09:30 AM', status: 'Confirmed' },
    { id: 'BK-9922', user: 'Priya Patel', slot: 'Lot B-204', time: '10:15 AM', status: 'Pending' },
    { id: 'BK-9923', user: 'Rohan Verma', slot: 'Lot A-105', time: '11:00 AM', status: 'Completed' },
    { id: 'BK-9924', user: 'Ananya Iyer', slot: 'Lot C-302', time: '11:45 AM', status: 'Confirmed' },
    { id: 'BK-9925', user: 'Rahul Nair', slot: 'Lot B-108', time: '12:30 PM', status: 'Cancelled' },
  ];

  const usersData = [
    { id: 'U-001', name: 'Aarav Sharma', email: 'aarav.sharma@gmail.com', bookings: 12, rating: '4.8' },
    { id: 'U-002', name: 'Priya Patel', email: 'priya.patel@gmail.com', bookings: 5, rating: '4.9' },
    { id: 'U-003', name: 'Rohan Verma', email: 'rohan.verma@gmail.com', bookings: 21, rating: '4.5' },
    { id: 'U-004', name: 'Ananya Iyer', email: 'ananya.iyer@gmail.com', bookings: 8, rating: '4.7' },
    { id: 'U-005', name: 'Vikram Patel', email: 'vikram.patel@gmail.com', bookings: 14, rating: '5.0' },
  ];

  const lotsData = [
    { id: 'L-A', name: 'Lot A - BIT Campus Main Lot', totalSlots: 161, occupiedSlots: 38, status: 'Active' },
    { id: 'L-B', name: 'Lot B - BIT Annex Lot', totalSlots: 80, occupiedSlots: 24, status: 'Active' },
    { id: 'L-C', name: 'Lot C - Executive Zone', totalSlots: 40, occupiedSlots: 10, status: 'Active' },
  ];

  // ── 1. Load Live Stats & Revenue from Table DB ────────────────────────────
  const loadDashboardStats = async () => {
    try {
      const { supabase } = await import('../../../config/supabase');

      // Fetch all 4 stats concurrently to reduce round-trip latency
      const [locsRes, slotsRes, bksRes, pmtsRes] = await Promise.all([
        supabase.from('parking_locations').select('location_id'),
        supabase.from('parking_slots').select('slot_id, status'),
        supabase.from('bookings').select('booking_id'),
        supabase.from('payments').select('amount'),
      ]);

      const totalLots = locsRes.data ? locsRes.data.length : 1;

      let totalSlots = 0;
      let availableSlots = 0;
      let occupiedSlots = 0;
      const slots = slotsRes.data;
      if (slots && slots.length > 0) {
        totalSlots = slots.length;
        availableSlots = slots.filter((s) => s.status === 'AVAILABLE').length;
        occupiedSlots = slots.filter((s) => s.status === 'OCCUPIED' || s.status === 'RESERVED').length;
      }

      const todaysBookings = bksRes.data ? bksRes.data.length : 0;
      const todaysRevenue = pmtsRes.data
        ? pmtsRes.data.reduce((acc, p) => acc + Number(p.amount || 0), 0)
        : 0;

      setDashStats({
        totalLots,
        totalSlots: totalSlots || 161,
        availableSlots,
        occupiedSlots,
        todaysBookings,
        todaysRevenue,
      });
    } catch (e) {
      console.log('Admin Dashboard stats load error:', e);
    }
  };

  // ── 2. Load Live Verification Logs from Table DB ─────────────────────────
  const fetchActivityLogs = async () => {
    try {
      const { supabase } = await import('../../../config/supabase');
      
      const { data: logs, error } = await supabase
        .from('verification_logs')
        .select(`
          *,
          bookings (
            booking_code,
            parking_slots (slot_number),
            vehicles (vehicle_number),
            users (full_name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(25);

      if (!error && logs && logs.length > 0) {
        const mapped = logs.map((l) => {
          const dt = new Date(l.created_at || Date.now());
          const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

          return {
            id:       String(l.log_id),
            lpn:      l.bookings?.vehicles?.vehicle_number || 'KA-01-AB-1234',
            customer: l.bookings?.users?.full_name || 'Walk-in Customer',
            code:     l.bookings?.booking_code || 'PN-BK-0000',
            slotNum:  l.bookings?.parking_slots?.slot_number || 'A-101',
            type:     l.action === 'ENTRY_SCAN' ? 'in' : 'out',
            action:   l.action,
            status:   l.status || 'SUCCESS',
            details:  `Slot ${l.bookings?.parking_slots?.slot_number || 'A-101'} • ${timeStr}`,
            fullTime: `${dateStr} • ${timeStr}`,
            remarks:  l.remarks || 'Verification attempt logged',
          };
        });
        setActivityLogs(mapped);
      } else {
        // Fallback to recent bookings if verification_logs is empty
        const { data: recentBookings } = await supabase
          .from('bookings')
          .select('*, parking_slots(slot_number), vehicles(vehicle_number), users(full_name)')
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
              customer: b.users?.full_name || 'Customer',
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
      console.log('Admin fetchActivityLogs error:', e.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadDashboardStats();
    fetchActivityLogs();

    // Real-time: refresh stats & logs whenever slots, bookings or verification logs update
    const slotChannel = realtimeService.subscribeToSlots(1, () => {
      loadDashboardStats();
    });
    const bookingChannel = realtimeService.subscribeToBookings(() => {
      loadDashboardStats();
      fetchActivityLogs();
    });

    return () => {
      realtimeService.unsubscribe(slotChannel);
      realtimeService.unsubscribe(bookingChannel);
    };
  }, []);

  const getFilteredLogs = () => {
    return activityLogs.filter((log) => {
      const q = logSearchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        log.lpn.toLowerCase().includes(q) || 
        log.customer.toLowerCase().includes(q) || 
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.statusBarSpacer} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.iconButton}>
            <FeatherIcon name="menu" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SpotOn Admin</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setShowNotifications(true)}
          >
            <FeatherIcon name="bell" size={22} color="#1A1D20" />
            <View style={styles.badge} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('Profile')}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120' }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Performance Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
        </View>

        {/* Stats Grid (Live DB Metrics) */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            {/* Card 1 - Total Lots */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Locations</Text>
              <View style={styles.statRowContent}>
                <Text style={styles.statValue}>{dashStats.totalLots}</Text>
                <FeatherIcon name="map" size={18} color="#6B7280" style={styles.statIcon} />
              </View>
            </View>
            {/* Card 2 - Total Slots */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Slots</Text>
              <View style={styles.statRowContent}>
                <Text style={styles.statValue}>{dashStats.totalSlots}</Text>
                <FeatherIcon name="grid" size={18} color="#6B7280" style={styles.statIcon} />
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            {/* Card 3 - Available */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Available Slots</Text>
              <View style={styles.statRowContent}>
                <Text style={[styles.statValue, { color: '#10B981' }]}>{dashStats.availableSlots}</Text>
                <View style={styles.changeBadge}>
                  <Text style={styles.changeText}>Free</Text>
                </View>
              </View>
            </View>
            {/* Card 4 - Occupied */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Occupied / Reserved</Text>
              <View style={styles.statRowContent}>
                <Text style={[styles.statValue, { color: '#1A5FB4' }]}>{dashStats.occupiedSlots}</Text>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar} />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            {/* Card 5 - Total Bookings */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Bookings</Text>
              <View style={styles.statRowContent}>
                <Text style={styles.statValue}>{dashStats.todaysBookings}</Text>
                <FeatherIcon name="calendar" size={18} color="#6B7280" style={styles.statIcon} />
              </View>
            </View>
            {/* Card 6 - Total Revenue */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Revenue</Text>
              <View style={styles.statRowContent}>
                <Text style={[styles.statValue, { color: '#16A34A' }]}>₹{dashStats.todaysRevenue}</Text>
                <FeatherIcon name="credit-card" size={18} color="#16A34A" style={styles.statIcon} />
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 16 }]}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionCard} 
            activeOpacity={0.8}
            onPress={() => setShowLotsModal(true)}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <FeatherIcon name="map-pin" size={18} color="#0052cc" />
            </View>
            <Text style={styles.quickActionTitle}>Manage Lots</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard} 
            activeOpacity={0.8}
            onPress={() => setActiveTab('SlotMgmt')}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: '#D1FAE5' }]}>
              <FeatherIcon name="layers" size={18} color="#16A34A" />
            </View>
            <Text style={styles.quickActionTitle}>Manage Slots</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard} 
            activeOpacity={0.8}
            onPress={() => setActiveTab('StaffMgmt')}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <FeatherIcon name="users" size={18} color="#0052cc" />
            </View>
            <Text style={styles.quickActionTitle}>Staff Mgmt</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard} 
            activeOpacity={0.8}
            onPress={() => setShowBookingsModal(true)}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <FeatherIcon name="bookmark" size={18} color="#D97706" />
            </View>
            <Text style={styles.quickActionTitle}>Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard} 
            activeOpacity={0.8}
            onPress={() => setShowUsersModal(true)}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: '#FCE7F3' }]}>
              <FeatherIcon name="user" size={18} color="#DB2777" />
            </View>
            <Text style={styles.quickActionTitle}>Users</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard} 
            activeOpacity={0.8}
            onPress={() => setShowAnalyticsModal(true)}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <FeatherIcon name="bar-chart-2" size={18} color="#9333EA" />
            </View>
            <Text style={styles.quickActionTitle}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity (Live Table DB Integrated) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => setShowLogsModal(true)} activeOpacity={0.7}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0052cc' }}>View All Logs ({activityLogs.length})</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityCard}>
          {activityLogs.slice(0, 5).map((act, idx) => {
            const isEntry = act.type === 'in' || act.action === 'ENTRY_SCAN';
            const isFailed = act.status === 'EXPIRED' || act.status === 'FAILED' || act.status === 'REJECTED';

            let iconBg    = isEntry ? '#DCFCE7' : '#DBEAFE';
            let iconClr   = isEntry ? '#16A34A' : '#2563EB';
            let statusTxt = isEntry ? 'Checked In' : 'Checked Out';
            let badgeBg   = isEntry ? '#DCFCE7' : '#DBEAFE';
            let badgeClr  = isEntry ? '#15803D' : '#1D64C6';

            if (isFailed) {
              iconBg    = '#FEE2E2';
              iconClr   = '#EF4444';
              badgeBg   = '#FEE2E2';
              badgeClr  = '#B91C1C';
              statusTxt = act.status === 'EXPIRED' ? 'Expired Pass' : 'Scan Failed';
            }

            return (
              <View 
                key={act.id} 
                style={[
                  styles.activityRow,
                  idx === activityLogs.slice(0, 5).length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                <View style={[styles.activityIconCircle, { backgroundColor: iconBg }]}>
                  <FeatherIcon 
                    name={isFailed ? 'alert-triangle' : isEntry ? 'log-in' : 'log-out'} 
                    size={16} 
                    color={iconClr} 
                  />
                </View>
                <View style={styles.activityTextCol}>
                  <Text style={styles.activityTitle}>{act.lpn} ({act.customer})</Text>
                  <Text style={styles.activitySubtitle}>Code: {act.code} • Slot: {act.slotNum}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ backgroundColor: badgeBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: badgeClr }}>{statusTxt}</Text>
                  </View>
                  <Text style={styles.activityTime}>{act.details.split(' • ')[1] || 'Just Now'}</Text>
                </View>
              </View>
            );
          })}

          {activityLogs.length === 0 && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#94A3B8', fontSize: 13 }}>No recent activity logged in DB.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Admin Activity & Audit Logs Modal ───────────────────────────────── */}
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
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>Admin System Audit Logs</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Live Supabase Database Logs ({getFilteredLogs().length} records)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowLogsModal(false)}>
                <FeatherIcon name="x" size={22} color="#64748B" />
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
                          <FeatherIcon
                            name={isFailed ? 'alert-triangle' : isEntry ? 'log-in' : 'log-out'}
                            size={15}
                            color={iconClr}
                          />
                        </View>
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{item.lpn}</Text>
                          <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>{item.customer}</Text>
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
                  <FeatherIcon name="inbox" size={32} color="#CBD5E1" />
                  <Text style={{ marginTop: 10, color: '#94A3B8', fontSize: 13 }}>No verification log entries found.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={showNotifications} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <FeatherIcon name="x" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.notifyItem}>
                  <View style={styles.notifyContent}>
                    <Text style={styles.notifyTitle}>{item.title}</Text>
                    <Text style={styles.notifyMessage}>{item.message}</Text>
                  </View>
                  <Text style={styles.notifyTime}>{item.time}</Text>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
      </Modal>

      {/* Bookings Management Modal */}
      <Modal visible={showBookingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bookings Management</Text>
              <TouchableOpacity onPress={() => setShowBookingsModal(false)}>
                <FeatherIcon name="x" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={bookingsData}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.notifyItem}>
                  <View style={styles.notifyContent}>
                    <View style={styles.bookingHeader}>
                      <Text style={styles.notifyTitle}>{item.id} - {item.user}</Text>
                      <View style={[styles.statusBadge, 
                        item.status === 'Confirmed' && { backgroundColor: '#D1FAE5' },
                        item.status === 'Pending' && { backgroundColor: '#FEF3C7' },
                        item.status === 'Completed' && { backgroundColor: '#DBEAFE' },
                        item.status === 'Cancelled' && { backgroundColor: '#FEE2E2' },
                      ]}>
                        <Text style={[styles.statusText,
                          item.status === 'Confirmed' && { color: '#065F46' },
                          item.status === 'Pending' && { color: '#92400E' },
                          item.status === 'Completed' && { color: '#1E40AF' },
                          item.status === 'Cancelled' && { color: '#991B1B' },
                        ]}>{item.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.notifyMessage}>Slot: {item.slot} | Scheduled: {item.time}</Text>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
      </Modal>

      {/* Users Management Modal */}
      <Modal visible={showUsersModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Users Directory</Text>
              <TouchableOpacity onPress={() => setShowUsersModal(false)}>
                <FeatherIcon name="x" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={usersData}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.notifyItem}>
                  <View style={styles.notifyContent}>
                    <Text style={styles.notifyTitle}>{item.name} ({item.id})</Text>
                    <Text style={styles.notifyMessage}>{item.email} | {item.bookings} bookings</Text>
                  </View>
                  <View style={styles.userRating}>
                    <FeatherIcon name="star" size={12} color="#D97706" />
                    <Text style={styles.ratingValue}>{item.rating}</Text>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
      </Modal>

      {/* Lots Management Modal */}
      <Modal visible={showLotsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Parking Lots Overview</Text>
              <TouchableOpacity onPress={() => setShowLotsModal(false)}>
                <FeatherIcon name="x" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={lotsData}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.notifyItem}>
                  <View style={styles.notifyContent}>
                    <Text style={styles.notifyTitle}>{item.name}</Text>
                    <Text style={styles.notifyMessage}>Occupancy: {item.occupiedSlots} / {item.totalSlots} Slots</Text>
                  </View>
                  <View style={[styles.statusBadge, item.status === 'Active' ? { backgroundColor: '#D1FAE5' } : { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.statusText, item.status === 'Active' ? { color: '#065F46' } : { color: '#991B1B' }]}>{item.status}</Text>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
      </Modal>

      {/* Analytics Modal */}
      <Modal visible={showAnalyticsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Operational Analytics</Text>
              <TouchableOpacity onPress={() => setShowAnalyticsModal(false)}>
                <FeatherIcon name="x" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 8 }}>
              <View style={styles.analyticsChartContainer}>
                <Text style={styles.analyticsTitle}>Weekly Slot Occupancy Trend</Text>
                <View style={styles.chartBarsRow}>
                  <View style={styles.chartColumn}>
                    <Text style={styles.barValLabel}>65%</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: '65%' }]} />
                    </View>
                    <Text style={styles.barDayLabel}>Mon</Text>
                  </View>

                  <View style={styles.chartColumn}>
                    <Text style={styles.barValLabel}>78%</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: '78%' }]} />
                    </View>
                    <Text style={styles.barDayLabel}>Tue</Text>
                  </View>

                  <View style={styles.chartColumn}>
                    <Text style={styles.barValLabel}>70%</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: '70%' }]} />
                    </View>
                    <Text style={styles.barDayLabel}>Wed</Text>
                  </View>

                  <View style={styles.chartColumn}>
                    <Text style={styles.barValLabel}>85%</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: '85%' }]} />
                    </View>
                    <Text style={styles.barDayLabel}>Thu</Text>
                  </View>

                  <View style={styles.chartColumn}>
                    <Text style={styles.barValLabel}>92%</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: '92%' }]} />
                    </View>
                    <Text style={styles.barDayLabel}>Fri</Text>
                  </View>

                  <View style={styles.chartColumn}>
                    <Text style={styles.barValLabel}>98%</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: '98%' }]} />
                    </View>
                    <Text style={styles.barDayLabel}>Sat</Text>
                  </View>

                  <View style={styles.chartColumn}>
                    <Text style={styles.barValLabel}>80%</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: '80%' }]} />
                    </View>
                    <Text style={styles.barDayLabel}>Sun</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.analyticsSubtitle}>Average Occupancy Rate: 84%</Text>
              <Text style={[styles.analyticsSubtitle, { marginTop: 12 }]}>Revenue Distribution</Text>
              <View style={styles.revenueDist}>
                <View style={styles.revenueDistItem}>
                  <View style={[styles.colorBox, { backgroundColor: '#1A5FB4' }]} />
                  <Text style={styles.revenueDistText}>Hourly Bookings (65%)</Text>
                </View>
                <View style={styles.revenueDistItem}>
                  <View style={[styles.colorBox, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.revenueDistText}>Monthly Passes (25%)</Text>
                </View>
                <View style={styles.revenueDistItem}>
                  <View style={[styles.colorBox, { backgroundColor: '#D97706' }]} />
                  <Text style={styles.revenueDistText}>Valet Services (10%)</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default DashBoard;
