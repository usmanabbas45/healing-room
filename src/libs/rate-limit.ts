/**
 * Rate Limiter for API Routes
 * 
 * Protects against:
 * - Brute force login attacks
 * - Signup spam/bots
 * - API abuse on chat/email endpoints
 * 
 * Uses in-memory storage (works for single-instance deployments like Railway)
 * For multi-instance deployments, consider using Redis
 */

import { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// Using globalThis to persist across Next.js dev mode recompilations
declare global {
  var rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

if (!globalThis.rateLimitStore) {
  globalThis.rateLimitStore = new Map<string, RateLimitEntry>();
}

const store = globalThis.rateLimitStore;

// Clean up expired entries every 5 minutes
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  // Convert to array to avoid TypeScript iteration issues
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  });
}

/**
 * Rate limit configuration for different endpoints
 */
export const RATE_LIMITS = {
  // Auth routes - strict limits to prevent brute force
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  signup: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 signups per hour per IP
  
  // API routes - moderate limits
  chat: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 messages per minute
  email: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 emails per hour
  
  // OAuth routes - prevent abuse
  oauth: { maxRequests: 10, windowMs: 15 * 60 * 1000 }, // 10 attempts per 15 minutes
  
  // General API - default limit
  default: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string {
  // Check various headers for the real IP (behind proxies/load balancers)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first one (client)
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  // Fallback - this might not be the real IP behind a proxy
  return "unknown";
}

/**
 * Check if request should be rate limited
 * 
 * @param request - The incoming request
 * @param type - The type of rate limit to apply
 * @returns Object with limited status and headers
 */
export function rateLimit(
  request: NextRequest,
  type: RateLimitType = "default"
): {
  limited: boolean;
  remaining: number;
  resetIn: number;
  headers: Record<string, string>;
} {
  cleanupExpiredEntries();
  
  const config = RATE_LIMITS[type];
  const ip = getClientIp(request);
  const key = `${type}:${ip}`;
  const now = Date.now();
  
  let entry = store.get(key);
  
  // If no entry or window has expired, create new entry
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    store.set(key, entry);
    
    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetIn: Math.ceil(config.windowMs / 1000),
      headers: {
        "X-RateLimit-Limit": config.maxRequests.toString(),
        "X-RateLimit-Remaining": (config.maxRequests - 1).toString(),
        "X-RateLimit-Reset": Math.ceil(entry.resetTime / 1000).toString(),
      },
    };
  }
  
  // Increment count
  entry.count++;
  store.set(key, entry);
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetIn = Math.ceil((entry.resetTime - now) / 1000);
  const limited = entry.count > config.maxRequests;
  
  return {
    limited,
    remaining,
    resetIn,
    headers: {
      "X-RateLimit-Limit": config.maxRequests.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(entry.resetTime / 1000).toString(),
      ...(limited && { "Retry-After": resetIn.toString() }),
    },
  };
}

/**
 * Create a rate limited response
 */
export function rateLimitedResponse(resetIn: number, headers: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: `Please try again in ${resetIn} seconds`,
      retryAfter: resetIn,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    }
  );
}

/**
 * Helper to apply rate limit headers to a response
 */
export function applyRateLimitHeaders(
  response: Response,
  headers: Record<string, string>
): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) {
    newHeaders.set(key, value);
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

