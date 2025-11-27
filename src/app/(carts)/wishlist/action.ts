"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/auth";
import { Session } from "next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/libs/prisma";

export type Wishlists = {
  userId: string;
  items: Array<{
    productId: string;
  }>;
};

export async function addItem(productId: string) {
  const session: Session | null = await getServerSession(authOptions);

  if (!session?.user._id) {
    console.error(`User Id not found.`);
    return;
  }

  const userId = session.user._id;

  // Get or create wishlist
  let wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!wishlist) {
    await prisma.wishlist.create({
      data: {
        userId,
        items: {
          create: { productId },
        },
      },
    });
  } else {
    // Check if item already exists
    const exists = wishlist.items.some((item) => item.productId === productId);

    if (!exists) {
      await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
        },
      });
    }
  }

  revalidatePath("/wishlist");
}

export async function getItems(userId: string) {
  if (!userId) {
    console.error(`User Id not found.`);
    return null;
  }

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              variants: true,
            },
          },
        },
      },
    },
  });

  if (!wishlist || !wishlist.items.length) {
    return null;
  }

  // Transform to match EnrichedProducts interface
  return wishlist.items.map((item) => ({
    _id: item.product.id,
    id: item.product.id,
    productId: item.product.id,
    name: item.product.name,
    description: item.product.description,
    price: item.product.price,
    category: item.product.category,
    sizes: item.product.sizes,
    image: item.product.images,
    variants: item.product.variants.map((v) => ({
      priceId: v.priceId,
      color: v.color,
      images: v.images,
    })),
    // These are required by EnrichedProducts but not applicable for wishlist
    purchased: false,
    color: item.product.variants[0]?.color || "",
    size: item.product.sizes[0] || "",
    quantity: 0,
    variantId: item.product.variants[0]?.priceId || "",
  }));
}

export async function getTotalWishlist() {
  const session: Session | null = await getServerSession(authOptions);

  if (!session?.user._id) {
    return undefined;
  }

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.user._id },
    include: { items: true },
  });

  if (!wishlist) {
    return undefined;
  }

  return {
    userId: wishlist.userId,
    items: wishlist.items.map((item) => ({ productId: item.productId })),
  };
}

export async function delItem(productId: string) {
  const session: Session | null = await getServerSession(authOptions);
  const userId = session?.user._id;

  if (!userId) {
    console.error("User not found.");
    return;
  }

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (wishlist) {
    const itemToDelete = wishlist.items.find(
      (item) => item.productId === productId
    );

    if (itemToDelete) {
      await prisma.wishlistItem.delete({
        where: { id: itemToDelete.id },
      });
    }
  }

  revalidatePath("/wishlist");
}
