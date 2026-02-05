"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/auth";
import { Session } from "next-auth";
import prisma from "@/libs/prisma";
import { getHikeupProduct, transformHikeupProduct, isHikeupConnected, getHikeupOffers, type HikeupOffer } from "@/libs/hikeup";

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
  originalPrice?: number;
  discountPercentage?: number;
  discountAmount?: number;
  offerName?: string;
  dealExpired?: boolean; // NEW: Flag if deal is no longer active
  color: string;
  size: string;
  quantity: number;
  variantId: string;
  purchased: boolean;
  _id: string;
};

// Helper: Check if discount is still active
// Now async to fetch full product data for type/brand matching
async function checkDiscountStillActive(productId: string, offers: HikeupOffer[]): Promise<{
  discountPercentage: number;
  discountAmount: number;
  offerName: string;
} | null> {
  // Fetch full product data to check types and brands
  let product: any = null;
  try {
    product = await getHikeupProduct(productId);
  } catch (error) {
    console.error(`Error fetching product ${productId} for discount check:`, error);
    return null;
  }
  
  if (!product) return null;
  
  const numProductId = Number(productId);
  const productTypeIds = (product.product_type || []).map((pt: any) => Number(pt.type_id || pt.id));
  const brandId = product.brand_id ? Number(product.brand_id) : null;
  
  for (const offer of offers) {
    // 1. Check specific product ID match
    if (offer.applicableProducts && offer.applicableProducts.some(p => p.id === numProductId)) {
      return {
        discountPercentage: offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
        discountAmount: !offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
        offerName: offer.name,
      };
    }
    
    // 2. Check product type match
    if (offer.applicableProductTypeIds && offer.applicableProductTypeIds.length > 0) {
      const hasMatchingType = productTypeIds.some((typeId: number) => 
        offer.applicableProductTypeIds!.includes(typeId)
      );
      if (hasMatchingType) {
        return {
          discountPercentage: offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
          discountAmount: !offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
          offerName: offer.name,
        };
      }
    }
    
    // 3. Check brand match
    if (brandId && offer.applicableBrandIds && offer.applicableBrandIds.length > 0) {
      if (offer.applicableBrandIds.includes(brandId)) {
        return {
          discountPercentage: offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
          discountAmount: !offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
          offerName: offer.name,
        };
      }
    }
    
    // 4. Check store-wide offer
    if ((!offer.applicableProducts || offer.applicableProducts.length === 0) &&
        (!offer.applicableProductTypeIds || offer.applicableProductTypeIds.length === 0) &&
        (!offer.applicableBrandIds || offer.applicableBrandIds.length === 0)) {
      return {
        discountPercentage: offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
        discountAmount: !offer.isPercentage ? (offer.offerValue || offer.offerAmount) : 0,
        offerName: offer.name,
      };
    }
  }
  
  return null;
}

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

  // Fetch active offers to re-validate discounts
  let activeOffers: HikeupOffer[] = [];
  try {
    if (await isHikeupConnected()) {
      activeOffers = await getHikeupOffers();
      console.log(`🛒 Cart: Validating ${cart.items.length} items against ${activeOffers.length} active offers`);
    }
  } catch (error) {
    console.error('Error fetching offers for cart validation:', error);
  }

  // Re-validate each cart item's discount
  const enrichedItems: EnrichedCartItem[] = await Promise.all(cart.items.map(async (item) => {
    let finalPrice = item.price;
    let originalPrice = (item as any).originalPrice || undefined;
    let discountPercentage = (item as any).discountPercentage || undefined;
    let discountAmount = (item as any).discountAmount || undefined;
    let offerName = (item as any).offerName || undefined;
    let dealExpired = false;

    // If item had a discount, check if it's still valid
    if (originalPrice && (discountPercentage || discountAmount)) {
      const currentDiscount = await checkDiscountStillActive(item.productId, activeOffers);
      
      if (currentDiscount && currentDiscount.offerName === offerName) {
        // Deal is still active with same offer
        console.log(`✅ Cart item "${item.productName}": Deal "${offerName}" still active`);
      } else {
        // Deal expired or changed - revert to original price
        console.log(`⚠️ Cart item "${item.productName}": Deal "${offerName}" EXPIRED - reverting to regular price`);
        finalPrice = originalPrice;
        dealExpired = true;
        
        // Update database to reflect expired deal
        try {
          await prisma.cartItem.update({
            where: { id: item.id },
            data: {
              price: originalPrice,
              originalPrice: null,
              discountPercentage: null,
              discountAmount: null,
              offerName: null,
            },
          });
          console.log(`📝 Updated cart item in database: removed expired discount`);
        } catch (error) {
          console.error('Error updating cart item:', error);
        }
        
        // Clear discount info for return
        originalPrice = undefined;
        discountPercentage = undefined;
        discountAmount = undefined;
        offerName = undefined;
      }
    }

    return {
      id: item.id,
      _id: item.id,
      productId: item.productId,
      name: item.productName || 'Product',
      category: item.category || 'uncategorized',
      image: item.image ? [item.image] : ['/logo.png'],
      price: finalPrice,
      originalPrice,
      discountPercentage,
      discountAmount,
      offerName,
      dealExpired,
      color: item.size,
      size: item.size,
      quantity: item.quantity,
      variantId: item.variantId || "",
      purchased: false,
    };
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

export type AddItemResult = {
  success: boolean;
  error?: string;
};

export async function addItem(
  category: string,
  productId: string,
  size: string,
  variantId: string,
  price: number,
  productName?: string,
  image?: string,
  originalPrice?: number,
  discountPercentage?: number,
  discountAmount?: number,
  offerName?: string,
  quantity: number = 1,
): Promise<AddItemResult> {
  const session: Session | null = await getServerSession(authOptions);

  if (!session?.user._id) {
    console.error(`User Id not found.`);
    return { success: false, error: "You must be logged in to add items to cart." };
  }

  const userId = session.user._id;

  // ===== SERVER-SIDE INVENTORY CHECK =====
  if (await isHikeupConnected()) {
    try {
      const hikeupProduct = await getHikeupProduct(productId);
      if (hikeupProduct) {
        const transformed = transformHikeupProduct(hikeupProduct);
        // Find the specific variant
        const variant = transformed.variants.find(
          (v: any) => String(v.priceId) === String(variantId)
        );
        
        if (variant) {
          // Check current cart quantity for this item
          const existingCart = await prisma.cart.findUnique({
            where: { userId },
            include: { items: true },
          });
          
          const existingItem = existingCart?.items.find(
            (item) =>
              item.productId === productId &&
              item.variantId === variantId &&
              item.size === size
          );
          
          const currentCartQty = existingItem?.quantity || 0;
          const requestedQty = currentCartQty + quantity;
          
          if (variant.inventory <= 0) {
            return { success: false, error: "This item is out of stock." };
          }
          
          if (requestedQty > variant.inventory) {
            return { 
              success: false, 
              error: `Only ${variant.inventory} available. You have ${currentCartQty} in your cart.` 
            };
          }
        }
      }
    } catch (error) {
      console.error("Error checking inventory:", error);
      // Continue anyway if inventory check fails - don't block the purchase
    }
  }

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
            quantity: quantity,
            price,
            productName: productName || '',
            category: category || '',
            image: image || null,
            originalPrice: originalPrice || null,
            discountPercentage: discountPercentage || null,
            discountAmount: discountAmount || null,
            offerName: offerName || null,
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
        data: { 
          quantity: existingItem.quantity + quantity,
          // Update price and discount info in case they changed
          price,
          originalPrice: originalPrice || null,
          discountPercentage: discountPercentage || null,
          discountAmount: discountAmount || null,
          offerName: offerName || null,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          size,
          quantity: quantity,
          price,
          productName: productName || '',
          category: category || '',
          image: image || null,
          originalPrice: originalPrice || null,
          discountPercentage: discountPercentage || null,
          discountAmount: discountAmount || null,
          offerName: offerName || null,
        },
      });
    }
  }

  revalidatePath(`/${category}/${productId}`);
  return { success: true };
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

