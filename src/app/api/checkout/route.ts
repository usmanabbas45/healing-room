import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import prisma from "@/libs/prisma";
import { generateOrderNumber } from "@/libs/delivery-config";
import { rateLimit, rateLimitedResponse } from "@/libs/rate-limit";
import { generateOrderConfirmationEmail } from "@/libs/email-templates";
import { createHikeupInvoice } from "@/libs/hikeup-invoice";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  // Rate limit checkouts
  const { limited, resetIn, headers } = rateLimit(request, "checkout");
  if (limited) {
    return rateLimitedResponse(resetIn, headers);
  }

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Please sign in to checkout" }, { status: 401 });
    }
    
    const body = await request.json();
    const {
      fulfillmentMethod,
      contactInfo,
      deliveryAddress,
      deliveryDate,
      deliveryTimeSlot,
      deliveryInstructions,
      deliveryDistance,
      deliveryCoords,
      subtotal,
      deliveryFee,
      totalPrice,
    } = body;
    
    // Validate required fields
    if (!fulfillmentMethod || !contactInfo?.name || !contactInfo?.email) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }
    
    // Get user and their cart
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        cart: {
          include: {
            items: true,
          },
        },
      },
    });
    
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    
    if (!user.cart || user.cart.items.length === 0) {
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
    }
    
    // Validate cart total matches
    const calculatedSubtotal = user.cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    
    if (Math.abs(calculatedSubtotal - subtotal) > 0.01) {
      return NextResponse.json(
        { message: "Cart total mismatch. Please refresh and try again." },
        { status: 400 }
      );
    }
    
    // Generate unique order number
    const orderNumber = generateOrderNumber();
    
    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        
        // Pricing
        subtotal: calculatedSubtotal,
        deliveryFee: deliveryFee || 0,
        totalPrice: totalPrice || calculatedSubtotal + (deliveryFee || 0),
        
        // Status
        status: "awaiting_payment",
        paymentMethod: "etransfer",
        paymentStatus: "pending",
        
        // Fulfillment
        fulfillmentMethod,
        
        // Contact info
        customerName: contactInfo.name,
        customerEmail: contactInfo.email,
        customerPhone: contactInfo.phone || null,
        
        // Delivery address (if applicable)
        deliveryAddressLine1: deliveryAddress?.line1 || null,
        deliveryAddressLine2: deliveryAddress?.line2 || null,
        deliveryCity: deliveryAddress?.city || null,
        deliveryProvince: deliveryAddress?.province || null,
        deliveryPostalCode: deliveryAddress?.postalCode || null,
        deliveryCountry: deliveryAddress ? "Canada" : null,
        
        // Delivery scheduling
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        deliveryTimeSlot: deliveryTimeSlot || null,
        deliveryInstructions: deliveryInstructions || null,
        deliveryDistance: deliveryDistance || null,
        
        // Create order items from cart
        items: {
          create: user.cart.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            category: item.category,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
          })),
        },
      },
      include: {
        items: true,
      },
    });
    
    // Clear the user's cart
    await prisma.cartItem.deleteMany({
      where: { cartId: user.cart.id },
    });
    
    console.log(`✅ Order created: ${orderNumber} for ${session.user.email}`);
    
    // Create invoice in Hikeup POS (non-blocking)
    try {
      const hikeupResult = await createHikeupInvoice({
        orderNumber: order.orderNumber,
        customerName: contactInfo.name,
        customerEmail: contactInfo.email,
        customerPhone: contactInfo.phone || undefined,
        items: order.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.totalPrice,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        transactionDate: order.createdAt,
        notes: `Online order - ${fulfillmentMethod}${deliveryInstructions ? ` - ${deliveryInstructions}` : ''}`,
      });

      if (hikeupResult.success) {
        console.log(`📄 Hikeup invoice created: ID ${hikeupResult.hikeupInvoiceId}`);
        // Optionally store the Hikeup invoice ID in the order notes
        await prisma.order.update({
          where: { id: order.id },
          data: {
            notes: `Hikeup Invoice ID: ${hikeupResult.hikeupInvoiceId}`,
          },
        });
      } else {
        console.warn(`⚠️ Failed to create Hikeup invoice: ${hikeupResult.error}`);
      }
    } catch (hikeupError) {
      // Don't fail the order if Hikeup invoice creation fails
      console.error("Failed to create Hikeup invoice:", hikeupError);
    }
    
    // Send confirmation email
    try {
      const emailData = generateOrderConfirmationEmail({
        orderNumber: order.orderNumber,
        customerName: contactInfo.name,
        customerEmail: contactInfo.email,
        fulfillmentMethod,
        deliveryAddress: deliveryAddress ? {
          line1: deliveryAddress.line1,
          line2: deliveryAddress.line2,
          city: deliveryAddress.city,
          province: deliveryAddress.province,
          postalCode: deliveryAddress.postalCode,
        } : undefined,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        deliveryTimeSlot,
        deliveryDistance: deliveryDistance || undefined,
        items: order.items.map(item => ({
          productName: item.productName,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        totalPrice: order.totalPrice,
      });
      
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || "465"),
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: contactInfo.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });
      
      console.log(`📧 Confirmation email sent to ${contactInfo.email}`);
    } catch (emailError) {
      // Don't fail the order if email fails
      console.error("Failed to send confirmation email:", emailError);
    }
    
    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      message: "Order created successfully",
    });
    
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ message: "Failed to create order" }, { status: 500 });
  }
}

