"use server";

import prisma from "@/libs/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/auth";
import { Session } from "next-auth";
import Stripe from "stripe";
import { emptyCart, getItems } from "@/app/(carts)/cart/action";

// Generate random order number
function generateOrderNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ORD-${result}`;
}

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
      name: order.shippingName,
      email: order.shippingEmail,
      phone: order.shippingPhone,
      address: {
        line1: order.shippingAddressLine1,
        line2: order.shippingAddressLine2,
        city: order.shippingCity,
        state: order.shippingState,
        postal_code: order.shippingPostalCode,
        country: order.shippingCountry,
      },
      products: enrichedProducts,
      orderId: order.stripeSessionId,
      purchaseDate: order.purchaseDate,
      expectedDeliveryDate: order.expectedDeliveryDate,
      total_price: order.totalPrice,
      status: order.status,
    };
  } catch (error) {
    console.error("Error getting order:", error);
    return null;
  }
};

export const saveOrder = async (data: Stripe.Checkout.Session) => {
  try {
    const userId = data.metadata?.userId;
    if (!userId || !data) {
      console.error("Missing information.");
      return null;
    }

    const cart = await getItems(userId);
    if (!cart || cart.length === 0) {
      console.error("Products or cart not found.");
      return null;
    }

    // Check if order already exists
    const existingOrder = await prisma.order.findFirst({
      where: { stripeSessionId: data.id },
    });

    if (existingOrder) {
      console.info("This order has already been saved.");
      return existingOrder;
    }

    // Create new order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        stripeSessionId: data.id,
        totalPrice: (data.amount_total || 0) / 100,
        status: "confirmed",
        shippingName: data.customer_details?.name || "",
        shippingEmail: data.customer_details?.email || "",
        shippingPhone: data.customer_details?.phone || null,
        shippingAddressLine1: data.customer_details?.address?.line1 || "",
        shippingAddressLine2: data.customer_details?.address?.line2 || null,
        shippingCity: data.customer_details?.address?.city || "",
        shippingState: data.customer_details?.address?.state || null,
        shippingPostalCode: data.customer_details?.address?.postal_code || "",
        shippingCountry: data.customer_details?.address?.country || "",
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        items: {
          create: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            color: item.color,
            image: item.image[0] || null,
            productName: item.name || '',
            category: item.category || '',
          })),
        },
      },
    });

    console.info("Order saved successfully:", order.orderNumber);
    await emptyCart(userId);

    return order;
  } catch (error) {
    console.error("Error saving the order:", error);
    return null;
  }
};
