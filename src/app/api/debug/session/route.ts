import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    // Get token directly
    const token = await getToken({ 
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    // Get cookies
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get("next-auth.session-token") || 
                          cookieStore.get("__Secure-next-auth.session-token");
    
    return NextResponse.json({
      session: {
        exists: !!session,
        user: session?.user,
      },
      token: {
        exists: !!token,
        id: token?.id,
        email: token?.email,
        role: token?.role,
        name: token?.name,
      },
      cookie: {
        exists: !!sessionCookie,
        name: sessionCookie?.name,
        hasValue: !!sessionCookie?.value,
      },
      environment: {
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        nodeEnv: process.env.NODE_ENV,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
