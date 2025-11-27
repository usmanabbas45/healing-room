import { NextRequest, NextResponse } from 'next/server';
import { createHikeupClient } from '@/libs/hikeup';

/**
 * API Route to sync products from Hikeup POS to PostgreSQL
 * 
 * Usage:
 * POST /api/hikeup/sync
 */
export async function POST(request: NextRequest) {
  try {
    const hikeupClient = createHikeupClient();
    await hikeupClient.syncProductsToDatabase();

    return NextResponse.json(
      { message: 'Products synced successfully from Hikeup' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error syncing products from Hikeup:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync products' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to test Hikeup connection
 */
export async function GET(request: NextRequest) {
  try {
    const hikeupClient = createHikeupClient();
    const products = await hikeupClient.getProducts();

    return NextResponse.json(
      { 
        message: 'Hikeup connection successful',
        productCount: products.length 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error connecting to Hikeup:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect to Hikeup' },
      { status: 500 }
    );
  }
}
