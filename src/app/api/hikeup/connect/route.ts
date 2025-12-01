import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { rateLimit, rateLimitedResponse } from "@/libs/rate-limit";

/**
 * Initiates Hikeup OAuth flow
 * Redirects admin user to Hikeup to authorize the app
 */
export async function GET(request: NextRequest) {
  // Rate limit: 10 OAuth attempts per 15 minutes per IP
  const { limited, resetIn, headers } = rateLimit(request, "oauth");
  if (limited) {
    return rateLimitedResponse(resetIn, headers);
  }

  // Only allow authenticated admin users
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const clientId = process.env.HIKEUP_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/hikeup/callback`;
  
  if (!clientId) {
    return NextResponse.json(
      { error: "Hikeup Client ID not configured" },
      { status: 500 }
    );
  }

  // Build Hikeup OAuth authorization URL
  // Request 'all' scope and 'offline_access' for refresh tokens
  const hikeupAuthUrl = new URL('https://api.hikeup.com/oauth/authorize');
  hikeupAuthUrl.searchParams.set('client_id', clientId);
  hikeupAuthUrl.searchParams.set('redirect_uri', redirectUri);
  hikeupAuthUrl.searchParams.set('response_type', 'code');
  hikeupAuthUrl.searchParams.set('scope', 'all offline_access');
  hikeupAuthUrl.searchParams.set('access_type', 'offline'); // Request refresh token
  
  // Add state parameter for security (prevents CSRF)
  const state = Buffer.from(JSON.stringify({ 
    userId: session.user._id,
    timestamp: Date.now() 
  })).toString('base64');
  hikeupAuthUrl.searchParams.set('state', state);

  return NextResponse.redirect(hikeupAuthUrl.toString());
}

