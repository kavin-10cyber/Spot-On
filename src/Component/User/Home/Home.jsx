import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Feather';
import { styles } from './HomeStyles';
import { parkingService } from '../../../services/parkingService';
import { realtimeService } from '../../../services/realtimeService';
import { locationService } from '../../../services/locationService';
import { buildDashboardMapHTML } from '../../../services/leafletMapService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

// Sathyamangalam, TN Default Coordinates & Parking Spots (including BIT College)
const SATHY_DEFAULT_LAT = 11.5034;
const SATHY_DEFAULT_LNG = 77.2444;

const PARKING_SPOTS = [
  {
    id: 'bit-campus-1',
    name: 'BIT College Campus Parking',
    rating: 4.9,
    distance: '0.3 km away',
    time: '3 mins',
    availableSlots: 50,
    rate: 20,
    lat: 11.4967,
    lng: 77.2764,
    price: '₹20/hr',
  },
  {
    id: 'sathy-bus-stand-2',
    name: 'Sathyamangalam Bus Stand Lot',
    rating: 4.8,
    distance: '0.2 km away',
    time: '2 mins',
    availableSlots: 18,
    rate: 30,
    lat: 11.5034,
    lng: 77.2444,
    price: '₹30/hr',
  },
  {
    id: 'bannari-temple-3',
    name: 'Bannari Amman Temple Complex',
    rating: 4.9,
    distance: '5.4 km away',
    time: '8 mins',
    availableSlots: 35,
    rate: 40,
    lat: 11.5471,
    lng: 77.2882,
    price: '₹40/hr',
  },
  {
    id: 'bhavanisagar-dam-4',
    name: 'Bhavanisagar Dam Visitors Lot',
    rating: 4.6,
    distance: '12.0 km away',
    time: '18 mins',
    availableSlots: 40,
    rate: 25,
    lat: 11.4721,
    lng: 77.1189,
    price: '₹25/hr',
  },
  {
    id: 'north-bazaar-5',
    name: 'North Bazaar Multi-Level',
    rating: 4.7,
    distance: '0.5 km away',
    time: '4 mins',
    availableSlots: 12,
    rate: 35,
    lat: 11.5065,
    lng: 77.2480,
    price: '₹35/hr',
  },
];

const FILTERS = [
  { id: 'nearby', label: 'Nearby', icon: 'navigation' },
  { id: 'ev', label: 'EV Charging', icon: 'battery-charging' },
  { id: 'underground', label: 'Underground', icon: 'arrow-down-circle' },
  { id: 'covered', label: 'Covered', icon: 'umbrella' },
  { id: 'accessible', label: 'Accessible', icon: 'user' },
];

// Delegate map building to the shared leafletMapService (multi-CDN fallback)
const buildMapHTML = (spots, userLat = SATHY_DEFAULT_LAT, userLng = SATHY_DEFAULT_LNG) => {
  return buildDashboardMapHTML(spots, userLat, userLng);
};

