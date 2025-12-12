import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/libs/prisma";
import { OrderActions } from "./OrderActions";

export default async function AdminOrdersPage({
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

  const statusFilter = searchParams.status || "all";
  
  // Get orders with optional status filter
  const orders = await prisma.order.findMany({
    where: statusFilter !== "all" ? { status: statusFilter } : undefined,
    include: {
      items: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get order counts by status
  const orderCounts = await prisma.order.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const statusCounts: Record<string, number> = {
    all: orders.length,
    awaiting_payment: 0,
    paid: 0,
    processing: 0,
    ready_for_pickup: 0,
    out_for_delivery: 0,
    shipped: 0,
    delivered: 0,
    completed: 0,
    cancelled: 0,
  };

  orderCounts.forEach((item) => {
    statusCounts[item.status] = item._count.id;
  });

  const statusLabels: Record<string, { label: string; color: string }> = {
    awaiting_payment: { label: "Awaiting Payment", color: "bg-yellow-100 text-yellow-800" },
    paid: { label: "Paid", color: "bg-blue-100 text-blue-800" },
    processing: { label: "Processing", color: "bg-purple-100 text-purple-800" },
    ready_for_pickup: { label: "Ready for Pickup", color: "bg-green-100 text-green-800" },
    out_for_delivery: { label: "Out for Delivery", color: "bg-orange-100 text-orange-800" },
    shipped: { label: "Shipped", color: "bg-indigo-100 text-indigo-800" },
    delivered: { label: "Delivered", color: "bg-green-100 text-green-800" },
    completed: { label: "Completed", color: "bg-gray-100 text-gray-800" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
    refunded: { label: "Refunded", color: "bg-red-100 text-red-800" },
  };

  const fulfillmentLabels: Record<string, string> = {
    pickup: "🏪 Pickup",
    delivery: "🚗 Delivery",
    shipping: "📦 Shipping",
  };

  return (
    <section className="pt-8 pb-12 max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-primary hover:underline text-sm mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">Order Management</h1>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <Link
            href="/admin/orders"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === "all"
                ? "bg-primary text-white"
                : "bg-gray-100 text-text-muted hover:bg-gray-200"
            }`}
          >
            All ({statusCounts.all})
          </Link>
          <Link
            href="/admin/orders?status=awaiting_payment"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === "awaiting_payment"
                ? "bg-yellow-500 text-white"
                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            }`}
          >
            Awaiting Payment ({statusCounts.awaiting_payment})
          </Link>
          <Link
            href="/admin/orders?status=paid"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === "paid"
                ? "bg-blue-500 text-white"
                : "bg-blue-100 text-blue-800 hover:bg-blue-200"
            }`}
          >
            Paid ({statusCounts.paid})
          </Link>
          <Link
            href="/admin/orders?status=processing"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === "processing"
                ? "bg-purple-500 text-white"
                : "bg-purple-100 text-purple-800 hover:bg-purple-200"
            }`}
          >
            Processing ({statusCounts.processing})
          </Link>
          <Link
            href="/admin/orders?status=ready_for_pickup"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === "ready_for_pickup"
                ? "bg-green-500 text-white"
                : "bg-green-100 text-green-800 hover:bg-green-200"
            }`}
          >
            Ready ({statusCounts.ready_for_pickup})
          </Link>
          <Link
            href="/admin/orders?status=completed"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === "completed"
                ? "bg-gray-500 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            Completed ({statusCounts.completed})
          </Link>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white border border-border-primary rounded-xl p-12 text-center">
          <p className="text-text-muted">No orders found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-border-primary rounded-xl overflow-hidden"
            >
              {/* Order Header */}
              <div className="p-4 border-b border-border-primary bg-bg-alt/50">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-mono font-semibold text-primary">{order.orderNumber}</p>
                      <p className="text-sm text-text-muted">
                        {new Date(order.createdAt).toLocaleString("en-CA")}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusLabels[order.status]?.color || "bg-gray-100"}`}>
                      {statusLabels[order.status]?.label || order.status}
                    </span>
                    <span className="text-sm">
                      {fulfillmentLabels[order.fulfillmentMethod] || order.fulfillmentMethod}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">${order.totalPrice.toFixed(2)}</p>
                    <p className="text-xs text-text-muted">
                      {order.paymentStatus === "confirmed" ? "✅ Paid" : "⏳ " + order.paymentStatus}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Customer Info */}
                  <div>
                    <h4 className="text-xs text-text-muted uppercase tracking-wide mb-1">Customer</h4>
                    <p className="font-medium text-text-primary">{order.customerName}</p>
                    <p className="text-sm text-text-muted">{order.customerEmail}</p>
                    {order.customerPhone && (
                      <p className="text-sm text-text-muted">{order.customerPhone}</p>
                    )}
                  </div>

                  {/* Delivery Info */}
                  <div>
                    <h4 className="text-xs text-text-muted uppercase tracking-wide mb-1">
                      {order.fulfillmentMethod === "pickup" ? "Pickup Location" : "Delivery Address"}
                    </h4>
                    {order.fulfillmentMethod === "pickup" ? (
                      <p className="text-sm text-text-primary">7147 Indian Line Rd, Norfolk County</p>
                    ) : order.deliveryAddressLine1 ? (
                      <>
                        <p className="text-sm text-text-primary">{order.deliveryAddressLine1}</p>
                        {order.deliveryAddressLine2 && (
                          <p className="text-sm text-text-muted">{order.deliveryAddressLine2}</p>
                        )}
                        <p className="text-sm text-text-muted">
                          {order.deliveryCity}, {order.deliveryProvince} {order.deliveryPostalCode}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-text-muted">No address provided</p>
                    )}
                    {order.deliveryDate && (
                      <p className="text-sm text-primary mt-1">
                        {new Date(order.deliveryDate).toLocaleDateString("en-CA", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {order.fulfillmentMethod === "delivery" ? " (2-7 PM run)" : order.deliveryTimeSlot ? ` • ${order.deliveryTimeSlot}` : ""}
                      </p>
                    )}
                    {order.fulfillmentMethod === "delivery" && order.deliveryDistance && (
                      <p className="text-xs text-text-muted mt-1">
                        📍 {order.deliveryDistance.toFixed(1)} km • ${(order.deliveryDistance * 0.5).toFixed(2)} fee
                      </p>
                    )}
                  </div>

                  {/* Items Summary */}
                  <div>
                    <h4 className="text-xs text-text-muted uppercase tracking-wide mb-1">Items</h4>
                    <div className="space-y-1">
                      {order.items.slice(0, 3).map((item) => (
                        <p key={item.id} className="text-sm text-text-primary truncate">
                          {item.quantity}× {item.productName}
                        </p>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-text-muted">+{order.items.length - 3} more</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Reference (Order Number in e-transfer) */}
                {order.paymentReference && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-800">
                      <strong>💳 Payment Reference:</strong> {order.paymentReference}
                    </p>
                    {order.paidAt && (
                      <p className="text-xs text-green-700 mt-1">
                        Paid: {new Date(order.paidAt).toLocaleString("en-CA")}
                      </p>
                    )}
                  </div>
                )}

                {/* Staff Notes */}
                {order.staffNotes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>📝 Staff Note:</strong> {order.staffNotes}
                    </p>
                  </div>
                )}
                
                {/* Delivery Requirements for delivery orders */}
                {order.fulfillmentMethod === "delivery" && order.status !== "completed" && order.status !== "cancelled" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-900">
                      <strong>🚗 Delivery Checklist:</strong>
                    </p>
                    <ul className="text-xs text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                      <li>Verify payment received with order number ({order.orderNumber}) in e-transfer message</li>
                      <li>Check customer ID (19+ required)</li>
                      <li>Verify ID name matches order name: {order.customerName}</li>
                      {order.totalPrice >= 200 && (
                        <li className="font-bold text-blue-900">⚠️ Order $200+ - Verify ID before handing over product</li>
                      )}
                      <li>🚫 No cash accepted at door</li>
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <OrderActions order={order} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

