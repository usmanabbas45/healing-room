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

  if (!product) {
    return <div className="text-text-primary">Product not found</div>;
  }

  return (
    <div className="flex flex-wrap justify-between gap-8">
      <div className="grow-999 basis-0">
        <ProductImages
          name={productPlainObject.name}
          selectedVariant={selectedVariant}
        />
      </div>

      <div className="sticky flex flex-col items-center justify-center w-full h-full gap-5 grow basis-600 top-8">
        <div className="w-full border border-solid rounded-lg border-border-primary bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col justify-between gap-3 p-5 border-b border-solid border-border-primary">
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
            <h1 className="text-lg font-semibold text-text-primary">
              {productPlainObject.name}
            </h1>
            <span className="text-xl font-bold text-primary">
              ${(selectedVariant?.price || productPlainObject.price).toFixed(2)}
              {productPlainObject.variants.length > 1 && (
                <span className="text-sm font-normal text-text-muted ml-2">
                  ({selectedVariant?.color || selectedVariant?.name || 'Select option'})
                </span>
              )}
            </span>
            {productPlainObject.description && (
              <div 
                className="text-sm text-text-light leading-relaxed [&_h1]:text-base [&_h1]:font-medium [&_h1]:text-text-primary [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-normal [&_h2]:text-text-light [&_h2]:mt-2 [&_h2]:mb-1 [&_strong]:text-text-primary [&_strong]:font-medium [&_p]:mb-2"
                dangerouslySetInnerHTML={{ __html: productPlainObject.description }}
              />
            )}
          </div>

          <AddToCart
            session={session}
            product={productPlainObject}
            selectedVariant={selectedVariant}
            setSelectedVariant={setSelectedVariant}
          />
        </div>

        <Accordion type="single" collapsible className="w-full bg-white border border-border-primary rounded-lg overflow-hidden">
          <AccordionItem value="item-1" className="border-border-primary">
            <AccordionTrigger className="text-sm text-text-primary hover:text-primary px-5">
              PRODUCT INFO
            </AccordionTrigger>
            <AccordionContent className="text-text-light px-5">
              <p>
                All products are lab-tested for quality and potency. 
                Certificate of Analysis (COA) available upon request.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2" className="border-border-primary">
            <AccordionTrigger className="text-sm text-text-primary hover:text-primary px-5">
              STORAGE
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2 text-text-light px-5">
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
  );
};
