import Link from "next/link";
import { format } from "date-fns";
import { getUserOrders } from "./action";
import { Suspense } from "react";
import { Loader } from "@/components/common/Loader";
import { Session, getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

export async function generateMetadata() {
  return {
    title: `Orders | Healing Room`,
  };
}

const UserOrders = async () => {
  const session: Session | null = await getServerSession(authOptions);

  if (session?.user) {
    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-[calc(100vh-91px)]">
            <Loader height={30} width={30} />
          </div>
        }
      >
        <Orders />
      </Suspense>
    );
  }

  return (
    <section className="flex flex-col items-center justify-center w-full h-[calc(100vh-91px)] gap-2">
      <h1 className="mb-4 text-2xl md:text-3xl font-bold text-text-primary">Sign In Required</h1>
      <p className="mb-4 text-text-muted text-center max-w-md">
        Sign in to view your order history and track your purchases.
      </p>
      <Link
        className="flex font-medium items-center bg-primary text-white justify-center text-sm min-w-[160px] h-[44px] px-6 rounded-lg transition-all hover:bg-primary-dark"
        href="/login"
      >
        Sign In
      </Link>
    </section>
  );
};

const Orders = async () => {
  const orders = await getUserOrders();

  if (!orders || orders.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center w-full h-[calc(100vh-91px)] gap-2">
        <h1 className="mb-4 text-2xl md:text-3xl font-bold text-text-primary">No Orders Yet</h1>
        <p className="mb-4 text-text-muted text-center max-w-md">
          When you place an order, it will appear here. Start shopping to create your first order!
        </p>
        <Link
          className="flex font-medium items-center bg-primary text-white justify-center text-sm min-w-[160px] h-[44px] px-6 rounded-lg transition-all hover:bg-primary-dark"
          href="/shop"
        >
          Start Shopping
        </Link>
      </section>
    );
  }

  const totalItems = orders.reduce((sum, order) => 
    sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  );

  return (
    <section className="pt-4 pb-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">My Orders</h1>
        <p className="text-sm text-text-muted mt-1">
          {orders.length} order{orders.length !== 1 ? 's' : ''} • {totalItems} item{totalItems !== 1 ? 's' : ''} total
        </p>
      </div>

      <div className="space-y-4">
        {orders.map((order, index: number) => {
          const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
          const orderDate = format(order.purchaseDate, "MMM dd, yyyy");
          
          // Determine status badge color
          const getStatusColor = (status: string) => {
            switch (status?.toLowerCase()) {
              case 'completed':
                return 'bg-green-100 text-green-800';
              case 'delivered':
                return 'bg-green-100 text-green-800';
              case 'shipped':
                return 'bg-blue-100 text-blue-800';
              case 'out_for_delivery':
                return 'bg-blue-100 text-blue-800';
              case 'processing':
                return 'bg-blue-100 text-blue-800';
              case 'ready_for_pickup':
                return 'bg-purple-100 text-purple-800';
              case 'awaiting_payment':
                return 'bg-yellow-100 text-yellow-800';
              case 'paid':
                return 'bg-green-100 text-green-800';
              case 'cancelled':
                return 'bg-red-100 text-red-800';
              case 'refunded':
                return 'bg-red-100 text-red-800';
              default:
                return 'bg-gray-100 text-gray-800';
            }
          };
          
          // Format status label
          const formatStatus = (status: string) => {
            return status
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          };

          return (
            <Link
              key={index}
              href={`/orders/${order.id}?items=${order.items.length}`}
              className="block"
            >
              <div className="bg-white border border-border-primary rounded-xl p-4 md:p-6 hover:shadow-md transition-shadow">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">Order #{order.orderNumber}</p>
                      <p className="text-xs text-text-muted">{orderDate}</p>
                    </div>
                  </div>
                  
                  {order.status && (
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${getStatusColor(order.status)} w-fit`}>
                      {formatStatus(order.status)}
                    </span>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border-primary">
                  <div>
                    <p className="text-xs text-text-muted mb-1">Total</p>
                    <p className="text-lg font-bold text-primary">${order.totalPrice.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-text-muted mb-1">Items</p>
                    <p className="text-base font-semibold text-text-primary">{itemCount}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-text-muted mb-1">Method</p>
                    <p className="text-base font-medium text-text-primary capitalize">
                      {order.fulfillmentMethod === 'pickup' ? 'Pickup' : 
                       order.fulfillmentMethod === 'delivery' ? 'Delivery' : 'Shipping'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-text-muted mb-1">Payment</p>
                    <p className="text-base font-medium text-text-primary capitalize">
                      {order.paymentMethod || 'E-Transfer'}
                    </p>
                  </div>
                </div>

                {/* Tracking / Fulfillment Info */}
                {order.trackingNumber && order.fulfillmentMethod === 'shipping' ? (
                  <div className="mt-4 pt-4 border-t border-border-primary">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-sm font-medium text-text-primary">Tracking Number</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <a
                        href={`https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${order.trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-primary hover:underline"
                      >
                        {order.trackingNumber}
                      </a>
                      <span className="text-sm text-primary font-medium flex items-center gap-1">
                        View Details
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-border-primary flex items-center justify-between">
                    <p className="text-sm text-text-muted">
                      {order.fulfillmentMethod === 'delivery' && order.deliveryAddressLine1
                        ? `Deliver to ${order.deliveryCity}, ${order.deliveryProvince}`
                        : order.fulfillmentMethod === 'pickup'
                        ? 'Pickup at store'
                        : 'Shipping'}
                    </p>
                    <span className="text-sm text-primary font-medium flex items-center gap-1">
                      View Details
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default UserOrders;
