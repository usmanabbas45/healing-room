import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Only check auth for protected routes
  const protectedPaths = ["/account", "/create", "/result", "/admin", "/orders", "/checkout"];
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));
  
  if (!isProtected) {
    return NextResponse.next();
  }
  
  // Get the token using getToken (works better than withAuth in some deployments)
  const token = await getToken({ 
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Debug log for production
  if (pathname.startsWith("/admin")) {
    console.log("Admin access attempt:", {
      path: pathname,
      hasToken: !!token,
      role: token?.role,
      email: token?.email,
    });
  }
  
  // If no token, redirect to login
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  
  // Special check for admin routes - require staff role
  if (pathname.startsWith("/admin")) {
    if (token.role !== "staff") {
      // Show 404 instead of revealing admin panel exists
      return NextResponse.rewrite(new URL("/404", req.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/create",
    "/result",
    "/admin/:path*",
    "/orders/:path*",
    "/checkout/:path*",
  ],
};
