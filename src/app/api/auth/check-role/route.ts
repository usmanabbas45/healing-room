import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

/**
 * API endpoint to check user's role from session
 * Used by middleware for admin access control
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [CHECK-ROLE] API called:", {
      hasCookieHeader: !!request.headers.get('cookie'),
      cookiePreview: request.headers.get('cookie')?.substring(0, 100),
    });
    
    const session = await getServerSession(authOptions);
    
    console.log("🔍 [CHECK-ROLE] Session check:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      role: session?.user?.role,
    });
    
    if (!session?.user) {
      console.log("❌ [CHECK-ROLE] No session found");
      return NextResponse.json({ 
        authenticated: false,
        role: null 
      }, { status: 200 });
    }
    
    console.log("✅ [CHECK-ROLE] Session valid:", {
      role: session.user.role,
      email: session.user.email,
    });
    
    return NextResponse.json({ 
      authenticated: true,
      role: session.user.role,
      userId: session.user._id,
      email: session.user.email,
    }, { status: 200 });
  } catch (error: any) {
    console.error("❌ [CHECK-ROLE] Error checking role:", error);
    return NextResponse.json({ 
      authenticated: false,
      role: null,
      error: error.message 
    }, { status: 200 });
  }
}
