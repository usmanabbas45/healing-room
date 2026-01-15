import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Protected routes that require authentication
  const isProtectedRoute = 
    path.startsWith("/admin") ||
    path.startsWith("/account") ||
    path === "/create" ||
    path === "/result";
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }
  
  // Skip check for the role check API itself to avoid infinite loop
  if (path.startsWith("/api/auth/check-role")) {
    return NextResponse.next();
  }
  
  // Call API to check user role from database
  try {
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host');
    const checkUrl = `${protocol}://${host}/api/auth/check-role`;
    
    console.log("🔐 [MIDDLEWARE] Checking auth via API:", checkUrl);
    
    const response = await fetch(checkUrl, {
      headers: {
        cookie: req.headers.get('cookie') || '',
      },
    });
    
    const data = await response.json();
    
    console.log("🔐 [MIDDLEWARE] Auth check result:", {
      path,
      authenticated: data.authenticated,
      role: data.role,
    });
    
    // If not authenticated, redirect to login
    if (!data.authenticated) {
      console.log("❌ [MIDDLEWARE] Not authenticated - redirecting to login");
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(loginUrl);
    }
    
    // Admin routes require staff role
    if (path.startsWith("/admin")) {
      if (data.role !== "staff") {
        console.log("❌ [MIDDLEWARE] Not staff - access denied", {
          role: data.role,
          expected: "staff",
        });
        // Redirect to home to prevent revealing admin panel exists
        return NextResponse.redirect(new URL("/", req.url));
      }
      console.log("✅ [MIDDLEWARE] Staff access granted to admin");
    }
    
    return NextResponse.next();
  } catch (error: any) {
    console.error("❌ [MIDDLEWARE] Error checking auth:", error);
    // On error, redirect to login for safety
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = { 
  matcher: [
    "/account/:path*", 
    "/create", 
    "/result",
    "/admin/:path*",  // Protect all admin routes
  ] 
};
