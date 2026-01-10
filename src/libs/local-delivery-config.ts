// Local Delivery Configuration for Healing Room
// Uses OpenStreetMap/Nominatim for free geocoding

export const STORE_LOCATION = {
  address: "7147 Indian Line Rd, Norfolk County, ON N0E 1Z0",
  lat: 43.02805,
  lng: -80.23135,
  email: "healingroom7147@proton.me",
};

export const LOCAL_DELIVERY_CONFIG = {
  // Delivery Schedule
  cutoffHour: 13, // 1:00 PM
  deliveryRunSchedule: "daily", // Once per day
  deliveryRunTime: "afternoon", // Afternoon delivery run
  
  // Pricing
  perKilometerRate: 0.50, // $0.50 per km (one-way distance)
  minimumFee: 0, // No minimum
  freeDeliveryThreshold: null, // No free delivery based on order amount
  
  // Coverage Areas (cities/towns we deliver to)
  coverageAreas: [
    { name: "Six Nations Reserve", priority: 1 },
    { name: "Brantford", priority: 1 },
    { name: "Hamilton", priority: 2 },
    { name: "Hagersville", priority: 1 },
    { name: "Caledonia", priority: 1 },
    { name: "Ohsweken", priority: 1 },
    { name: "Simcoe", priority: 2 },
  ],
  
  // Maximum delivery distance (in km)
  maxDeliveryDistance: 50, // Reasonable limit for daily runs
  
  // ID & Age Requirements
  idRequirements: {
    minAge: 19,
    idRequired: true,
    nameMatchRequired: true,
    verificationThreshold: 200, // Orders $200+ need ID verification before handoff
    message: "Valid ID required at delivery. Name on ID must match the name on the order. Orders over $200 require ID verification before product is handed over.",
  },
  
  // Payment
  payment: {
    method: "etransfer",
    email: "healingroom7147@proton.me",
    mustPayBeforeDelivery: true,
    requireOrderNumberInMessage: true, // REQUIRED: Order number must be in e-transfer message
    noCashAtDoor: true, // NO CASH ACCEPTED AT DOOR
    message: "Payment must be received before the order goes out for delivery. Include your order number in the e-transfer message (REQUIRED for confirmation).",
  },
};

/**
 * Calculate delivery fee based on distance
 * @param distanceKm - Distance in kilometers from store
 * @returns Delivery fee in dollars
 */
export function calculateLocalDeliveryFee(distanceKm: number): number {
  const fee = distanceKm * LOCAL_DELIVERY_CONFIG.perKilometerRate;
  return Math.round(fee * 100) / 100; // Round to 2 decimals
}

/**
 * Check if address is within delivery area
 * @param distanceKm - Distance in kilometers from store
 * @returns True if within delivery area
 */
export function isWithinDeliveryArea(distanceKm: number): boolean {
  return distanceKm <= LOCAL_DELIVERY_CONFIG.maxDeliveryDistance;
}

/**
 * Get same-day delivery availability status
 * @returns Object with availability status and message
 */
export function getSameDayDeliveryStatus(): { available: boolean; message: string; cutoffTime: string } {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour + minute / 60;
  
  const cutoffTime = LOCAL_DELIVERY_CONFIG.cutoffHour;
  const available = currentTime < cutoffTime;
  
  if (available) {
    const hoursLeft = Math.floor(cutoffTime - currentTime);
    const minutesLeft = Math.floor((cutoffTime - currentTime - hoursLeft) * 60);
    
    return {
      available: true,
      message: `Order now for same-day delivery! (${hoursLeft}h ${minutesLeft}m left)`,
      cutoffTime: "1:00 PM",
    };
  }
  
  return {
    available: false,
    message: "Orders placed after 1:00 PM will be delivered the next day.",
    cutoffTime: "1:00 PM",
  };
}

/**
 * Get next available delivery date
 * @returns Next delivery date
 */
