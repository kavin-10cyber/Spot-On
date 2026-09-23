import { supabase } from '../config/supabase';

export const staffService = {
  /**
   * Verify Scanned / Manually Entered Booking Code or License Plate (Used in Staff QRScanner)
   * Validates DB start_time, end_time, and status, and logs into public.verification_logs
   */
  async verifyBookingQRCode(bookingCode, staffId = 1) {
    try {
      const searchStr = String(bookingCode).trim();

      // 1. Fetch booking by booking_code OR vehicle_number from public.bookings
      let booking = null;

      // Query A: Search by booking_code exact/partial match
      const { data: byCode } = await supabase
        .from('bookings')
        .select(`
          *,
          users (full_name, phone),
          parking_locations (name, address),
          parking_slots (slot_number, floor_level),
          vehicles (vehicle_number, vehicle_type)
        `)
        .or(`booking_code.eq.${searchStr},booking_code.ilike.%${searchStr}%`)
        .order('created_at', { ascending: false });

      if (byCode && byCode.length > 0) {
        booking = byCode[0];
      } else {
        // Query B: Search by vehicle plate number
        const { data: byPlate } = await supabase
          .from('bookings')
          .select(`
            *,
            users (full_name, phone),
            parking_locations (name, address),
            parking_slots (slot_number, floor_level),
            vehicles!inner (vehicle_number, vehicle_type)
          `)
          .ilike('vehicles.vehicle_number', `%${searchStr}%`)
          .order('created_at', { ascending: false });

        if (byPlate && byPlate.length > 0) {
          booking = byPlate[0];
        }
      }

      if (!booking) {
        return {
          success: false,
          error: `No active booking found for "${searchStr}". Please check the ticket code or vehicle plate.`,
        };
      }

      const now = new Date();
      const startTime = new Date(booking.start_time);
      const endTime = new Date(booking.end_time);

      const startTimeStr = startTime.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const endTimeStr = endTime.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // 2. Perform Date & Time Validation Checks
      let logAction = 'ENTRY_SCAN';
      let isSuccess = true;
      let remarks = '';
      let failureReason = '';
      let newStatus = '';

      if (booking.status === 'CANCELLED') {
        isSuccess = false;
        failureReason = `Booking was CANCELLED.`;
        remarks = `Failed: Booking ${booking.booking_code} was cancelled.`;
      } else if (booking.status === 'COMPLETED') {
        isSuccess = false;
        failureReason = `Ticket ALREADY USED & COMPLETED.`;
        remarks = `Failed: Booking ${booking.booking_code} already completed.`;
      } else if (booking.status === 'CONFIRMED' || booking.status === 'PENDING') {
        logAction = 'ENTRY_SCAN';

        // Buffer window: Allow entry starting 30 mins before scheduled start_time
        const earlyBuffer = new Date(startTime.getTime() - 30 * 60 * 1000);

        if (now < earlyBuffer) {
          isSuccess = false;
          failureReason = `TOO EARLY! Booking start time is ${startTimeStr}.`;
          remarks = `Failed: Arrival at ${now.toLocaleTimeString()} is too early for start time ${startTimeStr}.`;
        } else if (now > endTime) {
          isSuccess = false;
          failureReason = `BOOKING EXPIRED! Expired at ${endTimeStr}.`;
          remarks = `Failed: Arrival at ${now.toLocaleTimeString()} is after end time ${endTimeStr}.`;
        } else {
          // Valid Entry! Update booking status to CHECKED_IN and slot status to OCCUPIED
          newStatus = 'CHECKED_IN';
          remarks = `Success: Entry verified at ${now.toLocaleTimeString()}. Scheduled: ${startTimeStr} - ${endTimeStr}`;

          await supabase
            .from('bookings')
            .update({ status: 'CHECKED_IN', actual_check_in: now.toISOString() })
            .eq('booking_id', booking.booking_id);

          await supabase
            .from('parking_slots')
            .update({ status: 'OCCUPIED' })
            .eq('slot_id', booking.slot_id);
        }
      } else if (booking.status === 'CHECKED_IN') {
        logAction = 'EXIT_SCAN';
        remarks = `Success: Exit verified at ${now.toLocaleTimeString()}. Scheduled end: ${endTimeStr}`;

        await supabase
          .from('bookings')
          .update({ status: 'COMPLETED', actual_check_out: now.toISOString() })
          .eq('booking_id', booking.booking_id);

        await supabase
          .from('parking_slots')
          .update({ status: 'AVAILABLE' })
          .eq('slot_id', booking.slot_id);
      }

      // 3. Record verification attempt in public.verification_logs
      await supabase.from('verification_logs').insert([
        {
          booking_id: booking.booking_id,
          verified_by_staff_id: staffId,
          action: logAction,
          status: isSuccess ? 'SUCCESS' : 'EXPIRED',
          remarks: remarks.slice(0, 255),
        },
      ]);

      if (!isSuccess) {
        return {
          success: false,
          error: failureReason,
          booking: {
            ...booking,
            startTimeStr,
            endTimeStr,
          },
        };
      }

      return {
        success: true,
        booking: {
          ...booking,
          status: booking.status === 'CHECKED_IN' ? 'COMPLETED' : 'CHECKED_IN',
          startTimeStr,
          endTimeStr,
        },
        action: logAction,
      };
    } catch (error) {
      console.error('verifyBookingQRCode Error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create Manual Spot Booking by Gate Attendant
   */
  async createManualBooking({
    vehicleNumber,
    vehicleType,
    locationId,
    slotId,
    staffId,
    collectedAmount,
  }) {
    try {
      // 1. Create a dummy or lookup guest user
      const guestEmail = `guest_${Date.now()}@spoton.local`;
      const { data: user } = await supabase
        .from('users')
        .insert([{ full_name: 'Walk-in Customer', email: guestEmail, phone: `${Date.now()}`, password_hash: 'manual', role_id: 4 }])
        .select()
        .single();

      const userId = user ? user.user_id : 4;

      // 2. Create vehicle record
      const { data: vehicle } = await supabase
        .from('vehicles')
        .insert([{ user_id: userId, vehicle_number: vehicleNumber, vehicle_type: vehicleType }])
        .select()
        .single();

      const vehicleId = vehicle ? vehicle.vehicle_id : 1;

      // 3. Create spot booking
      const bookingCode = `SPOT-${Math.floor(10000 + Math.random() * 90000)}`;
      const { data: booking, error: bookingErr } = await supabase
        .from('bookings')
        .insert([
          {
            booking_code: bookingCode,
            user_id: userId,
            slot_id: slotId,
            location_id: locationId,
            vehicle_id: vehicleId,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            actual_check_in: new Date().toISOString(),
            total_amount: collectedAmount,
            booking_type: 'MANUAL_SPOT',
            status: 'CHECKED_IN',
          },
        ])
        .select()
        .single();

      if (bookingErr) throw bookingErr;

      // 4. Update slot to OCCUPIED
      await supabase.from('parking_slots').update({ status: 'OCCUPIED' }).eq('slot_id', slotId);

      // 5. Record Cash Payment
      await supabase.from('payments').insert([
        {
          booking_id: booking.booking_id,
          amount: collectedAmount,
          payment_method: 'CASH',
          payment_status: 'SUCCESS',
          collected_by_staff_id: staffId,
        },
      ]);

      return { success: true, booking };
    } catch (error) {
      console.error('createManualBooking Error:', error);
      return { success: false, error: error.message };
    }
  },
};
