"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { ProductDocument, VariantsDocument } from "@/types/types";
import { addItem } from "@/app/(carts)/cart/action";
import { Loader } from "../common/Loader";
import { Session } from "next-auth";
import { toast } from "sonner";

interface AddToCartProps {
  product: ProductDocument;
  session: Session | null;
  selectedVariant: VariantsDocument | undefined;
  setSelectedVariant: (variant: VariantsDocument) => void;
}

export default function AddToCart({
  product,
  session,
  selectedVariant,
  setSelectedVariant,
}: AddToCartProps) {
  // Auto-select first size if only one option (e.g., "Default")
  const [selectedSize, setSelectedSize] = useState<string>(() => 
    product.sizes?.length === 1 ? product.sizes[0] : ""
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [isPending, startTransition] = useTransition();
  
  // Auto-select first variant if only one option
  useEffect(() => {
    if (!selectedVariant && product.variants?.length === 1) {
      setSelectedVariant(product.variants[0]);
    }
  }, [product.variants, selectedVariant, setSelectedVariant]);

  const handleAddToCart = useCallback(async () => {
    if (!session) {
      toast.info(
        "You must be registered to be able to add a product to the cart."
      );
      return;
    }
    if (!selectedVariant?.priceId) {
      toast.info("You have to select an option to add the product.");
      return;
    }
    if (!selectedSize) {
      toast.info("You have to select an option to add the product.");
      return;
    }
    
    // Client-side inventory check
    if (selectedVariant.inventory !== undefined && selectedVariant.inventory <= 0) {
      toast.error("This item is out of stock.");
      return;
    }
    
    startTransition(async () => {
      const result = await addItem(
        product.category,
        product._id || product.id,
        selectedSize,
        selectedVariant.priceId,
        selectedVariant.price || product.price,
        product.name,
        product.images?.[0] || product.image?.[0] || '/logo.png',
        (product as any).originalPrice,
        (product as any).discountPercentage,
        (product as any).discountAmount,
        (product as any).offerName,
        quantity
      );
      
      if (result.success) {
        toast.success(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart!`);
        setQuantity(1); // Reset quantity after adding
      } else {
        toast.error(result.error || "Failed to add to cart.");
      }
    });
  }, [session, selectedVariant, selectedSize, product, quantity, startTransition]);

  // Check if we have multiple variants with different options
  const hasMultipleVariants = product.variants.length > 1;
  const hasOnlyDefaultVariant = product.variants.length === 1 && 
    (product.variants[0].color === 'Default' || product.variants[0].name === 'Default');

  return (
    <>
      <div className="p-5">
        {/* Show variant options if there are multiple or non-default variants */}
        {hasMultipleVariants && (
          <div className="mb-4">
            <p className="text-sm text-text-muted mb-2">Select Option:</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant, index) => (
                <button
                  key={index}
                  className={`flex flex-col items-center justify-center border border-solid px-4 py-2 rounded-lg transition duration-150 ease min-w-[80px] ${
                    selectedVariant?.priceId === variant.priceId
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-text-primary border-border-primary hover:border-primary"
                  }`}
                  onClick={() => {
                    setSelectedVariant(variant);
                    setSelectedSize(variant.color || variant.name || 'Default');
                  }}
                >
                  <span className="text-sm font-medium">{variant.color || variant.name}</span>
                  <span className={`text-xs ${selectedVariant?.priceId === variant.priceId ? 'text-white/80' : 'text-text-muted'}`}>
                    ${variant.price?.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Show inventory status */}
        {selectedVariant && selectedVariant.inventory !== undefined && (
          <div className="text-sm text-text-muted">
            {selectedVariant.inventory > 0 ? (
              <span className="text-green-600">✓ In Stock ({selectedVariant.inventory} available)</span>
            ) : (
              <span className="text-red-500">Out of Stock</span>
            )}
          </div>
        )}
        
        {/* Quantity Selector */}
        {selectedVariant && (selectedVariant.inventory ?? 1) > 0 && (
          <div className="flex items-center gap-3 pt-3">
            <label className="text-sm font-medium text-text-primary">Quantity:</label>
            <div className="flex items-center border border-border-primary rounded-md">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="px-3 py-2 text-text-primary hover:bg-bg-alt disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Decrease quantity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <input
                type="number"
                min="1"
                max={selectedVariant.inventory || 99}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  const maxQty = selectedVariant.inventory || 99;
                  setQuantity(Math.min(Math.max(1, val), maxQty));
                }}
                className="w-16 text-center py-2 border-x border-border-primary text-sm font-medium text-text-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity(Math.min((selectedVariant.inventory || 99), quantity + 1))}
                disabled={quantity >= (selectedVariant.inventory || 99)}
                className="px-3 py-2 text-text-primary hover:bg-bg-alt disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase quantity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-solid border-border-primary">
        <button
          type="submit"
          onClick={handleAddToCart}
          disabled={(selectedVariant?.inventory ?? 1) <= 0}
          className={`w-full p-3 transition duration-150 text-sm font-medium ease ${
            (selectedVariant?.inventory ?? 1) <= 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-primary text-white hover:bg-primary-dark"
          }`}
        >
          {isPending ? <Loader height={20} width={20} /> : 
            (selectedVariant?.inventory ?? 1) <= 0 ? "Out of Stock" : 
            `Add ${quantity} to Cart - $${((selectedVariant?.price || product.price) * quantity).toFixed(2)}`}
        </button>
      </div>
    </>
  );
}
