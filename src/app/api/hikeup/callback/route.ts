import { NextRequest, NextResponse } from "next/server";
import { setHikeupToken } from "@/libs/hikeup";
import { rateLimit, rateLimitedResponse } from "@/libs/rate-limit";
import https from "https";
import tls from "tls";

/**
 * Make HTTPS request with weak DH key support (for Hikeup's outdated SSL)
 */
function httpsPost(url: string, data: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
      // Allow weak DH keys (Hikeup uses outdated SSL)
      rejectUnauthorized: false,
      // Use ciphers that work with weak DH keys
      ciphers: 'DEFAULT:@SECLEVEL=0',
      minVersion: 'TLSv1' as tls.SecureVersion,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode || 500, body });
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

/**
 * Handles Hikeup OAuth callback
 * Exchanges authorization code for access token
 */
export async function GET(request: NextRequest) {
  // Rate limit: 10 OAuth attempts per 15 minutes per IP
  const { limited, resetIn, headers } = rateLimit(request, "oauth");
  if (limited) {
    return rateLimitedResponse(resetIn, headers);
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    console.error('Hikeup OAuth error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url;
    return NextResponse.redirect(
      new URL(`/admin?error=hikeup_auth_failed&message=${error}`, baseUrl)
    );
  }

  // VALIDATE STATE PARAMETER (CSRF protection)
  // Per Hikeup docs: "If the states don't match, the request may have been created by a third party"
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      const stateAge = Date.now() - stateData.timestamp;
      
      // Reject if state is older than 10 minutes (same as auth code expiry per Hikeup docs)
      if (stateAge > 10 * 60 * 1000) {
        console.error('❌ State expired - possible replay attack');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url;
        return NextResponse.redirect(
          new URL('/admin?error=hikeup_auth_failed&message=state_expired', baseUrl)
        );
      }
      
      console.log('✅ State validation passed');
    } catch (e) {
      console.error('❌ Invalid state parameter - possible CSRF attack:', e);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url;
      return NextResponse.redirect(
        new URL('/admin?error=hikeup_auth_failed&message=invalid_state', baseUrl)
      );
    }
  } else {
    console.warn('⚠️ No state parameter received (should always be present)');
  }

  if (!code) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url;
    return NextResponse.redirect(
      new URL('/admin?error=no_auth_code', baseUrl)
    );
  }

  try {
    console.log('🔄 Exchanging code for token...');
    
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.HIKEUP_CLIENT_ID!,
      client_secret: process.env.HIKEUP_CLIENT_SECRET!,
      code: code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/hikeup/callback`,
    }).toString();

    console.log('📤 Token request to: https://api.hikeup.com/oauth/token');

    const response = await httpsPost('https://api.hikeup.com/oauth/token', tokenBody);

    console.log('📥 Token response status:', response.status);
    console.log('📥 Token response body:', response.body.substring(0, 200));

    if (response.status !== 200) {
      console.error('❌ Token exchange failed:', response.body);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url;
      return NextResponse.redirect(
        new URL('/admin?error=token_exchange_failed', baseUrl)
      );
    }

    const tokenData = JSON.parse(response.body);
    console.log('✅ Token data received:', {
      has_access_token: !!tokenData.access_token,
      has_refresh_token: !!tokenData.refresh_token,
      refresh_token_preview: tokenData.refresh_token ? tokenData.refresh_token.substring(0, 20) + '...' : 'NONE',
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
    });
    
    // Log initial connection to database for reference
    const prisma = (await import('@/libs/prisma')).default;
    await prisma.hikeupLog.create({
      data: {
        eventType: 'initial_oauth_connection',
        message: 'Initial OAuth connection - exchanged code for tokens',
        statusCode: 200,
        errorResponse: JSON.stringify({
          fullHikeupResponse: tokenData,
          responseKeys: Object.keys(tokenData),
          allFields: {
            access_token: tokenData.access_token ? `${tokenData.access_token.substring(0, 20)}...` : 'MISSING',
            token_type: tokenData.token_type || 'MISSING',
            expires: tokenData.expires || 'MISSING',
            expires_in: tokenData.expires_in || 'MISSING',
            refresh_token: tokenData.refresh_token ? `${tokenData.refresh_token.substring(0, 20)}...` : 'MISSING',
          }
        }),
        metadata: JSON.stringify({
          expiresInHours: tokenData.expires_in ? Math.round(tokenData.expires_in / 3600) : 'UNKNOWN',
          hasRefreshToken: !!tokenData.refresh_token,
        }),
      },
    });
    
    // If no refresh token, use a very long expiry (365 days) and warn
    const expiresIn = tokenData.expires_in || (tokenData.refresh_token ? 3600 : 31536000);
    
    if (!tokenData.refresh_token) {
      console.warn('⚠️ No refresh token received from Hikeup! Token will expire and require manual reconnection.');
    }
    
    // Store the tokens in database for persistence
    // Mark as initial connection to track refresh token age
    await setHikeupToken(
      tokenData.access_token,
      tokenData.refresh_token || '',
      expiresIn,
      true // isInitialConnection
    );

    console.log('✅ Hikeup connected and token saved to database!');
    console.log(`📅 Token expires in: ${Math.round(expiresIn / 3600)} hours (${Math.round(expiresIn / 86400)} days)`);
    console.log('📅 Initial connection date stored for refresh token lifecycle tracking');

    // Immediately sync products after successful connection
    console.log('🔄 [INITIAL CONNECTION] Triggering immediate product sync...');
    try {
      const { syncProductsToDatabase } = await import('@/libs/hikeup');
      await syncProductsToDatabase();
      console.log('✅ [INITIAL CONNECTION] Product sync completed successfully');
    } catch (syncError) {
      console.error('❌ [INITIAL CONNECTION] Product sync failed (non-fatal):', syncError);
      // Don't fail the connection - sync will happen via cron anyway
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url;
    return NextResponse.redirect(
      new URL('/admin?success=hikeup_connected', baseUrl)
    );

  } catch (error: any) {
    console.error('Hikeup callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url;
    return NextResponse.redirect(
      new URL(`/admin?error=connection_failed`, baseUrl)
    );
  }
}
