import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { styles } from './SearchStyles';
import { parkingService } from '../../../services/parkingService';
import { locationService } from '../../../services/locationService';

// All parking data with city info
const ALL_PARKING_LOTS = [
  {
    id: '1',
    name: 'Westside Premium Parking',
    street: 'Broadway Ave',
    distance: '0.5 miles',
    rating: 4.6,
    rate: 100,
    availability: 'Available',
    city: 'Sathyamangalam',
  },
  {
    id: '2',
    name: 'SkyView Secure Deck',
    street: '8th Ave',
    distance: '0.8 miles',
    rating: 4.5,
    rate: 120,
    availability: 'Available',
    city: 'Sathyamangalam',
  },
  {
    id: '3',
    name: 'Metro Central Plaza',
    street: '42nd St',
    distance: '1.2 miles',
    rating: 4.2,
    rate: 80,
    availability: 'Almost Full',
    city: 'Sathyamangalam',
  },
  {
    id: '4',
    name: 'Grand Central Parking',
    street: 'Park Ave',
    distance: '0.4 miles',
    rating: 4.9,
    rate: 150,
    availability: 'Available',
    city: 'Sathyamangalam',
  },
  {
    id: '5',
    name: 'Marina Bay Parking',
    street: 'Anna Salai',
    distance: '0.3 miles',
    rating: 4.7,
    rate: 60,
    availability: 'Available',
    city: 'Chennai',
  },
  {
    id: '6',
    name: 'T Nagar Multi-Level',
    street: 'Usman Rd',
    distance: '0.6 miles',
    rating: 4.4,
    rate: 40,
    availability: 'Available',
    city: 'Chennai',
  },
  {
    id: '7',
    name: 'Phoenix Mall Parking',
    street: 'Velachery Rd',
    distance: '1.0 miles',
    rating: 4.3,
    rate: 50,
    availability: 'Almost Full',
    city: 'Chennai',
  },
  {
    id: '8',
    name: 'MG Road Secure Park',
    street: 'MG Road',
    distance: '0.2 miles',
    rating: 4.8,
    rate: 70,
    availability: 'Available',
    city: 'Bangalore',
  },
  {
    id: '9',
    name: 'Indiranagar Deck',
    street: '100 Feet Rd',
    distance: '0.7 miles',
    rating: 4.5,
    rate: 60,
    availability: 'Available',
    city: 'Bangalore',
  },
  {
    id: '10',
    name: 'Connaught Place Lot',
    street: 'Janpath',
    distance: '0.4 miles',
    rating: 4.6,
    rate: 80,
    availability: 'Available',
    city: 'Delhi',
  },
  {
    id: '11',
    name: 'Bandra West Parking',
    street: 'Hill Rd',
    distance: '0.5 miles',
    rating: 4.4,
    rate: 90,
    availability: 'Almost Full',
    city: 'Mumbai',
  },
  {
    id: '12',
    name: 'Andheri Hub Deck',
    street: 'SV Road',
    distance: '0.9 miles',
    rating: 4.3,
    rate: 50,
    availability: 'Available',
    city: 'Mumbai',
  },
];

const FILTERS = [
  { id: 'distance', label: 'Distance' },
  { id: 'price', label: 'Price' },
  { id: 'ev', label: 'EV Charging' },
  { id: 'covered', label: 'Covered' },
];

