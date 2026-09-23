import { supabase } from '../config/supabase';

/**
 * SpotOn Realtime Service
 * Manages all Supabase Realtime channel subscriptions safely
 */
export const realtimeService = {
  /**
   * Subscribe to live parking slot status changes for a location
   * Callback receives: { slot_id, slot_number, status, slot_type }
   */
  subscribeToSlots(locationId, callback) {
    try {
      // Use unique channel name instance to avoid "cannot add postgres_changes callbacks after subscribe()" error
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const channelName = `slots_${locationId}_${uniqueId}`;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'parking_slots',
            filter: `location_id=eq.${locationId}`,
          },
          (payload) => {
            console.log('[Realtime] Slot changed:', payload);
            if (callback) callback(payload);
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Slots channel (${channelName}):`, status);
        });

      return channel;
    } catch (err) {
      console.warn('[Realtime] subscribeToSlots error:', err);
      return null;
    }
  },

  /**
   * Subscribe to live booking changes (new bookings, status updates)
   */
  subscribeToBookings(callback) {
    try {
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const channelName = `bookings_${uniqueId}`;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
          },
          (payload) => {
            console.log('[Realtime] Booking changed:', payload);
            if (callback) callback(payload);
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Bookings channel (${channelName}):`, status);
        });

      return channel;
    } catch (err) {
      console.warn('[Realtime] subscribeToBookings error:', err);
      return null;
    }
  },

  /**
   * Subscribe to verification log events (gate scan entries)
   */
  subscribeToVerificationLogs(callback) {
    try {
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const channelName = `verif_logs_${uniqueId}`;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'verification_logs',
          },
          (payload) => {
            console.log('[Realtime] Verification log:', payload);
            if (callback) callback(payload);
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Verification logs channel (${channelName}):`, status);
        });

      return channel;
    } catch (err) {
      console.warn('[Realtime] subscribeToVerificationLogs error:', err);
      return null;
    }
  },

  /**
   * Subscribe to live payment transactions (new payments, status updates)
   */
  subscribeToPayments(callback) {
    try {
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const channelName = `payments_${uniqueId}`;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments',
          },
          (payload) => {
            console.log('[Realtime] Payment changed:', payload);
            if (callback) callback(payload);
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Payments channel (${channelName}):`, status);
        });

      return channel;
    } catch (err) {
      console.warn('[Realtime] subscribeToPayments error:', err);
      return null;
    }
  },

  /**
   * Unsubscribe and clean up a channel safely
   */
  unsubscribe(channel) {
    try {
      if (channel && typeof channel === 'object') {
        supabase.removeChannel(channel);
      }
    } catch (err) {
      console.warn('[Realtime] unsubscribe error:', err);
    }
  },
};
