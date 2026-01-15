import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

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
  
  // Get session directly - this works in middleware in Next.js 14+
  const session = await getServerSession(authOptions);
  
  console.log("🔐 [MIDDLEWARE] Route access attempt:", {
    path,
    hasSession: !!session,
    userRole: session?.user?.role,
    userEmail: session?.user?.email,
  });
  
  // If no session, redirect to login
  if (!session) {
    console.log("❌ [MIDDLEWARE] No session - redirecting to login");
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }
  
  // Admin routes require staff role
  if (path.startsWith("/admin")) {
    if (session.user.role !== "staff") {
      console.log("❌ [MIDDLEWARE] Not staff - access denied", {
        role: session.user.role,
        expected: "staff",
      });
      // Redirect to home to prevent revealing admin panel exists
      return NextResponse.redirect(new URL("/", req.url));
    }
    console.log("✅ [MIDDLEWARE] Staff access granted to admin");
  }
  
  return NextResponse.next();
}

export const config = { 
  matcher: [
    "/account/:path*", 
    "/create", 
    "/result",
    "/admin/:path*",  // Protect all admin routes
  ] 
};