export function getNextDeliveryDate(): Date {
  const now = new Date();
  const hour = now.getHours();
  const result = new Date(now);
  
  // If before cutoff, same day delivery available
  if (hour < LOCAL_DELIVERY_CONFIG.cutoffHour) {
    return result;
  }
  
  // If after cutoff, next day delivery
  result.setDate(result.getDate() + 1);
  return result;
}

/**
 * Calculate DRIVING distance between two coordinates using OSRM (OpenStreetMap routing)
 * This returns actual road distance, not straight-line distance
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2 (defaults to store location)
 * @param lng2 - Longitude of point 2 (defaults to store location)
 * @returns Distance in kilometers (actual driving distance)
 */
export async function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number = STORE_LOCATION.lat,
  lng2: number = STORE_LOCATION.lng
): Promise<number> {
  try {
    // OSRM public API - free, no key needed, unlimited usage
    // Format: lng,lat (OSRM uses lng,lat order, not lat,lng!)
    const url = `https://router.project-osrm.org/route/v1/driving/${lng2},${lat2};${lng1},${lat1}?overview=false`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HealingRoomSixNations/1.0',
      },
    });
    
    if (!response.ok) {
      console.error('❌ OSRM routing error:', response.status);
      // Fallback to straight-line distance with road factor
      return calculateStraightLineDistance(lat1, lng1, lat2, lng2) * 1.5;
    }
    
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('❌ OSRM no route found');
      // Fallback to straight-line distance with road factor
      return calculateStraightLineDistance(lat1, lng1, lat2, lng2) * 1.5;
    }
    
    // OSRM returns distance in meters, convert to km
    const distanceKm = data.routes[0].distance / 1000;
    console.log(`🚗 OSRM driving distance: ${distanceKm.toFixed(1)} km`);
    return Math.round(distanceKm * 10) / 10; // Round to 1 decimal
  } catch (error) {
    console.error('❌ Error calculating driving distance:', error);
    // Fallback to straight-line distance with road factor
    return calculateStraightLineDistance(lat1, lng1, lat2, lng2) * 1.5;
  }
}

/**
 * Calculate straight-line distance (fallback)
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lng2 - Longitude of point 2
 * @returns Distance in kilometers (as the crow flies)
 */
function calculateStraightLineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  console.log(`📏 Straight-line distance (fallback): ${distance.toFixed(1)} km`);
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Get formatted delivery coverage areas string
 * @returns Comma-separated list of coverage areas
 */
export function getDeliveryCoverageAreasText(): string {
  return LOCAL_DELIVERY_CONFIG.coverageAreas.map(area => area.name).join(", ");
}

/**
 * Get delivery requirements text for display
 * @param orderTotal - Total order amount to check verification threshold
 * @returns Formatted requirements text
 */
export function getDeliveryRequirementsText(orderTotal: number): string {
  const { idRequirements } = LOCAL_DELIVERY_CONFIG;
  let text = `You must be ${idRequirements.minAge}+ with valid ID. `;
  text += "Name on ID must match the name on the order. ";
  
  if (orderTotal >= idRequirements.verificationThreshold) {
    text += "⚠️ ID verification required before product is handed over.";
  }
  
  return text;
}

/**
 * Get payment instructions text
 * @returns Formatted payment instructions
 */
export function getPaymentInstructionsText(): string {
  return `Send e-Transfer to ${LOCAL_DELIVERY_CONFIG.payment.email}. IMPORTANT: Include your order number in the message field - this is REQUIRED for order confirmation. No cash accepted at delivery.`;
}

/**
 * Get estimated delivery timeframe text
 * @param orderDate - Date order was placed
 * @param deliveryDate - Scheduled delivery date
 * @returns Formatted delivery timeframe text
 */
export function getDeliveryTimeframeText(orderDate: Date, deliveryDate: Date): string {
  const isSameDay = orderDate.toDateString() === deliveryDate.toDateString();
  
  if (isSameDay) {
    return "Your order is scheduled for same-day delivery during our afternoon delivery run (typically 2 PM - 7 PM).";
  } else {
    return `Your order is scheduled for delivery on ${deliveryDate.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })} during our afternoon delivery run (typically 2 PM - 7 PM).`;
  }
}

