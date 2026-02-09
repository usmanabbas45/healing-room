/**
 * Server-side cron jobs for automated tasks
 * This file runs automatically when the server starts
 */
import cron from 'node-cron';
import prisma from '@/libs/prisma';
import { syncProductsToDatabase } from '@/libs/hikeup';

let cronInitialized = false;

/**
 * Initialize all cron jobs
 * Called once when the server starts
 */
export async function initializeCronJobs() {
  // Prevent multiple initializations
  if (cronInitialized) {
    console.log('⏰ Cron jobs already initialized, skipping...');
    return;
  }

  console.log('⏰ Initializing cron jobs...');

  // Sync products to database on startup
  console.log('📦 [STARTUP] Syncing products to database...');
  await syncProductsToDatabase();

  // Refresh Hikeup token every 6 hours (4 times per day)
  // This ensures we stay well ahead of token expiration
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔄 [CRON] Starting 6-hour Hikeup token refresh...');
    await refreshHikeupToken();
  });

  // Sync products to database every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔄 [CRON] Syncing products to database...');
    await syncProductsToDatabase();
  });

  cronInitialized = true;
  console.log('✅ Cron jobs initialized successfully!');
  console.log('   - Hikeup token refresh: Every 6 hours (4x daily)');
  console.log('   - Product sync: Every 5 minutes');
}

/**
 * Refresh Hikeup token
 */
