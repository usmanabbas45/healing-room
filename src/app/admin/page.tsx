import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isHikeupConnected, getTokenStatus } from "@/libs/hikeup";
import { getAllProducts } from "@/app/actions";
import prisma from "@/libs/prisma";

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  const errorMessage = searchParams.message;
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
  
  // Get user count
  const userCount = await prisma.user.count();

  return (
    <section className="pt-4 pb-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Admin Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">Manage orders, products, and system settings</p>
      </div>

      {/* Status Messages */}
      {success === "hikeup_connected" && (
        <div className="bg-white border-l-4 border-primary rounded-lg px-4 py-3 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-text-primary">Hikeup POS connected successfully! Token saved to database. Products will now load from your POS.</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-white border-l-4 border-red-500 rounded-lg px-4 py-3 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">Error: {error.replace(/_/g, " ")}</p>
              {errorMessage && (
                <p className="mt-2 text-xs font-mono bg-gray-100 p-2 rounded text-text-muted">
                  Details: {errorMessage}
                </p>
              )}
              {error === 'ssl_error' && (
                <p className="mt-2 text-xs text-text-muted">
                  This is an SSL compatibility issue with Hikeup&apos;s server. 
                  Try running the server with: <code className="bg-gray-100 px-1 rounded">NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev</code>
                </p>
              )}
              {error === 'hikeup_auth_failed' && errorMessage === 'invalid_request' && (
                <div className="mt-3 text-xs text-text-muted">
                  <p className="font-semibold text-text-primary">This means Hikeup rejected your OAuth request.</p>
                  <p className="mt-2">Common causes:</p>
                  <ul className="list-disc ml-5 mt-1 space-y-1">
                    <li>Your redirect URI is not whitelisted in Hikeup app settings</li>
                    <li>The client ID or secret is incorrect</li>
                    <li>Your app is not approved/active in Hikeup</li>
                  </ul>
                  <p className="mt-2 font-semibold text-text-primary">Fix:</p>
                  <ol className="list-decimal ml-5 mt-1 space-y-1">
                    <li>Go to Hikeup Developer Dashboard</li>
                    <li>Find app: <code className="bg-gray-100 px-1 rounded">healingroom-ced58b3a33</code></li>
                    <li>Add redirect URI: <code className="bg-gray-100 px-1 rounded break-all">https://resplendent-wonder-production.up.railway.app/api/hikeup/callback</code></li>
                    <li>Save and try again</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hikeup Integration Card */}
      <div className="bg-white border border-border-primary rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Hikeup POS Integration</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                <span className="text-xs text-text-muted">
                  {connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-text-muted mb-4">
          {connected 
            ? 'Your Hikeup POS is connected. Products and inventory are fetched in real-time. Token is stored in database and persists across restarts.'
            : 'Connect your Hikeup POS to display products and inventory from your store.'}
        </p>
        
        <div className="flex flex-wrap gap-3">
          {!connected ? (
            <a
              href="/api/hikeup/connect"
              className="bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
            >
              Connect Hikeup POS
            </a>
          ) : (
            <>
              <Link
                href="/shop"
                className="bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
              >
                View Store
              </Link>
              <a
                href="/api/hikeup/connect"
                className="bg-white border border-border-primary text-text-primary px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Reconnect
              </a>
            </>
          )}
          <Link
            href="/admin/hikeup-logs"
            className="bg-white border border-border-primary text-text-primary px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Integration Logs
          </Link>
        </div>
        
        {/* Detailed Token Info */}
        {tokenStatus.connected && (
          <div className="mt-4 pt-4 border-t border-border-primary space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Token Expires</span>
              <span className="text-text-primary font-medium">{tokenStatus.expiresAt?.toLocaleString() || 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Status</span>
              <span className={tokenStatus.isExpired ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                {tokenStatus.isExpired ? 'Expired' : 'Valid'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Auto-Refresh</span>
              <span className={tokenStatus.hasRefreshToken ? 'text-green-600 font-medium' : 'text-gray-600 font-medium'}>
                {tokenStatus.hasRefreshToken ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Orders Card - Prominent */}
      {(pendingPayments > 0 || paidOrders > 0) && (
        <div className="bg-white border-l-4 border-primary rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-1">
                  Orders Require Attention
                </h2>
                <div className="flex flex-wrap gap-2 items-center text-sm">
                  {pendingPayments > 0 && (
                    <span className="px-2.5 py-1 bg-gray-100 text-text-primary rounded-full font-medium">
                      {pendingPayments} awaiting payment
                    </span>
                  )}
                  {paidOrders > 0 && (
                    <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full font-medium">
                      {paidOrders} ready to process
                    </span>
                  )}
                </div>
                {pendingPayments > 0 && (
                  <p className="text-xs text-text-muted mt-2">
                    Check e-transfer for order number in message field
                  </p>
                )}
              </div>
            </div>
            <Link
              href="/admin/orders?status=awaiting_payment"
              className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm shrink-0"
            >
              Manage Orders
            </Link>
          </div>
        </div>
      )}
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Link href="/admin/orders" className="bg-white border border-border-primary rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h3 className="text-xs text-text-muted font-medium">Total Orders</h3>
          </div>
          <p className="text-2xl font-bold text-text-primary">{totalOrders}</p>
        </Link>
        
        <Link href="/admin/orders?status=awaiting_payment" className="bg-white border border-border-primary rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xs text-text-muted font-medium">Awaiting Payment</h3>
          </div>
          <p className="text-2xl font-bold text-text-primary">{pendingPayments}</p>
        </Link>
        
        <Link href="/admin/orders?status=processing" className="bg-white border border-border-primary rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xs text-text-muted font-medium">Processing</h3>
          </div>
          <p className="text-2xl font-bold text-text-primary">{processingOrders}</p>
        </Link>
        
        <Link href="/admin/users" className="bg-white border border-border-primary rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-xs text-text-muted font-medium">Users</h3>
          </div>
          <p className="text-2xl font-bold text-text-primary">{userCount}</p>
        </Link>
        
        <div className="bg-white border border-border-primary rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-xs text-text-muted font-medium">Products</h3>
          </div>
          <p className="text-2xl font-bold text-text-primary">{productCount}</p>
          <p className="text-xs text-text-muted mt-1">
            {connected ? 'From Hikeup POS' : 'From database'}
          </p>
        </div>
        
        <div className="bg-white border border-border-primary rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-xs text-text-muted font-medium">POS Status</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <p className={`text-sm font-semibold ${connected ? 'text-text-primary' : 'text-text-muted'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {!connected && (
        <div className="bg-white border border-border-primary rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            How to Connect
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-sm text-text-primary">
            <li>Click <strong>&quot;Connect Hikeup POS&quot;</strong> above</li>
            <li>Log in with your <strong>Hikeup store account</strong> (not developer account)</li>
            <li>Click <strong>&quot;Authorize&quot;</strong> to grant access</li>
            <li>Token will be saved to database and persist permanently</li>
            <li>Products will appear on your website automatically</li>
          </ol>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-text-muted">
              <strong className="text-text-primary">Note:</strong> You need to log in with the Hikeup account that has your store&apos;s products, 
              not the developer account you used to create the app.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
