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
    
    // Send confirmation email to customer
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
      
      // Send to customer
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: contactInfo.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });
      
      console.log(`📧 Confirmation email sent to ${contactInfo.email}`);
      
      // Send notification to all staff members
      const staffMembers = await prisma.user.findMany({
        where: { role: 'staff' },
        select: { email: true, name: true },
      });
      
      if (staffMembers.length > 0) {
        const staffEmails = staffMembers.map(staff => staff.email);
        
        // Staff notification email (simplified version)
        const staffSubject = `🔔 New Order: ${order.orderNumber}`;
        const staffHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e67e22;">New Order Received</h2>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p style="margin: 5px 0;"><strong>Customer:</strong> ${contactInfo.name} (${contactInfo.email})</p>
              <p style="margin: 5px 0;"><strong>Total:</strong> $${order.totalPrice.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Method:</strong> ${fulfillmentMethod === 'pickup' ? 'Store Pickup' : fulfillmentMethod === 'delivery' ? 'Local Delivery' : 'Shipping'}</p>
            </div>
            
            <h3>Order Items (${order.items.length}):</h3>
            <ul>
              ${order.items.map(item => `
                <li>${item.productName} (${item.size}) × ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>
              `).join('')}
            </ul>
            
            ${fulfillmentMethod === 'delivery' && deliveryAddress ? `
              <h3>Delivery Details:</h3>
              <p>${deliveryAddress.line1}${deliveryAddress.line2 ? ', ' + deliveryAddress.line2 : ''}<br/>
              ${deliveryAddress.city}, ${deliveryAddress.province} ${deliveryAddress.postalCode}</p>
              ${deliveryDate ? `<p><strong>Scheduled:</strong> ${new Date(deliveryDate).toLocaleDateString()}</p>` : ''}
              ${deliveryDistance ? `<p><strong>Distance:</strong> ${deliveryDistance.toFixed(1)} km</p>` : ''}
              ${deliveryInstructions ? `<p><strong>Instructions:</strong> ${deliveryInstructions}</p>` : ''}
            ` : ''}
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0;"><strong>⚠️ Payment Status:</strong> Awaiting e-Transfer confirmation</p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">Customer should send e-Transfer to: healingroom7147@proton.me</p>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              <a href="${process.env.NEXTAUTH_URL || 'https://healingroomsixnations.ca'}/admin/orders" style="color: #e67e22;">View in Admin Dashboard →</a>
            </p>
          </div>
        `;
        
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: staffEmails,
          subject: staffSubject,
          html: staffHtml,
        });
        
        console.log(`📧 Staff notification sent to ${staffMembers.length} staff member(s)`);
      }
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

