import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/libs/prisma';

/**
 * Cron endpoint to proactively refresh Hikeup tokens
 * This should be called daily to keep tokens fresh
 * 
 * Setup in Railway/Vercel:
 * - Add a cron job that hits this endpoint every 24 hours
 * - Or use a service like cron-job.org or EasyCron
 * 
 * Security: Uses CRON_SECRET env var to prevent unauthorized access
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('🔄 Cron: Checking Hikeup token status...');
    
    // Load token from database
    const [accessTokenSetting, refreshTokenSetting, expiresAtSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'hikeup_access_token' } }),
      prisma.settings.findUnique({ where: { key: 'hikeup_refresh_token' } }),
      prisma.settings.findUnique({ where: { key: 'hikeup_expires_at' } }),
    ]);
    
    if (!accessTokenSetting || !refreshTokenSetting) {
      console.log('⚠️ Cron: No Hikeup token found - skipping refresh');
      return NextResponse.json({
        success: false,
        message: 'No Hikeup token found',
      });
    }
    
    const expiresAt = expiresAtSetting ? parseInt(expiresAtSetting.value) : Date.now();
    const tokenLifetime = 604800000; // 7 days in milliseconds
    const tokenAge = Date.now() - (expiresAt - tokenLifetime);
    const tokenAgeDays = Math.round(tokenAge / 86400000);
    
    console.log(`📊 Cron: Token age: ${tokenAgeDays} days`);
    
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
      
      console.log('✅ Cron: Token refreshed successfully!');
      console.log(`📅 Cron: New token expires in ${Math.round(expiresIn / 3600)} hours`);
      
      // Log event
      await prisma.hikeupLog.create({
        data: {
          eventType: 'token_refreshed_cron',
          message: 'Hikeup token refreshed via cron job',
          statusCode: 200,
          metadata: {
            tokenAgeDays,
            expiresInHours: Math.round(expiresIn / 3600),
          },
        },
      });
      
      return NextResponse.json({
        success: true,
        message: 'Token refreshed successfully',
        tokenAgeDays,
        expiresInHours: Math.round(expiresIn / 3600),
      });
    } else {
      const errorText = await response.text();
      console.error('❌ Cron: Token refresh failed:', response.status, errorText);
      
      // Log failure
      await prisma.hikeupLog.create({
        data: {
          eventType: 'cron_refresh_failed',
          message: 'Failed to refresh Hikeup token via cron',
          statusCode: response.status,
          errorResponse: errorText,
          metadata: { tokenAgeDays },
        },
      });
      
      return NextResponse.json({
        success: false,
        message: 'Token refresh failed',
        error: errorText,
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('❌ Cron error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

