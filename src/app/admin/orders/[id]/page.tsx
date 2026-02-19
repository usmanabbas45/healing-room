import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import prisma from "@/libs/prisma";

export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: `Order Details | Admin | Healing Room`,
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

export default async function AdminOrderDetailsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Check if user is staff - show 404 if not
  if (session.user.role !== "staff") {
    notFound();
  }

  // Fetch order with all details
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      user: {
        select: {
          email: true,
          name: true,
          phone: true,
        },
      },
    },
  });

  if (!order) {
    return (
      <div className="pt-12 text-center max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Order Not Found</h1>
        <p className="text-text-muted mb-6">This order doesn&apos;t exist.</p>
        <Link href="/admin/orders" className="text-primary hover:underline">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const totalProducts = order.items.reduce((total, item) => total + item.quantity, 0);
  const productsText = totalProducts === 1 ? "item" : "items";

  return (
    <div className="pt-8 pb-12 max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Link href="/admin/orders" className="text-sm text-text-muted hover:text-primary mb-2 inline-block">
            ← Back to Order Management
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
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Order Items ({totalProducts} {productsText})
            </h2>
            
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 bg-white border border-border-primary rounded-xl">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-bg-alt flex-shrink-0">
                    <Image
                      src={item.image || '/logo.png'}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-primary line-clamp-2">{item.productName}</h3>
                    <p className="text-xs text-text-muted">{item.category}</p>
                    {item.size && item.size !== 'Default' && (
                      <p className="text-sm text-text-muted">Size: {item.size}</p>
                    )}
                    {item.color && (
                      <p className="text-sm text-text-muted">Color: {item.color}</p>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-text-muted">Qty: {item.quantity}</span>
                      <div className="text-right">
                        <p className="text-sm text-text-muted">${item.price.toFixed(2)} each</p>
                        <p className="font-medium text-primary">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white border border-border-primary rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Customer Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Name</p>
                <p className="text-sm text-text-primary font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Email</p>
                <a href={`mailto:${order.customerEmail}`} className="text-sm text-primary hover:underline">
                  {order.customerEmail}
                </a>
              </div>
              {order.customerPhone && (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Phone</p>
                  <a href={`tel:${order.customerPhone}`} className="text-sm text-primary hover:underline">
                    {order.customerPhone}
                  </a>
                </div>
              )}
              {order.user && (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Account</p>
                  <p className="text-sm text-text-primary">{order.user.name}</p>
                  <p className="text-xs text-text-muted">{order.user.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery/Pickup Information */}
          <div className="bg-white border border-border-primary rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {order.fulfillmentMethod === 'pickup' ? '🏪 Pickup Information' : 
               order.fulfillmentMethod === 'delivery' ? '🚗 Delivery Information' : 
               '📦 Shipping Information'}
            </h2>
            <div className="space-y-3">
              {order.fulfillmentMethod === 'pickup' ? (
                <>
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Location</p>
                    <p className="text-sm text-text-primary">7147 Indian Line Rd</p>
                    <p className="text-sm text-text-muted">Norfolk County, ON N0E 1Z0</p>
                  </div>
                  {order.deliveryDate && (
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Pickup Date</p>
                      <p className="text-sm text-text-primary">
                        {format(new Date(order.deliveryDate), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Address</p>
                    <p className="text-sm text-text-primary">{order.deliveryAddressLine1}</p>
                    {order.deliveryAddressLine2 && (
                      <p className="text-sm text-text-muted">{order.deliveryAddressLine2}</p>
                    )}
                    <p className="text-sm text-text-muted">
                      {order.deliveryCity}, {order.deliveryProvince} {order.deliveryPostalCode}
                    </p>
                    <p className="text-sm text-text-muted">{order.deliveryCountry}</p>
                  </div>
                  {order.deliveryDate && (
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
                        {order.fulfillmentMethod === 'delivery' ? 'Delivery Date' : 'Estimated Delivery'}
                      </p>
                      <p className="text-sm text-text-primary">
                        {format(new Date(order.deliveryDate), "EEEE, MMMM d, yyyy")}
                      </p>
                      {order.deliveryTimeSlot && (
                        <p className="text-sm text-text-muted">{order.deliveryTimeSlot}</p>
                      )}
                    </div>
                  )}
                  {order.deliveryInstructions && (
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Delivery Instructions</p>
                      <p className="text-sm text-text-primary">{order.deliveryInstructions}</p>
                    </div>
                  )}
                  {order.fulfillmentMethod === 'delivery' && order.deliveryDistance && (
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Distance</p>
                      <p className="text-sm text-text-primary">
                        {order.deliveryDistance.toFixed(1)} km from store
                      </p>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Tracking Number</p>
                      <a
                        href={`https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${order.trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-primary hover:underline break-all"
                      >
                        {order.trackingNumber}
                      </a>
                      {order.shippedAt && (
                        <p className="text-xs text-text-muted mt-1">
                          Shipped: {format(new Date(order.shippedAt), "MMMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {(order.notes || order.staffNotes) && (
            <div className="bg-white border border-border-primary rounded-xl p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Notes</h2>
              <div className="space-y-3">
                {order.notes && (
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Customer Note</p>
                    <p className="text-sm text-text-primary">{order.notes}</p>
                  </div>
                )}
                {order.staffNotes && (
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Staff Note</p>
                    <p className="text-sm text-text-primary">{order.staffNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-border-primary rounded-xl p-6 space-y-6 sticky top-24">
            <div>
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
                    <span className="text-xl font-bold text-primary">${order.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="pt-6 border-t border-border-primary">
              <h3 className="text-sm font-medium text-text-primary mb-3">Payment Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Method</span>
                  <span className="text-text-primary capitalize">
                    {order.paymentMethod === 'etransfer' ? 'e-Transfer' : 
                     order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 
                     order.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Status</span>
                  <span className={`font-medium ${
                    order.paymentStatus === 'confirmed' ? 'text-green-600' :
                    order.paymentStatus === 'pending' ? 'text-yellow-600' :
                    order.paymentStatus === 'failed' ? 'text-red-600' :
                    'text-text-primary'
                  }`}>
                    {order.paymentStatus === 'confirmed' ? '✅ Confirmed' :
                     order.paymentStatus === 'pending' ? '⏳ Pending' :
                     order.paymentStatus === 'received' ? '💰 Received' :
                     order.paymentStatus}
                  </span>
                </div>
                {order.paymentReference && (
                  <div>
                    <p className="text-text-muted mb-1">Reference</p>
                    <p className="text-text-primary break-all">{order.paymentReference}</p>
                  </div>
                )}
                {order.paidAt && (
                  <div>
                    <p className="text-text-muted mb-1">Paid At</p>
                    <p className="text-text-primary">
                      {format(new Date(order.paidAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="pt-6 border-t border-border-primary">
              <h3 className="text-sm font-medium text-text-primary mb-3">Timestamps</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-text-muted">Created</p>
                  <p className="text-text-primary">{format(order.createdAt, "MMM d, yyyy h:mm a")}</p>
                </div>
                <div>
                  <p className="text-text-muted">Last Updated</p>
                  <p className="text-text-primary">{format(order.updatedAt, "MMM d, yyyy h:mm a")}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-6 border-t border-border-primary">
              <Link
                href="/admin/orders"
                className="block w-full text-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark transition-colors"
              >
                Back to Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
