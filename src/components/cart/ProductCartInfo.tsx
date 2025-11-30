"use client";

import { useCallback } from "react";
import { EnrichedProducts } from "@/types/types";
import { addItem, delOneItem } from "@/app/(carts)/cart/action";
import { toast } from "sonner";

const ProductCartInfo = ({ product }: { product: EnrichedProducts }) => {
  const {
    productId,
    size,
    variantId,
    category,
    price,
    quantity,
    purchased,
    name,
    image,
  } = product;

  const handleAddItem = useCallback(async () => {
    const result = await addItem(category, productId, size, variantId, price, name, image?.[0]);
    if (!result.success) {
      toast.error(result.error || "Failed to add item.");
    }
  }, [category, productId, size, variantId, price, name, image]);

  const handleDelItem = useCallback(() => {
    delOneItem(productId, size, variantId);
  }, [productId, size, variantId]);

  // For purchased items (order history), just show quantity
  if (purchased) {
    return (
      <div className="text-sm text-text-muted">
        Qty: {quantity}
      </div>
    );
  }

  // Quantity controls for cart
  return (
    <div className="flex bg-white rounded-lg overflow-hidden border border-border-primary">
      <button
        className="flex items-center justify-center w-8 h-8 text-text-muted transition-all hover:text-primary hover:bg-bg-alt"
        onClick={handleDelItem}
        aria-label="Decrease quantity"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 7.25H14V8.75H2V7.25Z" />
        </svg>
      </button>
      <span className="flex items-center justify-center w-10 h-8 text-sm text-text-primary font-medium border-x border-border-primary bg-bg-alt">
        {quantity}
      </span>
      <button
        className="flex items-center justify-center w-8 h-8 text-text-muted transition-all hover:text-primary hover:bg-bg-alt"
        onClick={handleAddItem}
        aria-label="Increase quantity"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.75 1.75V6.75H13.75V8.25H8.75V13.25H7.25V8.25H2.25V6.75H7.25V1.75H8.75Z" />
        </svg>
      </button>
    </div>
  );
};

export default ProductCartInfo;
