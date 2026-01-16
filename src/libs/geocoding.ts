// Geocoding utilities using Google Maps Geocoding API

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GEOCODING_BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

export interface GeocodingError {
  error: string;
  message: string;
}

/**
 * Geocode a Canadian address using Google Maps Geocoding API
 * @param address - Address object with components
 * @returns Coordinates and formatted address
 */
export async function geocodeAddress(address: {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
}): Promise<GeocodingResult | GeocodingError> {
  try {
    // Build search query
    const addressParts = [
      address.line1,
      address.line2,
      address.city,
      address.province,
      address.postalCode,
      "Canada",
    ].filter(Boolean);
    
    const searchQuery = addressParts.join(", ");
    
    // Google Maps Geocoding API request
    const params = new URLSearchParams({
      address: searchQuery,
      key: GOOGLE_MAPS_API_KEY || "",
      region: "ca", // Canada
    });
    
    const response = await fetch(
      `${GEOCODING_BASE_URL}?${params.toString()}`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return {
        error: "address_not_found",
        message: "Unable to locate this address. Please verify the address is correct.",
      };
    }
    
    const result = data.results[0];
    const { geometry, address_components, formatted_address } = result;
    
    // Extract address components
    let city, province, postalCode, country;
    
    for (const component of address_components) {
      const types = component.types;
      
      if (types.includes("locality")) {
        city = component.long_name;
      } else if (types.includes("administrative_area_level_1")) {
        province = component.long_name;
      } else if (types.includes("postal_code")) {
        postalCode = component.long_name;
      } else if (types.includes("country")) {
        country = component.long_name;
      }
    }
    
    return {
      lat: geometry.location.lat,
      lng: geometry.location.lng,
      displayName: formatted_address,
      city,
      province,
      postalCode,
      country,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return {
      error: "geocoding_failed",
      message: "Unable to calculate delivery distance. Please try again or contact us.",
    };
  }
}

/**
 * Reverse geocode coordinates to get address using Google Maps
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Address information
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult | GeocodingError> {
  try {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: GOOGLE_MAPS_API_KEY || "",
    });
    
    const response = await fetch(
      `${GEOCODING_BASE_URL}?${params.toString()}`
    );
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return {
        error: "reverse_geocoding_failed",
        message: "Unable to determine location.",
      };
    }
    
    const result = data.results[0];
    const { address_components, formatted_address } = result;
    
    // Extract address components
    let city, province, postalCode, country;
    
    for (const component of address_components) {
      const types = component.types;
      
      if (types.includes("locality")) {
        city = component.long_name;
      } else if (types.includes("administrative_area_level_1")) {
        province = component.long_name;
      } else if (types.includes("postal_code")) {
        postalCode = component.long_name;
      } else if (types.includes("country")) {
        country = component.long_name;
      }
    }
    
    return {
      lat,
      lng,
      displayName: formatted_address,
      city,
      province,
      postalCode,
      country,
    };
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return {
      error: "reverse_geocoding_failed",
      message: "Unable to determine location.",
    };
  }
}

/**
 * Validate if an address is in Canada (Ontario specifically for our use case)
 * @param geocodingResult - Result from geocodeAddress
 * @returns True if address is valid for delivery
 */
export function isValidDeliveryAddress(
  geocodingResult: GeocodingResult
): { valid: boolean; message?: string } {
  if (geocodingResult.country !== "Canada") {
    return {
      valid: false,
      message: "We only deliver within Canada.",
    };
  }
  
  if (geocodingResult.province !== "Ontario") {
    return {
      valid: false,
      message: "We currently only deliver within Ontario.",
    };
  }
  
  return { valid: true };
}

/**
 * Get estimated delivery time based on distance
 * @param distanceKm - Distance in kilometers
 * @returns Estimated delivery window
 */
export function getEstimatedDeliveryTime(distanceKm: number): string {
  // These are rough estimates for delivery within Ontario
  if (distanceKm <= 10) {
    return "30-60 minutes";
  } else if (distanceKm <= 25) {
    return "1-2 hours";
  } else if (distanceKm <= 50) {
    return "2-3 hours";
  } else {
    return "Please contact us";
  }
}

