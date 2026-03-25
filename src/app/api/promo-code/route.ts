import { NextRequest, NextResponse } from 'next/server';

// ✅ Add more codes here anytime. Format: 'CODE': discountPercent
const PROMO_CODES: Record<string, number> = {
  healing15: 15, // 15% off
};

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { valid: false, message: 'Please enter a discount code' },
        { status: 400 }
      );
    }

    const discountPercent = PROMO_CODES[code.toLowerCase().trim()];

    if (!discountPercent) {
      return NextResponse.json(
        { valid: false, message: 'Invalid discount code. Please try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      discountPercent,
      message: `${discountPercent}% discount applied!`,
    });
  } catch {
    return NextResponse.json(
      { valid: false, message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
