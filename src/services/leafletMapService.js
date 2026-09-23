/**
 * SpotOn Leaflet Map Engine
 * Generates interactive OpenStreetMap HTML for Home Dashboard and Navigation screens.
 * Uses base href & robust unpkg/cdnjs fallback URLs + mixed-content compatibility.
 */

export function buildDashboardMapHTML(spots = [], userLat = 11.5034, userLng = 77.2444) {
  const safeUserLat = userLat || 11.5034;
  const safeUserLng = userLng || 77.2444;

  const markersJS = spots
    .map(
      (s, i) => `
    var marker${i} = L.marker([${s.lat}, ${s.lng}], {
      icon: L.divIcon({
        className: 'custom-price-pin',
        html: '<div class="marker-bubble">${s.price || '₹20/hr'}</div><div class="marker-arrow"></div>',
        iconSize: [76, 44],
        iconAnchor: [38, 44],
      })
    }).addTo(map);

    marker${i}.on('click', function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', index: ${i} }));
      }
    });`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<base href="https://unpkg.com/leaflet@1.9.4/dist/">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #E2E8F0; }
  #map { width: 100%; height: 100%; background: #E2E8F0; }
  .custom-price-pin { background: transparent; border: none; }
  .marker-bubble {
    background: #0052cc;
    color: #FFFFFF;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    font-weight: 800;
    padding: 6px 12px;
    border-radius: 18px;
    text-align: center;
    box-shadow: 0 3px 10px rgba(0, 82, 204, 0.4);
    white-space: nowrap;
    border: 1.5px solid #FFFFFF;
  }
  .marker-arrow {
    width: 0; height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 9px solid #0052cc;
    margin: -1px auto 0 auto;
  }
  .user-dot {
    width: 18px; height: 18px;
    background: #0052cc;
    border: 3px solid #FFFFFF;
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(0, 82, 204, 0.6);
  }
  .pulse-ring {
    border: 3px solid #0052cc;
    border-radius: 50%;
    height: 42px; width: 42px;
    position: absolute;
    left: 50%; top: 50%;
    margin: -21px 0 0 -21px;
    animation: pulsate 2s ease-out infinite;
    opacity: 0;
  }
  @keyframes pulsate {
    0% { transform: scale(0.3); opacity: 0.9; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  #fallback-grid {
    position: absolute; top:0; left:0; right:0; bottom:0;
    background: radial-gradient(circle, #CBD5E1 1px, transparent 1px);
    background-size: 24px 24px;
    z-index: 0;
  }
</style>
</head>
<body>
<div id="fallback-grid"></div>
<div id="map"></div>

<script>
  var USER_LAT = ${safeUserLat};
  var USER_LNG = ${safeUserLng};

  function startMap() {
    if (typeof L === 'undefined') {
      setTimeout(startMap, 100);
      return;
    }

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([USER_LAT, USER_LNG], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    var userMarker = L.marker([USER_LAT, USER_LNG], {
      icon: L.divIcon({
        className: 'custom-user-pin',
        html: '<div class="pulse-ring"></div><div class="user-dot"></div>',
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      })
    }).addTo(map);

    ${markersJS}

    function handleMessage(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.type === 'flyTo') {
          map.flyTo([data.lat, data.lng], 15, { duration: 0.5 });
        } else if (data.type === 'recenterUser') {
          userMarker.setLatLng([data.lat, data.lng]);
          map.flyTo([data.lat, data.lng], 16, { duration: 0.6 });
        }
      } catch(err) {}
    }

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMap);
  } else {
    startMap();
  }
</script>
</body>
</html>`;
}

export function buildNavigationMapHTML(lat, lng, userLat = null, userLng = null) {
  const destLat = lat || 11.5034;
  const destLng = lng || 77.2444;
  const startLat = userLat || (destLat - 0.005);
  const startLng = userLng || (destLng - 0.005);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<base href="https://unpkg.com/leaflet@1.9.4/dist/">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; background: #E2E8F0; }
  .red-pin {
    width: 32px; height: 32px;
    border-radius: 50% 50% 50% 0;
    background: #EA4335;
    position: absolute;
    transform: rotate(-45deg);
    border: 2px solid #FFFFFF;
    box-shadow: -2px 2px 6px rgba(0,0,0,0.35);
  }
  .red-pin::after {
    content: '';
    width: 10px; height: 10px;
    margin: 9px 0 0 9px;
    background: #FFFFFF;
    position: absolute;
    border-radius: 50%;
  }
  .user-dot {
    width: 18px; height: 18px;
    background: #0052cc;
    border: 3px solid #FFFFFF;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,82,204,0.5);
  }
  .pulse-ring {
    border: 3px solid #0052cc;
    border-radius: 50%;
    height: 40px; width: 40px;
    position: absolute;
    left: 50%; top: 50%;
    margin: -20px 0 0 -20px;
    animation: pulsate 2s ease-out infinite;
    opacity: 0;
  }
  @keyframes pulsate {
    0% { transform: scale(0.3); opacity: 0.8; }
    100% { transform: scale(1.4); opacity: 0; }
  }
</style>
</head>
<body>
<div id="map"></div>

<script>
  var DEST_LAT = ${destLat};
  var DEST_LNG = ${destLng};
  var START_LAT = ${startLat};
  var START_LNG = ${startLng};

  function startNavMap() {
    if (typeof L === 'undefined') {
      setTimeout(startNavMap, 100);
      return;
    }

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([DEST_LAT, DEST_LNG], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    var destMarker = L.marker([DEST_LAT, DEST_LNG], {
      icon: L.divIcon({
        className: 'dest-pin',
        html: '<div class="red-pin"></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      })
    }).addTo(map);

    var userMarker = L.marker([START_LAT, START_LNG], {
      icon: L.divIcon({
        className: 'user-pin',
        html: '<div class="pulse-ring"></div><div class="user-dot"></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })
    }).addTo(map);

    var routePolyline = L.polyline([
      [START_LAT, START_LNG],
      [DEST_LAT, DEST_LNG]
    ], {
      color: '#0052cc',
      weight: 6,
      opacity: 0.85
    }).addTo(map);

    var group = new L.featureGroup([destMarker, userMarker]);
    map.fitBounds(group.getBounds().pad(0.25));

    function handleMessage(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.type === 'recenter') {
          map.fitBounds(group.getBounds().pad(0.25));
        } else if (data.type === 'updateUserPosition') {
          userMarker.setLatLng([data.lat, data.lng]);
          routePolyline.setLatLngs([
            [data.lat, data.lng],
            [DEST_LAT, DEST_LNG]
          ]);
        }
      } catch(err) {}
    }

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startNavMap);
  } else {
    startNavMap();
  }
</script>
</body>
</html>`;
}
