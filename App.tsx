import React, { useState, useEffect, useRef } from 'react';
import { View, StatusBar, BackHandler } from 'react-native';

// Auth Components
import Opening from './src/Component/Opening/Opening';
import Login from './src/Component/Login/Login';

// User / Client Components
import Home from './src/Component/User/Home/Home';
import Search from './src/Component/User/Search/Search';
import ParkingDetail from './src/Component/User/ParkingDetail/ParkingDetail';
import SlotSelection from './src/Component/User/SlotSelection/SlotSelection';
import ConfirmBooking from './src/Component/User/ConfirmBooking/ConfirmBooking';
import Payment from './src/Component/User/Payment/Payment';
import BookingSuccess from './src/Component/User/BookingSuccess/BookingSuccess';
import BookingPass from './src/Component/User/BookingPass/BookingPass';
import Navigation from './src/Component/User/Navigation/Navigation';
import BookingsScreen from './src/Component/User/Bookings/BookingsScreen';
import ProfileScreen from './src/Component/User/Profile/ProfileScreen';
import BottomTabBar from './src/Component/User/BottomTabBar/BottomTabBar';

// Staff Components
import RawStaffDashboard from './src/Component/Staff/Dashboard/dashboard';
const StaffDashboard: any = RawStaffDashboard;
import StaffBookingsList from './src/Component/Staff/BookingsList/BookingsList';
import StaffManualBooking from './src/Component/Staff/ManualBooking/ManualBooking';
import StaffQrScanner from './src/Component/Staff/QRScanner/QRScanner';
import StaffSlotAssignment from './src/Component/Staff/SlotAssignment/SlotAssignment';
import StaffCollectPayment from './src/Component/Staff/CollectPayment/CollectPayment';
import StaffBookingSuccess from './src/Component/Staff/BookingSuccess/BookingSuccess';
import Navbar from './src/Component/Staff/Components/navbar';

// Admin Components
import DashBoard from './src/Component/Admin/DashBoard/DashBoard';
import SlotManagement from './src/Component/Admin/SlotManagement/SlotManagement';
import StaffManagement from './src/Component/Admin/StaffManagement/StaffManagement';
import AdminProfile from './src/Component/Admin/Profile/AdminProfile';
import AdminBottomTabBar from './src/Component/Admin/BottomTabBar/AdminBottomTabBar';

