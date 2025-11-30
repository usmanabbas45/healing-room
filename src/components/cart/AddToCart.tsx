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
        product.images?.[0] || product.image?.[0] || '/logo.png'
      );
      
      if (result.success) {
        toast.success("Added to cart!");
      } else {
        toast.error(result.error || "Failed to add to cart.");
      }
    });
  }, [session, selectedVariant, selectedSize, product, startTransition]);

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
            `Add To Cart - $${(selectedVariant?.price || product.price).toFixed(2)}`}
        </button>
      </div>
    </>
  );
}
