import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

/**
 * API endpoint to check user's role from session
 * Used by middleware for admin access control
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ 
        authenticated: false,
        role: null 
      }, { status: 200 });
    }
    
    return NextResponse.json({ 
      authenticated: true,
      role: session.user.role,
      userId: session.user._id,
      email: session.user.email,
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error checking role:", error);
    return NextResponse.json({ 
      authenticated: false,
      role: null,
      error: error.message 
    }, { status: 200 });
  }
}
