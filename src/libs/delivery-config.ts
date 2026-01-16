// Delivery & Shipping Configuration
// TODO: Update these values with actual rates and radius

export const STORE_LOCATION = {
  address: "7147 Indian Line Rd, Norfolk County, ON N0E 1Z0",
  lat: 43.02805,
  lng: -80.23135,
  email: "info@healingroomsixnations.ca",
};

export const STORE_HOURS = {
  open: 9, // 9 AM
  close: 22, // 10 PM
  days: [0, 1, 2, 3, 4, 5, 6], // All days (Sunday = 0)
};

// Delivery cutoff time for same-day delivery
export const SAME_DAY_CUTOFF_HOUR = 13; // 1 PM - orders after this get next-day delivery

// Delivery radius in kilometers
export const DELIVERY_RADIUS_KM = 25; // Placeholder - update as needed

// Delivery fees (in CAD)
export const DELIVERY_FEES = {
  // Distance-based fees
  tiers: [
    { maxKm: 10, fee: 5.00, label: "Within 10km" },
    { maxKm: 25, fee: 10.00, label: "10-25km" },
  ],
  // Free delivery threshold
  freeDeliveryMinimum: 100, // Free delivery for orders over $100
};

// Shipping fees - Canada Post Xpresspost
export const SHIPPING_FEES = {
  xpresspost: 25.00, // Flat rate Xpresspost with tracking (Canada-wide)
  freeShippingMinimum: null, // No free shipping threshold - always $25
};

// Available delivery time slots
export const DELIVERY_TIME_SLOTS = [
  { id: "morning", label: "9 AM - 12 PM", start: 9, end: 12 },
  { id: "afternoon", label: "12 PM - 3 PM", start: 12, end: 15 },
  { id: "evening", label: "3 PM - 6 PM", start: 15, end: 18 },
  { id: "night", label: "6 PM - 9 PM", start: 18, end: 21 },
];

// E-transfer payment details
export const ETRANSFER_CONFIG = {
  recipientEmail: "healingroom7147@proton.me",
  recipientName: "Healing Room Six Nations",
  autoDepositEnabled: true, // If true, no security question needed
  securityQuestion: null, // Set if auto-deposit is not enabled
  securityAnswer: null,
};

// Calculate delivery fee based on distance and order total
export function calculateDeliveryFee(distanceKm: number, orderTotal: number): number {
  // Free delivery for orders over threshold
  if (orderTotal >= DELIVERY_FEES.freeDeliveryMinimum) {
    return 0;
  }
  
  // Find the appropriate tier
  for (const tier of DELIVERY_FEES.tiers) {
    if (distanceKm <= tier.maxKm) {
      return tier.fee;
    }
  }
  
  // If outside all tiers, delivery not available
  return -1; // Indicates delivery not available
}

// Calculate shipping fee - flat $25 Xpresspost rate for all Canadian addresses
export function calculateShippingFee(orderTotal: number): number {
  // Always $25 - no free shipping threshold
  return SHIPPING_FEES.xpresspost;
}

// Check if same-day delivery is available
export function isSameDayDeliveryAvailable(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Check if store is open today
  if (!STORE_HOURS.days.includes(day)) {
    return false;
  }
  
  // Check if before cutoff time
  return hour < SAME_DAY_CUTOFF_HOUR;
}

// Get next available delivery date
export function getNextDeliveryDate(): Date {
  const now = new Date();
  const result = new Date(now);
  
  if (isSameDayDeliveryAvailable()) {
    // Same day delivery available
    return result;
  }
  
  // Next day delivery
  result.setDate(result.getDate() + 1);
  
  // Skip to next open day if needed
  while (!STORE_HOURS.days.includes(result.getDay())) {
    result.setDate(result.getDate() + 1);
  }
  
  return result;
}

// Calculate DRIVING distance between two coordinates using Google Maps Distance Matrix API
// Re-export from local-delivery-config for consistency
export { calculateDistance } from './local-delivery-config';

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Calculate straight-line distance using Haversine formula
function calculateStraightLineDistance(lat: number, lng: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat - STORE_LOCATION.lat);
  const dLng = toRad(lng - STORE_LOCATION.lng);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(STORE_LOCATION.lat)) * Math.cos(toRad(lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if address is within delivery radius (using straight-line distance)
export function isWithinDeliveryRadius(lat: number, lng: number): boolean {
  const distance = calculateStraightLineDistance(lat, lng);
  return distance <= DELIVERY_RADIUS_KM;
}

// Generate a human-readable order number
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HR-${timestamp}-${random}`;
}

