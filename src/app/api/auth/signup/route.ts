import prisma from "@/libs/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getHikeupCustomerByEmail, createHikeupCustomer, isHikeupConnected } from "@/libs/hikeup";
import { rateLimit, rateLimitedResponse } from "@/libs/rate-limit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

export async function POST(request: NextRequest) {
  // Rate limit: 3 signups per hour per IP
  const { limited, resetIn, headers } = rateLimit(request, "signup");
  if (limited) {
    return rateLimitedResponse(resetIn, headers);
  }

  try {
    const { name, email, password } = await request.json();

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    // Check if user already exists in our database
    const userFound = await prisma.user.findUnique({
      where: { email },
    });

    if (userFound) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 409 },
      );
    }

    // Hash password before any external calls
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if Hikeup is connected
    const hikeupConnected = await isHikeupConnected();
    
    let hikeupCustomerCreated = false;
    let hikeupCustomerId: number | null = null;

    if (hikeupConnected) {
      console.log(`📋 Checking Hikeup for existing customer: ${email}`);
      
      // Check if customer already exists on Hikeup
      const existingHikeupCustomer = await getHikeupCustomerByEmail(email);
      
      if (existingHikeupCustomer) {
        // Customer exists on Hikeup - just use their ID, don't create
        console.log(`✅ Customer already exists on Hikeup (ID: ${existingHikeupCustomer.id})`);
        hikeupCustomerId = existingHikeupCustomer.id;
      } else {
        // Customer doesn't exist on Hikeup - create them
        console.log(`📝 Creating new customer on Hikeup: ${name} (${email})`);
        
        // Parse name into first/last
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Customer';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
        
        const newHikeupCustomer = await createHikeupCustomer(email, firstName, lastName);
        
        if (!newHikeupCustomer) {
          // Hikeup customer creation failed - roll back (don't create local user)
          console.error('❌ Failed to create customer on Hikeup - rolling back signup');
          return NextResponse.json(
            { message: "Failed to sync with POS system. Please try again." },
            { status: 500 },
          );
        }
        
        hikeupCustomerId = newHikeupCustomer.id;
        hikeupCustomerCreated = true;
        console.log(`✅ Created Hikeup customer: ID ${newHikeupCustomer.id}`);
      }
    } else {
      console.log('⚠️ Hikeup not connected - skipping POS sync');
    }

    // Create user in our database (with optional Hikeup customer ID)
    const savedUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        // Store Hikeup customer ID if available (for future order syncing)
        hikeupCustomerId: hikeupCustomerId ? String(hikeupCustomerId) : null,
      },
    });

    console.log(`✅ User created: ${savedUser.email}${hikeupCustomerCreated ? ' (+ Hikeup customer)' : hikeupCustomerId ? ' (linked to existing Hikeup customer)' : ''}`);

    return NextResponse.json(
      {
        name: savedUser.name,
        email: savedUser.email,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error during signup:", error);
    return NextResponse.json(
      { message: error.message || "Signup failed" },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    // SECURITY: Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?._id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { userId, name, email, password } = await request.json();

    // SECURITY: Users can only update their own account
    if (userId !== session.user._id) {
      return NextResponse.json(
        { message: "Forbidden: Can only update your own account" },
        { status: 403 },
      );
    }

    if (password && password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToUpdate) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // SECURITY: Only allow updating specific fields (prevent role escalation)
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }
    // CRITICAL: Role cannot be updated through this endpoint

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    console.log(`👤 User ${updatedUser.email} updated their profile`);

    return NextResponse.json(
      {
        message: "User updated successfully",
        updatedUser: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error during user update:", error);
    return NextResponse.json(
      { message: error.message || "Update failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // SECURITY: Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?._id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { userId } = await request.json();

    // SECURITY: Users can only delete their own account (unless staff)
    if (userId !== session.user._id && session.user.role !== "staff") {
      return NextResponse.json(
        { message: "Forbidden: Can only delete your own account" },
        { status: 403 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    console.log(`🗑️ User ${user.email} deleted by ${session.user.email}`);

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error during user deletion:", error);
    return NextResponse.error();
  }
}
