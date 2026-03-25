'use client';

import { useState } from 'react';
import { Session } from 'next-auth';
import { EnrichedProducts } from '@/types/types';
import DiscountCodeBox from '@/components/cart/DiscountCodeBox';
import dynamic from 'next/dynamic';

const ButtonCheckout = dynamic(
  () => import('./ButtonCheckout'),
  {
    ssr: false,
    loading: () => (
      <p className="flex items-center justify-center w-full h-full text-sm">
        Continue
      </p>
    ),
  },
);

interface Props {
  subtotal: number;
  totalItems: number;
  session: Session;
  cartWithProducts: EnrichedProducts[];
}

export default function OrderSummaryWithDiscount({
  subtotal,
  totalItems,
  session,
  cartWithProducts,
}: Props) {
  const [discountPercent, setDiscountPercent] = useState(0);

  const discountAmount = subtotal * (discountPercent / 100);
  const finalTotal = subtotal - discountAmount;

  return (
    <>
      {/* Line items */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
          <span className="text-text-primary font-medium">${subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Delivery</span>
          <span className="text-text-muted italic text-xs">Calculated at checkout</span>
        </div>

        {/* Discount line — only shows when code applied */}
        {discountPercent > 0 && (
          <div className="flex justify-between text-sm font-medium text-green-700">
            <span>Discount ({discountPercent}% off)</span>
            <span>-${discountAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="border-t border-border-primary pt-3">
          <div className="flex justify-between items-center">
            <span className="text-text-primary font-semibold">
              {discountPercent > 0 ? 'Total' : 'Subtotal'}
            </span>
            <span className="text-xl font-bold text-primary">
              ${finalTotal.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Final total will be calculated at checkout
          </p>
        </div>
      </div>

      {/* Discount code box — sits right above checkout button */}
      <DiscountCodeBox
        subtotal={subtotal}
        onDiscountApplied={(percent) => setDiscountPercent(percent)}
        onDiscountRemoved={() => setDiscountPercent(0)}
      />

      {/* Checkout button */}
      <div className="mt-4">
        <ButtonCheckout session={session} cartWithProducts={cartWithProducts} />
      </div>
    </>
  );
}
