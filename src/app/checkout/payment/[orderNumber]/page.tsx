import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { redirect } from "next/navigation";
import prisma from "@/libs/prisma";
import { ETRANSFER_CONFIG, DELIVERY_TIME_SLOTS, STORE_LOCATION } from "@/libs/delivery-config";
import { LOCAL_DELIVERY_CONFIG } from "@/libs/local-delivery-config";
import Link from "next/link";

interface Props {
  params: { orderNumber: string };
}

export default async function PaymentInstructionsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login?redirect=/orders");
  }
  
  // Get the order
  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: {
      items: true,
      user: true,
    },
  });
  
  if (!order) {
    redirect("/orders");
  }
  
  // Ensure the order belongs to this user
  if (order.user.email !== session.user.email) {
    redirect("/orders");
  }
  
  const timeSlot = order.deliveryTimeSlot 
    ? DELIVERY_TIME_SLOTS.find(s => s.id === order.deliveryTimeSlot)?.label 
    : null;
  
  // Use correct e-transfer email
  const etransferEmail = LOCAL_DELIVERY_CONFIG.payment.email;
  
  return (
    <div className="min-h-screen bg-bg-alt py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Order Placed!</h1>
          <p className="text-text-muted">
            Your order <span className="font-mono font-semibold text-primary">{order.orderNumber}</span> has been received.
          </p>
        </div>
        
        {/* Payment Instructions Card */}
        <div className="bg-white rounded-xl shadow-sm border border-border-primary overflow-hidden mb-6">
          <div className="bg-primary/5 border-b border-primary/20 px-6 py-4">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Complete Your Payment
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shrink-0 font-semibold">
                1
              </div>
              <div>
                <h3 className="font-medium text-text-primary mb-1">Open your banking app</h3>
                <p className="text-sm text-text-muted">
                  Log in to your bank&apos;s mobile app or online banking.
                </p>
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shrink-0 font-semibold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text-primary mb-1">Send an Interac e-Transfer</h3>
                <div className="bg-bg-alt rounded-lg p-4 mt-2 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-muted">Send to:</span>
                    <span className="font-mono font-medium text-text-primary">{etransferEmail}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-muted">Amount:</span>
                    <span className="text-xl font-bold text-primary">${order.totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
                      <p className="text-xs font-bold text-yellow-900 mb-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        REQUIRED: Add Message
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-yellow-800">Message field:</span>
                        <span className="font-mono font-bold text-yellow-900 text-base">{order.orderNumber}</span>
                      </div>
                      <p className="text-xs text-yellow-800 mt-2">
                        ⚠️ Your order number MUST be in the e-transfer message - we use this to confirm your order!
                      </p>
                    </div>
                  </div>
                </div>
                {order.fulfillmentMethod === "delivery" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                    <p className="text-xs font-medium text-red-900">
                      🚫 No cash accepted at delivery - e-Transfer payment only
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shrink-0 font-semibold">
                3
              </div>
              <div>
                <h3 className="font-medium text-text-primary mb-1">We&apos;ll confirm & process</h3>
                <p className="text-sm text-text-muted mb-2">
                  {LOCAL_DELIVERY_CONFIG.payment.mustPayBeforeDelivery && order.fulfillmentMethod === "delivery"
                    ? "Payment must be received before your order goes out for delivery. We have auto-deposit enabled for instant confirmation!"
                    : ETRANSFER_CONFIG.autoDepositEnabled 
                    ? "We have auto-deposit enabled, so your payment will be received instantly. No security question needed!"
                    : "Once we receive and confirm your payment, we&apos;ll start preparing your order."}
                </p>
                {order.fulfillmentMethod === "delivery" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                    <p className="text-xs text-blue-900">
                      <strong>📅 Expected Delivery:</strong> {order.deliveryDate 
                        ? new Date(order.deliveryDate).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })
                        : "Next business day"
                      }
                    </p>
                    <p className="text-xs text-blue-800 mt-1">
                      ⏰ Delivery window: 2:00 PM - 7:00 PM (afternoon run)
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Copy Button */}
            <div className="pt-4 border-t border-border-primary">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(etransferEmail);
                }}
                className="w-full py-3 bg-bg-alt hover:bg-gray-100 rounded-lg text-text-primary font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Email Address
              </button>
            </div>
          </div>
        </div>
        
        {/* Order Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-border-primary overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-border-primary">
            <h2 className="text-lg font-semibold text-text-primary">Order Details</h2>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Fulfillment Method */}
            <div className="flex justify-between">
              <span className="text-text-muted">Fulfillment</span>
              <span className="font-medium text-text-primary capitalize">
                {order.fulfillmentMethod === "pickup" ? "Store Pickup" : 
                 order.fulfillmentMethod === "delivery" ? "Local Delivery" : "Shipping"}
              </span>
            </div>
            
            {/* Address */}
            {order.fulfillmentMethod === "pickup" ? (
              <div className="flex justify-between">
                <span className="text-text-muted">Pickup At</span>
                <span className="font-medium text-text-primary text-right">
                  {STORE_LOCATION.address}
                </span>
              </div>
            ) : order.deliveryAddressLine1 && (
              <div className="flex justify-between">
                <span className="text-text-muted">Deliver To</span>
                <div className="text-right">
                  <p className="font-medium text-text-primary">{order.deliveryAddressLine1}</p>
                  {order.deliveryAddressLine2 && <p className="text-sm text-text-muted">{order.deliveryAddressLine2}</p>}
                  <p className="text-sm text-text-muted">
                    {order.deliveryCity}, {order.deliveryProvince} {order.deliveryPostalCode}
                  </p>
                </div>
              </div>
            )}
            
            {/* Delivery Schedule & Distance */}
            {order.fulfillmentMethod === "delivery" && order.deliveryDate && (
              <>
              <div className="flex justify-between">
                <span className="text-text-muted">Scheduled</span>
                <span className="font-medium text-text-primary">
                  {new Date(order.deliveryDate).toLocaleDateString("en-CA", { 
                    weekday: "long", 
                    month: "long", 
                    day: "numeric" 
                  })}
                </span>
              </div>
                {order.deliveryDistance && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Distance from store</span>
                    <span className="font-medium text-text-primary">{order.deliveryDistance.toFixed(1)} km</span>
                  </div>
                )}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                  <p className="text-xs text-yellow-800">
                    <strong>⚠️ Delivery Requirements:</strong> {LOCAL_DELIVERY_CONFIG.idRequirements.message}
                  </p>
                </div>
              </>
            )}
            
            {/* Items */}
            <div className="pt-4 border-t border-border-primary">
              <h3 className="font-medium text-text-primary mb-3">Items ({order.items.length})</h3>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-text-muted">
                      {item.productName} ({item.size}) × {item.quantity}
                    </span>
                    <span className="text-text-primary">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Totals */}
            <div className="pt-4 border-t border-border-primary space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Subtotal</span>
                <span className="text-text-primary">${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">
                  {order.fulfillmentMethod === "pickup" ? "Pickup" :
                   order.fulfillmentMethod === "delivery" ? "Delivery" : "Shipping"}
                </span>
                <span className={order.deliveryFee === 0 ? "text-green-600" : "text-text-primary"}>
                  {order.deliveryFee === 0 ? "FREE" : `$${order.deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border-primary">
                <span className="text-text-primary">Total</span>
                <span className="text-primary">${order.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Important Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-yellow-800">⏰ Payment Required Within 24 Hours</p>
              <p className="text-sm text-yellow-700 mt-1">
                Please complete your e-Transfer within 24 hours to avoid order cancellation.
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                <strong>Don&apos;t forget:</strong> Include your order number (<span className="font-mono font-bold">{order.orderNumber}</span>) in the e-transfer message field!
              </p>
              <p className="text-xs text-yellow-600 mt-2">
                A confirmation email has been sent to {order.customerEmail}.
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/orders"
            className="flex-1 py-3 px-6 bg-primary text-white rounded-lg font-medium text-center hover:bg-primary-dark transition-colors"
          >
            View My Orders
          </Link>
          <Link
            href="/shop"
            className="flex-1 py-3 px-6 border border-border-primary text-text-primary rounded-lg font-medium text-center hover:bg-bg-alt transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
        
        {/* Contact Info */}
        <div className="text-center mt-8 text-sm text-text-muted">
          <p>Questions? Contact us at {STORE_LOCATION.phone}</p>
          <p>or email {etransferEmail}</p>
        </div>
      </div>
    </div>
  );
}

