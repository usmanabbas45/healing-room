import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Additional check for admin routes - require staff role
    if (req.nextUrl.pathname.startsWith("/admin")) {
      const token = req.nextauth.token;
      
      if (!token || token.role !== "staff") {
        // Redirect to home instead of showing 404 or login
        // This prevents revealing that an admin panel exists
        return NextResponse.rewrite(new URL("/404", req.url));
      }
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      // Allow access if authenticated for non-admin routes
      // For admin routes, the middleware function above will check role
      authorized: ({ token, req }) => {
        // Admin routes require authentication (role check happens in middleware function)
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return !!token;
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
