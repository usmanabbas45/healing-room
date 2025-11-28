/**
 * Hikeup POS API Integration - Real-Time
 * Fetches products directly from Hikeup API
 * Tokens are stored in database for persistence
 * 
 * API Docs: https://docs.hikeup.com
 * Base URL: https://api.hikeup.com/api/v1
 */

import prisma from "@/libs/prisma";
import https from "https";
import tls from "tls";

const HIKEUP_API_BASE = 'https://api.hikeup.com/api/v1';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// In-memory cache for tokens
let tokenCache: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
} | null = null;

// In-memory cache for products
let productsCache: {
  data: Map<string, any>;
  totalCount: number;
  lastFetch: number;
} = {
  data: new Map(),
  totalCount: 0,
  lastFetch: 0,
};

// Search results cache (shorter TTL)
const searchCache: Map<string, { results: HikeupProduct[]; timestamp: number }> = new Map();
const SEARCH_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Individual product cache (for quick lookups)
const productByIdCache: Map<string, HikeupProduct> = new Map();

function isCacheValid(): boolean {
  return Date.now() - productsCache.lastFetch < CACHE_TTL && productsCache.data.size > 0;
}

function clearProductsCache() {
  productsCache = { data: new Map(), totalCount: 0, lastFetch: 0 };
}

/**
 * Get cached total count (avoids API call if cache is valid)
 */
export function getCachedTotalCount(): number | null {
  if (isCacheValid() && productsCache.totalCount > 0) {
    return productsCache.totalCount;
  }
  return null;
}

/**
 * Make HTTPS request with weak DH key support (for Hikeup's outdated SSL)
 */
function httpsRequest(
  url: string, 
  method: string = 'GET',
  headers: Record<string, string> = {},
  body?: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
      // Allow weak DH keys (Hikeup uses outdated SSL)
      rejectUnauthorized: false,
      ciphers: 'DEFAULT:@SECLEVEL=0',
      minVersion: 'TLSv1' as tls.SecureVersion,
    };

    if (body) {
      options.headers!['Content-Length'] = Buffer.byteLength(body).toString();
    }

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode || 500, body: responseBody });
      });
    });

    req.on('error', (e) => reject(e));
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Load token from database
 */
async function loadTokenFromDb(): Promise<typeof tokenCache> {
  try {
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: ['hikeup_access_token', 'hikeup_refresh_token', 'hikeup_expires_at']
        }
      }
    });

    const accessToken = settings.find(s => s.key === 'hikeup_access_token')?.value;
    const refreshToken = settings.find(s => s.key === 'hikeup_refresh_token')?.value;
    const expiresAt = settings.find(s => s.key === 'hikeup_expires_at')?.value;

    if (accessToken && expiresAt) {
      tokenCache = {
        accessToken,
        refreshToken: refreshToken || '',
        expiresAt: parseInt(expiresAt, 10),
      };
      console.log('✅ Loaded Hikeup token from database');
      return tokenCache;
    }
    return null;
  } catch (error) {
    console.error('Error loading Hikeup token from DB:', error);
    return null;
  }
}

/**
 * Save token to database
 */
async function saveTokenToDb(accessToken: string, refreshToken: string, expiresAt: number) {
  try {
    await prisma.$transaction([
      prisma.settings.upsert({
        where: { key: 'hikeup_access_token' },
        update: { value: accessToken },
        create: { key: 'hikeup_access_token', value: accessToken },
      }),
      prisma.settings.upsert({
        where: { key: 'hikeup_refresh_token' },
        update: { value: refreshToken },
        create: { key: 'hikeup_refresh_token', value: refreshToken },
      }),
      prisma.settings.upsert({
        where: { key: 'hikeup_expires_at' },
        update: { value: expiresAt.toString() },
        create: { key: 'hikeup_expires_at', value: expiresAt.toString() },
      }),
    ]);
    console.log('✅ Saved Hikeup token to database');
  } catch (error) {
    console.error('Error saving Hikeup token to DB:', error);
  }
}

/**
 * Set Hikeup token (saves to memory and database)
 */
export async function setHikeupToken(accessToken: string, refreshToken: string, expiresIn: number) {
  const expiresAt = Date.now() + (expiresIn * 1000);
  
  tokenCache = {
    accessToken,
    refreshToken,
    expiresAt,
  };
  
  await saveTokenToDb(accessToken, refreshToken, expiresAt);
  console.log('✅ Hikeup token stored successfully');
}

