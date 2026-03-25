'use client';

import { useState } from 'react';

interface Props {
  subtotal: number;
  onDiscountApplied: (percent: number, code: string) => void;
  onDiscountRemoved: () => void;
}

export default function DiscountCodeBox({ subtotal, onDiscountApplied, onDiscountRemoved }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  const [appliedCode, setAppliedCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/promo-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.valid) {
        setApplied(true);
        setAppliedCode(code.toUpperCase());
        setDiscountPercent(data.discountPercent);
        onDiscountApplied(data.discountPercent, code);
      } else {
        setError(data.message || 'Invalid discount code');
      }
    } catch {
      setLoading(false);
      setError('Something went wrong. Please try again.');
    }
  };

  const handleRemove = () => {
    setApplied(false);
    setCode('');
    setAppliedCode('');
    setDiscountPercent(0);
    setError('');
    onDiscountRemoved();
  };

  const discountAmount = subtotal * (discountPercent / 100);

  return (
    <div className="mt-4 pt-4 border-t border-border-primary">
      <p className="text-sm font-medium text-text-primary mb-2">Discount Code</p>

      {!applied ? (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              placeholder="Enter discount code"
              className="flex-1 border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            <button
              onClick={handleApply}
              disabled={loading || !code.trim()}
              className="flex items-center justify-center bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all whitespace-nowrap min-w-[72px] h-[40px]"
            >
              {loading ? '...' : 'Apply'}
            </button>
          </div>
          {error && (
            <p className="text-red-500 text-xs mt-1.5">✕ {error}</p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-green-800">
              ✓ <span className="font-bold">{appliedCode}</span> applied
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              {discountPercent}% off — you save ${discountAmount.toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleRemove}
            className="text-xs text-text-muted hover:text-red-500 font-medium ml-3 transition-colors underline"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
