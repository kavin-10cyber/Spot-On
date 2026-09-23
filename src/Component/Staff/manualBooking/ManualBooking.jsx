import React, { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Navbar from '../Components/navbar';
import { styles } from './ManualBookingStyles';
import { supabase } from '../../../config/supabase';

const getTodayDateString = (offsetDays = 0) => {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const getCurrentDeviceTimeString = () => {
  const d = new Date();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const paddedHours = hours.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');
  return `${paddedHours}:${paddedMinutes} ${ampm}`;
};

const ManualBooking = ({ onBack, onBookingSuccess, onNavigateToScanner, onNavigateToScreen }) => {

  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Sedan / Hatchback');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [duration, setDuration] = useState('2 Hours');
  const [inDate, setInDate] = useState(getTodayDateString(0));
  const [outDate, setOutDate] = useState(getTodayDateString(0));
  const [inTime, setInTime] = useState(getCurrentDeviceTimeString());
  const [outTime, setOutTime] = useState('12:00 PM');

  // ── Live slot state ──────────────────────────────────────────────────────
  const [allSlots, setAllSlots]           = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot]   = useState(null); // { slot_id, slot_number }
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [loadingSlots, setLoadingSlots]   = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [slotFilter, setSlotFilter]       = useState('all'); // 'all' | 'free' | 'ev'
  
  // Custom Date Picker Modal States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateTarget, setDateTarget] = useState('in'); // 'in' or 'out'
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  // Custom Time Picker States
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeTarget, setTimeTarget] = useState('in'); // 'in' or 'out'

  const vehicleTypes = ['Sedan / Hatchback', 'SUV / MUV', 'Two Wheeler', 'Electric Vehicle'];

  const parseDateString = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  };

  const parseTimeString = (str) => {
    if (!str) return null;
    const parts = str.trim().toLowerCase().match(/(\d+):(\d+)\s*(am|pm)?/);
    if (!parts) return null;
    let hours = parseInt(parts[1], 10);
    const minutes = parseInt(parts[2], 10);
    const ampm = parts[3];
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    return { hours, minutes };
  };

  // ── Fetch slots for location from Supabase with date & time-based availability check ──────
  const fetchTimebasedSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const dIn = parseDateString(inDate);
      const tIn = parseTimeString(inTime);
      const dOut = parseDateString(outDate);
      const tOut = parseTimeString(outTime);

      const startIso = dIn && tIn ? new Date(new Date(dIn).setHours(tIn.hours, tIn.minutes, 0, 0)).toISOString() : new Date().toISOString();
      const endIso = dOut && tOut ? new Date(new Date(dOut).setHours(tOut.hours, tOut.minutes, 0, 0)).toISOString() : new Date(Date.now() + 2 * 3600000).toISOString();

      const { data: slotsData } = await supabase
        .from('parking_slots')
        .select('*, parking_locations(name)')
        .eq('location_id', 1)
        .eq('is_active', true)
        .order('slot_id', { ascending: true });

      const { data: overlappingBookings } = await supabase
        .from('bookings')
        .select('slot_id')
        .eq('location_id', 1)
        .in('status', ['CONFIRMED', 'CHECKED_IN'])
        .lt('start_time', endIso)
        .gt('end_time', startIso);

      const bookedSet = new Set((overlappingBookings || []).map((b) => Number(b.slot_id)));

      if (slotsData && slotsData.length > 0) {
        const mappedSlots = slotsData.map(s => ({
          ...s,
          timebasedStatus: bookedSet.has(Number(s.slot_id)) ? 'OCCUPIED' : s.status,
        }));
        setAllSlots(mappedSlots);

        const avail = slotsData.filter((s) => !bookedSet.has(Number(s.slot_id)) && s.status !== 'MAINTENANCE');
        setAvailableSlots(avail);
        if (avail.length > 0) {
          setSelectedSlot((prev) => (prev && avail.some(a => a.slot_id === prev.slot_id) ? prev : avail[0]));
        }
      }
    } catch (e) {
      console.log('ManualBooking fetchSlots error:', e.message);
    } finally {
      setLoadingSlots(false);
    }
  }, [inDate, inTime, outDate, outTime]);

  useEffect(() => {
    fetchTimebasedSlots();
  }, [fetchTimebasedSlots]);

  useEffect(() => {
    if (duration === 'Custom') return;

    const dateObj = parseDateString(inDate);
    const timeObj = parseTimeString(inTime);
    if (!dateObj || !timeObj) return;

    dateObj.setHours(timeObj.hours, timeObj.minutes, 0, 0);

    let offsetMinutes = 0;
    if (duration === '2 Hours') offsetMinutes = 120;
    else if (duration === '4 Hours') offsetMinutes = 240;
    else if (duration === 'Full Day') offsetMinutes = 720;

    const outDateObj = new Date(dateObj.getTime() + offsetMinutes * 60 * 1000);

    const outHours = outDateObj.getHours();
    const outMinutes = outDateObj.getMinutes();
    const ampm = outHours >= 12 ? 'PM' : 'AM';
    const displayHours = outHours % 12 === 0 ? 12 : outHours % 12;
    const paddedHours = displayHours.toString().padStart(2, '0');
    const paddedMinutes = outMinutes.toString().padStart(2, '0');
    setOutTime(`${paddedHours}:${paddedMinutes} ${ampm}`);

    const displayDay = outDateObj.getDate().toString().padStart(2, '0');
    const displayMonth = (outDateObj.getMonth() + 1).toString().padStart(2, '0');
    const displayYear = outDateObj.getFullYear();
    setOutDate(`${displayDay}/${displayMonth}/${displayYear}`);
  }, [inDate, inTime, duration]);

  const calculateCustomHours = (inD, inT, outD, outT) => {
    const parseTime = (str) => {
      if (!str) return null;
      const parts = str.trim().toLowerCase().match(/(\d+):(\d+)\s*(am|pm)?/);
      if (!parts) return null;
      let hours = parseInt(parts[1], 10);
      const minutes = parseInt(parts[2], 10);
      const ampm = parts[3];
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      return { hours, minutes };
    };

    const dIn = parseDateString(inD);
    const tIn = parseTime(inT);
    const dOut = parseDateString(outD);
    const tOut = parseTime(outT);

    if (!dIn || !tIn || !dOut || !tOut) return null;

    dIn.setHours(tIn.hours, tIn.minutes, 0, 0);
    dOut.setHours(tOut.hours, tOut.minutes, 0, 0);

    const diffMs = dOut.getTime() - dIn.getTime();
    if (diffMs < 0) return null;

    const diffHours = diffMs / (1000 * 60 * 60);
    return parseFloat(diffHours.toFixed(1));
  };

  const parseTimeToDate = (timeStr) => {
    const d = new Date();
    const timeObj = parseTimeString(timeStr);
    if (timeObj) {
      d.setHours(timeObj.hours, timeObj.minutes, 0, 0);
    }
    return d;
  };

  const formatTimeToString = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const paddedHours = displayHours.toString().padStart(2, '0');
    const paddedMinutes = minutes.toString().padStart(2, '0');
    return `${paddedHours}:${paddedMinutes} ${ampm}`;
  };

  const onTimeChange = (event, selectedDate) => {
    setShowTimePicker(false);
    if (event.type === 'set' && selectedDate) {
      const formatted = formatTimeToString(selectedDate);
      if (timeTarget === 'in') {
        setInTime(formatted);
      } else {
        setOutTime(formatted);
      }
    }
  };

  const computedHours = calculateCustomHours(inDate, inTime, outDate, outTime);

  // ── Convert DD/MM/YYYY + HH:MM AM/PM → ISO string ─────────────────────────
  const toISOString = (dateStr, timeStr) => {
    const d = parseDateString(dateStr);
    const t = parseTimeString(timeStr);
    if (!d || !t) return new Date().toISOString();
    d.setHours(t.hours, t.minutes, 0, 0);
    return d.toISOString();
  };

  const handleProceedPayment = async () => {
    if (!customerName.trim() || !vehicleNumber.trim()) {
      Alert.alert('Missing Information', 'Please fill in Customer Name and Vehicle Number.');
      return;
    }
    if (!selectedSlot) {
      Alert.alert('No Slot Selected', 'Please select an available parking slot.');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const startTime = toISOString(inDate, inTime);
      const startDateTimeObj = parseDateString(inDate) || new Date();
      const tObj = parseTimeString(inTime);
      if (tObj) startDateTimeObj.setHours(tObj.hours, tObj.minutes, 0, 0);

      // Fix NOT-NULL constraint for end_time: For Open Slot or missing end time, set default 24h from start
      let endTime = new Date(startDateTimeObj.getTime() + 24 * 60 * 60 * 1000).toISOString();
      if (duration !== 'Open Slot' && outDate && outTime) {
        endTime = toISOString(outDate, outTime);
      }

      const bookingCode = `PN-ST-${Math.floor(10000 + Math.random() * 90000)}`;

      // 1. Get or create a guest user record for walk-in customer
      let userId = 4; // default fallback user_id
      const { data: existingUser } = await supabase
        .from('users')
        .select('user_id')
        .eq('phone', phoneNumber.trim() || '0000000000')
        .single();
      if (existingUser?.user_id) userId = existingUser.user_id;

      // 2. Upsert vehicle record
      const { data: vehicle } = await supabase
        .from('vehicles')
        .upsert([{
          user_id: userId,
          vehicle_number: vehicleNumber.trim().toUpperCase(),
          vehicle_type: '4-WHEELER',
          model_name: vehicleType,
          status: 'ACTIVE',
        }], { onConflict: 'vehicle_number' })
        .select('vehicle_id')
        .single();

      const vehicleId = vehicle?.vehicle_id || 1;

      // Pricing Rule:
      // Open Slot Bookings: Base Fee (₹20) + ₹35/hr
      // Fixed-Duration Bookings: Flat Rate ₹30/hr (no base fee)
      let calculatedAmount = 60;
      if (duration === 'Open Slot') {
        const hrs = computedHours || 2;
        calculatedAmount = 20 + Math.round(hrs * 35);
      } else if (duration === '1 Hour') {
        calculatedAmount = 30;
      } else if (duration === '2 Hours') {
        calculatedAmount = 60;
      } else if (duration === '4 Hours') {
        calculatedAmount = 120;
      } else if (duration === 'Full Day') {
        calculatedAmount = 360; // 12 hrs x 30
      } else if (duration === 'Custom' && computedHours) {
        calculatedAmount = Math.round(computedHours * 30);
      }

      // 3. Insert booking record with valid non-null end_time
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          booking_code:  bookingCode,
          user_id:       userId,
          location_id:   selectedSlot.location_id || 1,
          slot_id:       selectedSlot.slot_id,
          vehicle_id:    vehicleId,
          start_time:    startTime,
          end_time:      endTime,
          total_amount:  calculatedAmount,
          booking_type:  'MANUAL_SPOT',  // valid enum: ONLINE | MANUAL_SPOT
          status:        'CONFIRMED',
        }])
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 4. Mark slot as RESERVED → triggers Realtime on ALL subscribed pages
      await supabase
        .from('parking_slots')
        .update({ status: 'RESERVED' })
        .eq('slot_id', selectedSlot.slot_id);

      // 5. Insert payment record in public.payments table
      const txnId = `TXN-ST-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await supabase.from('payments').insert([
        {
          booking_id: booking.booking_id,
          amount: calculatedAmount,
          payment_method: 'CASH',
          payment_status: 'COMPLETED',
          transaction_id: txnId,
          collected_by_staff_id: 1,
          paid_at: new Date().toISOString(),
        },
      ]);

      // 6. Notify parent and navigate directly to BookingSuccess screen
      if (onBookingSuccess) {
        onBookingSuccess({
          name:          customerName,
          lpn:           vehicleNumber.trim().toUpperCase(),
          slotClass:     vehicleType.split(' / ')[0],
          lot:           selectedSlot.parking_locations?.name || 'Central Plaza',
          zone:          `Zone ${selectedSlot.slot_number?.charAt(0) || 'A'}`,
          slotNum:       selectedSlot.slot_number || 'A-101',
          time:          duration,
          payment:       'PENDING',
          bookingCode:   bookingCode,
          bookingId:     booking?.booking_id,
        });
      }
    } catch (e) {
      console.error('ManualBooking submit error:', e);
      Alert.alert('Booking Failed', e.message || 'Could not create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignSlotOnly = () => {
    if (!customerName.trim() || !vehicleNumber.trim()) {
      Alert.alert('Missing Information', 'Please fill in Customer Name and Vehicle Number.');
      return;
    }
    Alert.alert('Slot Assigned', `Slot ${selectedSlot?.slot_number || 'A-101'} has been pre-assigned to vehicle ${vehicleNumber.toUpperCase()}. Proceed to payment to complete booking.`);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent={false} backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.75}>
            <Feather name="arrow-left" size={24} color="#0052cc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Booking</Text>
        </View>
        <TouchableOpacity onPress={() => Alert.alert('Menu', 'Options: Clear Form, Help')} activeOpacity={0.75}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Main Form Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Quick Walk-in Entry Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>Quick Walk-in Entry</Text>
            <Text style={styles.bannerSub}>
              Efficiently log new arrivals and assign parking slots in real-time.
            </Text>
          </View>
          <View style={styles.bannerWatermarkContainer}>
            <Text style={styles.bannerWatermark}>P</Text>
          </View>
        </View>

        {/* Customer Details section */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="user-plus" size={18} color="#0052cc" style={{ marginRight: 8 }} />
            <Text style={styles.sectionHeaderTitle}>Customer Details</Text>
          </View>
          
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Customer Name</Text>
            <View style={styles.inputFieldBox}>
              <Feather name="user" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Aarav Sharma"
                placeholderTextColor="#94A3B8"
                value={customerName}
                onChangeText={setCustomerName}
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputFieldBox}>
              <Feather name="phone" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.textInput}
                placeholder="+91 98765 43210"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
          </View>
        </View>

        {/* Vehicle Information section */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="car-outline" size={20} color="#0052cc" style={{ marginRight: 8 }} />
            <Text style={styles.sectionHeaderTitle}>Vehicle Information</Text>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Vehicle Number</Text>
            <View style={styles.inputFieldBox}>
              <Feather name="hash" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.textInput}
                placeholder="ABC-1234"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                autoCorrect={false}
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Vehicle Type</Text>
            <TouchableOpacity 
              style={styles.dropdownBox}
              activeOpacity={0.8}
              onPress={() => setShowVehicleModal(true)}
            >
              <View style={styles.dropdownLeft}>
                <MaterialCommunityIcons name="car-select" size={20} color="#94A3B8" style={{ marginRight: 10 }} />
                <Text style={styles.dropdownValueText}>{vehicleType}</Text>
              </View>
              <Feather name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Duration & Slot section */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="clock" size={18} color="#0052cc" style={{ marginRight: 8 }} />
            <Text style={styles.sectionHeaderTitle}>Duration & Slot</Text>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Booking Duration</Text>
            <View style={styles.chipsRow}>
              {['2 Hours', '4 Hours', 'Full Day', 'Custom', 'Open Slot'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, duration === opt ? styles.chipActive : styles.chipInactive]}
                  onPress={() => setDuration(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={duration === opt ? styles.chipTextActive : styles.chipTextInactive}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

            {/* Dates row */}
            <View style={styles.customTimeRow}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>In-Date</Text>
                <TouchableOpacity 
                  style={styles.inputFieldBox}
                  activeOpacity={0.8}
                  onPress={() => {
                    setDateTarget('in');
                    const parsed = parseDateString(inDate);
                    setCurrentCalendarMonth(parsed || new Date());
                    setShowDatePicker(true);
                  }}
                >
                  <Feather name="calendar" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <Text style={styles.datePickerValueText}>{inDate}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputWrapper, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Out-Date</Text>
                <TouchableOpacity 
                  style={[styles.inputFieldBox, (duration !== 'Custom') && { backgroundColor: '#F1F5F9' }]}
                  activeOpacity={duration === 'Custom' ? 0.8 : 1}
                  onPress={() => {
                    if (duration === 'Custom') {
                      setDateTarget('out');
                      const parsed = parseDateString(outDate);
                      setCurrentCalendarMonth(parsed || new Date());
                      setShowDatePicker(true);
                    }
                  }}
                >
                  <Feather name="calendar" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <Text style={[styles.datePickerValueText, (duration !== 'Custom') && { color: '#64748B' }]}>
                    {duration === 'Open Slot' ? 'Open Ended' : outDate}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Timings row */}
            <View style={styles.customTimeRow}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>In-Time</Text>
                <TouchableOpacity 
                  style={styles.inputFieldBox}
                  activeOpacity={0.8}
                  onPress={() => {
                    setTimeTarget('in');
                    setShowTimePicker(true);
                  }}
                >
                  <Feather name="clock" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <Text style={styles.datePickerValueText}>{inTime}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputWrapper, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Out-Time</Text>
                <TouchableOpacity 
                  style={[styles.inputFieldBox, (duration !== 'Custom') && { backgroundColor: '#F1F5F9' }]}
                  activeOpacity={duration === 'Custom' ? 0.8 : 1}
                  onPress={() => {
                    if (duration === 'Custom') {
                      setTimeTarget('out');
                      setShowTimePicker(true);
                    }
                  }}
                >
                  <Feather name="clock" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <Text style={[styles.datePickerValueText, (duration !== 'Custom') && { color: '#64748B' }]}>
                    {duration === 'Open Slot' ? 'Open Ended' : outTime}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

          {duration === 'Custom' && computedHours !== null && !isNaN(computedHours) && (
            <View style={styles.computedHoursBox}>
              <Feather name="activity" size={14} color="#0052cc" style={{ marginRight: 6 }} />
              <Text style={styles.computedHoursText}>
                Calculated Duration: <Text style={{ fontWeight: '800', color: '#0052cc' }}>{computedHours} Hours</Text>
              </Text>
            </View>
          )}

          {duration === 'Open Slot' && (
            <View style={[styles.computedHoursBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Feather name="zap" size={14} color="#0052cc" style={{ marginRight: 6 }} />
              <Text style={styles.computedHoursText}>
                Mode: <Text style={{ fontWeight: '800', color: '#0052cc' }}>Open Slot (Pay on Exit upon vehicle checkout)</Text>
              </Text>
            </View>
          )}

          {/* ── Rate Card Banner ────────────────────────────────── */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
            borderRadius: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="tag-outline" size={18} color="#0052cc" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>Rate Card:</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF' }}>Open: ₹20 + ₹35/hr</Text>
              </View>
              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>Fixed: ₹30/hr</Text>
              </View>
            </View>
          </View>

          {/* ── Live Slot Picker ──────────────────────────────────── */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Assign Parking Slot</Text>
            <TouchableOpacity
              style={styles.dropdownBox}
              activeOpacity={0.8}
              onPress={() => setShowSlotModal(true)}
            >
              <View style={styles.dropdownLeft}>
                <MaterialCommunityIcons name="parking" size={20} color="#0052cc" style={{ marginRight: 10 }} />
                {loadingSlots ? (
                  <ActivityIndicator size="small" color="#0052cc" />
                ) : (
                  <Text style={[styles.dropdownValueText, { color: selectedSlot ? '#1E293B' : '#94A3B8' }]}>
                    {selectedSlot
                      ? `${selectedSlot.slot_number}  •  ${selectedSlot.slot_type || 'Standard'}  •  Floor ${selectedSlot.floor_level || 'P1'}`
                      : availableSlots.length === 0 ? 'No slots available' : 'Select a slot...'}
                  </Text>
                )}
              </View>
              <Feather name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>
            {availableSlots.length > 0 && (
              <Text style={{ fontSize: 11, color: '#22C55E', marginTop: 4, marginLeft: 2 }}>
                ✓ {availableSlots.length} slots available
              </Text>
            )}
          </View>

          {/* Form Actions */}
          <View style={{ marginTop: 24 }}>
            <TouchableOpacity
              style={[styles.proceedPaymentBtn, (isSubmitting || !selectedSlot) && { opacity: 0.6 }]}
              onPress={handleProceedPayment}
              activeOpacity={0.85}
              disabled={isSubmitting || !selectedSlot}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              ) : (
                <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.proceedPaymentBtnText}>
                {isSubmitting ? 'Creating Booking...' : 'Confirm & Assign Slot'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SMS receipt alert card */}
        <View style={styles.smsAlertCard}>
          <Feather name="info" size={18} color="#16A34A" style={{ marginRight: 10, marginTop: 2 }} />
          <Text style={styles.smsAlertText}>
            Booking summary and digital receipt will be sent via SMS once payment is confirmed.
          </Text>
        </View>
      </ScrollView>

      {/* Global bottom Navbar configured to set Dashboard active */}
      <Navbar
        activeTab="Dashboard"
        onTabPress={(tab) => {
          if (tab === 'Dashboard') {
            onBack();
          } else if (tab === 'Scanner') {
            onNavigateToScanner();
          } else if (onNavigateToScreen) {
            onNavigateToScreen(tab);
          } else {
            onBack();
          }
        }}
      />
      {/* Vehicle Type Selection Modal */}
      <Modal
        visible={showVehicleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVehicleModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowVehicleModal(false)}
        >
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerHeaderTitle}>Select Vehicle Type</Text>
              <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {vehicleTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.pickerOptionItem,
                  vehicleType === type && styles.pickerOptionItemActive
                ]}
                onPress={() => {
                  setVehicleType(type);
                  setShowVehicleModal(false);
                }}
              >
                <Text style={[
                  styles.pickerOptionText,
                  vehicleType === type && styles.pickerOptionTextActive
                ]}>
                  {type}
                </Text>
                {vehicleType === type && (
                  <Feather name="check" size={16} color="#0052cc" style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── User-Friendly Spatial Grid Slot Selection Modal ───────────────── */}
      <Modal
        visible={showSlotModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSlotModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSlotModal(false)}
        >
          <View
            style={[styles.pickerModalContent, { maxHeight: '85%', width: '92%', borderRadius: 24, padding: 18 }]}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Assign Parking Slot</Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  {availableSlots.length} Available  •  {allSlots.length - availableSlots.length} Taken
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSlotModal(false)} activeOpacity={0.7}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
              {[
                { key: 'all',  label: 'All' },
                { key: 'free', label: 'Free' },
                { key: 'ev',   label: 'EV' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setSlotFilter(f.key)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 12,
                    backgroundColor: slotFilter === f.key ? '#0052cc' : '#EFF6FF',
                    borderWidth: 1,
                    borderColor: slotFilter === f.key ? '#003d99' : '#BFDBFE',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: slotFilter === f.key ? '#fff' : '#0052cc' }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Legend */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 8, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 4 }} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>Available</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0052cc', marginRight: 4 }} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>Selected</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 4 }} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>Taken</Text>
              </View>
            </View>

            {/* Spatial Grid Content */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {(() => {
                const displaySlots = slotFilter === 'free'
                  ? allSlots.filter((s) => s.status === 'AVAILABLE')
                  : slotFilter === 'ev'
                  ? allSlots.filter((s) => s.slot_type === 'EV')
                  : allSlots;

                const getPrefix = (sn = '') => {
                  const m = sn.match(/^([A-Za-z]+)/);
                  return m ? m[1].toUpperCase() : 'Z';
                };

                const zoneGroups = displaySlots.reduce((acc, slot) => {
                  const z = getPrefix(slot.slot_number);
                  if (!acc[z]) acc[z] = [];
                  acc[z].push(slot);
                  return acc;
                }, {});

                const sortedZones = Object.keys(zoneGroups).sort();

                if (sortedZones.length === 0) {
                  return (
                    <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                      <MaterialCommunityIcons name="car-off" size={36} color="#CBD5E1" />
                      <Text style={{ marginTop: 8, color: '#94A3B8', fontSize: 13 }}>No slots match this filter</Text>
                    </View>
                  );
                }

                const renderCell = (slot) => {
                  const isSelected = selectedSlot?.slot_id === slot.slot_id;
                  const isOccupied = slot.status !== 'AVAILABLE';
                  const isEV       = slot.slot_type === 'EV';

                  let cellBg    = '#DCFCE7';
                  let borderClr = '#22C55E';
                  let iconColor = '#15803D';

                  if (isOccupied) { cellBg = '#FEE2E2'; borderClr = '#EF4444'; iconColor = '#EF4444'; }
                  if (isSelected) { cellBg = '#0052cc'; borderClr = '#003d99'; iconColor = '#FFFFFF'; }

                  return (
                    <TouchableOpacity
                      key={slot.slot_id}
                      onPress={() => {
                        if (isOccupied) {
                          Alert.alert('Slot Taken', `Slot ${slot.slot_number} is currently occupied/reserved.`);
                          return;
                        }
                        setSelectedSlot(slot);
                      }}
                      activeOpacity={0.75}
                      style={{
                        width: 54,
                        height: 48,
                        backgroundColor: cellBg,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderColor: borderClr,
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: 3,
                        position: 'relative',
                      }}
                    >
                      {isOccupied ? (
                        <MaterialCommunityIcons name="car" size={18} color={iconColor} />
                      ) : (
                        <>
                          {isEV && !isSelected && (
                            <MaterialCommunityIcons
                              name="lightning-bolt"
                              size={10}
                              color="#0052cc"
                              style={{ position: 'absolute', top: 2, right: 3 }}
                            />
                          )}
                          <Text style={{ fontSize: 10, fontWeight: '700', color: iconColor, textAlign: 'center' }}>
                            {slot.slot_number}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  );
                };

                return sortedZones.map((zoneName) => {
                  const zSlots = zoneGroups[zoneName] || [];
                  const half   = Math.ceil(zSlots.length / 2);
                  const left   = zSlots.slice(0, half);
                  const right  = zSlots.slice(half);

                  return (
                    <View key={zoneName} style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <View style={{ backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#BFDBFE' }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#0052cc' }}>ZONE {zoneName}</Text>
                        </View>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0', marginLeft: 8 }} />
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start' }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', maxWidth: 120, justifyContent: 'flex-end' }}>
                          {left.map(renderCell)}
                        </View>
                        <View style={{ width: 24, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, paddingVertical: 4 }}>
                          <View style={{ width: 2, flex: 1, backgroundColor: '#E2E8F0' }} />
                          <MaterialCommunityIcons name="arrow-up-down" size={12} color="#CBD5E1" style={{ marginVertical: 2 }} />
                          <View style={{ width: 2, flex: 1, backgroundColor: '#E2E8F0' }} />
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', maxWidth: 120, justifyContent: 'flex-start' }}>
                          {right.map(renderCell)}
                        </View>
                      </View>
                    </View>
                  );
                });
              })()}
            </ScrollView>

            {/* Confirm Slot Selection Footer */}
            {selectedSlot && (
              <TouchableOpacity
                style={{
                  width: '100%',
                  height: 46,
                  backgroundColor: '#0052cc',
                  borderRadius: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  marginTop: 8,
                }}
                onPress={() => setShowSlotModal(false)}
                activeOpacity={0.85}
              >
                <Feather name="check-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                  Confirm Slot {selectedSlot.slot_number}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Calendar Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.calendarModalContent}>
            {/* Calendar Month Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity 
                onPress={() => {
                  const newMonth = new Date(currentCalendarMonth);
                  newMonth.setMonth(newMonth.getMonth() - 1);
                  setCurrentCalendarMonth(newMonth);
                }}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Feather name="chevron-left" size={20} color="#1E293B" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>
                {currentCalendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  const newMonth = new Date(currentCalendarMonth);
                  newMonth.setMonth(newMonth.getMonth() + 1);
                  setCurrentCalendarMonth(newMonth);
                }}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Feather name="chevron-right" size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {/* Weekdays labels */}
            <View style={styles.weekDaysRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <Text key={i} style={styles.weekDayLabel}>{day}</Text>
              ))}
            </View>

            {/* Days grid */}
            <View style={styles.daysGrid}>
              {(() => {
                const year = currentCalendarMonth.getFullYear();
                const month = currentCalendarMonth.getMonth();
                const firstDayIndex = new Date(year, month, 1).getDay();
                const totalDays = new Date(year, month + 1, 0).getDate();
                const cells = [];

                // Empty padding cells
                for (let i = 0; i < firstDayIndex; i++) {
                  cells.push(<View key={`empty-${i}`} style={styles.dayCellEmpty} />);
                }

                // Day cells
                const activeValStr = dateTarget === 'in' ? inDate : outDate;
                const activeParsed = parseDateString(activeValStr);

                for (let day = 1; day <= totalDays; day++) {
                  const dateObj = new Date(year, month, day);
                  const isSelected = activeParsed && 
                    activeParsed.getDate() === day && 
                    activeParsed.getMonth() === month && 
                    activeParsed.getFullYear() === year;

                  cells.push(
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                      onPress={() => {
                        const dStr = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
                        if (dateTarget === 'in') {
                          setInDate(dStr);
                        } else {
                          setOutDate(dStr);
                        }
                        setShowDatePicker(false);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return cells;
              })()}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Native Time Picker Dialog */}
      {showTimePicker && (
        <DateTimePicker
          value={timeTarget === 'in' ? parseTimeToDate(inTime) : parseTimeToDate(outTime)}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={onTimeChange}
        />
      )}
    </View>
  );
};

export default ManualBooking;