/**
 * Get stored token (from memory or database)
 */
export async function getStoredToken() {
  if (tokenCache) return tokenCache;
  return await loadTokenFromDb();
}

/**
 * Clear Hikeup token
 */
export async function clearHikeupToken() {
  tokenCache = null;
  try {
    await prisma.settings.deleteMany({
      where: {
        key: {
          in: ['hikeup_access_token', 'hikeup_refresh_token', 'hikeup_expires_at']
        }
      }
    });
  } catch (error) {
    console.error('Error clearing Hikeup token:', error);
  }
}

/**
 * Check if Hikeup is connected
 */
export async function isHikeupConnected(): Promise<boolean> {
  const token = await getStoredToken();
  return token !== null && token.accessToken !== '';
}

async function getAccessToken(): Promise<string> {
  let token = tokenCache;
  
  if (!token) {
    token = await loadTokenFromDb();
  }
  
  if (!token) {
    throw new Error('Hikeup not connected. Please connect via /admin');
  }

  // Check if token is expired (with 5 min buffer)
  if (Date.now() >= token.expiresAt - 300000) {
    console.log('🔄 Refreshing Hikeup token...');
    
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.HIKEUP_CLIENT_ID!,
      client_secret: process.env.HIKEUP_CLIENT_SECRET!,
      refresh_token: token.refreshToken,
    }).toString();

    const response = await httpsRequest(
      'https://api.hikeup.com/oauth/token',
      'POST',
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    );

    if (response.status !== 200) {
      await clearHikeupToken();
      throw new Error('Token refresh failed. Please reconnect Hikeup.');
    }

    const data = JSON.parse(response.body);
    await setHikeupToken(data.access_token, data.refresh_token || token.refreshToken, data.expires_in || 604800);
    
    return data.access_token;
  }

  return token.accessToken;
}

