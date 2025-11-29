"use client";

import { useCallback } from "react";
import { EnrichedProducts } from "@/types/types";
import { addItem, delOneItem } from "@/app/(carts)/cart/action";

const ProductCartInfo = ({ product }: { product: EnrichedProducts }) => {
  const {
    productId,
    size,
    variantId,
    category,
    price,
    quantity,
    purchased,
    color,
    name,
    image,
  } = product;

  const handleAddItem = useCallback(() => {
    addItem(category, productId, size, variantId, price, name, image?.[0]);
  }, [category, productId, size, variantId, price, name, image]);

  const handleDelItem = useCallback(() => {
    delOneItem(productId, size, variantId);
  }, [productId, size, variantId]);

  const quantityButtons = useCallback(() => {
    if (purchased) {
      return (
        <div className="text-sm text-primary font-medium">
          ${quantity ? (price * quantity).toFixed(2) : price}
        </div>
      );
    } else {
      return (
        <div className="flex bg-white w-min rounded-md overflow-hidden border border-border-primary">
          <button
            className="flex items-center justify-center w-8 h-8 p-2 text-text-muted transition-all hover:text-primary hover:bg-bg-alt"
            onClick={handleDelItem}
          >
            <svg
              data-test="geist-icon"
              height="14"
              strokeLinejoin="round"
              viewBox="0 0 16 16"
              width="14"
              style={{ color: "currentColor" }}
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M2 7.25H2.75H13.25H14V8.75H13.25H2.75H2V7.25Z"
                fill="currentColor"
              ></path>
            </svg>
          </button>
          <span className="flex items-center justify-center w-8 h-8 p-2 text-sm text-text-primary font-medium border-x border-border-primary bg-bg-alt">
            {quantity}
          </span>
          <button
            className="flex items-center justify-center w-8 h-8 p-2 text-text-muted transition-all hover:text-primary hover:bg-bg-alt"
            onClick={handleAddItem}
          >
            <svg
              data-test="geist-icon"
              height="14"
              strokeLinejoin="round"
              viewBox="0 0 16 16"
              width="14"
              style={{ color: "currentColor" }}
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M8.75 1.75V1H7.25V1.75V6.75H2.25H1.5V8.25H2.25H7.25V13.25V14H8.75V13.25V8.25H13.75H14.5V6.75H13.75H8.75V1.75Z"
                fill="currentColor"
              ></path>
            </svg>
          </button>
        </div>
      );
    }
  }, [purchased, quantity, price, handleAddItem, handleDelItem]);

  // Hide size/color display when both are "Default" (Hikeup products without variants)
  const showVariantInfo = size !== 'Default' || color !== 'Default';

  return (
    <>
      {showVariantInfo && (
        <div className="flex sm:hidden">
          <div className="text-sm pr-2.5 border-r">{size}</div>
          <div className="text-sm pl-2.5">{color}</div>
        </div>
      )}
      <div className="flex items-center justify-between sm:hidden">
        {quantityButtons()}
      </div>
      <div className="items-center justify-between hidden sm:flex">
        {quantityButtons()}
        {showVariantInfo && (
          <div className="flex">
            <div className="text-sm pr-2.5 border-r">{size}</div>
            <div className="text-sm pl-2.5">{color}</div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductCartInfo;
