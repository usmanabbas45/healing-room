/**
 * Centralized pricing configuration and utilities
 * Apply markup to all prices from Hikeup POS
 */

// Markup percentage (15% = 0.15)
export const PRICE_MARKUP_PERCENTAGE = 0.15;

/**
 * Apply markup to a price
 * @param basePrice - Original price from Hikeup
 * @returns Price with markup applied, rounded to 2 decimals
 */
export function applyPriceMarkup(basePrice: number): number {
  const markedUpPrice = basePrice * (1 + PRICE_MARKUP_PERCENTAGE);
  return Math.round(markedUpPrice * 100) / 100; // Round to 2 decimals
}

/**
 * Apply markup to multiple prices
 * @param prices - Array of prices to markup
 * @returns Array of marked up prices
 */
export function applyPriceMarkupBulk(prices: number[]): number[] {
  return prices.map(applyPriceMarkup);
}

/**
 * Calculate original price from marked up price (for reference)
 * @param markedUpPrice - Price with markup
 * @returns Original base price
 */
export function getBasePrice(markedUpPrice: number): number {
  const basePrice = markedUpPrice / (1 + PRICE_MARKUP_PERCENTAGE);
  return Math.round(basePrice * 100) / 100;
}

