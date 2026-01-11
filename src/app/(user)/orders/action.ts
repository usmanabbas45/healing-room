"use server";

import prisma from "@/libs/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/auth";
import { Session } from "next-auth";

export const getUserOrders = async () => {
  try {
    const session: Session | null = await getServerSession(authOptions);
    const userId = session?.user._id;

    if (!userId) return null;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: { purchaseDate: "desc" },
    });

    // Transform orders to include item count and total
    return orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      purchaseDate: order.purchaseDate,
      totalPrice: order.totalPrice,
      status: order.status,
      fulfillmentMethod: order.fulfillmentMethod,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      deliveryAddressLine1: order.deliveryAddressLine1,
      deliveryCity: order.deliveryCity,
      deliveryProvince: order.deliveryProvince,
      trackingNumber: order.trackingNumber,
      shippedAt: order.shippedAt,
      items: order.items,
    }));
  } catch (error) {
    console.error("Error getting orders:", error);
    return null;
  }
};

export const getOrder = async (orderId: string) => {
  try {
    const session: Session | null = await getServerSession(authOptions);
    const userId = session?.user._id;

    if (!userId) return null;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      console.log("Order not found");
      return null;
    }

    const enrichedProducts = order.items.map((item) => ({
      productId: item.productId,
      name: item.productName || 'Product',
      category: item.category || 'uncategorized',
      image: item.image ? [item.image] : ['/logo.png'],
      price: item.price,
      purchased: true,
      color: item.color || "",
      size: item.size,
      quantity: item.quantity,
    }));

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
      fulfillmentMethod: order.fulfillmentMethod,
      address: {
        line1: order.deliveryAddressLine1,
        line2: order.deliveryAddressLine2,
        city: order.deliveryCity,
        state: order.deliveryProvince,
        postal_code: order.deliveryPostalCode,
        country: order.deliveryCountry,
      },
      products: enrichedProducts,
      purchaseDate: order.purchaseDate,
      deliveryDate: order.deliveryDate,
      deliveryTimeSlot: order.deliveryTimeSlot,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total_price: order.totalPrice,
      status: order.status,
      paymentStatus: order.paymentStatus,
      trackingNumber: order.trackingNumber,
      shippedAt: order.shippedAt,
    };
  } catch (error) {
    console.error("Error getting order:", error);
    return null;
  }
};

// Update order status (for admin use)
export const updateOrderStatus = async (orderId: string, status: string) => {
  try {
    const session: Session | null = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'staff') {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false, error: "Failed to update order" };
  }
};
