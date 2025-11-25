import { NextResponse, NextRequest } from "next/server";
const nodemailer = require("nodemailer");

export async function POST(request: NextRequest) {
  const { name, email, message, subject } = await request.json();

  if (!name || !email || !message || !subject) {
    return NextResponse.json(
      { message: "We need more information to send an email!" },
      { status: 400 },
    );
  }

  // Proton Mail SMTP Configuration (requires paid plan + custom domain)
  const transporter = nodemailer.createTransport({
    host: "smtp.protonmail.ch",
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.PROTON_EMAIL_ADDRESS, // Your custom domain email (e.g., orders@healingroom.com)
      pass: process.env.PROTON_SMTP_TOKEN,    // SMTP token from Proton settings
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: true,
    },
  });

  const mailOptions = {
    from: `"Healing Room" <${process.env.PROTON_EMAIL_ADDRESS}>`,
    to: email,
    replyTo: process.env.PROTON_EMAIL_ADDRESS,
    subject: subject,
    html: ` 
            <p>Hello ${name}!</p>
            <p>${message}</p>
            `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return NextResponse.json(
      { message: "Email sent successfully!" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { message: "COULT NOT SEND THE MESSAGE" },
      { status: 500 },
    );
  }
}
