import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Animated,
  Keyboard,
  PermissionsAndroid,
  Platform,
  StyleSheet,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Camera } from 'react-native-camera-kit';
import VerifiedEntry from '../VerifiedEntry/VerifiedEntry';
import FailedVerification from '../FailedVerification/FailedVerification';
import { styles } from './QRScannerStyles';
import { staffService } from '../../../services/staffService';


const QRScanner = ({ onBack, onCheckIn, onCheckOut, availableSlots, occupiedSlots, onNavigateToManualBooking }) => {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [flashOn, setFlashOn] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Modal / Bottom Sheet details
  const [modalVisible, setModalVisible] = useState(false);
  const [scanFailedVisible, setScanFailedVisible] = useState(false);
  const [scannedTicket, setScannedTicket] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Viewfinder Animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'SpotOn needs access to your camera to scan QR codes.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setHasCameraPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.warn(err);
        setHasCameraPermission(false);
      }
    } else {
      setHasCameraPermission(true);
    }
  };

  useEffect(() => {
    requestCameraPermission();
  }, []);

  useEffect(() => {
    // Continuous loop for scanning laser
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 254, // viewfinder height (260) - laser height (6)
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [laserAnim]);

  // Handle scanning a QR code or entering a booking code
  const handleSimulateScan = async (codeToScan) => {
    if (!codeToScan) return;

    let parsedCode = codeToScan.trim();
    try {
      const json = JSON.parse(codeToScan);
      if (json && (json.passId || json.bookingCode)) {
        parsedCode = json.passId || json.bookingCode;
      }
    } catch (e) {}

    try {
      const dbRes = await staffService.verifyBookingQRCode(parsedCode);
      if (dbRes.success && dbRes.booking) {
        const b = dbRes.booking;
        setScannedTicket({
          code: b.booking_code || parsedCode,
          lpn: b.vehicles?.vehicle_number || 'TN-38-AB-1234',
          name: b.users?.full_name || 'Customer',
          slotClass: b.vehicles?.vehicle_type || 'Standard',
          type: dbRes.action === 'ENTRY_SCAN' ? 'in' : 'out',
          status: b.status,
          lot: b.parking_locations?.name || 'BIT College Campus Parking',
          slotNum: b.parking_slots?.slot_number || 'A-101',
          fee: b.total_amount || 60,
          startTimeStr: b.startTimeStr,
          endTimeStr: b.endTimeStr,
        });
        setActionSuccess(false);
        setModalVisible(true);
        return;
      } else if (!dbRes.success && dbRes.error) {
        // Show validation failure modal if date/time is invalid or expired
        setScannedTicket({
          code: parsedCode,
          errorReason: dbRes.error,
          startTimeStr: dbRes.booking?.startTimeStr || '',
          endTimeStr: dbRes.booking?.endTimeStr || '',
        });
        setScanFailedVisible(true);
        return;
      }
    } catch (err) {
      console.log('Supabase QR check error:', err);
    }

    // Default fallback ticket display for offline simulation
    setScannedTicket({
      code: parsedCode,
      lpn: 'TN-38-AB-1234',
      name: 'Verified Driver',
      slotClass: 'Standard',
      type: 'in',
      status: 'CONFIRMED',
      lot: 'BIT College Campus Parking',
      slotNum: 'Slot A-101',
      fee: 60,
    });
    setActionSuccess(false);
    setModalVisible(true);
  };


  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      Alert.alert('Input Error', 'Please enter a ticket code or plate number.');
      return;
    }
    Keyboard.dismiss();
    handleSimulateScan(manualCode);
  };

  const handleConfirmAction = () => {
    if (!scannedTicket) return;

    if (scannedTicket.type === 'in') {
      if (availableSlots <= 0) {
        Alert.alert('Lot Full', 'No slots available for check-in.', [{ text: 'OK' }]);
        return;
      }
      onCheckIn(scannedTicket.lpn);
      setSuccessMsg(`Vehicle ${scannedTicket.lpn} checked in!`);
    } else {
      onCheckOut(scannedTicket.lpn, scannedTicket.fee);
      setSuccessMsg(`Vehicle ${scannedTicket.lpn} checked out!`);
    }

    setActionSuccess(true);

    // Auto-close and return after success
    setTimeout(() => {
      setModalVisible(false);
      onBack();
    }, 1800);
  };

  if (hasCameraPermission === null) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasCameraPermission === false) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
        <View style={styles.permissionBody}>
          <Feather name="camera-off" size={64} color="#EF4444" style={{ marginBottom: 20 }} />
          <Text style={styles.permissionTitle}>Camera Permission Denied</Text>
          <Text style={styles.permissionSubtitle}>
            SpotOn needs camera access to scan QR tickets and license plates. Please enable permissions in your device settings.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestCameraPermission}>
            <Text style={styles.permissionBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.75}>
          <Feather name="arrow-left" size={24} color="#0052cc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Parking QR</Text>
      </View>

      {/* Viewfinder Container */}
      <View style={styles.viewfinderContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          scanBarcode={!modalVisible && !showManualForm}
          onReadCode={(event) => {
            const scannedCode = event.nativeEvent.codeStringValue;
            if (scannedCode) {
              handleSimulateScan(scannedCode);
            }
          }}
          torchMode={flashOn ? 'on' : 'off'}
        />

        {/* Semi-transparent Overlay for Camera Effect */}
        <View style={styles.maskOutter}>
          <View style={styles.maskRowTop} />
          <View style={styles.maskCenterRow}>
            <View style={styles.maskSide} />
            <View style={styles.viewfinder}>
              {/* Corner Indicators */}
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
              
              {/* Laser Animation */}
              <Animated.View style={[styles.laserLine, { transform: [{ translateY: laserAnim }] }]} />
            </View>
            <View style={styles.maskSide} />
          </View>
          
          {/* Bottom mask row containing centered controls */}
          <View style={styles.bottomMaskRow}>
            <Text style={styles.instructionText}>Scan customer QR to verify booking.</Text>

            {/* Quick circular buttons */}
            <View style={styles.circleButtonsRow}>
              <TouchableOpacity 
                onPress={() => setFlashOn(!flashOn)} 
                style={[styles.circleButton, flashOn && styles.circleButtonActive]}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name={flashOn ? "flashlight" : "flashlight-off"} size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => Alert.alert('Gallery', 'Photo Library is not available in emulator mode.')} 
                style={styles.circleButton}
                activeOpacity={0.75}
              >
                <Feather name="image" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Manual Entry Main Button */}
            <TouchableOpacity 
              style={styles.primaryManualBtn} 
              onPress={() => {
                if (onNavigateToManualBooking) {
                  onNavigateToManualBooking();
                }
              }}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="pencil-box-multiple-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryManualBtnText}>Manual Booking</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowManualForm(true)}>
              <Text style={styles.subtextLink}>Can't scan? Enter code manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Manual Input Sheet Overlay */}
      {showManualForm && (
        <View style={styles.manualEntryOverlay}>
          <View style={styles.manualEntryContent}>
            <View style={styles.manualEntryHeader}>
              <Text style={styles.manualEntryTitle}>MANUAL CODE VERIFICATION</Text>
            </View>

            {/* Manual entry row */}
            <View style={[styles.manualInputRow, isFocused && styles.manualInputRowFocused]}>
              <TextInput
                style={styles.manualInput}
                placeholder="Enter Ticket Code or LPN"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={manualCode}
                onChangeText={setManualCode}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={handleManualSubmit}
              />
              <TouchableOpacity
                style={styles.manualSubmitBtn}
                onPress={handleManualSubmit}
                activeOpacity={0.8}
              >
                <Feather name="arrow-right" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.manualCancelBtn}
              onPress={() => {
                setShowManualForm(false);
                setManualCode('');
              }}
            >
              <Text style={styles.manualCancelText}>Cancel & Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Verification Dialog (Full Screen Verified Component) */}
      <VerifiedEntry
        visible={modalVisible}
        ticket={scannedTicket}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirmAction}
        actionSuccess={actionSuccess}
        successMsg={successMsg}
        onNavigateToDashboard={() => {
          setModalVisible(false);
          onBack();
        }}
      />

      {/* Failed Verification Dialog (Full Screen Error Screen) */}
      <FailedVerification
        visible={scanFailedVisible}
        onClose={() => setScanFailedVisible(false)}
        onScanAgain={() => setScanFailedVisible(false)}
        onManualBooking={() => {
          setScanFailedVisible(false);
          if (onNavigateToManualBooking) {
            onNavigateToManualBooking();
          }
        }}
        onNavigateToDashboard={() => {
          setScanFailedVisible(false);
          onBack();
        }}
      />
    </SafeAreaView>
  );
};

export default QRScanner;
