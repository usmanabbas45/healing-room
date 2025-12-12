// Geocoding utilities using OpenStreetMap Nominatim API (FREE)
// No API key required!

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

// User agent required by Nominatim terms of service
const USER_AGENT = "HealingRoomSixNations/1.0";

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
 * Geocode a Canadian address using Nominatim (OpenStreetMap)
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
    
    // Nominatim API request
    const params = new URLSearchParams({
      q: searchQuery,
      format: "json",
      addressdetails: "1",
      limit: "1",
      countrycodes: "ca", // Canada only
    });
    
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": USER_AGENT,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return {
        error: "address_not_found",
        message: "Unable to locate this address. Please verify the address is correct.",
      };
    }
    
    const result = data[0];
    
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village,
      province: result.address?.state,
      postalCode: result.address?.postcode,
      country: result.address?.country,
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
 * Reverse geocode coordinates to get address
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
      lat: lat.toString(),
      lon: lng.toString(),
      format: "json",
      addressdetails: "1",
    });
    
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?${params.toString()}`,
      {
        headers: {
          "User-Agent": USER_AGENT,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      city: result.address?.city || result.address?.town,
      province: result.address?.state,
      postalCode: result.address?.postcode,
      country: result.address?.country,
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

