"use client";

import { ProductImages } from "@/components/products/ProductImages";
import { ProductDocument, VariantsDocument } from "@/types/types";
import { Session } from "next-auth";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import AddToCart from "../cart/AddToCart";
import WishlistButton from "../cart/WishlistButton";
interface SingleProduct {
  product: string;
  session: Session | null;
  wishlistString: string;
  offersString: string;
}

export const SingleProduct = ({ product, session, wishlistString, offersString }: SingleProduct) => {
  const productPlainObject: ProductDocument = JSON.parse(product);
  
  // Find first in-stock variant, fallback to first variant if all sold out
  const initialVariant = productPlainObject.variants.find(
    v => v.inventory === undefined || v.inventory > 0
  ) || productPlainObject.variants[0];
  
  const [selectedVariant, setSelectedVariant] = useState<VariantsDocument>(initialVariant);

  if (!product) {
    return <div className="text-text-primary">Product not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Image - Sticky */}
        <div className="lg:col-span-1 lg:sticky lg:top-24 h-fit">
          <div className="bg-white border border-border-primary rounded-lg shadow-sm overflow-hidden">
            <ProductImages
              name={productPlainObject.name}
              selectedVariant={selectedVariant}
            />
          </div>
        </div>

        {/* Product Details */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-border-primary rounded-lg shadow-sm overflow-hidden p-5 space-y-3 flex flex-col">
          {/* Product Types/Categories */}
          {((productPlainObject as any).categories?.length > 0 || productPlainObject.category) && (
            <div className="flex flex-wrap gap-2">
              {((productPlainObject as any).categories || [productPlainObject.category?.replace(/-/g, ' ')]).map((cat: string, idx: number) => (
                <span 
                  key={idx}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium tracking-wide uppercase rounded-full bg-primary/10 text-primary"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
          
          {/* Product Name and Wishlist */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-text-primary flex-1">
              {productPlainObject.name}
            </h1>
            <div className="flex-shrink-0 p-2 hover:bg-bg-alt rounded-md transition-colors">
              <WishlistButton
                session={session}
                productId={JSON.stringify(productPlainObject._id || productPlainObject.id)}
                wishlistString={wishlistString}
              />
            </div>
          </div>
          
          {/* Price and Discount */}
          <div className="space-y-2">
            {(productPlainObject as any).originalPrice && (productPlainObject as any).originalPrice > productPlainObject.price ? (
              <>
                {/* Discount Badge */}
                {(productPlainObject as any).discountPercentage && (
                  <div className="inline-block bg-red-600 text-white text-sm font-bold px-3 py-1.5 rounded-md shadow-md">
                    {(productPlainObject as any).discountPercentage}% OFF SALE!
                  </div>
                )}
                
                {/* Offer Name */}
                {(productPlainObject as any).offerName && (
                  <div className="text-sm font-medium text-green-600">
                    🎉 {(productPlainObject as any).offerName}
                  </div>
                )}
                
                {/* Pricing */}
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-red-600">
                    ${(selectedVariant?.price || productPlainObject.price).toFixed(2)}
                  </span>
                  <span className="text-xl text-text-muted line-through">
                    ${((selectedVariant as any)?.originalPrice || (productPlainObject as any).originalPrice).toFixed(2)}
                  </span>
                  {productPlainObject.variants.length > 1 && (
                    <span className="text-sm text-text-muted">
                      ({selectedVariant?.color || selectedVariant?.name || 'Select option'})
                    </span>
                  )}
                </div>
                
                {/* Savings */}
                <div className="text-sm font-medium text-green-700">
                  You save: ${(((selectedVariant as any)?.originalPrice || (productPlainObject as any).originalPrice) - (selectedVariant?.price || productPlainObject.price)).toFixed(2)}
                </div>
              </>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">
                  ${(selectedVariant?.price || productPlainObject.price).toFixed(2)}
                </span>
                {productPlainObject.variants.length > 1 && (
                  <span className="text-sm text-text-muted">
                    ({selectedVariant?.color || selectedVariant?.name || 'Select option'})
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Description */}
          {productPlainObject.description && (
            <div 
              className="text-sm text-text-light leading-relaxed border-t border-border-primary pt-3 flex-1 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-text-primary [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-medium [&_h2]:text-text-light [&_h2]:mt-2 [&_h2]:mb-1 [&_strong]:text-text-primary [&_strong]:font-medium [&_p]:mb-2"
              dangerouslySetInnerHTML={{ __html: productPlainObject.description }}
            />
          )}

          {/* Add to Cart Section */}
          <div className="border-t border-border-primary mt-auto">
            <AddToCart
              session={session}
              product={productPlainObject}
              selectedVariant={selectedVariant}
              setSelectedVariant={setSelectedVariant}
              offersString={offersString}
            />
          </div>
          </div>

          {/* Accordions - Below Details */}
          <div className="bg-white border border-border-primary rounded-lg shadow-sm overflow-hidden mt-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-border-primary">
                <AccordionTrigger className="text-sm font-medium text-text-primary hover:text-primary px-5 py-3">
                  PRODUCT INFO
                </AccordionTrigger>
                <AccordionContent className="text-text-light px-5 pb-3">
                  <p>
                    All products are lab-tested for quality and potency. 
                    Certificate of Analysis (COA) available upon request.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm font-medium text-text-primary hover:text-primary px-5 py-3">
                  STORAGE
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-2 text-text-light px-5 pb-3">
                  <p>Store in a cool, dry place away from direct sunlight.</p>
                  <p>
                    Keep products in their original packaging to maintain freshness
                    and potency.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
};
