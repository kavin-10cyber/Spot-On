import { PermissionsAndroid, Platform } from 'react-native';

export const locationService = {
  /**
   * Request Android Runtime Location Permission (ACCESS_FINE_LOCATION & ACCESS_COARSE_LOCATION)
   */
  async requestLocationPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission Needed',
            message: 'SpotOn requires location access to find nearby parking spots and provide turn-by-turn navigation.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow Location Access',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Location permission request error:', err);
        return false;
      }
    }
    return true;
  },

  /**
   * Get Current Physical Device GPS Position safely
   */
  getCurrentUserLocation() {
    return new Promise((resolve) => {
      try {
        const hasGeo =
          typeof navigator !== 'undefined' &&
          navigator &&
          navigator.geolocation &&
          typeof navigator.geolocation.getCurrentPosition === 'function';

        if (hasGeo) {
          // 1.5s safety timeout to prevent app freeze when GPS satellite lock is slow
          const timer = setTimeout(() => {
            resolve({ latitude: 11.4967, longitude: 77.2764, isFallback: true });
          }, 1500);

          navigator.geolocation.getCurrentPosition(
            (position) => {
              clearTimeout(timer);
              const { latitude, longitude, accuracy } = position.coords;
              resolve({ latitude, longitude, accuracy });
            },
            (error) => {
              clearTimeout(timer);
              resolve({ latitude: 11.4967, longitude: 77.2764, isFallback: true });
            },
            { enableHighAccuracy: false, timeout: 1500, maximumAge: 60000 }
          );
        } else {
          resolve({ latitude: 11.4967, longitude: 77.2764, isFallback: true });
        }
      } catch (e) {
        resolve({ latitude: 11.4967, longitude: 77.2764, isFallback: true });
      }
    });
  },

  /**
   * Stream Real-Time Continuous Device Location Updates safely
   */
  watchUserLocation(onLocationUpdate, onError) {
    try {
      const hasWatch = typeof navigator !== 'undefined' && navigator && navigator.geolocation && typeof navigator.geolocation.watchPosition === 'function';
      if (hasWatch) {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, heading, speed } = position.coords;
            if (onLocationUpdate) {
              onLocationUpdate({ latitude, longitude, heading: heading || 0, speed: speed || 0 });
            }
          },
          (error) => {
            if (onError) onError(error);
          },
          {
            enableHighAccuracy: true,
            distanceFilter: 5,
            interval: 3000,
            fastestInterval: 1000,
          }
        );
        return watchId;
      }
    } catch (e) {
      console.warn('watchUserLocation exception:', e);
    }
    return null;
  },

  /**
   * Clear active GPS position watcher safely
   */
  clearWatch(watchId) {
    try {
      const hasClear = typeof navigator !== 'undefined' && navigator && navigator.geolocation && typeof navigator.geolocation.clearWatch === 'function';
      if (hasClear && watchId !== null && watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    } catch (e) {
      console.warn('clearWatch exception:', e);
    }
  },

  /**
   * Calculate Haversine Distance in Kilometers between two lat/lng points
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 10) / 10;
  },
};
