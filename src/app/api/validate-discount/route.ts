import { NextRequest, NextResponse } from 'next/server';
import { getProductDiscount } from '@/libs/hikeup';
import { applyPriceMarkup } from '@/libs/pricing';

/**
 * POST /api/validate-discount
 * Validates if a discount is still active for a product
 */
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();
    
    if (!productId) {
      return NextResponse.json(
        { isValid: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Check if product still has an active discount
    const discount = await getProductDiscount(Number(productId));
    
    if (!discount) {
      // No active discount found
      return NextResponse.json({
        isValid: false,
        currentPrice: null, // Will need to fetch actual product price
      });
    }
    
    // Discount is still active
    return NextResponse.json({
      isValid: true,
      discount: {
        discountPercentage: discount.discountPercentage,
        discountAmount: discount.discountAmount,
        offerName: discount.offerName,
        validUntil: discount.validUntil,
      },
    });
    
  } catch (error) {
    console.error('Error validating discount:', error);
    return NextResponse.json(
      { isValid: false, error: 'Failed to validate discount' },
      { status: 500 }
    );
  }
}