// Common Workspace Switcher & Services
import WorkspaceSwitcher from './src/Component/Common/WorkspaceSwitcher';
import { realtimeService } from './src/services/realtimeService';
import { locationService } from './src/services/locationService';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('Opening');
  const [userRole, setUserRole] = useState<'client' | 'staff' | 'admin'>('admin');
  const [activeWorkspace, setActiveWorkspace] = useState<'User' | 'Staff' | 'Admin'>('Admin');

  // Admin Navigation State
  const [adminTab, setAdminTab] = useState('Dashboard');

  // Staff Navigation & State (SpotOn Staff)
  const [staffScreen, setStaffScreen] = useState('Dashboard');
  const [pendingBooking, setPendingBooking] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState(142);
  const [occupiedSlots, setOccupiedSlots] = useState(358);
  const [reservedSlots] = useState(25);
  const [todaysTotal, setTodaysTotal] = useState(1204);
  const [recentActivity, setRecentActivity] = useState<any[]>([
    {
      id: '1',
      lpn: 'ABC-1234',
      details: 'Entry Gate 2 • 09:42 AM',
      status: 'SUCCESS',
      type: 'in',
    },
    {
      id: '2',
      lpn: 'XYZ-9876',
      details: 'Exit Gate 1 • 09:38 AM',
      status: '$12.50 PAID',
      type: 'out',
    },
  ]);

  // Client Navigation State
  const [selectedParking, setSelectedParking] = useState<any>(null);
  const [previousScreenOfSlot, setPreviousScreenOfSlot] = useState('Home');
  const [selectedSlotId, setSelectedSlotId] = useState<any>(null); // full slot object
  const [previousScreenOfNavigation, setPreviousScreenOfNavigation] = useState('BookingSuccess');
  const [previousScreenOfPass, setPreviousScreenOfPass] = useState('BookingSuccess');
  const [pendingUserBookingDetails, setPendingUserBookingDetails] = useState<any>(null);

  // Extract display string safely — never pass raw object into Text components
  const slotDisplayId: string = typeof selectedSlotId === 'string'
    ? selectedSlotId
    : (selectedSlotId?.id ? String(selectedSlotId.id) : 'A-101');

  // Staff Check-in / Booking Handlers (SpotOn Staff)
  const handleCheckIn = (lpn: string) => {
    setAvailableSlots(prev => Math.max(0, prev - 1));
    setOccupiedSlots(prev => prev + 1);
    setTodaysTotal(prev => prev + 1);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newActivity = {
      id: Date.now().toString(),
      lpn: lpn,
      details: `Entry Gate 2 • ${timeStr}`,
      status: 'SUCCESS',
      type: 'in',
    };
    setRecentActivity(prev => [newActivity, ...prev]);
  };

  const handleCheckOut = (lpn: string, amount: number) => {
    setOccupiedSlots(prev => Math.max(0, prev - 1));
    setAvailableSlots(prev => prev + 1);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newActivity = {
      id: Date.now().toString(),
      lpn: lpn,
      details: `Exit Gate 1 • ${timeStr}`,
      status: `$${amount.toFixed(2)} PAID`,
      type: 'out',
    };
    setRecentActivity(prev => [newActivity, ...prev]);
  };

  const handleStaffBookingSuccess = (booking: any) => {
    setPendingBooking(booking);
    setStaffScreen('BookingSuccess');
  };

  const currentScreenRef = useRef(currentScreen);
  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  useEffect(() => {
    // 1. Request Location Permission once on App Startup
    locationService.requestLocationPermission();

    // 2. Hardware Back Button Handling using ref
    const onBackPress = () => {
      const scr = currentScreenRef.current;
      if (scr !== 'Home' && scr !== 'Login' && scr !== 'Opening') {
        setCurrentScreen('Home');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    // 3. Live Slots Realtime Subscription (connected once)
    const slotsChannel = realtimeService.subscribeToSlots(1, (payload: any) => {
      console.log('[Realtime App] Slot updated:', payload);
      if (payload.new) {
        if (payload.new.status === 'OCCUPIED' || payload.new.status === 'RESERVED') {
          setAvailableSlots(prev => Math.max(0, prev - 1));
          setOccupiedSlots(prev => prev + 1);
        } else if (payload.new.status === 'AVAILABLE') {
          setOccupiedSlots(prev => Math.max(0, prev - 1));
          setAvailableSlots(prev => prev + 1);
        }
      }
    });

    // 4. Live Verification Logs Realtime Subscription
    const logsChannel = realtimeService.subscribeToVerificationLogs((payload: any) => {
      if (payload.new) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newAct = {
          id: String(payload.new.log_id || Date.now()),
          lpn: payload.new.remarks || 'GATE-SCAN',
          details: `Verification • ${timeStr}`,
          status: payload.new.status || 'SUCCESS',
          type: payload.new.action === 'ENTRY_SCAN' ? 'in' : 'out',
        };
        setRecentActivity(prev => [newAct, ...prev]);
      }
    });

    // 5. Live Bookings Realtime Subscription
    const bookingsChannel = realtimeService.subscribeToBookings((payload: any) => {
      if (payload.eventType === 'INSERT') {
        setTodaysTotal(prev => prev + 1);
      }
    });

    // 6. Live Payments Realtime Subscription
    const paymentsChannel = realtimeService.subscribeToPayments((payload: any) => {
      if (payload.new) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newAct = {
          id: String(payload.new.payment_id || Date.now()),
          lpn: payload.new.payment_method || 'PAYMENT',
          details: `Payment (${payload.new.payment_method}) • ${timeStr}`,
          status: `$${Number(payload.new.amount || 0).toFixed(2)} PAID`,
          type: 'in',
        };
        setRecentActivity(prev => [newAct, ...prev]);
      }
    });

    return () => {
      backHandler.remove();
      realtimeService.unsubscribe(slotsChannel);
      realtimeService.unsubscribe(logsChannel);
      realtimeService.unsubscribe(bookingsChannel);
      realtimeService.unsubscribe(paymentsChannel);
    };
  }, []);

  const handleFinalizeAssignment = (booking: any) => {
    setPendingBooking(booking);
    setStaffScreen('CollectPayment');
  };

  const handleFinalizePayment = (booking: any) => {
    setAvailableSlots(prev => Math.max(0, prev - 1));
    setOccupiedSlots(prev => prev + 1);
    setTodaysTotal(prev => prev + 1);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newActivity = {
      id: Date.now().toString(),
      lpn: booking.lpn,
      details: `Slot ${booking.slotNum} Assigned (${booking.paymentMethod}) • ${timeStr}`,
      status: 'SUCCESS',
      type: 'in',
    };
    setRecentActivity(prev => [newActivity, ...prev]);
    setPendingBooking(booking);
    setStaffScreen('BookingSuccess');
  };

  const navigateToDetail = (parking: any) => {
    setSelectedParking(parking);
    setCurrentScreen('ParkingDetail');
  };

  const navigateToReserve = (parking: any) => {
    setSelectedParking(parking);
    setSelectedSlotId(null); // Clear any pre-selected slot when starting new booking flow
    setPreviousScreenOfSlot(currentScreen);
    setCurrentScreen('ConfirmBooking'); // Step 1: Clicking "Reserve Slots" opens Confirm Booking page
  };

  const getSpotCoordinates = (name: string) => {
    if (name.includes('Grand Central')) return { lat: 40.7527, lng: -73.9772 };
    if (name.includes('Skyline')) return { lat: 40.7644, lng: -73.9735 };
    if (name.includes('Waterfront')) return { lat: 40.7725, lng: -73.9835 };
    return { lat: 40.7549, lng: -73.9840 };
  };

  const handleUserTabChange = (tabId: string) => {
    if (tabId === 'Home') setCurrentScreen('Home');
    else if (tabId === 'Bookings') setCurrentScreen('Bookings');
    else if (tabId === 'Profile') setCurrentScreen('Profile');
  };

  const handleLoginSuccess = (email?: string, role?: string) => {
    if ((email && email.toLowerCase().includes('admin')) || role === 'admin') {
      setUserRole('admin');
      setActiveWorkspace('Admin');
      setAdminTab('Dashboard');
      setCurrentScreen('Home');
    } else if ((email && email.toLowerCase().includes('staff')) || role === 'staff') {
      setUserRole('staff');
      setActiveWorkspace('Staff');
      setStaffScreen('Dashboard');
      setCurrentScreen('Home');
    } else {
      setUserRole('client');
      setActiveWorkspace('User');
      setCurrentScreen('Home');
    }
  };

  const showTabBar = currentScreen !== 'Opening' && currentScreen !== 'Login';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {showTabBar ? (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          
          {/* WORKSPACE 1: ADMIN WORKSPACE */}
          {activeWorkspace === 'Admin' && (
            <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
              <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                {adminTab === 'Dashboard' && <DashBoard setActiveTab={setAdminTab} />}
                {adminTab === 'SlotMgmt' && <SlotManagement />}
                {adminTab === 'StaffMgmt' && <StaffManagement />}
                {adminTab === 'Profile' && (
                  <AdminProfile
                    onLogout={() => {
                      setActiveWorkspace('User');
                      setCurrentScreen('Opening');
                    }}
                  />
                )}
              </View>
              <AdminBottomTabBar activeTab={adminTab} setActiveTab={setAdminTab} />
            </View>
          )}

          {/* WORKSPACE 2: STAFF WORKSPACE (SPOTON STAFF INTEGRATION) */}
          {activeWorkspace === 'Staff' && (
            <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
              <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                {staffScreen === 'Dashboard' && (
                  <StaffDashboard
                    availableSlots={availableSlots}
                    occupiedSlots={occupiedSlots}
                    reservedSlots={reservedSlots}
                    todaysTotal={todaysTotal}
                    recentActivity={recentActivity as any}
                    onNavigateToScanner={() => setStaffScreen('QRScanner')}
                    onNavigateToManualBooking={() => setStaffScreen('ManualBooking')}
                    onNavigateToScreen={setStaffScreen}
                  />
                )}

                {staffScreen === 'QRScanner' && (
                  <StaffQrScanner
                    onBack={() => setStaffScreen('Dashboard')}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    availableSlots={availableSlots}
                    occupiedSlots={occupiedSlots}
                    onNavigateToManualBooking={() => setStaffScreen('ManualBooking')}
                  />
                )}

                {staffScreen === 'ManualBooking' && (
                  <StaffManualBooking
                    onBack={() => setStaffScreen('Dashboard')}
                    onBookingSuccess={handleStaffBookingSuccess}
                    onNavigateToScanner={() => setStaffScreen('QRScanner')}
                    onNavigateToScreen={setStaffScreen}
                  />
                )}

                {staffScreen === 'SlotAssignment' && (
                  <StaffSlotAssignment
                    pendingBooking={pendingBooking}
                    onBack={() => setStaffScreen('Dashboard')}
                    onFinalizeAssignment={handleFinalizeAssignment}
                    onNavigateToScanner={() => setStaffScreen('QRScanner')}
                    onNavigateToScreen={setStaffScreen}
                  />
                )}

                {staffScreen === 'CollectPayment' && (
                  <StaffCollectPayment
                    pendingBooking={pendingBooking}
                    onBack={() => setStaffScreen('Dashboard')}
                    onFinalizePayment={handleFinalizePayment}
                  />
                )}

                {staffScreen === 'BookingSuccess' && (
                  <StaffBookingSuccess
                    pendingBooking={pendingBooking}
                    onDone={() => setStaffScreen('Dashboard')}
                  />
                )}

                {staffScreen === 'Bookings' && (
                  <StaffBookingsList
                    onNavigateToScreen={setStaffScreen}
                  />
                )}

                {staffScreen === 'Profile' && (
                  <View style={{ flex: 1 }}>
                    <ProfileScreen
                      // @ts-ignore
                      onLogout={() => {
                        setActiveWorkspace('User');
                        setCurrentScreen('Opening');
                      }}
                      // @ts-ignore
                      onNavigateToBookings={() => setStaffScreen('Bookings')}
                    />
                    <Navbar
                      activeTab="Profile"
                      onTabPress={(tab: any) => setStaffScreen(tab)}
                    />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* WORKSPACE 3: USER / CLIENT WORKSPACE */}
          {activeWorkspace === 'User' && (
            <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
              <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                {currentScreen === 'Home' && (
                  <Home
                    onBack={() => setCurrentScreen('Login')}
                    onSearch={() => setCurrentScreen('Search')}
                    onParkingSelect={navigateToDetail}
                    onReserve={navigateToReserve}
                  />
                )}
                {currentScreen === 'Bookings' && (
                  <BookingsScreen
                    onViewDetails={(parkingName: any, slotId: any, bookingObj: any) => {
                      const coords = getSpotCoordinates(parkingName);
                      setSelectedParking({
                        name: parkingName,
                        lat: coords.lat,
                        lng: coords.lng,
                      });
                      setSelectedSlotId(slotId);
                      if (bookingObj) {
                        setPendingBooking({
                          booking_id: bookingObj.id,
                          booking_code: bookingObj.code,
                          start_time: bookingObj.rawStartTime || bookingObj.start_time,
                          slot_number: bookingObj.slotNum,
                          vehicle_number: bookingObj.vehicle,
                          status: bookingObj.status,
                        });
                      }
                      setPreviousScreenOfPass('Bookings');
                      setCurrentScreen('BookingPass');
                    }}
                  />
                )}
                {currentScreen === 'Profile' && (
                  <ProfileScreen
                    // @ts-ignore
                    onLogout={() => {
                      setSelectedParking(null);
                      setSelectedSlotId(null);
                      setCurrentScreen('Opening');
                    }}
                    // @ts-ignore
                    onNavigateToBookings={() => {
                      setCurrentScreen('Bookings');
                    }}
                  />
                )}
                {currentScreen === 'Search' && (
                  <Search
                    onBack={() => setCurrentScreen('Home')}
                    onViewMap={() => setCurrentScreen('Home')}
                    onParkingSelect={navigateToDetail}
                  />
                )}
                {currentScreen === 'ParkingDetail' && (
                  <ParkingDetail
                    parking={selectedParking}
                    onBack={() => setCurrentScreen(selectedParking?._from || 'Home')}
                    onReserve={navigateToReserve}
                  />
                )}
                {/* Step 1 & 2: User Inputs Booking Details */}
                {currentScreen === 'ConfirmBooking' && (
                  <ConfirmBooking
                    parking={selectedParking}
                    selectedSlot={selectedSlotId}
                    onBack={() => setCurrentScreen(previousScreenOfSlot || 'ParkingDetail')}
                    onConfirm={(bookingPayload: any) => {
                      setPendingUserBookingDetails(bookingPayload);
                      setCurrentScreen('SlotSelection'); // Proceed to Select Parking Slot screen
                    }}
                  />
                )}
                {/* Step 3: Real-time DB Check against selected timing to display Available vs Booked slots */}
                {currentScreen === 'SlotSelection' && (
                  <SlotSelection
                    parking={selectedParking}
                    bookingDetails={pendingUserBookingDetails}
                    onBack={() => setCurrentScreen('ConfirmBooking')}
                    onContinue={(slot: any) => {
                      setSelectedSlotId(slot);
                      setCurrentScreen('Payment'); // Step 4: Proceed to Payment after slot selection
                    }}
                  />
                )}
                {/* Step 4: Payment & Finalization */}
                {currentScreen === 'Payment' && (
                  <Payment
                    parking={selectedParking}
                    slotId={slotDisplayId}
                    selectedSlot={selectedSlotId}
                    bookingDetails={pendingUserBookingDetails}
                    onBack={() => setCurrentScreen('SlotSelection')}
                    onPaySuccess={(finalBooking: any) => {
                      if (finalBooking) setPendingBooking(finalBooking);
                      setCurrentScreen('BookingSuccess');
                    }}
                  />
                )}
                {currentScreen === 'BookingSuccess' && (
                  <BookingSuccess
                    parking={selectedParking}
                    slotId={slotDisplayId}
                    onDone={() => {
                      setSelectedParking(null);
                      setSelectedSlotId(null);
                      setCurrentScreen('Home');
                    }}
                    onViewQR={() => {
                      setPreviousScreenOfPass('BookingSuccess');
                      setCurrentScreen('BookingPass');
                    }}
                    onNavigateToSlot={() => {
                      setPreviousScreenOfNavigation('BookingSuccess');
                      setCurrentScreen('Navigation');
                    }}
                  />
                )}
                {currentScreen === 'BookingPass' && (
                  <BookingPass
                    parking={selectedParking}
                    slotId={slotDisplayId}
                    bookingData={pendingBooking}
                    onBack={() => setCurrentScreen(previousScreenOfPass)}
                    onNavigateToSlot={() => {
                      setPreviousScreenOfNavigation('BookingPass');
                      setCurrentScreen('Navigation');
                    }}
                  />
                )}
                {currentScreen === 'Navigation' && (
                  <Navigation
                    parking={selectedParking}
                    slotId={slotDisplayId}
                    onBack={() => setCurrentScreen(previousScreenOfNavigation)}
                    onArrive={() => {
                      setSelectedParking(null);
                      setSelectedSlotId(null);
                      setCurrentScreen('Home');
                    }}
                  />
                )}
              </View>
              <BottomTabBar
                activeTab={currentScreen === 'Bookings' ? 'Bookings' : currentScreen === 'Profile' ? 'Profile' : 'Home'}
                setActiveTab={handleUserTabChange}
              />
            </View>
          )}

        </View>
      ) : (
        <>
          {currentScreen === 'Opening' && (
            <Opening onNavigateToLogin={() => setCurrentScreen('Login')} />
          )}
          {currentScreen === 'Login' && (
            <Login
              onBack={() => setCurrentScreen('Opening')}
              // @ts-ignore
              onLoginSuccess={(email?: string, role?: string) => handleLoginSuccess(email, role)}
            />
          )}
        </>
      )}
    </View>
  );
};

export default App;
