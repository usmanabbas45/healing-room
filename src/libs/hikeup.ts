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
import { applyPriceMarkup } from "@/libs/pricing";

const HIKEUP_API_BASE = 'https://api.hikeup.com/api/v1';

// ===========================================
// SERVER-SIDE SHARED CACHE
// Uses globalThis to survive Next.js dev mode recompilations
// ===========================================

// Cache TTL (15 minutes - balance between freshness and API limits)
const CACHE_TTL = 15 * 60 * 1000;
const TYPES_CACHE_TTL = 15 * 60 * 1000;
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

// Extend globalThis type
declare global {
  var hikeupCache: {
    products: HikeupProduct[];
    totalCount: number;
    timestamp: number;
    isLoading: boolean;
    productTypes: { types: any[]; timestamp: number } | null;
    productById: Map<string, HikeupProduct>;
    search: Map<string, { results: HikeupProduct[]; timestamp: number }>;
    token: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    } | null;
  } | undefined;
}

// Initialize global cache (survives module reloads in dev mode)
if (!globalThis.hikeupCache) {
  globalThis.hikeupCache = {
    products: [],
    totalCount: 0,
    timestamp: 0,
    isLoading: false,
    productTypes: null,
    productById: new Map(),
    search: new Map(),
    token: null,
  };
}

// Shortcuts to global cache
const cache = globalThis.hikeupCache;


function isAllProductsCacheValid(): boolean {
  return Date.now() - cache.timestamp < CACHE_TTL && cache.products.length > 0;
}

function clearAllCaches() {
  cache.products = [];
  cache.totalCount = 0;
  cache.timestamp = 0;
  cache.isLoading = false;
  cache.productTypes = null;
  cache.productById.clear();
  cache.search.clear();
}

/**
 * Get cached total count (avoids API call if cache is valid)
 */
export function getCachedTotalCount(): number | null {
  if (isAllProductsCacheValid()) {
    return cache.totalCount;
  }
  return null;
}

/**
 * Load ALL products into cache (called once, shared by all users)
 * This is the ONLY function that makes multiple API calls
 */
async function loadAllProductsIntoCache(): Promise<void> {
  // If already loading, wait
  if (cache.isLoading) {
    console.log('⏳ Cache is already being loaded, waiting...');
    // Wait for loading to complete (poll every 500ms, max 30 seconds)
    let waited = 0;
    while (cache.isLoading && waited < 30000) {
      await new Promise(resolve => setTimeout(resolve, 500));
      waited += 500;
    }
    return;
  }
  
  // If cache is valid, skip
  if (isAllProductsCacheValid()) {
    console.log(`📦 Using cached products (${cache.products.length} products, expires in ${Math.round((cache.timestamp + CACHE_TTL - Date.now()) / 60000)} min)`);
    return;
  }
  
  cache.isLoading = true;
  console.log('🔄 Loading ALL products into server cache (one-time operation)...');
  
  try {
    const allProducts: HikeupProduct[] = [];
    const batchSize = 100;
    let skipCount = 0;
    let hasMore = true;
    let totalCount = 0;
    
    while (hasMore) {
      const params = new URLSearchParams({
        page_size: batchSize.toString(),
        Skip_count: skipCount.toString(),
      });
      
      const response = await hikeupFetch<any>(`/products/get_all?${params.toString()}`);
      
      let products: HikeupProduct[] = [];
      if (Array.isArray(response)) {
        products = response;
      } else if (response?.items) {
        products = response.items;
        totalCount = response.totalCount || totalCount;
      } else if (response?.data) {
        products = response.data;
      }
      
      allProducts.push(...products);
      
      // Cache individual products for quick lookup
      products.forEach(p => cache.productById.set(String(p.id), p));
      
      console.log(`📦 Loaded batch: ${allProducts.length}/${totalCount || '?'} products`);
      
      if (products.length < batchSize) {
        hasMore = false;
      } else {
        skipCount += batchSize;
      }
      
      // Safety limit
      if (skipCount > 2000) {
        hasMore = false;
      }
    }
    
    // Update global cache
    cache.products = allProducts;
    cache.totalCount = allProducts.length;
    cache.timestamp = Date.now();
    cache.isLoading = false;
    
    console.log(`✅ Server cache loaded: ${allProducts.length} products (valid for ${CACHE_TTL / 60000} minutes)`);
    
  } catch (error) {
    console.error('❌ Error loading products into cache:', error);
    cache.isLoading = false;
  }
}

/**
 * Get all products from cache (loads cache if needed)
 */
