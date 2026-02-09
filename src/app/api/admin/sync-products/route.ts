import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { syncProductsToDatabase } from '@/libs/hikeup';

/**
 * Manual product sync endpoint for admins
 * POST /api/admin/sync-products
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is staff
    if (session.user.role !== 'staff') {
      return NextResponse.json(
        { error: 'Forbidden - Staff access required' },
        { status: 403 }
      );
    }
    
    console.log(`🔄 [ADMIN SYNC] Manual product sync triggered by ${session.user.email}`);
    
    // Trigger the same sync logic used by cron
    await syncProductsToDatabase();
    
    console.log('✅ [ADMIN SYNC] Manual product sync completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Product inventory synced successfully',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN SYNC] Manual product sync failed:', error);
    
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