async function refreshHikeupToken() {
  try {
    console.log('🔄 [CRON] Checking Hikeup token status...');
    
    // Load token from database
    const [accessTokenSetting, refreshTokenSetting, expiresAtSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'hikeup_access_token' } }),
      prisma.settings.findUnique({ where: { key: 'hikeup_refresh_token' } }),
      prisma.settings.findUnique({ where: { key: 'hikeup_expires_at' } }),
    ]);
    
    if (!accessTokenSetting || !refreshTokenSetting) {
      console.log('⚠️ [CRON] No Hikeup token found - skipping refresh');
      return;
    }
    
    // Get initial connection date (stored when first connected)
    const initialConnectionSetting = await prisma.settings.findUnique({ 
      where: { key: 'hikeup_initial_connection_date' } 
    });
    
    let daysSinceInitialConnection = 0;
    if (initialConnectionSetting) {
      const initialConnectionDate = parseInt(initialConnectionSetting.value);
      const ageMs = Date.now() - initialConnectionDate;
      daysSinceInitialConnection = Math.floor(ageMs / 86400000);
      
      console.log(`📊 [CRON] Days since initial connection: ${daysSinceInitialConnection}`);
      
      // Warn if approaching refresh token expiration (assuming 7-day lifetime)
      if (daysSinceInitialConnection >= 6) {
        console.log('⚠️⚠️⚠️ [CRON] WARNING: Refresh token is 6+ days old!');
        console.log('⚠️⚠️⚠️ [CRON] May expire soon - monitor for reconnection needs');
      }
    }
    
    const expiresAt = expiresAtSetting ? parseInt(expiresAtSetting.value) : Date.now();
    const tokenLifetime = 604800000; // 7 days in milliseconds
    const tokenAge = Date.now() - (expiresAt - tokenLifetime);
    const tokenAgeDays = Math.round(tokenAge / 86400000);
    
    console.log(`📊 [CRON] Access token age: ${tokenAgeDays} days`);
    
    // Attempt refresh
    const refreshBody = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.HIKEUP_CLIENT_ID || '',
      client_secret: process.env.HIKEUP_CLIENT_SECRET || '',
      refresh_token: refreshTokenSetting.value,
    }).toString();
    
    const response = await fetch('https://api.hikeup.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: refreshBody,
    });
    
    if (response.ok) {
      const data = await response.json();
      const newRefreshToken = data.refresh_token || refreshTokenSetting.value;
      const expiresIn = data.expires_in || 604800;
      const newExpiresAt = Date.now() + (expiresIn * 1000);
      
      // CRITICAL: Check if we got a new refresh token
      const gotNewRefreshToken = !!data.refresh_token && data.refresh_token !== refreshTokenSetting.value;
      
      if (data.refresh_token) {
        const oldToken = refreshTokenSetting.value.substring(0, 20);
        const newToken = data.refresh_token.substring(0, 20);
        const isSame = data.refresh_token === refreshTokenSetting.value;
        
        console.log('✅ [CRON] Received NEW refresh token from Hikeup');
        console.log(`   Old: ${oldToken}...`);
        console.log(`   New: ${newToken}...`);
        console.log(`   Status: ${isSame ? '⚠️ SAME (not rotated)' : '✅ DIFFERENT (rotated)'}`);
        
        // If it's DIFFERENT, reset the initial connection date (new 7-day lifecycle)
        if (gotNewRefreshToken) {
          console.log('🔄 [CRON] Refresh token rotated - resetting connection date');
        }
      } else {
        console.log('⚠️  [CRON] WARNING: Hikeup did NOT return refresh_token in response!');
        console.log('⚠️  [CRON] Reusing old refresh token - may cause expiration');
        console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
      }
      
      // Save new tokens
      const updates = [
        prisma.settings.update({
          where: { key: 'hikeup_access_token' },
          data: { value: data.access_token },
        }),
        prisma.settings.update({
          where: { key: 'hikeup_refresh_token' },
          data: { value: newRefreshToken },
        }),
        prisma.settings.update({
          where: { key: 'hikeup_expires_at' },
          data: { value: newExpiresAt.toString() },
        }),
      ];
      
      // If we got a new refresh token, reset the initial connection date
      if (gotNewRefreshToken) {
        updates.push(
          prisma.settings.upsert({
            where: { key: 'hikeup_initial_connection_date' },
            update: { value: Date.now().toString() },
            create: { key: 'hikeup_initial_connection_date', value: Date.now().toString() },
          })
        );
      }
      
      await prisma.$transaction(updates);
      
      console.log('✅ [CRON] Token refreshed successfully!');
      console.log(`📅 [CRON] New access token expires in ${Math.round(expiresIn / 3600)} hours`);
      
      // Log event with COMPLETE response data from Hikeup
      await prisma.hikeupLog.create({
        data: {
          eventType: 'token_refreshed_cron',
          message: 'Hikeup token refreshed via automated cron job',
          statusCode: 200,
          errorResponse: JSON.stringify({
            fullHikeupResponse: data,
            responseKeys: Object.keys(data),
            allFields: {
              access_token: data.access_token ? `${data.access_token.substring(0, 20)}...` : 'MISSING',
              token_type: data.token_type || 'MISSING',
              expires: data.expires || 'MISSING',
              expires_in: data.expires_in || 'MISSING',
              refresh_token: data.refresh_token ? `${data.refresh_token.substring(0, 20)}...` : 'MISSING',
              oldRefreshToken: refreshTokenSetting.value ? `${refreshTokenSetting.value.substring(0, 20)}...` : 'MISSING',
              tokensMatch: data.refresh_token === refreshTokenSetting.value,
            },
            analysis: {
              hasRefreshTokenInResponse: !!data.refresh_token,
              refreshTokenRotated: gotNewRefreshToken,
              reusingOldToken: !data.refresh_token,
            }
          }),
          metadata: JSON.stringify({
            tokenAgeDays,
            daysSinceInitialConnection: daysSinceInitialConnection,
            expiresInHours: Math.round(expiresIn / 3600),
            cronSchedule: 'Every 6 hours',
            gotNewRefreshToken: !!data.refresh_token,
            refreshTokenRotated: gotNewRefreshToken,
            allResponseKeys: Object.keys(data).join(', '),
          }),
        },
      });
    } else {
      const errorText = await response.text();
      console.error('❌ [CRON] Token refresh failed:', response.status, errorText);
      
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }
      
      // Log failure with complete error details
      await prisma.hikeupLog.create({
        data: {
          eventType: 'cron_refresh_failed',
          message: 'Failed to refresh Hikeup token via cron',
          statusCode: response.status,
          errorResponse: JSON.stringify({
            fullErrorResponse: errorData,
            rawError: errorText,
            errorKeys: typeof errorData === 'object' ? Object.keys(errorData) : [],
            requestDetails: {
              grant_type: 'refresh_token',
              had_refresh_token: !!refreshTokenSetting?.value,
              refresh_token_preview: refreshTokenSetting?.value ? `${refreshTokenSetting.value.substring(0, 20)}...` : 'NONE',
            }
          }),
          metadata: JSON.stringify({ 
            tokenAgeDays,
            daysSinceInitialConnection: daysSinceInitialConnection,
          }),
        },
      });
      
      // If it's an invalid_grant, the token is completely expired
      if (errorText.includes('invalid_grant')) {
        console.error('🔴 [CRON] CRITICAL: Refresh token expired! Manual reconnection required via /admin');
        
        await prisma.hikeupLog.create({
          data: {
            eventType: 'cron_refresh_token_expired',
            message: 'CRITICAL: Refresh token expired - manual reconnection required',
            statusCode: response.status,
            errorResponse: JSON.stringify({
              error: errorData,
              reason: 'invalid_grant means refresh token is no longer valid',
              action: 'Must reconnect via /admin to get new tokens',
            }),
            metadata: JSON.stringify({
              tokenAgeDays,
              daysSinceInitialConnection: daysSinceInitialConnection,
              action: 'Reconnect Hikeup via /admin',
            }),
          },
        });
      }
    }
    
  } catch (error: any) {
    console.error('❌ [CRON] Error:', error);
    
    await prisma.hikeupLog.create({
      data: {
        eventType: 'cron_error',
        message: 'Cron job error',
        errorResponse: error.message,
      },
    });
  }
}

