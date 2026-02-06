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
  offersString?: string;
}

export default function AddToCart({
  product,
  session,
  selectedVariant,
  setSelectedVariant,
  offersString,
}: AddToCartProps) {
  // Auto-select first size if only one option AND at least one variant is in stock
  const [selectedSize, setSelectedSize] = useState<string>(() => {
    if (product.sizes?.length === 1) {
      // Check if any variant is in stock
      const hasInStockVariant = product.variants?.some(
        v => v.inventory === undefined || v.inventory > 0
      );
      return hasInStockVariant ? product.sizes[0] : "";
    }
    return "";
  });
  const [quantity, setQuantity] = useState<number>(1);
  const [isPending, startTransition] = useTransition();
  
  // Parse offers
  const offers = offersString ? JSON.parse(offersString) : [];
  
  // Calculate price with quantity-based discount
  const calculatePriceWithDiscount = useCallback((qty: number, basePrice: number) => {
    console.log(`\n🧮 [AddToCart] Calculating price for quantity ${qty} at $${basePrice.toFixed(2)}`);
    console.log(`   Product ID: ${product._id || product.id}`);
    console.log(`   Offers available: ${offers.length}`);
    
    // Check for quantity-based offers for this product
    for (const offer of offers) {
      console.log(`\n   🎁 Checking offer: "${offer.name}"`);
      console.log(`      minimumQuantity: ${offer.minimumQuantity ?? 'N/A'}`);
      console.log(`      buyX: ${offer.buyX ?? 'N/A'}, getX: ${offer.getX ?? 'N/A'}`);
      
      // Determine the quantity threshold
      const quantityThreshold = offer.minimumQuantity || offer.buyX;
      
      // Skip true BOGO deals (buyX + getX = free items)
      if (offer.buyX && offer.getX) {
        console.log(`      ⏭️  Skipping: BOGO deal (Buy ${offer.buyX} Get ${offer.getX} free - not supported in preview)`);
        continue;
      }
      
      // Skip simple deals without quantity requirement
      if (!quantityThreshold || quantityThreshold <= 1) {
        console.log(`      ⏭️  Skipping: Not a quantity deal (threshold: ${quantityThreshold})`);
        continue;
      }
      
      console.log(`      ✅ Quantity-based deal detected (threshold: ${quantityThreshold})`);
      
      // Check if this offer applies to this product
      const productId = Number(product._id || product.id);
      const productTypeIds = ((product as any).product_type || []).map((pt: any) => Number(pt.type_id || pt.id));
      const brandId = (product as any).brand_id ? Number((product as any).brand_id) : null;
      
      console.log(`      Product info: ID=${productId}, typeIds=[${productTypeIds.join(',')}], brandId=${brandId}`);
      console.log(`      Offer applies to: products=[${offer.applicableProducts?.map((p: any) => p.id).join(',') || 'none'}], typeIds=[${offer.applicableProductTypeIds?.join(',') || 'none'}], brandIds=[${offer.applicableBrandIds?.join(',') || 'none'}]`);
      
      let applies = false;
      
      // Check specific product
      if (offer.applicableProducts && offer.applicableProducts.some((p: any) => p.id === productId)) {
        console.log(`      ✅ Matches: Specific product`);
        applies = true;
      }
      
      // Check product type
      if (!applies && offer.applicableProductTypeIds && offer.applicableProductTypeIds.length > 0) {
        const matches = productTypeIds.some((typeId: number) => offer.applicableProductTypeIds.includes(typeId));
        if (matches) {
          console.log(`      ✅ Matches: Product type`);
          applies = true;
        }
      }
      
      // Check brand
      if (!applies && brandId && offer.applicableBrandIds && offer.applicableBrandIds.length > 0) {
        const matches = offer.applicableBrandIds.includes(brandId);
        if (matches) {
          console.log(`      ✅ Matches: Brand`);
          applies = true;
        }
      }
      
      if (applies) {
        console.log(`      🎯 Offer applies to this product!`);
        console.log(`      Quantity check: ${qty} >= ${quantityThreshold}? ${qty >= quantityThreshold}`);
        
        if (qty >= quantityThreshold) {
          // Apply discount
          let discountedPrice = basePrice;
          if (offer.isPercentage) {
            discountedPrice = basePrice * (1 - (offer.offerValue || offer.offerAmount) / 100);
          } else {
            discountedPrice = Math.max(0, basePrice - (offer.offerValue || offer.offerAmount));
          }
          
          console.log(`      💰 Discount applied: $${basePrice.toFixed(2)} → $${discountedPrice.toFixed(2)}`);
          
          return {
            price: discountedPrice,
            totalPrice: discountedPrice * qty,
            originalPrice: basePrice,
            totalOriginalPrice: basePrice * qty,
            offerName: offer.name,
            savingsPerItem: basePrice - discountedPrice,
          };
        } else {
          console.log(`      ❌ Quantity threshold not met (need ${quantityThreshold})`);
        }
      } else {
        console.log(`      ❌ Offer does not apply to this product`);
      }
    }
    
    console.log(`   ℹ️  No applicable quantity discount for this quantity/product`);
    
    // No discount applies
    return {
      price: basePrice,
      totalPrice: basePrice * qty,
      originalPrice: null,
      totalOriginalPrice: null,
      offerName: null,
      savingsPerItem: 0,
    };
  }, [offers, product]);
  
  // Auto-set size when variant is selected (but don't override parent's selection)
  useEffect(() => {
    if (selectedVariant && !selectedSize) {
      setSelectedSize(selectedVariant.color || selectedVariant.name || 'Default');
    }
  }, [selectedVariant, selectedSize]);

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
              {product.variants.map((variant, index) => {
                const isOutOfStock = variant.inventory !== undefined && variant.inventory <= 0;
                const isSelected = selectedVariant?.priceId === variant.priceId;
                
                return (
                  <button
                    key={index}
                    disabled={isOutOfStock}
                    className={`flex flex-col items-center justify-center border border-solid px-4 py-2 rounded-lg transition duration-150 ease min-w-[80px] relative ${
                      isOutOfStock
                        ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-60"
                        : isSelected
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-text-primary border-border-primary hover:border-primary"
                    }`}
                    onClick={() => {
                      if (!isOutOfStock) {
                        setSelectedVariant(variant);
                        setSelectedSize(variant.color || variant.name || 'Default');
                      }
                    }}
                  >
                    {isOutOfStock && (
                      <span className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-red-500 bg-white px-1 rounded">SOLD OUT</span>
                      </span>
                    )}
                    <span className={`text-sm font-medium ${isOutOfStock ? 'opacity-50' : ''}`}>
                      {variant.color || variant.name}
                    </span>
                    <span className={`text-xs ${
                      isOutOfStock ? 'opacity-50' : 
                      isSelected ? 'text-white/80' : 'text-text-muted'
                    }`}>
                      ${variant.price?.toFixed(2)}
                    </span>
                  </button>
                );
              })}
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
        {(() => {
          const basePrice = selectedVariant?.price || product.price;
          const priceInfo = calculatePriceWithDiscount(quantity, basePrice);
          
          return (
            <>
              {/* Show savings banner if applicable */}
              {priceInfo.offerName && priceInfo.savingsPerItem > 0 && (
                <div className="bg-green-50 border-b border-green-200 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 font-medium">
                      🎉 {priceInfo.offerName}
                    </span>
                    <span className="text-green-600 font-semibold">
                      Save ${(priceInfo.savingsPerItem * quantity).toFixed(2)}!
                    </span>
                  </div>
                </div>
              )}
              
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
                {isPending ? (
                  <Loader height={20} width={20} />
                ) : (selectedVariant?.inventory ?? 1) <= 0 ? (
                  "Out of Stock"
                ) : priceInfo.originalPrice ? (
                  <div className="flex items-center justify-center gap-2">
                    <span>Add {quantity} to Cart -</span>
                    <span className="font-bold">${priceInfo.totalPrice.toFixed(2)}</span>
                    <span className="line-through text-white/70 text-xs">
                      ${priceInfo.totalOriginalPrice?.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  `Add ${quantity} to Cart - $${priceInfo.totalPrice.toFixed(2)}`
                )}
              </button>
            </>
          );
        })()}
      </div>
    </>
  );
}
