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
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  ready: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
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
        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColors[order.status] || statusColors.pending}`}>
          {order.status}
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
                <span className="text-text-primary">${order.total_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Pickup</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="border-t border-border-primary pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-text-primary">Total</span>
                  <span className="text-xl font-bold text-primary">${order.total_price.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            {order.status === 'pending' && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-2">Payment Pending</h3>
                <p className="text-sm text-yellow-700">
                  Please complete your payment to confirm this order. 
                  Contact the store for payment details.
                </p>
              </div>
            )}

            {order.status === 'ready' && (
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

            {/* Contact Info */}
            <div className="mt-6 pt-4 border-t border-border-primary">
              <h3 className="text-sm font-medium text-text-primary mb-2">Questions?</h3>
              <p className="text-sm text-text-muted">
                Call us at <a href="tel:+13653367919" className="text-primary hover:underline">(365) 336-7919</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