async function getCachedProducts(): Promise<HikeupProduct[]> {
  if (!isAllProductsCacheValid()) {
    await loadAllProductsIntoCache();
  }
  return cache.products;
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
    
    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json',
      ...headers,
    };

    if (body) {
      requestHeaders['Content-Length'] = Buffer.byteLength(body).toString();
    }
    
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: requestHeaders,
      // Allow weak DH keys (Hikeup uses outdated SSL)
      rejectUnauthorized: false,
      ciphers: 'DEFAULT:@SECLEVEL=0',
      minVersion: 'TLSv1' as tls.SecureVersion,
    };

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
async function loadTokenFromDb(): Promise<typeof cache.token> {
  try {
    console.log('🔍 Loading Hikeup tokens from database...');
    
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

    console.log('🔑 Token check:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasExpiresAt: !!expiresAt,
      expiresAtDate: expiresAt ? new Date(parseInt(expiresAt, 10)).toISOString() : null,
    });

    if (accessToken && expiresAt) {
      const expiresAtNum = parseInt(expiresAt, 10);
      const isExpired = Date.now() > expiresAtNum;
      
      cache.token = {
        accessToken,
        refreshToken: refreshToken || '',
        expiresAt: expiresAtNum,
      };
      
      console.log(`✅ Loaded Hikeup token from database (${isExpired ? '⚠️ EXPIRED' : '✓ Valid'})`);
      
      // If token is expired but we have a refresh token, try to refresh immediately
      if (isExpired && refreshToken) {
        console.log('🔄 Token expired, attempting automatic refresh...');
        try {
          await refreshAccessToken();
        } catch (e) {
          console.error('⚠️ Auto-refresh failed, will try again on next API call');
        }
      }
      
      return cache.token;
    }
    
    console.log('🔗 Hikeup: No token found in database - please connect via /admin');
    return null;
  } catch (error) {
    console.error('Error loading Hikeup token from DB:', error);
    return null;
  }
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  const token = cache.token;
  if (!token?.refreshToken) {
    console.log('❌ Cannot refresh: No refresh token available');
    return null;
  }
  
  console.log('🔄 Refreshing Hikeup access token...');
  
  const refreshBody = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.HIKEUP_CLIENT_ID || '',
    client_secret: process.env.HIKEUP_CLIENT_SECRET || '',
    refresh_token: token.refreshToken,
  }).toString();

  try {
    const response = await httpsRequest(
      'https://api.hikeup.com/oauth/token',
      'POST',
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      refreshBody
    );

    if (response.status === 200) {
      const data = JSON.parse(response.body);
      const newRefreshToken = data.refresh_token || token.refreshToken;
      const expiresIn = data.expires_in || 604800; // Default to 7 days
      
      await setHikeupToken(data.access_token, newRefreshToken, expiresIn);
      
      console.log('✅ Token refreshed successfully!');
      console.log(`📅 New token expires in: ${Math.round(expiresIn / 3600)} hours`);
      
      // Log successful refresh
      await logHikeupEvent('token_refreshed', 'Hikeup token successfully refreshed', {
        statusCode: response.status,
        hadRefreshToken: !!newRefreshToken,
        metadata: {
          expiresIn: expiresIn,
          expiresInHours: Math.round(expiresIn / 3600),
        },
      });
      
      return data.access_token;
    } else {
      console.error('❌ Token refresh failed:', response.status, response.body);
      
      // Log refresh failure
      await logHikeupEvent('refresh_failed', 'Failed to refresh Hikeup token', {
        statusCode: response.status,
        hadRefreshToken: !!token.refreshToken,
        errorResponse: response.body,
      });
      
      return null;
    }
  } catch (error) {
    console.error('❌ Token refresh error:', error);
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
  
  cache.token = {
    accessToken,
    refreshToken,
    expiresAt,
  };
  
  await saveTokenToDb(accessToken, refreshToken, expiresAt);
  
  const expiryDate = new Date(expiresAt);
  console.log('✅ Hikeup token stored successfully');
  console.log(`📅 Token expires: ${expiryDate.toISOString()}`);
  console.log(`🔑 Has refresh token: ${refreshToken ? 'YES' : 'NO'}`);
  
  // Log token creation
  await logHikeupEvent('token_created', 'Hikeup token successfully created and stored', {
    hadRefreshToken: !!refreshToken,
    metadata: {
      expiresIn: expiresIn,
      expiresAt: expiryDate.toISOString(),
    },
  });
}

/**
 * Get stored token (from memory or database)
 */
export async function getStoredToken() {
  if (cache.token) return cache.token;
  return await loadTokenFromDb();
}

/**
 * Log Hikeup events to database for auditing
 */
async function logHikeupEvent(
  eventType: string,
  message: string,
  options?: {
    endpoint?: string;
    statusCode?: number;
    tokenAge?: number;
    tokenExpired?: boolean;
    hadRefreshToken?: boolean;
    errorResponse?: string;
    metadata?: Record<string, any>;
  }
) {
  try {
    await prisma.hikeupLog.create({
      data: {
        eventType,
        message,
        endpoint: options?.endpoint,
        statusCode: options?.statusCode,
        tokenAge: options?.tokenAge,
        tokenExpired: options?.tokenExpired,
        hadRefreshToken: options?.hadRefreshToken,
        errorResponse: options?.errorResponse?.substring(0, 1000), // Limit to 1000 chars
        metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
      },
    });
    console.log(`📝 Logged Hikeup event: ${eventType}`);
  } catch (error) {
    console.error('❌ Failed to log Hikeup event to database:', error);
    // Don't throw - logging failures shouldn't break the flow
  }
}

