import { NextRequest, NextResponse } from "next/server";
import prisma from "@/libs/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, rateLimitedResponse } from "@/libs/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit: 5 attempts per 15 minutes (like login)
  const { limited, resetIn, headers } = rateLimit(request, "login");
  if (limited) {
    return rateLimitedResponse(resetIn, headers);
  }

  try {
    const { email, code, newPassword } = await request.json();

    // Validate inputs
    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { message: "Email, code, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Find valid reset code
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        email: email.toLowerCase(),
        code: code,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { message: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and mark code as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
      // Clean up all reset codes for this user
      prisma.passwordReset.deleteMany({
        where: {
          email: email.toLowerCase(),
          id: { not: resetRecord.id },
        },
      }),
    ]);

    console.log(`✅ Password reset successful for: ${email}`);

    return NextResponse.json({
      message: "Password reset successfully. You can now sign in with your new password.",
    });

  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