const Home = ({ onBack, onSearch, onParkingSelect, onReserve }) => {
  const [activeFilter, setActiveFilter] = useState('nearby');
  const [parkingSpots, setParkingSpots] = useState(PARKING_SPOTS);
  const [userLocation, setUserLocation] = useState({ latitude: SATHY_DEFAULT_LAT, longitude: SATHY_DEFAULT_LNG });
  const webViewRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    async function initGPSAndLocations() {
      // Fetch physical GPS location and Supabase parking locations in parallel
      const [locResult, spotsResult] = await Promise.allSettled([
        locationService.getCurrentUserLocation(),
        parkingService.getParkingLocations(),
      ]);

      let currentLoc = { latitude: SATHY_DEFAULT_LAT, longitude: SATHY_DEFAULT_LNG };
      if (locResult.status === 'fulfilled' && locResult.value?.latitude) {
        currentLoc = locResult.value;
        setUserLocation(currentLoc);
      }

      if (spotsResult.status === 'fulfilled' && spotsResult.value?.success && spotsResult.value?.data?.length > 0) {
        const uLat = currentLoc.latitude;
        const uLng = currentLoc.longitude;

        const dbSpots = spotsResult.value.data.map((locationItem, i) => {
          const spotLat = locationItem.latitude ? Number(locationItem.latitude) : uLat + (i + 1) * 0.003;
          const spotLng = locationItem.longitude ? Number(locationItem.longitude) : uLng + (i + 1) * 0.003;
          const dist = locationService.calculateDistance(uLat, uLng, spotLat, spotLng);

          return {
            id: String(locationItem.location_id),
            name: locationItem.name,
            rating: 4.8,
            distance: `${dist} km away`,
            time: `${Math.round(dist * 3 + 2)} mins`,
            availableSlots: locationItem.availableSlots ?? locationItem.total_capacity ?? 10,
            rate: 30,
            lat: spotLat,
            lng: spotLng,
            price: '₹30/hr',
          };
        });

        // Merge DB spots with default Sathyamangalam BIT spots
        setParkingSpots([...PARKING_SPOTS, ...dbSpots]);
      }
    }

    initGPSAndLocations();

    // 3. Real-Time WebSockets Channel Listener for Parking Occupancy Updates
    const channel = realtimeService.subscribeToSlots(1, (payload) => {
      console.log('[Realtime Home] Slot status changed:', payload);
    });

    return () => {
      realtimeService.unsubscribe(channel);
    };
  }, []);

  const handleCardScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / (CARD_WIDTH + 16));
    if (index >= 0 && index < parkingSpots.length) {
      const spot = parkingSpots[index];
      if (webViewRef.current && spot.lat && spot.lng) {
        webViewRef.current.postMessage(
          JSON.stringify({ type: 'flyTo', lat: spot.lat, lng: spot.lng })
        );
      }
    }
  };

  const handleMarkerClickFromWebview = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerPress' && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: data.index,
          animated: true,
        });
      }
    } catch (e) {
      console.log('WebView message error:', e);
    }
  };

  const handleRecenterToUser = async () => {
    const loc = await locationService.getCurrentUserLocation();
    const targetLat = loc?.latitude || userLocation.latitude || SATHY_DEFAULT_LAT;
    const targetLng = loc?.longitude || userLocation.longitude || SATHY_DEFAULT_LNG;

    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'recenterUser',
          lat: targetLat,
          lng: targetLng,
        })
      );
    }
  };

  const mapHTML = buildMapHTML(parkingSpots, userLocation.latitude, userLocation.longitude);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Floating Header Overlay */}
      <View style={styles.headerOverlay}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {onBack && (
              <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <Icon name="arrow-left" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
            <View>
              <Text style={styles.headerSub}>Find Parking Near</Text>
              <Text style={styles.headerTitle}>Sathyamangalam, TN</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
            <Icon name="search" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Filter Chips Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.id)}
              >
                <Icon
                  name={f.icon}
                  size={14}
                  color={active ? '#FFFFFF' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Interactive Map View */}
      <View style={styles.map}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHTML, baseUrl: 'https://unpkg.com' }}
          containerStyle={{ flex: 1, width: '100%', height: '100%' }}
          style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#E2E8F0' }}
          onMessage={handleMarkerClickFromWebview}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          allowUniversalAccessFromFileURLs
          allowFileAccess
          androidHardwareAccelerationDisabled={false}
          startInLoadingState={false}
          onError={(e) => console.warn('[DashboardMap] WebView error:', e.nativeEvent)}
        />
      </View>

      {/* Floating Google Maps Style "My Location" Pinpoint Button */}
      <TouchableOpacity
        style={styles.myLocationBtn}
        onPress={handleRecenterToUser}
        activeOpacity={0.8}
      >
        <Icon name="crosshair" size={22} color="#0052cc" />
      </TouchableOpacity>

      {/* Bottom Horizontal Parking Cards Carousel */}
      <View style={styles.cardsOverlay}>
        <FlatList
          ref={flatListRef}
          data={parkingSpots}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
          contentContainerStyle={styles.cardsScroll}
          onMomentumScrollEnd={handleCardScroll}
          renderItem={({ item }) => (
            <View style={[styles.spotCard, { width: CARD_WIDTH }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.spotName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.spotMeta}>
                    {item.distance} • {item.time}
                  </Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Icon name="star" size={12} color="#A16207" style={{ marginRight: 4 }} />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.priceText}>{item.price}</Text>
                  <Text style={styles.slotsAvailable}>
                    {item.availableSlots} slots left
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.detailsBtn}
                    onPress={() => onParkingSelect && onParkingSelect(item)}
                  >
                    <Text style={styles.detailsBtnText}>Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.reserveBtn}
                    onPress={() => onReserve && onReserve(item)}
                  >
                    <Text style={styles.reserveBtnText}>Reserve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
};

export default Home;
