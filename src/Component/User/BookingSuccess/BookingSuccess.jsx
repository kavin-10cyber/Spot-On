import React, { useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { styles } from './BookingSuccessStyles';

const BookingSuccess = ({ parking, slotId, onDone, onViewQR, onNavigateToSlot }) => {
  const destinationName = parking?.name || 'Grand Central Parking';
  const bookingId = '#PN-' + Math.floor(10000 + Math.random() * 90000);

  // Animation values
  const bounceAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(bounceAnim, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoP}>P</Text>
          </View>
          <Text style={styles.logoText}>SpotOn</Text>
        </View>
        <View style={styles.avatar}>
          <FeatherIcon name="user" size={16} color="#0052cc" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Animated Green Check Circle */}
        <Animated.View
          style={[
            styles.checkContainer,
            {
              transform: [{ scale: bounceAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={styles.outerCircle}>
            <View style={styles.innerCircle}>
              <FeatherIcon name="check" size={48} color="#FFFFFF" />
            </View>
          </View>
        </Animated.View>

        {/* Text Headers */}
        <View style={styles.textSection}>
          <Text style={styles.title}>Booking Confirmed!</Text>
          <Text style={styles.subtitle}>
            Your parking spot has been successfully reserved. Park easily and enjoy your day.
          </Text>
        </View>

        {/* Ticket Details Card */}
        <View style={styles.ticketCard}>
          <View style={styles.ticketRow}>
            <View>
              <Text style={styles.ticketLabel}>BOOKING ID</Text>
            </View>
            <View>
              <Text style={styles.bookingIdText}>{bookingId}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.ticketRow}>
            <View>
              <Text style={styles.ticketLabel}>SLOT NUMBER</Text>
              <Text style={styles.ticketValue}>{slotId || 'B-12'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.ticketLabel}>STATUS</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Reserved</Text>
              </View>
            </View>
          </View>

          <View style={[styles.ticketRow, { marginTop: 16 }]}>
            <View>
              <Text style={styles.ticketLabel}>PARKING LOCATION</Text>
              <View style={styles.locationRow}>
                <FeatherIcon name="map-pin" size={14} color="#0052cc" style={{ marginRight: 6 }} />
                <Text style={styles.locationValue} numberOfLines={1}>{destinationName}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Buttons Container */}
      <View style={styles.footerContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.qrButton}
          activeOpacity={0.85}
          onPress={onViewQR}
        >
          <MaterialIcon name="qr-code" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.qrButtonText}>View QR Code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navigateButton}
          onPress={onNavigateToSlot}
          activeOpacity={0.8}
        >
          <FeatherIcon name="navigation" size={18} color="#0052cc" style={{ marginRight: 8 }} />
          <Text style={styles.navigateButtonText}>Navigate to Slot</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneButton} onPress={onDone} activeOpacity={0.7}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BookingSuccess;
