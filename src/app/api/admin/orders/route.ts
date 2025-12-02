import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import prisma from "@/libs/prisma";

// PATCH /api/admin/orders - Update order status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user is staff
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user || user.role !== "staff") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    
    const body = await request.json();
    const { orderId, status, paymentStatus, paymentReference, paidAt, staffNotes } = body;
    
    if (!orderId) {
      return NextResponse.json({ message: "Order ID required" }, { status: 400 });
    }
    
    // Build update data
    const updateData: any = {};
    
    if (status) {
      updateData.status = status;
    }
    
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }
    
    if (paymentReference !== undefined) {
      updateData.paymentReference = paymentReference;
    }
    
    if (paidAt) {
      updateData.paidAt = new Date(paidAt);
    }
    
    if (staffNotes !== undefined) {
      updateData.staffNotes = staffNotes;
    }
    
    // Update the order
    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });
    
    console.log(`📝 Order ${order.orderNumber} updated by ${session.user.email}:`, updateData);
    
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
      },
    });
    
  } catch (error) {
    console.error("Admin order update error:", error);
    return NextResponse.json({ message: "Failed to update order" }, { status: 500 });
  }
}

// GET /api/admin/orders - Get all orders (with filters)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user is staff
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user || user.role !== "staff") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    
    const orders = await prisma.order.findMany({
      where: status ? { status } : undefined,
      include: {
        items: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    
    return NextResponse.json({ orders });
    
  } catch (error) {
    console.error("Admin orders fetch error:", error);
    return NextResponse.json({ message: "Failed to fetch orders" }, { status: 500 });
  }
}