/**
 * Clear Hikeup token
 */
export async function clearHikeupToken() {
  cache.token = null;
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
 * Check if Hikeup is connected (and attempt refresh if needed)
 */
export async function isHikeupConnected(): Promise<boolean> {
  const token = await getStoredToken();
  
  if (!token || !token.accessToken) {
    console.log('🔗 Hikeup: No token found');
    return false;
  }
  
  // If token exists and is not expired, we're connected
  if (Date.now() < token.expiresAt - 300000) {
    return true;
  }
  
  // Token is expired or expiring soon - try to refresh
  console.log('🔄 Hikeup: Token expired, attempting refresh...');
  
  // If we have a refresh token, try to refresh
  if (token.refreshToken) {
    try {
      await getAccessToken(); // This will attempt refresh
      return true;
    } catch (error) {
      console.error('🔴 Hikeup: Token refresh failed in isConnected check');
      // Don't return false immediately - the token might still work
      // Try a test API call to see if we're really disconnected
      return await testHikeupConnection();
    }
  }
  
  // No refresh token - try using existing token anyway
  return await testHikeupConnection();
}

/**
 * Test if the current token actually works
 */
async function testHikeupConnection(): Promise<boolean> {
  const token = await getStoredToken();
  if (!token?.accessToken) return false;
  
  try {
    console.log('🔗 Testing Hikeup connection with existing token...');
    const response = await httpsRequest(
      `${HIKEUP_API_BASE}/products/get_all?page_size=1`,
      'GET',
      {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
      }
    );
    
    if (response.status === 200) {
      console.log('✅ Hikeup connection test passed!');
      // Token still works - extend expiry since API accepted it
      const newExpiry = Date.now() + (60 * 60 * 1000); // 1 hour from now
      await saveTokenToDb(token.accessToken, token.refreshToken, newExpiry);
      cache.token = { ...token, expiresAt: newExpiry };
      return true;
    } else if (response.status === 401) {
      console.log('🔴 Hikeup connection test failed: Token invalid');
      return false;
    }
    
    // Other error - might be temporary, assume connected
    console.log(`⚠️ Hikeup connection test returned status ${response.status}`);
    return true;
  } catch (error) {
    console.error('❌ Hikeup connection test error:', error);
    return false;
  }
}

/**
 * Get token status for diagnostics
 */
export async function getTokenStatus(): Promise<{
  connected: boolean;
  hasRefreshToken: boolean;
  expiresAt: Date | null;
  isExpired: boolean;
  expiresIn: string;
}> {
  const token = await getStoredToken();
  
  if (!token || !token.accessToken) {
    return {
      connected: false,
      hasRefreshToken: false,
      expiresAt: null,
      isExpired: true,
      expiresIn: 'N/A',
    };
  }
  
  const now = Date.now();
  const isExpired = now >= token.expiresAt;
  const msRemaining = token.expiresAt - now;
  
  let expiresIn = 'Expired';
  if (!isExpired) {
    const hours = Math.floor(msRemaining / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) {
      expiresIn = `${days} days`;
    } else if (hours > 0) {
      expiresIn = `${hours} hours`;
    } else {
      expiresIn = `${Math.floor(msRemaining / 60000)} minutes`;
    }
  }
  
  return {
    connected: true,
    hasRefreshToken: !!token.refreshToken,
    expiresAt: new Date(token.expiresAt),
    isExpired,
    expiresIn,
  };
}

async function getAccessToken(): Promise<string> {
  let token = cache.token;
  
  if (!token) {
    token = await loadTokenFromDb();
  }
  
  if (!token) {
    throw new Error('Hikeup not connected. Please connect via /admin');
  }

  // Check if token is expired (with 5 min buffer)
  if (Date.now() >= token.expiresAt - 300000) {
    console.log('🔄 Token expired or expiring soon, attempting refresh...');
    
    // If no refresh token, just try the existing access token anyway
    if (!token.refreshToken) {
      console.log('⚠️ No refresh token available, using existing access token...');
      return token.accessToken;
    }
    
    // Try to refresh
    const newAccessToken = await refreshAccessToken();
    
    if (newAccessToken) {
      return newAccessToken;
    }
    
    // Refresh failed - but DON'T clear the token!
    // The existing access token might still work (servers are sometimes lenient)
    console.log('⚠️ Token refresh failed, but keeping existing token to try anyway...');
    console.log('⚠️ If API calls fail with 401, please reconnect Hikeup via /admin');
    
    // Update expiry to try again in 5 minutes (don't spam refresh attempts)
    const tempExpiry = Date.now() + (5 * 60 * 1000);
    cache.token = { ...token, expiresAt: tempExpiry };
    
    return token.accessToken;
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

  // Handle 401 Unauthorized - token is definitely invalid
  if (response.status === 401) {
    const token = cache.token;
    const tokenAge = token ? Math.round((Date.now() - (token.expiresAt - 7*24*60*60*1000)) / 86400000) : null;
    const tokenExpired = token ? Date.now() > token.expiresAt : null;
    const hadRefreshToken = !!token?.refreshToken;
    
    console.error('🔴 Hikeup API returned 401 - Token is invalid');
    console.error('🔴 TOKEN DELETION REASON:');
    console.error(`   - Endpoint: ${url}`);
    console.error(`   - Token age: ${tokenAge ?? 'unknown'} days old`);
    console.error(`   - Token expired: ${tokenExpired ?? 'unknown'}`);
    console.error(`   - Has refresh token: ${hadRefreshToken ? 'YES' : 'NO'}`);
    console.error(`   - Response: ${response.body.substring(0, 200)}`);
    console.error('🔴 DELETING TOKEN FROM DATABASE - Please reconnect Hikeup via /admin');
    
    // Log to database before clearing token
    await logHikeupEvent('token_deleted', 'Hikeup token deleted due to 401 Unauthorized from API', {
      endpoint: url,
      statusCode: 401,
      tokenAge: tokenAge ?? undefined,
      tokenExpired: tokenExpired ?? undefined,
      hadRefreshToken,
      errorResponse: response.body,
    });
    
    // NOW we clear the token since we know for sure it's invalid
    await clearHikeupToken();
    throw new Error('Hikeup token is invalid. Please reconnect via /admin.');
  }

  if (response.status !== 200) {
    console.error(`❌ Hikeup API Error (${response.status}):`, response.body);
    
    // Log non-401 API errors for monitoring
    await logHikeupEvent('api_error', `Hikeup API error: ${response.status}`, {
      endpoint: url,
      statusCode: response.status,
      errorResponse: response.body,
    });
    
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
 * Get products with pagination (uses server cache)
 * For "All Products" view - just slices from cache
 */
export async function getHikeupProductsWithMeta(
  pageSize: number = 100,
  skipCount: number = 0,
  outletId?: number
): Promise<{ products: HikeupProduct[]; next: string | null; totalCount: number }> {
  // Use cached products
  const allProducts = await getCachedProducts();
  
  // Slice for pagination
  const paginated = allProducts.slice(skipCount, skipCount + pageSize);
  const hasMore = skipCount + pageSize < allProducts.length;
  
  console.log(`📦 Serving ${paginated.length} products from cache (${skipCount}-${skipCount + pageSize} of ${allProducts.length})`);
  
  return {
    products: paginated,
    next: hasMore ? 'more' : null,
    totalCount: allProducts.length,
  };
}

/**
 * Get products (single page from cache)
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
 * Get ALL products (from cache)
 */
export async function getAllHikeupProducts(outletId?: number): Promise<HikeupProduct[]> {
  return await getCachedProducts();
}

/**
 * Get single product by ID - uses cache first, then direct API call
 * Uses: GET /products/get/{id} - single API call instead of fetching all products
 */
export async function getHikeupProduct(productId: string): Promise<HikeupProduct | null> {
  try {
    const id = String(productId);
    console.log(`🔍 Looking for product ID: ${id}`);
    
    // Check individual product cache first (instant - no API call)
    if (cache.productById.has(id)) {
      console.log(`✅ Found product ${id} in cache`);
      return cache.productById.get(id)!;
    }
    
    // Not in cache - fetch single product directly (1 API call)
    console.log(`📦 Fetching single product ${id} from Hikeup API...`);
    const product = await hikeupFetch<HikeupProduct>(`/products/get/${id}`);
    
    if (product && product.id) {
      // Cache this product for future lookups
      cache.productById.set(id, product);
      console.log(`✅ Fetched and cached product ${id}`);
      return product;
    }
    
    console.log(`❌ Product ${id} not found`);
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

// Import type only - we'll fetch actual types from Hikeup
import { type ProductTypeId } from './product-types';
export { type ProductTypeId };

// We'll dynamically fetch product types from Hikeup
export { PRODUCT_TYPES } from './product-types';

/**
 * Get product types for filter dropdown (extracted from cached products)
 * Uses the products cache - NO additional API calls
 */
export async function getProductTypesForFilter(): Promise<{ id: string; name: string; count: number }[]> {
  // Check types cache first
  if (cache.productTypes && Date.now() - cache.productTypes.timestamp < TYPES_CACHE_TTL) {
    console.log('📦 Using cached product types');
    return [
      { id: 'all', name: 'All Products', count: cache.totalCount },
      ...cache.productTypes.types
    ];
  }
  
  // Get all products from cache
  const allProducts = await getCachedProducts();
  
  // Extract unique types from products
  const typeMap = new Map<string, { name: string; originalName: string; count: number }>();
  
  allProducts.forEach((product: any) => {
    const productTypes = product.product_type || [];
    productTypes.forEach((pt: any) => {
      const typeName = pt.type_name || pt.name || '';
      if (typeName) {
        const typeId = typeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const existing = typeMap.get(typeId);
        if (existing) {
          existing.count++;
        } else {
          // Clean up display name (remove parenthetical content for cleaner UI)
          let displayName = typeName.replace(/\s*\([^)]*\)\s*/g, '').trim();
          // Also fix common typos
          displayName = displayName.replace('Hybird', 'Hybrid');
          
          typeMap.set(typeId, { name: displayName, originalName: typeName, count: 1 });
        }
      }
    });
  });
  
  // Convert to array and sort by count
  const typesArray = Array.from(typeMap.entries())
    .map(([id, data]) => ({ id, name: data.name, originalName: data.originalName, count: data.count }))
    .sort((a, b) => b.count - a.count);
  
  // Cache the types in global cache (with originalName for filtering)
  cache.productTypes = { types: typesArray, timestamp: Date.now() };
  
  console.log(`📦 Extracted ${typesArray.length} product types: ${typesArray.map(t => `${t.name}(${t.count})`).join(', ')}`);
  
  return [
    { id: 'all', name: 'All Products', count: allProducts.length },
    ...typesArray
  ];
}

/**
 * Get products filtered by product type (uses cache - 0 API calls)
 */
export async function getHikeupProductsByType(
  typeId: string,
  pageSize: number = 24,
  skipCount: number = 0
): Promise<{ products: HikeupProduct[]; totalCount: number }> {
  // If "all", just return paginated products
  if (typeId === 'all') {
    return getHikeupProductsWithMeta(pageSize, skipCount);
  }
  
  // Get all products from cache (loads if needed - one time only)
  const allProducts = await getCachedProducts();
  
  // Get the original type name from our cached types (use originalName for matching)
  const productTypes = cache.productTypes?.types || [];
  const matchingType = productTypes.find((t: any) => t.id === typeId);
  const originalTypeName = matchingType?.originalName || matchingType?.name || '';
  
  console.log(`🔍 Filtering by type: "${typeId}" → original name: "${originalTypeName}"`);
  
  const filtered = allProducts.filter(p => {
    const product = p as any;
    const types = product.product_type || [];
    
    return types.some((pt: any) => {
      const ptName = (pt.type_name || pt.name || '').toLowerCase();
      const searchName = originalTypeName.toLowerCase();
      
      // Exact match on original name
      if (ptName === searchName) return true;
      
      // Fallback: normalize both and compare
      const ptNormalized = ptName.replace(/[^a-z0-9]/g, '');
      const searchNormalized = searchName.replace(/[^a-z0-9]/g, '');
      
      return ptNormalized === searchNormalized;
    });
  });
  
  console.log(`🔍 Filter "${originalTypeName}": ${filtered.length} products (from ${allProducts.length} cached)`);
  
  // Apply pagination
  const paginated = filtered.slice(skipCount, skipCount + pageSize);
  
  return {
    products: paginated,
    totalCount: filtered.length,
  };
}

/**
 * Search products from server cache (has correct category info)
 * This is better than Hikeup's Filter API because cached products have proper product_type data
 * Results are cached for 2 minutes
 */
export async function searchHikeupProducts(query: string): Promise<HikeupProduct[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }
  
  const searchKey = query.trim().toLowerCase();
  
  // Check search cache first
  const cached = cache.search.get(searchKey);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
    console.log(`🔍 Search cache hit for "${searchKey}": ${cached.results.length} results`);
    return cached.results;
  }
  
  console.log(`🔍 Searching products for: "${query}"`);
  
  // Get all products from cache (loads if needed)
  const allProducts = await getCachedProducts();
  
  const results = allProducts.filter((product: any) => {
    const name = (product.product_name || product.name || '').toLowerCase();
    const sku = (product.sku || '').toLowerCase();
    const barcode = (product.barcode || '').toLowerCase();
    const description = (product.description || '').toLowerCase();
    const brand = (product.bran_name || product.brand_name || '').toLowerCase();
    
    return name.includes(searchKey) || 
           sku.includes(searchKey) || 
           barcode.includes(searchKey) ||
           description.includes(searchKey) ||
           brand.includes(searchKey);
  });
  
  // Cache results
  cache.search.set(searchKey, { results, timestamp: Date.now() });
  
  // Clean old cache entries (keep only last 20 searches)
  if (cache.search.size > 20) {
    const oldestKey = cache.search.keys().next().value;
    if (oldestKey) cache.search.delete(oldestKey);
  }
  
  console.log(`🔍 Search complete: ${results.length} results (from ${allProducts.length} cached products)`);
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
  imageUrls = Array.from(new Set(imageUrls.filter(Boolean)));
  
  // Fallback to logo if no valid images
  if (imageUrls.length === 0) imageUrls.push('/logo.png');
  
  // ===== EXTRACT PRICE & INVENTORY FROM product_outlets =====
  // Hikeup stores pricing/inventory per outlet, we use the first outlet
  const outlet = product.product_outlets?.[0];
  const basePrice = outlet?.price_inc_tax || outlet?.price_ex_tax || 0;
  const price = applyPriceMarkup(basePrice); // Apply 15% markup
  const inventory = outlet?.available_inventory || outlet?.on_hand_inventory || 0;
  const costPrice = outlet?.cost_price || 0;
  
  // ===== EXTRACT CATEGORIES FROM product_type (can have multiple) =====
  const productTypes = product.product_type || [];
  const categories = productTypes.map((pt: any) => {
    const typeName = pt.type_name || pt.name || '';
    // Clean up display name (remove parenthetical content)
    const displayName = typeName.replace(/\s*\([^)]*\)\s*/g, '').trim();
    return displayName;
  }).filter(Boolean);
  
  // Primary category (first one, for backwards compatibility)
  const categoryName = categories[0] || 'uncategorized';
  const category = categoryName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  // ===== EXTRACT BRAND (note: Hikeup uses "bran_name" typo) =====
  const brand = product.bran_name || product.brand_name || '';
  
  // ===== EXTRACT VARIANTS FROM product_variants =====
  // Debug: Log full variant structure for products with multiple variants
  if (product.product_variants?.length > 1) {
    console.log(`\n📦 PRODUCT: "${product.name}" has ${product.product_variants.length} variants`);
    console.log('🔍 FULL VARIANT DATA STRUCTURE:');
    console.log(JSON.stringify(product.product_variants[0], null, 2));
  }
  
  const variants = product.product_variants?.map((v: any, idx: number) => {
    const variantOutlet = v.variant_outlets?.[0];
    // Get the option name from variant_sub_values (e.g., "Pack", "Carton", "1g", "3.5g")
    const optionName = v.variant_sub_values?.[0]?.variant_sub_value_name || 
                       v.variant_name?.split('/').pop()?.trim() || 
                       'Default';
    
    // Get variant price - try multiple sources
    const baseVariantPrice = variantOutlet?.price_inc_tax || 
                             variantOutlet?.price_ex_tax || 
                             v.price_inc_tax ||
                             v.price_ex_tax ||
                             v.price ||
                             v.retail_price ||
                             basePrice; // Use basePrice before markup
    const variantPrice = applyPriceMarkup(baseVariantPrice); // Apply 15% markup
    
    // Debug log for each variant
    if (product.product_variants?.length > 1) {
      console.log(`\n🏷️ VARIANT #${idx + 1}: "${optionName}"`);
      console.log(`   - variantOutlet exists: ${!!variantOutlet}`);
      console.log(`   - variantOutlet?.price_inc_tax: ${variantOutlet?.price_inc_tax}`);
      console.log(`   - variantOutlet?.price_ex_tax: ${variantOutlet?.price_ex_tax}`);
      console.log(`   - v.price_inc_tax: ${v.price_inc_tax}`);
      console.log(`   - v.price_ex_tax: ${v.price_ex_tax}`);
      console.log(`   - v.price: ${v.price}`);
      console.log(`   - v.retail_price: ${v.retail_price}`);
      console.log(`   - FINAL PRICE: ${variantPrice}`);
    }
    
    return {
      _id: String(v.prod_variant_id || v.id),
      priceId: String(v.prod_variant_id || v.id),
      color: optionName, // Using "color" field for option name (legacy naming)
      name: optionName,
      fullName: v.variant_name || '',
      sku: v.sku || '',
      barcode: v.barcode || '',
      images: v.variant_images?.length > 0 ? v.variant_images : imageUrls,
      inventory: variantOutlet?.available_inventory || 0,
      price: variantPrice,
    };
  }) || [];

  // If no variants, create a default one
  if (variants.length === 0) {
    variants.push({
      _id: String(product.id),
      priceId: String(product.id),
      color: 'Default',
      name: 'Default',
      fullName: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      images: imageUrls,
      inventory: inventory,
      price: price,
    });
  }

  return {
    _id: String(product.id),
    id: String(product.id),
    name: product.name || 'Unnamed Product',
    description: product.description || '',
    price: price,
    category: category,
    categories: categories, // All product types
    sizes: variants.map((v: any) => v.color),
    images: imageUrls,
    image: imageUrls,
    variants: variants,
    inventory: inventory,
    sku: product.sku || '',
    barcode: product.barcode || '',
    brand: brand,
    costPrice: costPrice,
    isActive: product.isActive !== false,
    purchased: false,
    quantity: 0, // Not in cart - 0 indicates not a cart item
    productId: String(product.id),
    variantId: variants[0]?.priceId || String(product.id),
    color: variants[0]?.color || 'Default',
    size: variants[0]?.color || 'Default',
  };
}


// ============ CUSTOMER MANAGEMENT ============

export interface HikeupCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  customer_code?: string;
  notes?: string;
  billing_address?: any;
  shipping_address?: any;
  created_date?: string;
  last_modified?: string;
  isActive?: boolean;
}

/**
 * POST request to Hikeup API
 */
export async function hikeupPost<T>(endpoint: string, body: any): Promise<T> {
  const token = await getAccessToken();
  
  const url = endpoint.startsWith('http') ? endpoint : `${HIKEUP_API_BASE}${endpoint}`;
  const bodyString = JSON.stringify(body);
  
  console.log('🌐 Hikeup POST Request:', url);
  console.log('📨 RAW Request Body:', bodyString);
  
  const response = await httpsRequest(url, 'POST', {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }, bodyString);

  // Handle 401 Unauthorized - token is definitely invalid
  if (response.status === 401) {
    const token = cache.token;
    const tokenAge = token ? Math.round((Date.now() - (token.expiresAt - 7*24*60*60*1000)) / 86400000) : null;
    const tokenExpired = token ? Date.now() > token.expiresAt : null;
    const hadRefreshToken = !!token?.refreshToken;
    
    console.error('🔴 Hikeup POST API returned 401 - Token is invalid');
    console.error('🔴 TOKEN DELETION REASON (POST):');
    console.error(`   - Endpoint: ${url}`);
    console.error(`   - Token age: ${tokenAge ?? 'unknown'} days old`);
    console.error(`   - Token expired: ${tokenExpired ?? 'unknown'}`);
    console.error(`   - Has refresh token: ${hadRefreshToken ? 'YES' : 'NO'}`);
    console.error(`   - Response: ${response.body.substring(0, 200)}`);
    console.error('🔴 DELETING TOKEN FROM DATABASE - Please reconnect Hikeup via /admin');
    
    // Log to database before clearing token
    await logHikeupEvent('token_deleted', 'Hikeup token deleted due to 401 Unauthorized from POST API', {
      endpoint: url,
      statusCode: 401,
      tokenAge: tokenAge ?? undefined,
      tokenExpired: tokenExpired ?? undefined,
      hadRefreshToken,
      errorResponse: response.body,
    });
    
    await clearHikeupToken();
    throw new Error('Hikeup token is invalid. Please reconnect via /admin.');
  }

  if (response.status !== 200) {
    console.error(`❌ Hikeup API Error (${response.status}):`, response.body);
    
    // Log non-401 POST API errors for monitoring
    await logHikeupEvent('api_error', `Hikeup POST API error: ${response.status}`, {
      endpoint: url,
      statusCode: response.status,
      errorResponse: response.body,
    });
    
    throw new Error(`Hikeup API Error: ${response.status} - ${response.body}`);
  }

  try {
    return JSON.parse(response.body);
  } catch (e) {
    console.error('❌ Failed to parse JSON:', e);
    throw new Error('Invalid JSON response from Hikeup');
  }
}

/**
 * Check if a customer exists on Hikeup by email
 * Returns the customer if found, null otherwise
 */
export async function getHikeupCustomerByEmail(email: string): Promise<HikeupCustomer | null> {
  try {
    const connected = await isHikeupConnected();
    if (!connected) {
      console.log('⚠️ Hikeup not connected, skipping customer lookup');
      return null;
    }

    const params = new URLSearchParams({
      page_size: '10',
      Skip_count: '0',
      Filter: email, // Filter by email
    });
    
    console.log(`🔍 Searching for Hikeup customer by email: ${email}`);
    
    const response = await hikeupFetch<any>(`/customers/get_all?${params.toString()}`);
    
    let customers: HikeupCustomer[] = [];
    if (Array.isArray(response)) {
      customers = response;
    } else if (response?.items) {
      customers = response.items;
    } else if (response?.data) {
      customers = response.data;
    }
    
    // Find exact email match (filter might return partial matches)
    const exactMatch = customers.find(c => 
      c.email?.toLowerCase() === email.toLowerCase()
    );
    
    if (exactMatch) {
      console.log(`✅ Found existing Hikeup customer: ${exactMatch.first_name} ${exactMatch.last_name} (ID: ${exactMatch.id})`);
      return exactMatch;
    }
    
    console.log(`📭 No Hikeup customer found with email: ${email}`);
    return null;
    
  } catch (error) {
    console.error('❌ Error checking Hikeup customer:', error);
    // Don't throw - we don't want customer lookup failures to block signup
    return null;
  }
}

/**
 * Create a new customer on Hikeup
 * Returns the created customer or null on failure
 */
export async function createHikeupCustomer(
  email: string, 
  firstName: string, 
  lastName?: string
): Promise<HikeupCustomer | null> {
  try {
    const connected = await isHikeupConnected();
    if (!connected) {
      console.log('⚠️ Hikeup not connected, skipping customer creation');
      return null;
    }

    console.log(`👤 Creating Hikeup customer: ${firstName} ${lastName || ''} (${email})`);
    
    const customerData: any = {
      first_name: firstName,
      email: email,
      isActive: true,
    };
    
    if (lastName) {
      customerData.last_name = lastName;
    }
    
    const response = await hikeupPost<HikeupCustomer>('/customers/createOrUpdate', customerData);
    
    console.log(`✅ Created Hikeup customer: ID ${response.id}`);
    return response;
    
  } catch (error) {
    console.error('❌ Error creating Hikeup customer:', error);
    // Don't throw - we don't want Hikeup failures to block signup
    return null;
  }
}

/**
 * Ensure customer exists on Hikeup (check first, create if needed)
 * Returns: { exists: boolean, customer: HikeupCustomer | null, created: boolean }
 */
export async function ensureHikeupCustomer(
  email: string, 
  name: string
): Promise<{ exists: boolean; customer: HikeupCustomer | null; created: boolean }> {
  // Check if customer already exists
  const existingCustomer = await getHikeupCustomerByEmail(email);
  
  if (existingCustomer) {
    return { exists: true, customer: existingCustomer, created: false };
  }
  
  // Parse name into first/last
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
  
  // Create new customer
  const newCustomer = await createHikeupCustomer(email, firstName, lastName);
  
  return { 
    exists: !!newCustomer, 
    customer: newCustomer, 
    created: !!newCustomer 
  };
}

/**
 * Update an existing customer on Hikeup
 * Uses the hikeupCustomerId to identify the customer
 */
export interface UpdateCustomerData {
  firstName: string;
  lastName?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };
}

