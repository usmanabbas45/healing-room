import { NextRequest, NextResponse } from "next/server";
import { setHikeupToken } from "@/libs/hikeup";
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
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('Hikeup OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/admin?error=hikeup_auth_failed&message=${error}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/admin?error=no_auth_code', request.url)
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
      return NextResponse.redirect(
        new URL('/admin?error=token_exchange_failed', request.url)
      );
    }

    const tokenData = JSON.parse(response.body);
    console.log('✅ Token data received:', {
      has_access_token: !!tokenData.access_token,
      has_refresh_token: !!tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    });
    
    // Store the tokens in database for persistence
    await setHikeupToken(
      tokenData.access_token,
      tokenData.refresh_token || '',
      tokenData.expires_in || 604800
    );

    console.log('✅ Hikeup connected and token saved to database!');

    return NextResponse.redirect(
      new URL('/admin?success=hikeup_connected', request.url)
    );

  } catch (error: any) {
    console.error('Hikeup callback error:', error);
    return NextResponse.redirect(
      new URL(`/admin?error=connection_failed`, request.url)
    );
  }
}
