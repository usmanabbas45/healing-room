"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/auth";
import { Session } from "next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/libs/prisma";
import { getHikeupProduct, transformHikeupProduct, isHikeupConnected } from "@/libs/hikeup";

export type Wishlists = {
  userId: string;
  items: Array<{
    productId: string;
  }>;
};

export async function addItem(
  productId: string,
  productName?: string,
  category?: string,
  image?: string,
  price?: number
) {
  const session: Session | null = await getServerSession(authOptions);

  if (!session?.user._id) {
    console.error(`User Id not found.`);
    return { success: false, error: 'User not found' };
  }

  const userId = session.user._id;

  try {
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
            create: { 
              productId,
              productName: productName || '',
              category: category || '',
              image: image || null,
              price: price || 0,
          },
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
            productName: productName || '',
            category: category || '',
            image: image || null,
            price: price || 0,
          },
        });
      } else {
        return { success: true, message: 'Item already in wishlist' };
      }
    }

    revalidatePath("/wishlist");
    return { success: true };
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return { success: false, error: 'Failed to add item' };
  }
}

export async function getItems(userId: string) {
  if (!userId) {
    console.error(`User Id not found.`);
    return null;
  }

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      items: true,
    },
  });

  if (!wishlist || !wishlist.items.length) {
    return null;
  }

  // Check if Hikeup is connected to fetch fresh product data
  const connected = await isHikeupConnected();

  // Transform wishlist items to match EnrichedProducts interface
  const enrichedItems = await Promise.all(
    wishlist.items.map(async (item) => {
      // Try to get fresh product data from Hikeup
      if (connected) {
        const hikeupProduct = await getHikeupProduct(item.productId);
        if (hikeupProduct) {
          const transformed = transformHikeupProduct(hikeupProduct);
          return {
            _id: transformed.id,
            id: transformed.id,
            productId: transformed.id,
            name: transformed.name,
            description: transformed.description || '',
            price: transformed.price,
            category: transformed.category,
            sizes: transformed.sizes || ['Default'],
            image: transformed.images,
            variants: transformed.variants,
            purchased: false,
            color: transformed.variants[0]?.color || 'Default',
            size: transformed.sizes[0] || 'Default',
            quantity: 0,
            variantId: transformed.variants[0]?.priceId || item.productId,
            isAvailable: true,
          };
        } else {
          // Product no longer exists in Hikeup - mark as unavailable
          return {
            _id: item.productId,
            id: item.productId,
            productId: item.productId,
            name: item.productName || 'Product No Longer Available',
            description: '',
            price: item.price || 0,
            category: item.category || 'uncategorized',
            sizes: ['Default'],
            image: item.image ? [item.image] : ['/logo.png'],
            variants: [{
              priceId: item.productId,
              color: 'Default',
              images: item.image ? [item.image] : ['/logo.png'],
            }],
            purchased: false,
            color: 'Default',
            size: 'Default',
            quantity: 0,
            variantId: item.productId,
            isAvailable: false,
          };
        }
      }

      // Fallback to stored info if Hikeup unavailable (assume available but show cached data)
      return {
        _id: item.productId,
        id: item.productId,
        productId: item.productId,
        name: item.productName || 'Product',
        description: '',
        price: item.price || 0,
        category: item.category || 'uncategorized',
        sizes: ['Default'],
        image: item.image ? [item.image] : ['/logo.png'],
        variants: [{
          priceId: item.productId,
          color: 'Default',
          images: item.image ? [item.image] : ['/logo.png'],
        }],
        purchased: false,
        color: 'Default',
        size: 'Default',
        quantity: 0,
        variantId: item.productId,
        isAvailable: true, // Assume available if Hikeup is down
      };
    })
  );

  return enrichedItems;
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
    return { success: false, error: 'User not found' };
  }

  try {
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
    return { success: true };
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return { success: false, error: 'Failed to remove item' };
  }
}