export async function updateHikeupCustomer(
  hikeupCustomerId: string,
  email: string,
  data: UpdateCustomerData
): Promise<HikeupCustomer | null> {
  try {
    const connected = await isHikeupConnected();
    if (!connected) {
      console.log('⚠️ Hikeup not connected, skipping customer update');
      return null;
    }

    console.log(`📝 Updating Hikeup customer ID: ${hikeupCustomerId}`);
    
    // CRITICAL: Fetch the existing customer data from Hikeup first
    // As per Hikeup support: "use the same payload that you receive from the GET API"
    let existingCustomer: any = null;
    try {
      existingCustomer = await hikeupFetch<any>(`/customers/get/${hikeupCustomerId}`);
      console.log('📥 Fetched existing Hikeup customer for update');
    } catch (fetchError) {
      console.error('❌ Could not fetch existing customer:', fetchError);
      throw new Error('Failed to fetch existing customer data from Hikeup');
    }
    
    if (!existingCustomer) {
      throw new Error('No existing customer data found in Hikeup');
    }
    
    // Build a clean payload with ONLY fields from the API docs
    // Don't use the full GET response - too many fields cause conflicts
    const customerData: any = {
      id: existingCustomer.id,              // Required for update
      first_name: data.firstName,           // Required
      email: email,                         // Required
      last_name: data.lastName || existingCustomer.last_name || '',
      phone: data.phone || existingCustomer.phone || '',
      customer_group_id: existingCustomer.customer_group_id || 1,
      isActive: existingCustomer.isActive ?? true,
    };
    
    // Only include optional fields if they exist
    if (existingCustomer.company_name) {
      customerData.company_name = existingCustomer.company_name;
    }
    if (existingCustomer.customer_code) {
      customerData.customer_code = existingCustomer.customer_code;
    }
    if (existingCustomer.notes) {
      customerData.notes = existingCustomer.notes;
    }
    if (existingCustomer.loyalty_rewards_status !== undefined) {
      customerData.loyalty_rewards_status = existingCustomer.loyalty_rewards_status;
    }
    if (existingCustomer.accepts_marketing !== undefined) {
      customerData.accepts_marketing = existingCustomer.accepts_marketing;
    }
    
    // TESTING: DON'T send addresses at all - might be causing the 500 error
    // Just reference existing addresses by ID
    if (existingCustomer.billing_address_id) {
      customerData.billing_address_id = existingCustomer.billing_address_id;
    }
    if (existingCustomer.delivery_address_id) {
      customerData.delivery_address_id = existingCustomer.delivery_address_id;
    }
    
    // Only if user is explicitly updating address, send the address objects
    if (data.address && Object.keys(data.address).length > 0) {
      console.log('⚠️ User updating address - sending address objects (this might fail)');
      // User is updating address - send id: 0 to create new OR existing ID to update
      customerData.billing_address_id = 0; // 0 means create/update
      customerData.delivery_address_id = 0;
      
      customerData.billing_address = {
        id: 0, // Tell Hikeup to create/update
        address1: data.address.line1 || '',
        address2: data.address.line2 || '',
        city: data.address.city || '',
        state: data.address.province || '',
        country_code: 'CA',
        country_name: data.address.country || 'Canada',
        postcode: data.address.postalCode || '',
        receiverName: data.firstName + (data.lastName ? ' ' + data.lastName : ''),
        receiverPhone: data.phone || existingCustomer.phone || '',
      };
      
      customerData.shipping_address = { ...customerData.billing_address };
    }
    
    console.log('✅ Built clean payload with only API-documented fields');
    
    console.log('🔄 CHANGES BEING APPLIED:');
    if (existingCustomer.first_name !== customerData.first_name) {
      console.log(`   first_name: "${existingCustomer.first_name}" → "${customerData.first_name}"`);
    }
    if (existingCustomer.last_name !== customerData.last_name) {
      console.log(`   last_name: "${existingCustomer.last_name}" → "${customerData.last_name}"`);
    }
    if (existingCustomer.phone !== customerData.phone) {
      console.log(`   phone: "${existingCustomer.phone}" → "${customerData.phone}"`);
    }
    if (existingCustomer.email !== customerData.email) {
      console.log(`   email: "${existingCustomer.email}" → "${customerData.email}"`);
    }
    
    const response = await hikeupPost<HikeupCustomer>('/customers/createOrUpdate', customerData);
    
    console.log(`✅ Updated Hikeup customer: ID ${response.id}`);
    return response;
    
  } catch (error) {
    console.error('❌ Error updating Hikeup customer:', error);
    throw error; // Re-throw so the transaction can be rolled back
  }
}
