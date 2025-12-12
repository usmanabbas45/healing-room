import { authOptions } from "@/libs/auth";
import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitedResponse } from "@/libs/rate-limit";

const handler = NextAuth(authOptions);

// Wrap GET handler to catch JWT errors and clear invalid sessions
export async function GET(request: NextRequest, context: any) {
  try {
    return await handler(request, context);
  } catch (error: any) {
    // If JWT decryption fails (old/invalid session), clear the cookie
    // Error will still be logged by NextAuth for visibility
    if (error?.name === "JWEDecryptionFailed" || error?.message?.includes("decryption")) {
      console.log("🧹 Cleaning up stale session cookie (JWT decryption failed)");
      
      const response = NextResponse.json({ user: null }, { status: 200 });
      
      // Clear the invalid session cookie
      response.cookies.set("next-auth.session-token", "", {
        maxAge: 0,
        path: "/",
      });
      response.cookies.set("__Secure-next-auth.session-token", "", {
        maxAge: 0,
        path: "/",
      });
      
      return response;
    }
    
    // Re-throw other errors
    throw error;
  }
}

// Wrap POST handler with rate limiting for login attempts
export async function POST(request: NextRequest, context: { params: { nextauth: string[] } }) {
  try {
    // Only rate limit the credentials callback (login attempts)
    const isLoginAttempt = context.params.nextauth?.includes("callback") && 
                           context.params.nextauth?.includes("credentials");
    
    if (isLoginAttempt) {
      // Rate limit: 5 login attempts per 15 minutes per IP
      const { limited, resetIn, headers } = rateLimit(request, "login");
      if (limited) {
        return rateLimitedResponse(resetIn, headers);
      }
    }
    
    return await handler(request, context);
  } catch (error: any) {
    // If JWT decryption fails during POST, clear the cookie
    // Error will still be logged by NextAuth for visibility
    if (error?.name === "JWEDecryptionFailed" || error?.message?.includes("decryption")) {
      console.log("🧹 Cleaning up stale session cookie during POST (JWT decryption failed)");
      
      const response = NextResponse.json({ error: "Invalid session" }, { status: 401 });
      
      response.cookies.set("next-auth.session-token", "", {
        maxAge: 0,
        path: "/",
      });
      response.cookies.set("__Secure-next-auth.session-token", "", {
        maxAge: 0,
        path: "/",
      });
      
      return response;
    }
    
    throw error;
  }
}
