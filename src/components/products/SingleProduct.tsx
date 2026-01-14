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
interface SingleProduct {
  product: string;
  session: Session | null;
}

export const SingleProduct = ({ product, session }: SingleProduct) => {
  const productPlainObject: ProductDocument = JSON.parse(product);
  const [selectedVariant, setSelectedVariant] = useState<VariantsDocument>(
    productPlainObject.variants[0]
  );

  console.log('📦 SingleProduct rendering:', {
    productName: productPlainObject.name,
    variantsCount: productPlainObject.variants?.length || 0,
    selectedVariantName: selectedVariant?.name || selectedVariant?.color,
    selectedVariantImages: selectedVariant?.images?.length || 0,
    selectedVariantImagesData: selectedVariant?.images,
  });

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
          
          {/* Product Name */}
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">
            {productPlainObject.name}
          </h1>
          
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
