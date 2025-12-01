import { NextResponse, NextRequest } from "next/server";
import { rateLimit, rateLimitedResponse } from "@/libs/rate-limit";
const nodemailer = require("nodemailer");

export async function POST(request: NextRequest) {
  // Rate limit: 5 emails per hour per IP (prevent spam)
  const { limited, resetIn, headers } = rateLimit(request, "email");
  if (limited) {
    return rateLimitedResponse(resetIn, headers);
  }

  const { name, email, phone, message, subject, type } = await request.json();

  // Validate required fields
  if (!name || !email || !message) {
    return NextResponse.json(
      { message: "Name, email, and message are required." },
      { status: 400 },
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { message: "Invalid email format." },
      { status: 400 },
    );
  }

  // Namecheap Private Email SMTP Configuration
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "mail.privateemail.com",
    port: parseInt(process.env.EMAIL_PORT || "465"),
    secure: true, // SSL on port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    debug: true, // Enable debug output
  });
  
  // Verify connection
  try {
    await transporter.verify();
    console.log("✅ SMTP connection verified");
  } catch (verifyError: any) {
    console.error("❌ SMTP connection failed:", verifyError.message);
    return NextResponse.json(
      { message: "Email service temporarily unavailable. Please call us directly." },
      { status: 500 },
    );
  }

  // Ensure from address is properly formatted
  const fromAddress = `"Healing Room" <${process.env.EMAIL_USER}>`;

  // Email to business (contact form submission)
  const businessMailOptions = {
    from: fromAddress,
    to: process.env.EMAIL_USER, // Send to business email
    replyTo: email, // Reply goes to customer
    subject: subject || `New Contact Form: ${type || 'General Inquiry'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #D4842A; border-bottom: 2px solid #D4842A; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          ${phone ? `<p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>` : ''}
          <p><strong>Inquiry Type:</strong> ${type || 'General'}</p>
        </div>
        
        <div style="background: #fff; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h3 style="color: #2D2D2D; margin-top: 0;">Message:</h3>
          <p style="color: #555; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        
        <p style="color: #888; font-size: 12px; margin-top: 20px;">
          Sent from Healing Room website contact form
        </p>
      </div>
    `,
  };

  // Auto-reply to customer
  const customerMailOptions = {
    from: fromAddress,
    to: email,
    subject: "Thanks for contacting Healing Room! 🌿",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px;">
          <h1 style="color: #D4842A; margin: 0;">Healing Room</h1>
          <p style="color: #666; margin: 5px 0;">Premium Cannabis & Tobacco</p>
        </div>
        
        <div style="padding: 20px;">
          <p>Hi ${name},</p>
          
          <p>Thank you for reaching out to us! We've received your message and will get back to you as soon as possible.</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #555;"><strong>Your message:</strong></p>
            <p style="color: #666; font-style: italic;">"${message}"</p>
          </div>
          
          <p>In the meantime, feel free to visit us at:</p>
          <p style="color: #2D2D2D;">
            <strong>7147 Indian Line Rd</strong><br>
            Norfolk County, ON N0E 1Z0<br>
            <a href="tel:+13653367919" style="color: #D4842A;">(365) 336-7919</a>
          </p>
          
          <p>We're open 7 days a week, 9 AM - 10 PM.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong style="color: #D4842A;">The Healing Room Team</strong>
          </p>
        </div>
        
        <div style="background: #2D2D2D; color: #fff; padding: 15px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Healing Room. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    console.log("📧 Attempting to send email...");
    console.log("From:", fromAddress);
    console.log("To (business):", process.env.EMAIL_USER);
    console.log("To (customer):", email);
    
    // Send email to business
    await transporter.sendMail(businessMailOptions);
    console.log("✅ Business email sent");
    
    // Send auto-reply to customer
    await transporter.sendMail(customerMailOptions);
    console.log("✅ Customer auto-reply sent");
    
    return NextResponse.json(
      { message: "Message sent successfully! We'll get back to you soon." },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("❌ Email error:", error.message);
    console.error("Error code:", error.code);
    console.error("Response:", error.response);
    return NextResponse.json(
      { message: "Failed to send message. Please try again or call us directly." },
      { status: 500 },
    );
  }
}
