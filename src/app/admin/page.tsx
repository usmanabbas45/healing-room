import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isHikeupConnected, getTokenStatus } from "@/libs/hikeup";
import { getAllProducts } from "@/app/actions";
import prisma from "@/libs/prisma";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Check if user is staff - show 404 if not
  if (session.user.role !== "staff") {
    notFound();
  }

  const success = searchParams.success;
  const error = searchParams.error;
  const connected = await isHikeupConnected();
  const tokenStatus = await getTokenStatus();
  
  // Get product count
  let productCount = 0;
  try {
    const { totalCount } = await getAllProducts(1, 1);
    productCount = totalCount;
  } catch (e) {
    console.error('Error fetching products:', e);
  }
  
  // Get order counts
  const orderCounts = await prisma.order.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  
  const pendingPayments = orderCounts.find(c => c.status === "awaiting_payment")?._count.id || 0;
  const processingOrders = orderCounts.find(c => c.status === "processing")?._count.id || 0;
  const paidOrders = orderCounts.find(c => c.status === "paid")?._count.id || 0;
  const totalOrders = orderCounts.reduce((sum, c) => sum + c._count.id, 0);

  return (
    <section className="pt-12 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-8">Admin Dashboard</h1>

      {/* Status Messages */}
      {success === "hikeup_connected" && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
          ✅ Hikeup POS connected successfully! Token saved to database. Products will now load from your POS.
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          ❌ Error: {error.replace(/_/g, " ")}
          {error === 'ssl_error' && (
            <p className="mt-2 text-sm">
              This is an SSL compatibility issue with Hikeup&apos;s server. 
              Try running the server with: <code className="bg-red-100 px-1">NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev</code>
            </p>
          )}
        </div>
      )}

      {/* Connection Status */}
      <div className={`border rounded-lg p-4 mb-6 ${connected ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
          <span className={connected ? 'text-green-800' : 'text-yellow-800'}>
            {connected ? '🟢 Hikeup POS Connected - Token stored in database' : '🟡 Hikeup POS Not Connected'}
          </span>
        </div>
      </div>

      {/* Hikeup Integration Card */}
      <div className="bg-white border border-border-primary rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          🔗 Hikeup POS Integration
        </h2>
        <p className="text-text-light mb-4">
          {connected 
            ? 'Your Hikeup POS is connected. Products and inventory are fetched in real-time. Token is stored in database and persists across restarts.'
            : 'Connect your Hikeup POS to display products and inventory from your store.'}
        </p>
        
        <div className="flex flex-wrap gap-4">
          {!connected ? (
            <Link
              href="/api/hikeup/connect"
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
            >
              Connect Hikeup POS
            </Link>
          ) : (
            <>
              <Link
                href="/shop"
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
              >
                View Store →
              </Link>
              <Link
                href="/api/hikeup/connect"
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                🔄 Reconnect (Get Fresh Token)
              </Link>
            </>
          )}
        </div>
        
        {/* Detailed Token Info */}
        {tokenStatus.connected && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <p className="text-text-muted">
              <strong>Token Expires:</strong> {tokenStatus.expiresAt?.toLocaleString() || 'Unknown'}
            </p>
            <p className="text-text-muted">
              <strong>Status:</strong>{' '}
              {tokenStatus.isExpired ? (
                <span className="text-red-500">⚠️ Expired - Will attempt refresh on next request</span>
              ) : (
                <span className="text-green-600">✅ Valid</span>
              )}
            </p>
            <p className="text-text-muted">
              <strong>Auto-Refresh:</strong>{' '}
              {tokenStatus.hasRefreshToken ? (
                <span className="text-green-600">✅ Enabled (has refresh token)</span>
              ) : (
                <span className="text-yellow-600">⚠️ Disabled (no refresh token - reconnect for persistent access)</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Orders Card - Prominent */}
      {(pendingPayments > 0 || paidOrders > 0) && (
        <div className="bg-gradient-to-r from-primary/10 to-orange-100 border border-primary/30 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-1">
                📦 Orders Require Attention
              </h2>
              <p className="text-text-muted">
                {pendingPayments > 0 && <span className="text-yellow-600 font-medium">{pendingPayments} awaiting payment</span>}
                {pendingPayments > 0 && paidOrders > 0 && " • "}
                {paidOrders > 0 && <span className="text-blue-600 font-medium">{paidOrders} paid & ready to process</span>}
              </p>
            </div>
            <Link
              href="/admin/orders?status=awaiting_payment"
              className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              Manage Orders →
            </Link>
          </div>
        </div>
      )}
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Link href="/admin/orders" className="bg-white border border-border-primary rounded-lg p-6 hover:border-primary transition-colors">
          <h3 className="text-sm text-text-light mb-1">Total Orders</h3>
          <p className="text-2xl font-bold text-text-primary">{totalOrders}</p>
        </Link>
        <Link href="/admin/orders?status=awaiting_payment" className="bg-white border border-border-primary rounded-lg p-6 hover:border-primary transition-colors">
          <h3 className="text-sm text-text-light mb-1">Awaiting Payment</h3>
          <p className="text-2xl font-bold text-yellow-600">{pendingPayments}</p>
        </Link>
        <Link href="/admin/orders?status=processing" className="bg-white border border-border-primary rounded-lg p-6 hover:border-primary transition-colors">
          <h3 className="text-sm text-text-light mb-1">Processing</h3>
          <p className="text-2xl font-bold text-purple-600">{processingOrders}</p>
        </Link>
        <div className="bg-white border border-border-primary rounded-lg p-6">
          <h3 className="text-sm text-text-light mb-1">Products</h3>
          <p className="text-2xl font-bold text-text-primary">{productCount}</p>
          <p className="text-xs text-text-muted mt-1">
            {connected ? 'From Hikeup POS' : 'From database'}
          </p>
        </div>
        <div className="bg-white border border-border-primary rounded-lg p-6">
          <h3 className="text-sm text-text-light mb-1">POS Status</h3>
          <p className={`text-lg font-bold ${connected ? 'text-green-600' : 'text-yellow-500'}`}>
            {connected ? '🟢 Connected' : '🟡 Disconnected'}
          </p>
        </div>
      </div>

      {/* Instructions */}
      {!connected && (
        <div className="bg-bg-alt border border-border-primary rounded-lg p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            📋 How to Connect
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-text-light">
            <li>Click <strong>&quot;Connect Hikeup POS&quot;</strong> above</li>
            <li>Log in with your <strong>Hikeup store account</strong> (not developer account)</li>
            <li>Click <strong>&quot;Authorize&quot;</strong> to grant access</li>
            <li>Token will be saved to database and persist permanently!</li>
            <li>Products will appear on your website automatically! ✨</li>
          </ol>
          
          <div className="mt-4 p-3 bg-white rounded border border-border-primary">
            <p className="text-sm text-text-muted">
              <strong>Note:</strong> You need to log in with the Hikeup account that has your store&apos;s products, 
              not the developer account you used to create the app.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
