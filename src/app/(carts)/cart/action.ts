"use server";

import { revalidatePath } from "next/cache";
import { Schema } from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/auth";
import { Session } from "next-auth";
import { Product } from "@/models/Products";
import Cart, { CartDocument } from "@/models/Cart";
import { EnrichedProducts, VariantsDocument } from "@/types/types";
import { connectDB } from "@/libs/mongodb";

export type CartType = {
  userId: string;
  items: Array<{
    productId: Schema.Types.ObjectId;
    size: string;
    variantId: string;
    quantity: number;
    price: number;
  }>;
};

async function getCart(userId: string): Promise<CartDocument | null> {
  await connectDB();
  return Cart.findOne({ userId });
}

async function saveCart(userId: string, items: CartType["items"]): Promise<void> {
  await connectDB();
  await Cart.findOneAndUpdate(
    { userId },
    { userId, items },
    { upsert: true, new: true }
  );
}

export async function getItems(userId: string) {
  await connectDB();

  if (!userId) {
    console.error(`User Id not found.`);
    return undefined;
  }

  const cart = await getCart(userId);

  if (!cart || !cart.items.length) {
    return undefined;
  }

  const updatedCart: EnrichedProducts[] = [];
  for (const cartItem of cart.items) {
    try {
      if (cartItem.productId && cartItem.variantId) {
        const matchingProduct = await Product.findById(cartItem.productId);

        if (!matchingProduct) {
          console.error(
            `Product not found for productId: ${cartItem.productId}`,
          );
          continue;
        } else {
          const matchingVariant = matchingProduct.variants.find(
            (variant: VariantsDocument) =>
              variant.priceId === cartItem.variantId,
          );
          const updatedCartItem: EnrichedProducts = {
            productId: cartItem.productId,
            size: cartItem.size,
            variantId: cartItem.variantId,
            quantity: cartItem.quantity,
            price: cartItem.price,
            color: matchingVariant.color,
            category: matchingProduct.category,
            image: [matchingVariant.images[0]],
            name: matchingProduct.name,
            purchased: false,
            _id: matchingProduct._id.toString(),
          };

          updatedCart.push(updatedCartItem);
        }
      }
    } catch (error) {
      console.error("Error getting product details:", error);
    }
  }

  const filteredCart = updatedCart.filter((item) => item !== null);

  return filteredCart;
}

export async function getTotalItems(session: Session | null) {
  if (!session?.user._id) return 0;
  
  await connectDB();
  const cart = await getCart(session.user._id);
  const total: number =
    cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return total;
}

export async function addItem(
  category: string,
  productId: Schema.Types.ObjectId,
  size: string,
  variantId: string,
  price: number,
) {
  const session: Session | null = await getServerSession(authOptions);

  if (!session?.user._id) {
    console.error(`User Id not found.`);
    return;
  }

  const userId = session.user._id;
  await connectDB();
  const cart = await getCart(userId);

  let items: CartType["items"] = [];

  if (!cart || !cart.items.length) {
    items = [
      {
        productId: productId,
        size: size,
        variantId: variantId,
        quantity: 1,
        price: price,
      },
    ];
  } else {
    let itemFound = false;

    items = cart.items.map((item) => {
      if (
        item.productId.toString() === productId.toString() &&
        item.variantId === variantId &&
        item.size === size
      ) {
        itemFound = true;
        return { ...item, quantity: item.quantity + 1 };
      }
      return item;
    }) as CartType["items"];

    if (!itemFound) {
      items.push({
        productId: productId,
        size: size,
        variantId: variantId,
        quantity: 1,
        price: price,
      });
    }
  }

  await saveCart(userId, items);
  revalidatePath(`/${category}/${productId}`);
}

export async function delItem(
  productId: Schema.Types.ObjectId,
  size: string,
  variantId: string,
) {
  const session: Session | null = await getServerSession(authOptions);
  const userId = session?.user._id;
  
  if (!userId) return;

  await connectDB();
  const cart = await getCart(userId);

  if (cart && cart.items.length) {
    const updatedItems = cart.items.filter(
      (item) =>
        !(
          item.productId.toString() === productId.toString() &&
          item.variantId === variantId &&
          item.size === size
        ),
    );

    await saveCart(userId, updatedItems);
    revalidatePath("/cart");
  }
}

export async function delOneItem(
  productId: Schema.Types.ObjectId,
  size: string,
  variantId: string,
) {
  try {
    const session: Session | null = await getServerSession(authOptions);
    const userId = session?.user._id;
    
    if (!userId) return;

    await connectDB();
    const cart = await getCart(userId);

    if (cart && cart.items.length) {
      const updatedItems = cart.items
        .map((item) => {
          if (
            item.productId.toString() === productId.toString() &&
            item.variantId === variantId &&
            item.size === size
          ) {
            if (item.quantity > 1) {
              return { ...item, quantity: item.quantity - 1 };
            } else {
              return null;
            }
          }
          return item;
        })
        .filter(Boolean) as CartType["items"];

      await saveCart(userId, updatedItems);
      revalidatePath("/cart");
    }
  } catch (error) {
    console.error("Error in delOneItem:", error);
  }
}

export const emptyCart = async (userId: string) => {
  try {
    await connectDB();
    await Cart.findOneAndUpdate(
      { userId },
      { items: [] },
      { upsert: true }
    );
    revalidatePath("/cart");
    console.log("Cart emptied successfully.");
  } catch (error) {
    console.error("Error emptying cart:", error);
  }
};