async function hikeupFetch<T>(endpoint: string): Promise<T> {
  const token = await getAccessToken();
  
  const url = endpoint.startsWith('http') ? endpoint : `${HIKEUP_API_BASE}${endpoint}`;
  
  console.log('🌐 Hikeup API Request:', url);
  
  const response = await httpsRequest(url, 'GET', {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  console.log('📥 Hikeup API Response Status:', response.status);
  console.log('📥 Hikeup API Response Body (first 500 chars):', response.body.substring(0, 500));

  if (response.status !== 200) {
    console.error(`❌ Hikeup API Error (${response.status}):`, response.body);
    throw new Error(`Hikeup API Error: ${response.status}`);
  }

  try {
    return JSON.parse(response.body);
  } catch (e) {
    console.error('❌ Failed to parse JSON:', e);
    throw new Error('Invalid JSON response from Hikeup');
  }
}

// ============ Type Definitions ============

export interface HikeupProduct {
  id: number | string;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  price: number;
  cost: number;
  tax_id: number;
  product_type_id: number;
  product_type_name: string;
  brand_id: number;
  brand_name: string;
  supplier_id: number;
  supplier_name: string;
  variants: HikeupVariant[];
  images: HikeupImage[];
  inventory: number;
  track_inventory: boolean;
  is_active: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  outlets?: HikeupOutletData[];
}

export interface HikeupVariant {
  id: number | string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  inventory: number;
  barcode: string;
}

export interface HikeupImage {
  id: number | string;
  url: string;
  is_primary: boolean;
}

export interface HikeupOutletData {
  outlet_id: number;
  outlet_name: string;
  price: number;
  inventory: number;
  markup: number;
}

export interface HikeupProductType {
  id: number | string;
  name: string;
  parent_id: number | null;
}

export interface HikeupProductsResponse {
  data: HikeupProduct[];
  total: number;
  page: number;
  page_size: number;
}

// ============ Product API Functions ============

/**
 * Get products from Hikeup with pagination metadata (with caching)
 */
export async function getHikeupProductsWithMeta(
  pageSize: number = 100,
  skipCount: number = 0,
  outletId?: number
): Promise<{ products: HikeupProduct[]; next: string | null; totalCount: number }> {
  const cacheKey = `${pageSize}-${skipCount}-${outletId || 'all'}`;
  
  // Check cache first
  if (isCacheValid() && productsCache.data.has(cacheKey)) {
    console.log(`📦 Cache hit for ${cacheKey}`);
    return productsCache.data.get(cacheKey);
  }

  try {
    const params = new URLSearchParams({
      page_size: pageSize.toString(),
      Skip_count: skipCount.toString(),
    });
    
    if (outletId) {
      params.append('outlet', outletId.toString());
    }

    const url = `/products/get_all?${params.toString()}`;
    const response = await hikeupFetch<any>(url);
    
    let products: HikeupProduct[];
    if (Array.isArray(response)) {
      products = response;
    } else if (response?.items && Array.isArray(response.items)) {
      products = response.items;
    } else if (response?.data && Array.isArray(response.data)) {
      products = response.data;
    } else if (response?.products && Array.isArray(response.products)) {
      products = response.products;
    } else if (response?.result && Array.isArray(response.result)) {
      products = response.result;
    } else {
      products = [];
    }
    
    const result = {
      products,
      next: response?.next || null,
      totalCount: response?.totalCount || 0,
    };

    // Store in cache
    productsCache.data.set(cacheKey, result);
    productsCache.totalCount = result.totalCount;
    productsCache.lastFetch = Date.now();
    
    // Also cache individual products for quick lookups
    products.forEach((p: HikeupProduct) => {
      productByIdCache.set(String(p.id), p);
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error fetching Hikeup products:', error);
    return { products: [], next: null, totalCount: 0 };
  }
}

/**
 * Get all products from Hikeup (single page)
 */
export async function getHikeupProducts(
  pageSize: number = 100,
  skipCount: number = 0,
  outletId?: number
): Promise<HikeupProduct[]> {
  const { products } = await getHikeupProductsWithMeta(pageSize, skipCount, outletId);
  return products;
}

/**
 * Get ALL products with pagination (follows Hikeup's `next` field)
 */
export async function getAllHikeupProducts(outletId?: number): Promise<HikeupProduct[]> {
  const allProducts: HikeupProduct[] = [];
  const pageSize = 100;
  let skipCount = 0;
  let hasMore = true;

  console.log('📦 Starting paginated fetch of all Hikeup products...');

  while (hasMore) {
    const { products, next, totalCount } = await getHikeupProductsWithMeta(pageSize, skipCount, outletId);
    allProducts.push(...products);
    
    console.log(`📦 Page fetched: ${products.length} products (total so far: ${allProducts.length}/${totalCount || '?'})`);
    
    // Check if there's a next page
    if (next) {
      skipCount += pageSize;
    } else {
      hasMore = false;
    }
    
    // Safety limit
    if (skipCount > 10000) {
      console.log('⚠️ Reached safety limit of 10000 products');
      break;
    }
  }

  console.log(`📦 Finished fetching ${allProducts.length} total products from Hikeup`);
  return allProducts;
}

/**
 * Get single product by ID - uses cache or fetches from list
 */
export async function getHikeupProduct(productId: string): Promise<HikeupProduct | null> {
  try {
    const id = String(productId);
    console.log(`🔍 Looking for product ID: ${id}`);
    
    // Check individual product cache first (instant)
    if (productByIdCache.has(id)) {
      console.log(`✅ Found product ${id} in cache`);
      return productByIdCache.get(id)!;
    }
    
    // If not cached, we need to fetch products to find it
    // Fetch first page which will populate the cache
    await getHikeupProductsWithMeta(100, 0);
    
    // Check cache again
    if (productByIdCache.has(id)) {
      console.log(`✅ Found product ${id} after fetching`);
      return productByIdCache.get(id)!;
    }
    
    // Still not found - might be on a later page, fetch all
    console.log(`🔍 Product ${id} not in first page, fetching all...`);
    const allProducts = await getAllHikeupProducts();
    
    // Check cache one more time (getAllHikeupProducts populates the cache)
    if (productByIdCache.has(id)) {
      console.log(`✅ Found product ${id}`);
      return productByIdCache.get(id)!;
    }
    
    console.log(`❌ Product ${id} not found in ${allProducts.length} products`);
    return null;
  } catch (error) {
    console.error('Error fetching Hikeup product:', error);
    return null;
  }
}

/**
 * Search products using Hikeup's Filter API (searches SKU, Barcode, Name)
 */
export async function getHikeupProductByFilter(filter: string, limit: number = 50): Promise<HikeupProduct[]> {
  try {
    console.log(`🔍 Searching Hikeup with filter: "${filter}"`);
    
    const params = new URLSearchParams({
      page_size: limit.toString(),
      Skip_count: '0',
      Filter: filter,
    });
    
    const response = await hikeupFetch<any>(`/products/get_all?${params.toString()}`);
    
    let products: HikeupProduct[] = [];
    if (Array.isArray(response)) {
      products = response;
    } else if (response?.items) {
      products = response.items;
    } else if (response?.data) {
      products = response.data;
    }
    
    console.log(`🔍 Filter search returned ${products.length} products`);
    return products;
  } catch (error) {
    console.error('Error searching Hikeup products:', error);
    return [];
  }
}

/**
 * Get products by category
 */
export async function getHikeupProductsByCategory(categoryName: string): Promise<HikeupProduct[]> {
  const products = await getAllHikeupProducts();
  const normalizedCategory = categoryName.toLowerCase().replace(/-/g, ' ');
  
  return products.filter(p => {
    const productCategory = (p.product_type_name || '').toLowerCase();
    return productCategory === normalizedCategory ||
           productCategory.includes(normalizedCategory) ||
           normalizedCategory.includes(productCategory);
  });
}

/**
 * Search products - uses Hikeup's Filter API (fast, server-side search)
 * Searches by: SKU, Barcode, and Name
 * Results are cached for 2 minutes
 */
export async function searchHikeupProducts(query: string): Promise<HikeupProduct[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }
  
  const searchKey = query.trim().toLowerCase();
  
  // Check cache first
  const cached = searchCache.get(searchKey);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
    console.log(`🔍 Search cache hit for "${searchKey}": ${cached.results.length} results`);
    return cached.results;
  }
  
  console.log(`🔍 Searching Hikeup for: "${query}"`);
  
  // Use Hikeup's Filter API - searches SKU, Barcode, Name server-side
  const results = await getHikeupProductByFilter(query.trim(), 100);
  
  // Cache results
  searchCache.set(searchKey, { results, timestamp: Date.now() });
  
  // Clean old cache entries (keep only last 20 searches)
  if (searchCache.size > 20) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  
  console.log(`🔍 Search complete: ${results.length} results`);
  return results;
}

/**
 * Transform Hikeup product to website format
 */
// Helper to check if a string is a valid image URL
function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  // Must start with / (local) or http/https (remote)
  return url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://');
}

// Extract image URL from Hikeup's additional_images array
function extractHikeupImages(product: any): string[] {
  const urls: string[] = [];
  
  // Check additional_images array (this is where the actual URLs are!)
  if (product.additional_images && Array.isArray(product.additional_images)) {
    product.additional_images.forEach((img: any) => {
      // Prefer 500_thumbnail, then 240_thumbnail, then 50_thumbnail
      const url = img['500_thumbnail'] || img['240_thumbnail'] || img['50_thumbnail'] || img.image_url;
      if (url && isValidImageUrl(url)) {
        urls.push(url);
      }
    });
  }
  
  return urls;
}

export function transformHikeupProduct(product: any) {
  // Extract images from additional_images array (Hikeup's actual image storage)
  let imageUrls = extractHikeupImages(product);
  
  // Remove duplicates
  imageUrls = [...new Set(imageUrls.filter(Boolean))];
  
  // Fallback to logo if no valid images
  if (imageUrls.length === 0) imageUrls.push('/logo.png');
  
  const variants = product.variants?.map(v => ({
    _id: String(v.id),
    priceId: String(v.id),
    color: v.name || 'Default',
    images: imageUrls,
    inventory: v.inventory || 0,
    price: v.price || product.price,
  })) || [];

  if (variants.length === 0) {
    variants.push({
      _id: String(product.id),
      priceId: String(product.id),
      color: 'Default',
      images: imageUrls,
      inventory: product.inventory || 0,
      price: product.price,
    });
  }

  const category = (product.product_type_name || 'uncategorized')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  return {
    _id: String(product.id),
    id: String(product.id),
    name: product.name || 'Unnamed Product',
    description: product.description || '',
    price: product.price || 0,
    category: category,
    sizes: variants.map(v => v.color),
    images: imageUrls,
    image: imageUrls,
    variants: variants,
    inventory: product.inventory || 0,
    sku: product.sku || '',
    barcode: product.barcode || '',
    brand: product.brand_name || '',
    isActive: product.is_active !== false,
    purchased: false,
    quantity: 0,
    productId: String(product.id),
    variantId: variants[0]?.priceId || String(product.id),
    color: variants[0]?.color || 'Default',
    size: variants[0]?.color || 'Default',
  };
}
