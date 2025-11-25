"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/auth";
import { Session } from "next-auth";
import { Schema } from "mongoose";
import { revalidatePath } from "next/cache";
import { Product } from "@/models/Products";
import Wishlist, { WishlistDocument } from "@/models/Wishlist";
import { connectDB } from "@/libs/mongodb";

export type Wishlists = {
  userId: string;
  items: Array<{
    productId: Schema.Types.ObjectId;
  }>;
};

async function getWishlist(userId: string): Promise<WishlistDocument | null> {
  await connectDB();
  return Wishlist.findOne({ userId });
}

async function saveWishlist(userId: string, items: Wishlists["items"]): Promise<void> {
  await connectDB();
  await Wishlist.findOneAndUpdate(
    { userId },
    { userId, items },
    { upsert: true, new: true }
  );
}

export async function addItem(productId: Schema.Types.ObjectId) {
  const session: Session | null = await getServerSession(authOptions);

  if (!session?.user._id) {
    console.error(`User Id not found.`);
    return;
  }

  const userId = session.user._id;
  await connectDB();
  const wishlist = await getWishlist(userId);

  let items: Wishlists["items"] = [];

  if (!wishlist || !wishlist.items.length) {
    items = [{ productId }];
  } else {
    const itemExists = wishlist.items.some(
      (item) => item.productId.toString() === productId.toString()
    );

    if (!itemExists) {
      items = [...wishlist.items.map(item => ({ productId: item.productId })), { productId }];
    } else {
      items = wishlist.items.map(item => ({ productId: item.productId }));
    }
  }

  await saveWishlist(userId, items);
  revalidatePath("/wishlist");
}

export async function getItems(userId: string) {
  await connectDB();

  if (!userId) {
    console.error(`User Id not found.`);
    return null;
  }

  const wishlist = await getWishlist(userId);

  if (!wishlist || !wishlist.items.length) {
    return null;
  }

  const updatedWishlist = [];
  for (const wishlistItem of wishlist.items) {
    try {
      if (wishlistItem.productId) {
        const matchingProduct = await Product.findById(wishlistItem.productId);

        if (!matchingProduct) {
          console.error(
            `Product not found for productId: ${wishlistItem.productId}`,
          );
          continue;
        } else {
          updatedWishlist.push(matchingProduct);
        }
      }
    } catch (error) {
      console.error("Error getting product details:", error);
    }
  }

  const filteredWishlist = updatedWishlist.filter((item) => item !== null);

  return filteredWishlist;
}

export async function getTotalWishlist() {
  const session: Session | null = await getServerSession(authOptions);
  
  if (!session?.user._id) {
    return undefined;
  }

  await connectDB();
  const wishlist = await getWishlist(session.user._id);

  if (!wishlist) {
    return undefined;
  }

  return {
    userId: wishlist.userId,
    items: wishlist.items.map(item => ({ productId: item.productId }))
  };
}

export async function delItem(productId: Schema.Types.ObjectId) {
  const session: Session | null = await getServerSession(authOptions);
  const userId = session?.user._id;

  if (!userId) {
    console.error("User not found.");
    return;
  }

  await connectDB();
  const wishlist = await getWishlist(userId);

  if (wishlist && wishlist.items.length) {
    const updatedItems = wishlist.items.filter(
      (item) => item.productId.toString() !== productId.toString()
    );

    await saveWishlist(userId, updatedItems);
    revalidatePath("/wishlist");
  }
}
