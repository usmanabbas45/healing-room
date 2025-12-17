import { NextRequest, NextResponse } from "next/server";
import prisma from "@/libs/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { updateHikeupCustomer, isHikeupConnected } from "@/libs/hikeup";
import { rateLimit, rateLimitedResponse } from "@/libs/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?._id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user._id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        province: true,
        postalCode: true,
        country: true,
        hikeupCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
    
  } catch (error: any) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { message: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Rate limit
  const { limited, resetIn, headers } = rateLimit(request, "default");
  if (limited) {
    return rateLimitedResponse(resetIn, headers);
  }

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?._id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { name, phone, addressLine1, addressLine2, city, province, postalCode, country } = data;

    // Validate name
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { message: "Name is required" },
        { status: 400 }
      );
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user._id },
    });

    if (!currentUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Parse name into first/last
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

    // Check if Hikeup is connected and user has a Hikeup ID
    const hikeupConnected = await isHikeupConnected();
    let hikeupUpdateSuccess = true;
    let hikeupError: string | null = null;

    console.log(`🔍 Profile update - Hikeup sync check:`, {
      hikeupConnected,
      hasHikeupCustomerId: !!currentUser.hikeupCustomerId,
      hikeupCustomerId: currentUser.hikeupCustomerId,
      userEmail: currentUser.email,
    });

    if (hikeupConnected && currentUser.hikeupCustomerId) {
      try {
        console.log(`📤 Attempting to update Hikeup customer: ${currentUser.hikeupCustomerId}`);
        
        // Build update data - only include address if provided
        const updateData: any = {
          firstName,
          lastName,
          phone: phone || undefined,
        };
        
        // Only include address if user actually provided address fields
        if (addressLine1 || city || postalCode) {
          updateData.address = {
            line1: addressLine1 || undefined,
            line2: addressLine2 || undefined,
            city: city || undefined,
            province: province || undefined,
            postalCode: postalCode || undefined,
            country: country || 'Canada',
          };
        }
        
        // Update Hikeup customer
        await updateHikeupCustomer(
          currentUser.hikeupCustomerId,
          currentUser.email,
          updateData
        );
        console.log(`✅ Hikeup customer updated for user: ${currentUser.email}`);
      } catch (error: any) {
        console.error('❌ Hikeup customer update failed:', error);
        hikeupUpdateSuccess = false;
        hikeupError = error.message || 'Failed to sync with POS';
        // Don't throw - we'll still update local DB but warn the user
      }
    } else {
      if (!hikeupConnected) {
        console.log(`⚠️ Skipping Hikeup update - Not connected`);
      } else if (!currentUser.hikeupCustomerId) {
        console.log(`⚠️ User has no hikeupCustomerId - attempting to create/link customer in Hikeup`);
        try {
          // Try to create or find the customer in Hikeup
          const { ensureHikeupCustomer } = await import('@/libs/hikeup');
          const result = await ensureHikeupCustomer(currentUser.email, name.trim());
          
          if (result.customer?.id) {
            // Save the Hikeup customer ID to our database
            await prisma.user.update({
              where: { id: currentUser.id },
              data: { hikeupCustomerId: result.customer.id.toString() },
            });
            console.log(`✅ Linked user to Hikeup customer ID: ${result.customer.id}`);
            
            // Now try to update with the new info
            await updateHikeupCustomer(
              result.customer.id.toString(),
              currentUser.email,
              {
                firstName,
                lastName,
                phone: phone || undefined,
                address: {
                  line1: addressLine1 || undefined,
                  line2: addressLine2 || undefined,
                  city: city || undefined,
                  province: province || undefined,
                  postalCode: postalCode || undefined,
                  country: country || 'Canada',
                },
              }
            );
            console.log(`✅ Hikeup customer created and updated`);
          }
        } catch (error: any) {
          console.error('❌ Failed to create/link Hikeup customer:', error);
          // Don't fail the whole update, just log it
        }
      }
    }

    // Update local database
    const updatedUser = await prisma.user.update({
      where: { id: session.user._id },
      data: {
        name: name.trim(),
        phone: phone || null,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        city: city || null,
        province: province || null,
        postalCode: postalCode || null,
        country: country || 'Canada',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        province: true,
        postalCode: true,
        country: true,
      },
    });

    console.log(`✅ Profile updated for user: ${currentUser.email}`);

    return NextResponse.json({
      message: hikeupUpdateSuccess 
        ? "Profile updated successfully" 
        : "Profile saved locally, but POS sync failed",
      user: updatedUser,
      hikeupSynced: hikeupUpdateSuccess,
      hikeupError,
    });

  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { message: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}

