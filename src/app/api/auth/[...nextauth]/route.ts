import { authOptions } from "@/libs/auth";
import NextAuth from "next-auth";
import { NextRequest } from "next/server";
import { rateLimit, rateLimitedResponse } from "@/libs/rate-limit";

const handler = NextAuth(authOptions);

// Wrap GET handler (no rate limiting needed for session checks)
export { handler as GET };

// Wrap POST handler with rate limiting for login attempts
export async function POST(request: NextRequest, context: { params: { nextauth: string[] } }) {
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
  
  return handler(request, context);
}
