import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isHikeupConnected, getTokenStatus } from "@/libs/hikeup";
import { getAllProducts } from "@/app/actions";

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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-border-primary rounded-lg p-6">
          <h3 className="text-sm text-text-light mb-1">Products</h3>
          <p className="text-2xl font-bold text-text-primary">{productCount}</p>
          <p className="text-xs text-text-muted mt-1">
            {connected ? 'From Hikeup POS' : 'From database'}
          </p>
        </div>
        <div className="bg-white border border-border-primary rounded-lg p-6">
          <h3 className="text-sm text-text-light mb-1">Data Source</h3>
          <p className="text-lg font-bold text-text-primary">
            {connected ? '🔴 Live POS' : '💾 Database'}
          </p>
        </div>
        <div className="bg-white border border-border-primary rounded-lg p-6">
          <h3 className="text-sm text-text-light mb-1">Token Expires</h3>
          <p className={`text-lg font-bold ${tokenStatus.isExpired ? 'text-red-500' : 'text-green-600'}`}>
            {tokenStatus.connected ? tokenStatus.expiresIn : 'N/A'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {tokenStatus.hasRefreshToken ? '✅ Auto-refresh enabled' : '⚠️ Manual reconnect needed'}
          </p>
        </div>
        <div className="bg-white border border-border-primary rounded-lg p-6">
          <h3 className="text-sm text-text-light mb-1">Refresh Token</h3>
          <p className={`text-lg font-bold ${tokenStatus.hasRefreshToken ? 'text-green-600' : 'text-yellow-500'}`}>
            {tokenStatus.hasRefreshToken ? '✅ Yes' : '❌ No'}
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
