import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Only protect non-admin routes in middleware
  // Admin routes will validate server-side on each page
  const isProtectedRoute = 
    path.startsWith("/account") ||
    path === "/create" ||
    path === "/result";
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }
  
  // For non-admin protected routes, just check if there's a session cookie
  const sessionCookie = req.cookies.get('next-auth.session-token') || 
                        req.cookies.get('__Secure-next-auth.session-token');
  
  if (!sessionCookie) {
    console.log("❌ [MIDDLEWARE] No session cookie - redirecting to login");
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = { 
  matcher: [
    "/account/:path*", 
    "/create", 
    "/result",
  ] 
};
