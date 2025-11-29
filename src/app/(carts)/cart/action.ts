"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/auth";
import { Session } from "next-auth";
import prisma from "@/libs/prisma";
import { getHikeupProduct, transformHikeupProduct, isHikeupConnected } from "@/libs/hikeup";

export type CartType = {
  userId: string;
  items: Array<{
    productId: string;
    size: string;
    variantId: string;
    quantity: number;
    price: number;
  }>;
};

export type EnrichedCartItem = {
  id: string;
  productId: string;
  name: string;
  category: string;
  image: string[];
  price: number;
  color: string;
  size: string;
  quantity: number;
  variantId: string;
  purchased: boolean;
  _id: string;
};

export async function getItems(userId: string): Promise<EnrichedCartItem[] | undefined> {
  if (!userId) {
    console.error(`User Id not found.`);
    return undefined;
  }

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: true,
    },
  });

  if (!cart || !cart.items.length) {
    return undefined;
  }

  // Cart items now store product info directly
  const enrichedItems: EnrichedCartItem[] = cart.items.map((item) => ({
    id: item.id,
    _id: item.id,
    productId: item.productId,
    name: item.productName || 'Product',
    category: item.category || 'uncategorized',
    image: item.image ? [item.image] : ['/logo.png'],
    price: item.price,
    color: item.size, // Using size as color for Hikeup products
    size: item.size,
    quantity: item.quantity,
    variantId: item.variantId || "",
    purchased: false,
  }));

  return enrichedItems;
}

export async function getTotalItems(session: Session | null): Promise<number> {
  if (!session?.user._id) return 0;

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user._id },
    include: { items: true },
  });

  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
}

export async function addItem(
  category: string,
  productId: string,
  size: string,
  variantId: string,
  price: number,
  productName?: string,
  image?: string,
) {
  const session: Session | null = await getServerSession(authOptions);

  if (!session?.user._id) {
    console.error(`User Id not found.`);
    return;
  }

  const userId = session.user._id;

  // Get or create cart
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId,
        items: {
          create: {
            productId,
            variantId: variantId || null,
            size,
            quantity: 1,
            price,
            productName: productName || '',
            category: category || '',
            image: image || null,
          },
        },
      },
      include: { items: true },
    });
  } else {
    // Check if item already exists
    const existingItem = cart.items.find(
      (item) =>
        item.productId === productId &&
        item.variantId === variantId &&
        item.size === size
    );

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + 1 },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          size,
          quantity: 1,
          price,
          productName: productName || '',
          category: category || '',
          image: image || null,
        },
      });
    }
  }

  revalidatePath(`/${category}/${productId}`);
}

export async function delItem(
  productId: string,
  size: string,
  variantId: string,
) {
  const session: Session | null = await getServerSession(authOptions);
  const userId = session?.user._id;

  if (!userId) return;

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (cart) {
    const itemToDelete = cart.items.find(
      (item) =>
        item.productId === productId &&
        item.variantId === variantId &&
        item.size === size
    );

    if (itemToDelete) {
      await prisma.cartItem.delete({
        where: { id: itemToDelete.id },
      });
    }
  }

  revalidatePath("/cart");
}

export async function delOneItem(
  productId: string,
  size: string,
  variantId: string,
) {
  try {
    const session: Session | null = await getServerSession(authOptions);
    const userId = session?.user._id;

    if (!userId) return;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (cart) {
      const item = cart.items.find(
        (item) =>
          item.productId === productId &&
          item.variantId === variantId &&
          item.size === size
      );

      if (item) {
        if (item.quantity > 1) {
          await prisma.cartItem.update({
            where: { id: item.id },
            data: { quantity: item.quantity - 1 },
          });
        } else {
          await prisma.cartItem.delete({
            where: { id: item.id },
          });
        }
      }
    }

    revalidatePath("/cart");
  } catch (error) {
    console.error("Error in delOneItem:", error);
  }
}

export const emptyCart = async (userId: string) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
      console.log("Cart emptied successfully.");
    }

    revalidatePath("/cart");
  } catch (error) {
    console.error("Error emptying cart:", error);
  }
};
