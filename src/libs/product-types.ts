/**
 * Product types available in Hikeup (from your POS setup)
 */
export const PRODUCT_TYPES = [
  { id: 'all', name: 'All Products' },
  { id: 'cannabis', name: 'Cannabis' },
  { id: 'cannabis-flower', name: 'Cannabis Flower' },
  { id: 'indica', name: 'Indica' },
  { id: 'sativa', name: 'Sativa' },
  { id: 'hybrid-indica-dominant', name: 'Hybrid-Indica Dominant' },
  { id: 'hybrid-sativa-dominant', name: 'Hybrid-Sativa Dominant' },
  { id: 'nicotine', name: 'Nicotine' },
  { id: 'accessories', name: 'Accessories' },
] as const;

export type ProductTypeId = typeof PRODUCT_TYPES[number]['id'];

