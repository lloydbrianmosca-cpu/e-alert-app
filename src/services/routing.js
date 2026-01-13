// OpenRouteService API for road navigation
// Free tier: 2,000 requests/day - no credit card required

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImI2MzY2NGViMzQwOTRhODVhODdmYjc5YjVmMjNjN2I3IiwiaCI6Im11cm11cjY0In0=';
const ORS_BASE_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';

/**
 * Decode OpenRouteService polyline (uses standard polyline encoding)
 * @param {string} encoded - Encoded polyline string
 * @param {number} precision - Precision (default 5 for ORS)
 * @returns {Array} Array of {latitude, longitude} coordinates
 */
const decodePolyline = (encoded, precision = 5) => {
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const factor = Math.pow(10, precision);

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    // Decode latitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    
    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    // Decode longitude
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    
    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    coordinates.push({
      latitude: lat / factor,
      longitude: lng / factor,
    });
  }

  return coordinates;
};

/**
 * Get driving directions between two points using OpenRouteService
 * @param {Object} origin - {latitude, longitude}
 * @param {Object} destination - {latitude, longitude}
 * @returns {Object} { coordinates, distance, duration } or null on error
 */
export const getRouteDirections = async (origin, destination) => {
  try {
    // ORS expects coordinates as [longitude, latitude]
    const url = `${ORS_BASE_URL}?api_key=${ORS_API_KEY}&start=${origin.longitude},${origin.latitude}&end=${destination.longitude},${destination.latitude}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
      },
    });

    if (!response.ok) {
      console.warn('OpenRouteService API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn('No route found');
      return null;
    }

    const route = data.features[0];
    const geometry = route.geometry;
    const properties = route.properties;
    const summary = properties.summary;

    // GeoJSON format returns coordinates directly as array of [lng, lat]
    let coordinates = [];
    
    if (geometry.type === 'LineString') {
      // Direct coordinates array
      coordinates = geometry.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
    }

    return {
      coordinates,
      distance: summary.distance, // in meters
      duration: summary.duration, // in seconds
    };
  } catch (error) {
    console.error('Error fetching route directions:', error);
    return null;
  }
};

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
export const formatRouteDistance = (meters) => {
  if (meters === null || meters === undefined) return 'Unknown';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
};

/**
 * Format duration for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatRouteDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return 'Unknown';
  
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}min`;
  }
  
  return `~${minutes} min`;
};

/**
 * Calculate straight-line distance (fallback when API fails)
 * @param {Object} origin - {latitude, longitude}
 * @param {Object} destination - {latitude, longitude}
 * @returns {number} Distance in meters
 */
export const calculateStraightLineDistance = (origin, destination) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (origin.latitude * Math.PI) / 180;
  const φ2 = (destination.latitude * Math.PI) / 180;
  const Δφ = ((destination.latitude - origin.latitude) * Math.PI) / 180;
  const Δλ = ((destination.longitude - origin.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};
