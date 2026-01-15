import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Additional check for admin routes - require staff role
    if (req.nextUrl.pathname.startsWith("/admin")) {
      const token = req.nextauth.token;
      
      console.log("🔒 [MIDDLEWARE] Admin route access attempt:", {
        path: req.nextUrl.pathname,
        hasToken: !!token,
        tokenRole: token?.role,
        tokenEmail: token?.email,
        fullToken: token,
      });
      
      if (!token || token.role !== "staff") {
        console.log("❌ [MIDDLEWARE] Access denied - redirecting to 404", {
          hasToken: !!token,
          role: token?.role,
          expected: "staff",
        });
        // Redirect to home instead of showing 404 or login
        // This prevents revealing that an admin panel exists
        return NextResponse.rewrite(new URL("/404", req.url));
      }
      
      console.log("✅ [MIDDLEWARE] Access granted to admin panel");
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      // Allow access if authenticated for non-admin routes
      // For admin routes, the middleware function above will check role
      authorized: ({ token, req }) => {
        console.log("🔐 [MIDDLEWARE-AUTHORIZED] Checking authorization:", {
          path: req.nextUrl.pathname,
          hasToken: !!token,
          tokenRole: token?.role,
          tokenEmail: token?.email,
        });
        
        // Admin routes require authentication (role check happens in middleware function)
        if (req.nextUrl.pathname.startsWith("/admin")) {
          const authorized = !!token;
          console.log("🔐 [MIDDLEWARE-AUTHORIZED] Admin route check:", {
            authorized,
            willProceedToRoleCheck: authorized,
          });
          return authorized;
        }
        // Other protected routes just need authentication
        return !!token;
      },
    },
  }
);

export const config = { 
  matcher: [
    "/account/:path*", 
    "/create", 
    "/result",
    "/admin/:path*",  // Protect all admin routes
  ] 
};
