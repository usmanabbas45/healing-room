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
// TOKEN CACHE ONLY (in-memory for performance)
// Product data fetched directly from Hikeup API
// ===========================================

// Extend globalThis type for token storage only
declare global {
  var hikeupTokenCache: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null | undefined;
}

// Initialize token cache only
if (typeof globalThis.hikeupTokenCache === 'undefined') {
  globalThis.hikeupTokenCache = null;
}

// Shortcut to token cache
const tokenCache = globalThis;

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
async function loadTokenFromDb(): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
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
      
      tokenCache.hikeupTokenCache = {
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
      
      return tokenCache.hikeupTokenCache;
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
  const token = tokenCache.hikeupTokenCache;
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
      
      // Check if it's an invalid_grant error (refresh token expired)
      const isInvalidGrant = response.body.includes('invalid_grant');
      
      if (isInvalidGrant) {
        console.error('🔴 REFRESH TOKEN EXPIRED - Both access and refresh tokens are invalid');
        console.error('🔴 This requires manual reconnection via /admin');
        
        // Delete the invalid tokens
        await clearHikeupToken();
        
        // Log this critical event
        await logHikeupEvent('refresh_token_expired', 'Refresh token expired - manual reconnection required', {
          statusCode: response.status,
          errorResponse: response.body,
          metadata: {
            message: 'Both access and refresh tokens are invalid. Please reconnect Hikeup via /admin',
          },
        });
      } else {
        // Log other refresh failures
        await logHikeupEvent('refresh_failed', 'Failed to refresh Hikeup token', {
          statusCode: response.status,
          hadRefreshToken: !!token.refreshToken,
          errorResponse: response.body,
        });
      }
      
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
  
  tokenCache.hikeupTokenCache = {
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
  if (tokenCache.hikeupTokenCache) return tokenCache.hikeupTokenCache;
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
 * Clear Hikeup token (both cache and database)
 */
export async function clearHikeupToken() {
  console.log('🧹 Clearing Hikeup token from cache and database...');
  tokenCache.hikeupTokenCache = null;
  try {
    await prisma.settings.deleteMany({
      where: {
        key: {
          in: ['hikeup_access_token', 'hikeup_refresh_token', 'hikeup_expires_at']
        }
      }
    });
    console.log('✅ Token cleared successfully');
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
        tokenCache.hikeupTokenCache = { ...token, expiresAt: newExpiry };
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
  let token = tokenCache.hikeupTokenCache;
  
  if (!token) {
    token = await loadTokenFromDb();
  }
  
  if (!token) {
    throw new Error('Hikeup not connected. Please connect via /admin');
  }

  // Only refresh if token is actually expired (within 5 minutes of expiry)
  // The cron job handles proactive refreshing every 12 hours
  const isExpired = Date.now() >= token.expiresAt - 300000; // 5 min buffer
  
  if (isExpired && token.refreshToken) {
    console.log(`⚠️ Token expired, attempting refresh...`);
    
    // Try to refresh
    const newAccessToken = await refreshAccessToken();
    
    if (newAccessToken) {
      return newAccessToken;
    }
    
    // Refresh failed - log warning but try existing token anyway
    console.log('⚠️ Token refresh failed, using existing token...');
    console.log('⚠️ If API calls fail with 401, please reconnect Hikeup via /admin');
  }

  return token.accessToken;
}

async function hikeupFetch<T>(endpoint: string): Promise<T> {
  const token = await getAccessToken();
  
  const url = endpoint.startsWith('http') ? endpoint : `${HIKEUP_API_BASE}${endpoint}`;
  
  console.log('🌐 Hikeup API Request:', url);
  
  // Parse and log query parameters
  if (url.includes('?')) {
    const [base, queryString] = url.split('?');
    const params = new URLSearchParams(queryString);
    console.log('   📋 Query Parameters:');
    params.forEach((value, key) => {
      console.log(`      ${key}: ${value}`);
    });
  }
  
  const response = await httpsRequest(url, 'GET', {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  // Handle 401 Unauthorized - token is definitely invalid
  if (response.status === 401) {
    const token = tokenCache.hikeupTokenCache;
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
    console.error(`   📍 Full URL: ${url}`);
    
    // Log non-401 API errors for monitoring
    await logHikeupEvent('api_error', `Hikeup API error: ${response.status}`, {
      endpoint: url,
      statusCode: response.status,
      errorResponse: response.body,
    });
    
    throw new Error(`Hikeup API Error: ${response.status}`);
  }

  try {
    const data = JSON.parse(response.body);
    
    // Log response schema for debugging
    if (url.includes('/products/get_all')) {
      console.log('📥 Response Schema:');
      console.log(`   Type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      console.log(`   Keys: [${Object.keys(data).join(', ')}]`);
      
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        const sampleProduct = data.items[0];
        console.log(`   Sample Product Keys: [${Object.keys(sampleProduct).slice(0, 10).join(', ')}...]`);
        console.log(`   Total Results: ${data.totalCount || data.items.length}`);
      }
    }
    
    return data;
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
 * Get products with pagination - DIRECT API CALL
 * Makes a single API call to Hikeup for the requested page
 */
export async function getHikeupProductsWithMeta(
  pageSize: number = 100,
  skipCount: number = 0,
  outletId?: number
): Promise<{ products: HikeupProduct[]; next: string | null; totalCount: number }> {
  try {
    console.log(`🌐 Fetching products from Hikeup API (page_size: ${pageSize}, skip: ${skipCount})`);
    
    const params = new URLSearchParams({
      page_size: pageSize.toString(),
      Skip_count: skipCount.toString(),
    });
    
    const response = await hikeupFetch<any>(`/products/get_all?${params.toString()}`);
    
    let products: HikeupProduct[] = [];
    let totalCount = 0;
    
    if (Array.isArray(response)) {
      products = response;
      totalCount = products.length;
    } else if (response?.items) {
      products = response.items;
      totalCount = response.totalCount || products.length;
    } else if (response?.data) {
      products = response.data;
      totalCount = response.total || products.length;
    }
    
    // Deduplicate: Remove variant products (keep only parent products with product_variants)
    const productGroups = new Map<string, any[]>();
    
    products.forEach((product: any) => {
      const productName = product.name || '';
      const baseName = productName.split(' / ')[0].trim().toLowerCase();
      
      if (!productGroups.has(baseName)) {
        productGroups.set(baseName, []);
      }
      productGroups.get(baseName)!.push(product);
    });
    
    const deduplicatedProducts = Array.from(productGroups.values()).map(group => {
      if (group.length === 1) {
        return group[0];
      }
      
      // Pick parent product (one with product_variants array)
      const parent = group.find(p => p.product_variants && p.product_variants.length > 0);
      return parent || group[0];
    });
    
    console.log(`✅ Fetched ${deduplicatedProducts.length} unique products (deduplicated from ${products.length})`);
    
    // Use Hikeup's 'next' field from response, or calculate based on raw product count
    let nextPage: string | null = null;
    if (response?.next) {
      nextPage = response.next;
    } else if (products.length === pageSize && totalCount > skipCount + pageSize) {
      nextPage = 'more'; // More pages available
    }
    
    return {
      products: deduplicatedProducts,
      next: nextPage,
      totalCount: totalCount,
    };
  } catch (error) {
    console.error('❌ Error fetching products from Hikeup:', error);
    return { products: [], next: null, totalCount: 0 };
  }
}

/**
 * Get products (single page) - DIRECT API CALL
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
 * Get ALL products - DIRECT API CALL (makes multiple API calls if needed)
 * ⚠️ Use sparingly - this can make many API calls
 */
export async function getAllHikeupProducts(outletId?: number): Promise<HikeupProduct[]> {
  try {
    const allProducts: HikeupProduct[] = [];
    const batchSize = 100;
    let skipCount = 0;
    let hasMore = true;
    let totalCount = 0;
    
    console.log('📦 Fetching ALL products from Hikeup (paginated)...');
    
    while (hasMore) {
      const { products, next, totalCount: count } = await getHikeupProductsWithMeta(batchSize, skipCount, outletId);
      allProducts.push(...products);
      totalCount = count;
      
      console.log(`   📄 Page ${Math.floor(skipCount / batchSize) + 1}: ${products.length} products (total so far: ${allProducts.length}/${totalCount})`);
      
      // Check if there's a next page using Hikeup's 'next' field
      if (!next) {
        console.log('   ✅ No more pages (next = null)');
        hasMore = false;
      } else {
        skipCount += batchSize;
      }
      
      // Safety limit
      if (skipCount >= 1000) {
        console.log('⚠️ Reached safety limit of 1000 skip count');
        hasMore = false;
      }
    }
    
    console.log(`✅ Fetched total of ${allProducts.length} unique parent products`);
    console.log(`   (Hikeup reported ${totalCount} total products including variants)`);
    console.log(`   Deduplication removed ${totalCount - allProducts.length} variant products`)
    
    return allProducts;
  } catch (error) {
    console.error('❌ Error fetching all products:', error);
    return [];
  }
}

/**
 * Get single product by ID - DIRECT API CALL
 * Uses: GET /products/get/{id}
 */
export async function getHikeupProduct(productId: string): Promise<HikeupProduct | null> {
  try {
    const id = String(productId);
    console.log(`🔍 Fetching product ID: ${id} from Hikeup API...`);
    
    const product = await hikeupFetch<HikeupProduct>(`/products/get/${id}`);
    
    if (product && product.id) {
      console.log(`✅ Fetched product ${id}: ${product.name}`);
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
    console.log(`   📤 Request params: page_size=${limit}, Skip_count=0, Filter="${filter}"`);
    
    const params = new URLSearchParams({
      page_size: limit.toString(),
      Skip_count: '0',
      Filter: filter,
    });
    
    const response = await hikeupFetch<any>(`/products/get_all?${params.toString()}`);
    
    console.log(`📥 FULL RESPONSE from Hikeup Filter API:`);
    console.log(`   Response type: ${Array.isArray(response) ? 'array' : typeof response}`);
    console.log(`   Response keys:`, response ? Object.keys(response) : 'null');
    console.log(`   Full response:`, JSON.stringify(response, null, 2).substring(0, 1000));
    
    let products: HikeupProduct[] = [];
    if (Array.isArray(response)) {
      products = response;
      console.log(`   ✅ Products in root array: ${products.length}`);
    } else if (response?.items) {
      products = response.items;
      console.log(`   ✅ Products in response.items: ${products.length}`);
    } else if (response?.data) {
      products = response.data;
      console.log(`   ✅ Products in response.data: ${products.length}`);
    } else if (response?.result) {
      products = response.result;
      console.log(`   ✅ Products in response.result: ${products.length}`);
    } else {
      console.log(`   ❌ Could not find products array in response structure`);
      console.log(`   Available keys:`, response ? Object.keys(response) : 'none');
    }
    
    if (products.length > 0) {
      console.log(`   📦 Sample product:`, JSON.stringify(products[0], null, 2).substring(0, 500));
      
      // REVERSE-ENGINEER: Check which fields contain the filter value
      console.log(`\n🔬 ANALYZING FILTER BEHAVIOR: Which fields match "${filter}"?`);
      const filterLower = filter.toLowerCase();
      const matchedFields: Set<string> = new Set();
      
      // Check first 5 products to see which fields match
      products.slice(0, 5).forEach((product: any, index) => {
        if (index === 0) console.log(`   Checking fields in returned products...`);
        
        // Check all string fields
        Object.entries(product).forEach(([key, value]) => {
          if (typeof value === 'string' && value.toLowerCase().includes(filterLower)) {
            matchedFields.add(key);
            if (index === 0) {
              console.log(`   ✅ "${key}": "${value.substring(0, 100)}"`);
            }
          }
          
          // Check nested arrays (like product_type, product_tags)
          if (Array.isArray(value)) {
            value.forEach((item: any) => {
              if (typeof item === 'object' && item !== null) {
                Object.entries(item).forEach(([nestedKey, nestedValue]) => {
                  if (typeof nestedValue === 'string' && nestedValue.toLowerCase().includes(filterLower)) {
                    matchedFields.add(`${key}.${nestedKey}`);
                    if (index === 0) {
                      console.log(`   ✅ "${key}.${nestedKey}": "${nestedValue}"`);
                    }
                  }
                });
              }
            });
          }
        });
      });
      
      console.log(`\n📊 FILTER CONCLUSION: "${filter}" matched these fields:`);
      console.log(`   ${Array.from(matchedFields).join(', ') || 'NONE (Filter may search computed/unlisted fields)'}`);
    }
    
    console.log(`🔍 Filter search returned ${products.length} products`);
    return products;
  } catch (error) {
    console.error('❌ Error searching Hikeup products:', error);
    console.error('   Error details:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Get products by category - Uses Hikeup Filter API
 */
export async function getHikeupProductsByCategory(categoryName: string): Promise<HikeupProduct[]> {
  try {
    console.log(`🔍 Fetching products for category: "${categoryName}"`);
    
    // Use Hikeup's Filter API to search by category
    const normalizedCategory = categoryName.replace(/-/g, ' ');
    const products = await getHikeupProductByFilter(normalizedCategory, 100);
    
    // Filter to match category more precisely
    const filtered = products.filter(p => {
      const productTypes = (p as any).product_type || [];
      return productTypes.some((pt: any) => {
        const typeName = (pt.type_name || pt.name || '').toLowerCase();
        const searchName = normalizedCategory.toLowerCase();
        return typeName.includes(searchName) || searchName.includes(typeName);
      });
    });
    
    console.log(`✅ Found ${filtered.length} products in category "${categoryName}"`);
    return filtered;
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
}

// Import type only - we'll fetch actual types from Hikeup
import { type ProductTypeId } from './product-types';
export { type ProductTypeId };

// We'll dynamically fetch product types from Hikeup
export { PRODUCT_TYPES } from './product-types';

/**
 * Get product types from Hikeup API (dedicated endpoint)
 */
async function getHikeupProductTypes(): Promise<{ id: number; name: string }[]> {
  try {
    console.log('🔍 Fetching product types from Hikeup API...');
    
    const params = new URLSearchParams({
      page_size: '100',
      Skip_count: '0',
    });
    
    console.log(`🌐 Hikeup API Request: ${HIKEUP_API_BASE}/product_types/get_all?${params.toString()}`);
    const response = await hikeupFetch<any>(`/product_types/get_all?${params.toString()}`);
    
    console.log('📥 Product types response keys:', Object.keys(response || {}));
    
    // Handle different response formats
    let types: any[] = [];
    if (Array.isArray(response)) {
      types = response;
    } else if (response?.result) {
      types = response.result;
    } else if (response?.data) {
      types = response.data;
    } else if (response?.items) {
      types = response.items;
    }
    
    console.log(`✅ Fetched ${types.length} product types from Hikeup`);
    if (types.length > 0) {
      console.log('   Sample type:', JSON.stringify(types[0], null, 2));
    }
    
    // Map to clean format
    return types.map((t: any) => ({
      id: t.id,
      name: t.name || t.type_name || '',
    }));
  } catch (error) {
    console.error('❌ Error fetching product types from Hikeup:', error);
    throw error;
  }
}

/**
 * Get product types for filter dropdown (with caching)
 */
export async function getProductTypesForFilter(): Promise<{ id: string; name: string; count: number }[]> {
  try {
    // Check cache first
    if (productTypesCache && Date.now() - productTypesCache.timestamp < PRODUCT_TYPES_CACHE_TTL) {
      console.log(`📦 Using cached product types (${productTypesCache.types.length} types)`);
      return productTypesCache.types;
    }
    
    console.log('🔍 Fetching product types from Hikeup...');
    
    // Fetch from dedicated endpoint
    const hikeupTypes = await getHikeupProductTypes();
    
    if (hikeupTypes.length === 0) {
      console.log('⚠️ No product types returned - returning default');
      return [{ id: 'all', name: 'All Products', count: 0 }];
    }
    
    // Get total product count for "All Products"
    const { totalCount } = await getHikeupProductsWithMeta(1, 0);
    
    // Format for filter dropdown
    const formattedTypes = hikeupTypes.map((type) => {
      // Clean up display name (remove parenthetical content for cleaner UI)
      let displayName = type.name.replace(/\s*\([^)]*\)\s*/g, '').trim();
      // Fix common typos
      displayName = displayName.replace('Hybird', 'Hybrid');
      
      const typeId = type.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      return {
        id: typeId,
        name: displayName,
        count: 0, // Count would require fetching all products, not worth it
      };
    });
    
    // Remove duplicates and sort alphabetically
    const uniqueTypes = Array.from(
      new Map(formattedTypes.map(t => [t.id, t])).values()
    ).sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`✅ Processed ${uniqueTypes.length} product types for filter`);
    
    const result = [
      { id: 'all', name: 'All Products', count: totalCount },
      ...uniqueTypes
    ];
    
    // Cache the results
    productTypesCache = {
      types: result,
      timestamp: Date.now(),
    };
    
    return result;
  } catch (error) {
    console.error('❌ Error in getProductTypesForFilter:', error);
    
    // Return cached data if available, even if expired
    if (productTypesCache) {
      console.log('⚠️ Returning stale cached product types');
      return productTypesCache.types;
    }
    
    return [{ id: 'all', name: 'All Products', count: 0 }];
  }
}

/**
 * Get products filtered by product type - DIRECT API CALL
 * Note: For better filtering, this fetches all products and filters locally
 */
export async function getHikeupProductsByType(
  typeId: string,
  pageSize: number = 24,
  skipCount: number = 0
): Promise<{ products: HikeupProduct[]; totalCount: number }> {
  try {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 [FILTER REQUEST] Type: "${typeId}", Page Size: ${pageSize}, Skip: ${skipCount}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // If "all", return all products from cache
    if (typeId === 'all') {
      console.log(`📦 Fetching ALL products (no type filter)`);
      if (!isProductCacheReady()) {
        console.warn('⚠️ Product cache not ready, falling back to API');
        return getHikeupProductsWithMeta(pageSize, skipCount);
      }
      
      const allProducts = getCachedProducts();
      const paginated = allProducts.slice(skipCount, skipCount + pageSize);
      console.log(`✅ Returning ${paginated.length} of ${allProducts.length} total products (all types)\n`);
      return {
        products: paginated,
        totalCount: allProducts.length,
      };
    }
    
    console.log(`⚡ Getting products by type: "${typeId}" from cache (instant!)`);
    
    // Get products from cache by type (instant!)
    if (!isProductCacheReady()) {
      console.warn('⚠️ Product cache not ready yet, products may not be available\n');
      return {
        products: [],
        totalCount: 0,
      };
    }
    
    const filtered = getCachedProductsByType(typeId);
    
    if (filtered.length === 0) {
      console.log(`⚠️ No products found for type "${typeId}"`);
    }
    
    // Apply pagination
    const paginated = filtered.slice(skipCount, skipCount + pageSize);
    
    console.log(`\n✅ [FINAL RESULT] Returning ${paginated.length} of ${filtered.length} total products for type "${typeId}"`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    return {
      products: paginated,
      totalCount: filtered.length,
    };
  } catch (error) {
    console.error('❌ Error filtering products by type:', error);
    return { products: [], totalCount: 0 };
  }
}

/**
 * Search products using Hikeup Filter API - DIRECT API CALL
 * Searches by name, SKU, barcode
 */
export async function searchHikeupProducts(query: string): Promise<HikeupProduct[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }
  
  try {
    console.log(`🔍 Searching Hikeup for: "${query}"`);
    
    // Use Hikeup's Filter API
    const results = await getHikeupProductByFilter(query, 50);
    
    console.log(`🔍 Raw search results: ${results.length} products`);
    
    // DEDUPLICATE: Group by base product name and keep only parent products
    const productGroups = new Map<string, any[]>();
    
    results.forEach((product: any) => {
      const productName = product.name || '';
      const baseName = productName.split(' / ')[0].trim().toLowerCase();
      
      if (!productGroups.has(baseName)) {
        productGroups.set(baseName, []);
      }
      productGroups.get(baseName)!.push(product);
    });
    
    // For each group, pick the parent product
    const deduplicated = Array.from(productGroups.values()).map(group => {
      if (group.length === 1) {
        return group[0];
      }
      
      // Pick parent (one with product_variants)
      const parent = group.find(p => p.product_variants && p.product_variants.length > 0);
      return parent || group[0];
    });
    
    console.log(`✅ Search complete: ${deduplicated.length} unique products (from ${results.length} raw results)`);
    return deduplicated;
  } catch (error) {
    console.error('❌ Error searching products:', error);
    return [];
  }
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
    const token = tokenCache.hikeupTokenCache;
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
    // Check if address object exists AND has actual data (not just undefined values)
    const hasAddressData = data.address && (
      data.address.line1 || 
      data.address.city || 
      data.address.postalCode
    );
    
    if (hasAddressData && data.address) {
      console.log('⚠️ User updating address - sending address objects');
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
    } else {
      console.log('✅ No address update - keeping existing address IDs only');
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

// ============ OFFERS / SPECIAL DEALS ============

export interface HikeupOfferItem {
  offerOn: number; // 1=product, 5=category, etc
  offerOnId: number;
  name: string | null;
  compositeQty: number;
  fixedPrice: number;
  buyAndGetType: number;
  isActive: boolean;
  id: number;
}

export interface HikeupOffer {
  id: number;
  name: string;
  description: string | null;
  offerType: number;
  isPercentage: boolean;
  offerValue: number;
  offerAmount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  offerImage: string | null;
  offerItems?: HikeupOfferItem[];
  offerOutlets?: any[];
  offerCustomerGroups?: any[];
  // Enriched data (added by our system)
  applicableProducts?: { id: number; name: string; image?: string }[];
  applicableCategories?: string[];
}

// Cache for offers
let offersCache: {
  offers: HikeupOffer[];
  timestamp: number;
} | null = null;

const OFFERS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ============ PRODUCT CACHE SYSTEM ============
// Background-synced full product catalog with type indexing

let allProductsCache: {
  products: HikeupProduct[];
  byType: Map<string, HikeupProduct[]>; // Indexed by type for instant filtering
  lastSyncTime: Date;
  isLoading: boolean;
} | null = null;

// Cache for product types (longer TTL since types don't change often)
let productTypesCache: {
  types: { id: string; name: string; count: number }[];
  timestamp: number;
} | null = null;
const PRODUCT_TYPES_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Load ALL products into cache with type indexing
 * Called on server startup and for full refresh
 */
export async function loadAllProductsIntoCache(): Promise<void> {
  if (allProductsCache?.isLoading) {
    console.log('⏳ Products already loading, skipping...');
    return;
  }

  try {
    if (allProductsCache) {
      allProductsCache.isLoading = true;
    }

    console.log('📦 Loading ALL products into cache...');
    const startTime = Date.now();
    
    const allProducts = await getAllHikeupProducts();
    
    console.log(`✅ Loaded ${allProducts.length} products in ${Date.now() - startTime}ms`);
    
    // Build type index
    console.log('🏗️  Building type index...');
    const byType = new Map<string, HikeupProduct[]>();
    
    allProducts.forEach((product: any) => {
      const types = product.product_type || [];
      types.forEach((pt: any) => {
        const typeName = (pt.type_name || pt.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (typeName) {
          if (!byType.has(typeName)) {
            byType.set(typeName, []);
          }
          byType.get(typeName)!.push(product);
        }
      });
    });
    
    console.log(`✅ Type index built: ${byType.size} types`);
    byType.forEach((products, type) => {
      console.log(`   ${type}: ${products.length} products`);
    });
    
    allProductsCache = {
      products: allProducts,
      byType,
      lastSyncTime: new Date(),
      isLoading: false,
    };
    
    console.log(`✅ Product cache ready! ${allProducts.length} products indexed by ${byType.size} types`);
    console.log(`📍 [MODULE INSTANCE] Cache created at: ${new Date().toISOString()}`);
  } catch (error) {
    console.error('❌ Error loading products into cache:', error);
    if (allProductsCache) {
      allProductsCache.isLoading = false;
    }
  }
}

/**
 * Incrementally sync products using Sync_From parameter
 * Called by cron job every 5 minutes
 */
export async function syncProductUpdates(): Promise<void> {
  if (!allProductsCache) {
    console.log('⚠️ No product cache exists, performing full load...');
    await loadAllProductsIntoCache();
    return;
  }

  if (allProductsCache.isLoading) {
    console.log('⏳ Sync already in progress, skipping...');
    return;
  }

  try {
    allProductsCache.isLoading = true;
    
    const syncFrom = allProductsCache.lastSyncTime.toISOString();
    console.log(`🔄 Syncing product updates since ${syncFrom}...`);
    
    const params = new URLSearchParams({
      page_size: '500',
      Skip_count: '0',
      Sync_From: syncFrom,
    });
    
    const response = await hikeupFetch<any>(`/products/get_all?${params.toString()}`);
    const updates = response?.items || response || [];
    
    if (updates.length === 0) {
      console.log('✅ No product updates');
      allProductsCache.isLoading = false;
      return;
    }
    
    console.log(`📥 Received ${updates.length} product updates`);
    
    // Merge updates into cache
    const productMap = new Map(allProductsCache.products.map(p => [p.id, p]));
    updates.forEach((update: any) => {
      productMap.set(update.id, update);
    });
    
    const allProducts = Array.from(productMap.values());
    
    // Rebuild type index
    const byType = new Map<string, HikeupProduct[]>();
    allProducts.forEach((product: any) => {
      const types = product.product_type || [];
      types.forEach((pt: any) => {
        const typeName = (pt.type_name || pt.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (typeName) {
          if (!byType.has(typeName)) {
            byType.set(typeName, []);
          }
          byType.get(typeName)!.push(product);
        }
      });
    });
    
    allProductsCache = {
      products: allProducts,
      byType,
      lastSyncTime: new Date(),
      isLoading: false,
    };
    
    console.log(`✅ Cache updated: ${allProducts.length} total products, ${byType.size} types`);
  } catch (error) {
    console.error('❌ Error syncing product updates:', error);
    if (allProductsCache) {
      allProductsCache.isLoading = false;
    }
  }
}

/**
 * Get products from cache (instant!)
 */
export function getCachedProducts(): HikeupProduct[] {
  if (!allProductsCache) {
    console.warn('⚠️ Product cache not initialized');
    return [];
  }
  return allProductsCache.products;
}

/**
 * Get products by type from cache (instant!)
 */
export function getCachedProductsByType(typeId: string): HikeupProduct[] {
  console.log(`\n🔍 [CACHE LOOKUP] Searching for type: "${typeId}"`);
  
  if (!allProductsCache) {
    console.warn('⚠️ Product cache not initialized');
    return [];
  }
  
  console.log(`📊 [CACHE STATE]`);
  console.log(`   Total products in cache: ${allProductsCache.products.length}`);
  console.log(`   Total types indexed: ${allProductsCache.byType.size}`);
  console.log(`   Available types: [${Array.from(allProductsCache.byType.keys()).join(', ')}]`);
  console.log(`   Is loading: ${allProductsCache.isLoading}`);
  console.log(`   Last sync: ${allProductsCache.lastSyncTime}`);
  
  const products = allProductsCache.byType.get(typeId) || [];
  console.log(`\n📦 [RESULT] Found ${products.length} products for type "${typeId}"`);
  
  if (products.length > 0) {
    console.log(`   Sample products: ${products.slice(0, 3).map((p: any) => p.name).join(', ')}`);
  } else {
    console.log(`   ⚠️ Type "${typeId}" not found in cache!`);
    console.log(`   Did you mean one of: ${Array.from(allProductsCache.byType.keys()).slice(0, 5).join(', ')}?`);
  }
  
  return products;
}

/**
 * Check if product cache is ready
 */
export function isProductCacheReady(): boolean {
  const isReady = allProductsCache !== null && !allProductsCache.isLoading;
  
  console.log(`\n🔍 [CACHE READY CHECK]`);
  console.log(`   allProductsCache exists: ${allProductsCache !== null}`);
  console.log(`   isLoading: ${allProductsCache?.isLoading ?? 'N/A'}`);
  console.log(`   Product count: ${allProductsCache?.products.length ?? 0}`);
  console.log(`   Type count: ${allProductsCache?.byType.size ?? 0}`);
  console.log(`   ✅ Cache ready: ${isReady}`);
  
  return isReady;
}

/**
 * Get all active offers from Hikeup
 */
export async function getHikeupOffers(): Promise<HikeupOffer[]> {
  try {
    // Check cache first
    if (offersCache && Date.now() - offersCache.timestamp < OFFERS_CACHE_TTL) {
      console.log(`📦 Using cached offers (${offersCache.offers.length} offers)`);
      return offersCache.offers;
    }

    console.log('🎁 Fetching offers from Hikeup...');
    
    const params = new URLSearchParams({
      page_size: '100',
      Skip_count: '0',
    });

    const response = await hikeupFetch<any>(`/offers/get_all?${params.toString()}`);
    
    console.log('📦 RAW HIKEUP OFFERS RESPONSE:');
    console.log('Response type:', typeof response);
    console.log('Is array?', Array.isArray(response));
    console.log('Response keys:', response ? Object.keys(response) : 'null');
    console.log('Full response:', JSON.stringify(response, null, 2));
    
    let offers: HikeupOffer[] = [];
    if (Array.isArray(response)) {
      offers = response;
      console.log('✅ Found offers in array format');
    } else if (response?.items) {
      offers = response.items;
      console.log('✅ Found offers in response.items');
    } else if (response?.data) {
      offers = response.data;
      console.log('✅ Found offers in response.data');
    } else {
      console.log('⚠️ No offers found in expected response structure');
    }

    console.log(`📊 Total offers found: ${offers.length}`);
    
    if (offers.length > 0) {
      console.log('📋 Sample offer:', JSON.stringify(offers[0], null, 2));
    }

    // Filter only active offers
    const activeOffers = offers.filter(offer => offer.isActive === true);
    const inactiveCount = offers.length - activeOffers.length;
    
    console.log(`✅ Fetched ${activeOffers.length} active offer(s) from Hikeup${inactiveCount > 0 ? ` (${inactiveCount} inactive)` : ''}`);

    // Enrich offers with product/category information
    console.log('🔄 Enriching offers with product/category data...');
    const enrichedOffers = await Promise.all(
      activeOffers.map(async (offer) => {
        const enrichedOffer = { ...offer };
        
        console.log(`\n🎁 Processing offer: "${offer.name}"`);
        
        if (!offer.offerItems || offer.offerItems.length === 0) {
          console.log(`  ℹ️ No specific items - applies to all products`);
          return enrichedOffer;
        }
        
        console.log(`  📋 Processing ${offer.offerItems.length} offer item(s)`);

        enrichedOffer.applicableProducts = [];
        enrichedOffer.applicableCategories = [];

        for (const item of offer.offerItems) {
          // Try to fetch as a product by ID
          let productFound = false;
          if (item.offerOnId) {
            try {
              const product = await getHikeupProduct(String(item.offerOnId));
              if (product) {
                const images = extractHikeupImages(product);
                enrichedOffer.applicableProducts!.push({
                  id: product.id as number,
                  name: product.name || 'Unknown Product',
                  image: images[0] || '/logo.png',
                });
                console.log(`    ✅ Added product: ${product.name}`);
                productFound = true;
              }
            } catch (error) {
              console.log(`    ⚠️ Could not fetch product ${item.offerOnId}`);
            }
          }
          
          // Skip further processing if we found a product
          if (productFound) {
            continue;
          }
          
          // If no product found, log and skip
          console.log(`    ℹ️ No product found for offerOnId: ${item.offerOnId}`);
        }

        const productCount = enrichedOffer.applicableProducts?.length || 0;
        const categoryCount = enrichedOffer.applicableCategories?.length || 0;
        console.log(`  ✅ Offer "${offer.name}" enriched: ${productCount} product(s), ${categoryCount} category(ies)`);

        return enrichedOffer;
      })
    );

    console.log(`\n✅ Enrichment complete`);

    // Cache the enriched results
    offersCache = {
      offers: enrichedOffers,
      timestamp: Date.now(),
    };

    return enrichedOffers;
  } catch (error) {
    console.error('❌ Error fetching Hikeup offers:', error);
    return [];
  }
}

/**
 * Get active discount for a specific product
 */
export async function getProductDiscount(productId: number): Promise<{
  discountPercentage: number;
  discountAmount: number;
  offerName: string;
  validUntil: string;
} | null> {
  try {
    const offers = await getHikeupOffers();
    console.log(`🔍 Checking discount for product ID: ${productId}`);
    console.log(`📋 Active offers found: ${offers.length}`);
    
    // Find an offer that applies to this product
    for (const offer of offers) {
      console.log(`\n🎁 Checking offer: "${offer.name}"`);
      console.log(`   - Applicable products: ${offer.applicableProducts?.map(p => `${p.name} (ID: ${p.id})`).join(', ') || 'none'}`);
      console.log(`   - Applicable categories: ${offer.applicableCategories?.join(', ') || 'none'}`);
      
      // Check if product is in applicable products
      if (offer.applicableProducts && offer.applicableProducts.some(p => p.id === productId)) {
        console.log(`✅ MATCH FOUND! Product ${productId} matches offer "${offer.name}"`);
        return {
          discountPercentage: offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
          discountAmount: !offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
          offerName: offer.name,
          validUntil: offer.validTo,
        };
      }
      
      // Check if it's a store-wide offer (no specific products)
      if ((!offer.applicableProducts || offer.applicableProducts.length === 0) &&
          (!offer.applicableCategories || offer.applicableCategories.length === 0)) {
        console.log(`✅ STORE-WIDE OFFER FOUND! Applying "${offer.name}" to product ${productId}`);
        return {
          discountPercentage: offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
          discountAmount: !offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
          offerName: offer.name,
          validUntil: offer.validTo,
        };
      }
    }
    
    console.log(`❌ No discount found for product ${productId}`);
    return null;
  } catch (error) {
    console.error('Error getting product discount:', error);
    return null;
  }
}
