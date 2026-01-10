/**
 * Server-side cron jobs for automated tasks
 * This file runs automatically when the server starts
 */
import cron from 'node-cron';
import prisma from './prisma';
import { loadAllProductsIntoCache, syncProductUpdates } from './hikeup';

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

  // Load products into cache on startup
  console.log('📦 [STARTUP] Loading products into cache...');
  await loadAllProductsIntoCache();

  // Refresh Hikeup token every day at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('🔄 [CRON] Starting daily Hikeup token refresh...');
    await refreshHikeupToken();
  });

  // Also refresh every 12 hours as backup
  cron.schedule('0 */12 * * *', async () => {
    console.log('🔄 [CRON] Starting 12-hour Hikeup token refresh...');
    await refreshHikeupToken();
  });

  // Sync product updates every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔄 [CRON] Syncing product updates...');
    await syncProductUpdates();
  });

  cronInitialized = true;
  console.log('✅ Cron jobs initialized successfully!');
  console.log('   - Hikeup token refresh: Every day at 3 AM + every 12 hours');
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
    
    const expiresAt = expiresAtSetting ? parseInt(expiresAtSetting.value) : Date.now();
    const tokenLifetime = 604800000; // 7 days in milliseconds
    const tokenAge = Date.now() - (expiresAt - tokenLifetime);
    const tokenAgeDays = Math.round(tokenAge / 86400000);
    
    console.log(`📊 [CRON] Token age: ${tokenAgeDays} days`);
    
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
      
      // Save new tokens
      await prisma.$transaction([
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
      ]);
      
      console.log('✅ [CRON] Token refreshed successfully!');
      console.log(`📅 [CRON] New token expires in ${Math.round(expiresIn / 3600)} hours`);
      
      // Log event
      await prisma.hikeupLog.create({
        data: {
          eventType: 'token_refreshed_cron',
          message: 'Hikeup token refreshed via automated cron job',
          statusCode: 200,
          metadata: JSON.stringify({
            tokenAgeDays,
            expiresInHours: Math.round(expiresIn / 3600),
            cronSchedule: 'Every 12 hours + Daily at 3 AM',
          }),
        },
      });
    } else {
      const errorText = await response.text();
      console.error('❌ [CRON] Token refresh failed:', response.status, errorText);
      
      // Log failure
      await prisma.hikeupLog.create({
        data: {
          eventType: 'cron_refresh_failed',
          message: 'Failed to refresh Hikeup token via cron',
          statusCode: response.status,
          errorResponse: errorText,
          metadata: JSON.stringify({ tokenAgeDays }),
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
            errorResponse: errorText,
            metadata: JSON.stringify({
              tokenAgeDays,
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