const Search = ({ onBack, onViewMap, onParkingSelect }) => {
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('distance');
  const [dbLocations, setDbLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState([
    'BIT College Campus',
    'Sathyamangalam',
    'Bus Stand Lot',
  ]);

  // ── Fetch assigned parking locations from public.parking_locations ──────────
  const fetchLiveLocations = useCallback(async () => {
    try {
      // 1. Fetch user location and DB parking locations concurrently
      const [userLocResult, resResult] = await Promise.allSettled([
        locationService.getCurrentUserLocation(),
        parkingService.getParkingLocations(),
      ]);

      const userLoc = userLocResult.status === 'fulfilled' ? userLocResult.value : null;
      const uLat = userLoc?.latitude || 11.4967;
      const uLng = userLoc?.longitude || 77.2764;

      const res = resResult.status === 'fulfilled' ? resResult.value : null;
      if (res?.success && res?.data && res.data.length > 0) {
        const mapped = res.data.map((loc, idx) => {
          const spotLat = loc.latitude ? Number(loc.latitude) : uLat + (idx + 1) * 0.003;
          const spotLng = loc.longitude ? Number(loc.longitude) : uLng + (idx + 1) * 0.003;
          const distKm = locationService.calculateDistance(uLat, uLng, spotLat, spotLng);
          const avail = loc.availableSlots ?? loc.total_capacity ?? 10;

          return {
            id: String(loc.location_id),
            rawId: loc.location_id,
            name: loc.name,
            street: loc.address || 'Sathyamangalam, TN',
            distance: `${distKm} km away`,
            distValue: distKm,
            rating: 4.8,
            rate: 30,
            availability: avail === 0 ? 'Full' : avail <= 5 ? 'Almost Full' : 'Available',
            availableSlots: avail,
            city: loc.city || 'Sathyamangalam',
            lat: spotLat,
            lng: spotLng,
          };
        });

        // Sort by nearby distance by default
        mapped.sort((a, b) => a.distValue - b.distValue);
        setDbLocations(mapped);
      } else {
        setDbLocations(ALL_PARKING_LOTS);
      }
    } catch (err) {
      console.warn('Search screen DB fetch error:', err);
      setDbLocations(ALL_PARKING_LOTS);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLiveLocations();
  }, [fetchLiveLocations]);

  const getFilteredResults = useCallback(() => {
    const dataSource = dbLocations.length > 0 ? dbLocations : ALL_PARKING_LOTS;
    if (!searchText.trim()) {
      return dataSource;
    }
    const query = searchText.toLowerCase().trim();
    const results = dataSource.filter(
      (lot) =>
        (lot.city && lot.city.toLowerCase().includes(query)) ||
        (lot.name && lot.name.toLowerCase().includes(query)) ||
        (lot.street && lot.street.toLowerCase().includes(query)),
    );

    // Sort based on active filter
    if (activeFilter === 'price') {
      results.sort((a, b) => a.rate - b.rate);
    } else if (activeFilter === 'distance') {
      results.sort(
        (a, b) => (a.distValue || parseFloat(a.distance)) - (b.distValue || parseFloat(b.distance)),
      );
    }

    return results;
  }, [searchText, activeFilter, dbLocations]);

  const filteredResults = getFilteredResults();

  const handleSearch = (text) => {
    setSearchText(text);
  };

  const handleRecentPress = (term) => {
    setSearchText(term);
  };

  const handleClearSearch = () => {
    setSearchText('');
  };

  const handleSubmitSearch = () => {
    if (searchText.trim() && !recentSearches.includes(searchText.trim())) {
      setRecentSearches((prev) => [searchText.trim(), ...prev].slice(0, 5));
    }
  };

  const renderParkingItem = ({ item }) => {
    const isAlmostFull = item.availability === 'Almost Full';

    return (
      <TouchableOpacity
        style={styles.parkingCard}
        activeOpacity={0.7}
        onPress={() => onParkingSelect?.({ ...item, _from: 'Search' })}
      >
        {/* Map Thumbnail */}
        <View style={styles.mapThumbnail}>
          <View style={styles.mapPlaceholder}>
            <Icon name="map" size={24} color="#9CA3AF" />
          </View>
          <View style={styles.mapPin}>
            <Icon name="map-pin" size={12} color="#FFFFFF" />
          </View>
        </View>

        {/* Info */}
        <View style={styles.parkingInfo}>
          <Text style={styles.parkingName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.parkingAddress}>
            {item.distance} • {item.street}
          </Text>
          <View style={styles.ratingRow}>
            <Icon name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingValue}>{item.rating}</Text>
          </View>
        </View>

        {/* Right side: availability + price */}
        <View style={styles.parkingRight}>
          <View
            style={[
              styles.availabilityBadge,
              isAlmostFull && styles.almostFullBadge,
            ]}
          >
            <View
              style={[
                styles.availabilityDot,
                isAlmostFull && styles.almostFullDot,
              ]}
            />
            <Text
              style={[
                styles.availabilityText,
                isAlmostFull && styles.almostFullText,
              ]}
            >
              {item.availability}
            </Text>
          </View>
          <Text style={styles.priceText}>
            ₹{item.rate}
            <Text style={styles.priceUnit}>/hr</Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#1A1D20" />
        </TouchableOpacity>
        <View style={styles.searchInputWrapper}>
          <Icon name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search destinations..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={handleSearch}
            onSubmitEditing={handleSubmitSearch}
            autoFocus
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Icon name="x" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Icon name="sliders" size={20} color="#1A1D20" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredResults}
        renderItem={renderParkingItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Recent Searches — only show when not searching */}
            {!searchText.trim() && recentSearches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                {recentSearches.map((term, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentItem}
                    onPress={() => handleRecentPress(term)}
                  >
                    <Icon
                      name="clock"
                      size={16}
                      color="#9CA3AF"
                      style={styles.recentIcon}
                    />
                    <Text style={styles.recentText}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersRow}
            >
              {FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.chip,
                    activeFilter === filter.id && styles.chipActive,
                  ]}
                  onPress={() => setActiveFilter(filter.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      activeFilter === filter.id && styles.chipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Nearby Parking Header */}
            <View style={styles.nearbyHeader}>
              <Text style={styles.nearbyTitle}>
                {searchText.trim()
                  ? `Results for "${searchText.trim()}"`
                  : 'Nearby Parking'}
              </Text>
              {onViewMap && (
                <TouchableOpacity onPress={onViewMap}>
                  <Text style={styles.viewMapText}>View map</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="map-pin" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No parking found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching for a different city or area
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default Search;