// ===== PLACE ORDER =====
export type PlaceOrderResult = {
  success: boolean;
  orderId?: string;
  error?: string;
  errors?: string[];
};

// Generate order number like "HR-ABC123"
function generateOrderNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `HR-${result}`;
}

export async function placeOrder(
  cartItems: { productId: string; variantId: string; size: string; quantity: number; price: number; }[]
): Promise<PlaceOrderResult> {
  const session: Session | null = await getServerSession(authOptions);

  if (!session?.user._id) {
    return { success: false, error: "You must be logged in to place an order." };
  }

  const userId = session.user._id;

  // ===== VALIDATE INVENTORY FOR ALL ITEMS =====
  const inventoryErrors: string[] = [];
  
  if (await isHikeupConnected()) {
    for (const item of cartItems) {
      try {
        const hikeupProduct = await getHikeupProduct(item.productId);
        if (!hikeupProduct) {
          inventoryErrors.push(`Product "${item.productId}" is no longer available.`);
          continue;
        }

        const transformed = transformHikeupProduct(hikeupProduct);
        const variant = transformed.variants.find(
          (v: any) => String(v.priceId) === String(item.variantId)
        );

        if (variant) {
          if (variant.inventory <= 0) {
            inventoryErrors.push(`"${transformed.name}" (${variant.color || variant.name}) is out of stock.`);
          } else if (item.quantity > variant.inventory) {
            inventoryErrors.push(
              `Only ${variant.inventory} of "${transformed.name}" (${variant.color || variant.name}) available.`
            );
          }
        } else if (transformed.inventory <= 0) {
          inventoryErrors.push(`"${transformed.name}" is out of stock.`);
        } else if (item.quantity > transformed.inventory) {
          inventoryErrors.push(`Only ${transformed.inventory} of "${transformed.name}" available.`);
        }
      } catch (error) {
        console.error(`Error validating inventory for ${item.productId}:`, error);
      }
    }
  }

  if (inventoryErrors.length > 0) {
    return { success: false, errors: inventoryErrors };
  }

  // ===== CREATE ORDER =====
  try {
    // Get cart items with full details
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      return { success: false, error: "Your cart is empty." };
    }

    // Calculate total
    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Get user info for the order
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        subtotal: total,
        deliveryFee: 0,
        totalPrice: total,
        status: "awaiting_payment",
        paymentMethod: "etransfer",
        paymentStatus: "pending",
        fulfillmentMethod: "pickup",
        customerName: user?.name || "Customer",
        customerEmail: user?.email || "unknown@email.com",
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || "",
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            productName: item.productName || "",
            category: item.category || "",
            image: item.image || null,
          })),
        },
      },
    });

    // Clear cart
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    revalidatePath("/cart");
    revalidatePath("/orders");

    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("Error creating order:", error);
    return { success: false, error: "Failed to create order. Please try again." };
  }
}
