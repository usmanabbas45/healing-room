import { NextRequest, NextResponse } from "next/server";
import prisma from "@/libs/prisma";
import { rateLimit, rateLimitedResponse } from "@/libs/rate-limit";
const nodemailer = require("nodemailer");

// Generate 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 requests per hour per IP (same as email)
  const { limited, resetIn, headers } = rateLimit(request, "email");
  if (limited) {
    return rateLimitedResponse(resetIn, headers);
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({
        message: "If an account with that email exists, we've sent a verification code.",
      });
    }

    // Delete any existing reset codes for this email
    await prisma.passwordReset.deleteMany({
      where: { email: email.toLowerCase() },
    });

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save reset code
    await prisma.passwordReset.create({
      data: {
        email: email.toLowerCase(),
        code,
        expiresAt,
      },
    });

    // Send email with code
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "mail.privateemail.com",
      port: parseInt(process.env.EMAIL_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const fromAddress = `"Healing Room" <${process.env.EMAIL_USER}>`;

    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: "Reset Your Password - Healing Room",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #fdfcfa 0%, #ffffff 100%);">
            <h1 style="color: #D4842A; margin: 0;">Healing Room</h1>
            <p style="color: #666; margin: 5px 0;">Premium Cannabis & Tobacco</p>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="color: #2D2D2D; margin-top: 0;">Reset Your Password</h2>
            
            <p style="color: #555; line-height: 1.6;">
              We received a request to reset your password. Use the verification code below to complete the process:
            </p>
            
            <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Your verification code:</p>
              <p style="font-size: 36px; font-weight: bold; color: #D4842A; letter-spacing: 8px; margin: 0;">
                ${code}
              </p>
              <p style="color: #888; margin: 15px 0 0 0; font-size: 12px;">
                This code expires in 15 minutes
              </p>
            </div>
            
            <p style="color: #555; line-height: 1.6;">
              If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
            
            <p style="color: #888; font-size: 12px; margin-top: 30px;">
              For security reasons, never share this code with anyone. Healing Room staff will never ask for your verification code.
            </p>
          </div>
          
          <div style="background: #2D2D2D; color: #fff; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Healing Room. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset code sent to: ${email}`);

    return NextResponse.json({
      message: "If an account with that email exists, we've sent a verification code.",
    });

  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

