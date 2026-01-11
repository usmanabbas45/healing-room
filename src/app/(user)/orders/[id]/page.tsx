import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { getOrder } from "../action";

export async function generateMetadata() {
  return {
    title: `Order Details | Healing Room`,
  };
}

// Status badge colors
const statusColors: { [key: string]: string } = {
  awaiting_payment: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  processing: "bg-blue-100 text-blue-800",
  ready_for_pickup: "bg-purple-100 text-purple-800",
  out_for_delivery: "bg-blue-100 text-blue-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-red-100 text-red-800",
};

// Format status label
const formatStatus = (status: string) => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const OrderDetails = async ({ params }: { params: { id: string } }) => {
  const order = await getOrder(params.id);

  if (!order) {
    return (
      <div className="pt-12 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Order Not Found</h1>
        <p className="text-text-muted mb-6">This order doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Link href="/orders" className="text-primary hover:underline">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const totalProducts = order.products.reduce(
    (total: number, product: any) => total + product.quantity,
    0
  );
  const productsText = totalProducts === 1 ? "item" : "items";

  return (
    <div className="pt-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Link href="/orders" className="text-sm text-text-muted hover:text-primary mb-2 inline-block">
            ← Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">
            Order {order.orderNumber}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Placed on {format(order.purchaseDate, "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
          {formatStatus(order.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Order Items ({totalProducts} {productsText})
          </h2>
          
          {order.products.map((item: any, index: number) => (
            <div key={index} className="flex gap-4 p-4 bg-white border border-border-primary rounded-xl">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-bg-alt flex-shrink-0">
                <Image
                  src={item.image?.[0] || '/logo.png'}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-text-primary line-clamp-2">{item.name}</h3>
                {item.size && item.size !== 'Default' && (
                  <p className="text-sm text-text-muted">{item.size}</p>
                )}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-text-muted">Qty: {item.quantity}</span>
                  <span className="font-medium text-primary">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-border-primary rounded-xl p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Order Summary</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Subtotal</span>
                <span className="text-text-primary">${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">
                  {order.fulfillmentMethod === 'pickup' ? 'Pickup' :
                   order.fulfillmentMethod === 'delivery' ? 'Delivery' : 'Shipping'}
                </span>
                <span className={order.deliveryFee === 0 ? "text-green-600" : "text-text-primary"}>
                  {order.deliveryFee === 0 ? 'Free' : `$${order.deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-border-primary pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-text-primary">Total</span>
                  <span className="text-xl font-bold text-primary">${order.total_price.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Tracking Information */}
            {order.trackingNumber && order.fulfillmentMethod === 'shipping' && (
              <div className="mt-6 pt-4 border-t border-border-primary">
                <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  Tracking Information
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-text-muted mb-1">Tracking Number</p>
                    <a
                      href={`https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${order.trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-primary hover:underline break-all"
                    >
                      {order.trackingNumber}
                    </a>
                  </div>
                  {order.shippedAt && (
                    <div>
                      <p className="text-xs text-text-muted mb-1">Shipped On</p>
                      <p className="text-sm text-text-primary">
                        {format(new Date(order.shippedAt), "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}
                  <a
                    href={`https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${order.trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                  >
                    Track Package
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            )}

            {/* Status Messages */}
            {order.status === 'awaiting_payment' && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-2">Payment Pending</h3>
                <p className="text-sm text-yellow-700">
                  Please complete your payment via e-Transfer to confirm this order.
                </p>
              </div>
            )}

            {order.status === 'ready_for_pickup' && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Ready for Pickup!</h3>
                <p className="text-sm text-green-700">
                  Your order is ready. Visit us at:
                </p>
                <p className="text-sm text-green-700 mt-2 font-medium">
                  7147 Indian Line Rd<br />
                  Norfolk County, ON N0E 1Z0
                </p>
              </div>
            )}

            {order.status === 'shipped' && order.trackingNumber && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Order Shipped!</h3>
                <p className="text-sm text-blue-700">
                  Your order has been shipped via Canada Post Xpresspost. Use the tracking number above to monitor delivery.
                </p>
              </div>
            )}

            {(order.status === 'delivered' || order.status === 'completed') && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Order Completed!</h3>
                <p className="text-sm text-green-700">
                  Thank you for your order. We hope you enjoy your purchase!
                </p>
              </div>
            )}

            {/* Contact Info */}
            <div className="mt-6 pt-4 border-t border-border-primary">
              <h3 className="text-sm font-medium text-text-primary mb-2">Questions?</h3>
              <p className="text-sm text-text-muted">
                Email us at <a href="mailto:info@healingroomsixnations.ca" className="text-primary hover:underline">info@healingroomsixnations.ca</a> or use our AI chat assistant
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
