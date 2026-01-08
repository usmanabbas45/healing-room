import { STORE_LOCATION, ETRANSFER_CONFIG, DELIVERY_TIME_SLOTS } from "./delivery-config";
import { LOCAL_DELIVERY_CONFIG } from "./local-delivery-config";

interface OrderItem {
  productName: string;
  size: string;
  quantity: number;
  price: number;
}

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  fulfillmentMethod: "pickup" | "delivery" | "shipping";
  deliveryAddress?: {
    line1: string;
    line2?: string;
    city: string;
    province: string;
    postalCode: string;
  };
  deliveryDate?: Date;
  deliveryTimeSlot?: string;
  deliveryDistance?: number; // Distance in km for local delivery
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalPrice: number;
}

export function generateOrderConfirmationEmail(data: OrderEmailData): { subject: string; html: string; text: string } {
  const timeSlotLabel = data.deliveryTimeSlot 
    ? DELIVERY_TIME_SLOTS.find(s => s.id === data.deliveryTimeSlot)?.label 
    : null;

  // Use the correct e-transfer email from LOCAL_DELIVERY_CONFIG
  const etransferEmail = LOCAL_DELIVERY_CONFIG.payment.email;

  const subject = `Order Confirmed - ${data.orderNumber} | Healing Room`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #2D2D2D; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #D4842A 0%, #c47a25 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Order Confirmed!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Thank you for your order, ${data.customerName}!</p>
            </td>
          </tr>
          
          <!-- Invoice Header -->
          <tr>
            <td style="padding: 30px 30px 20px;">
              <table width="100%" style="background-color: #f8f5f0; border-radius: 8px; padding: 20px;">
                <tr>
                  <td style="width: 50%;">
                    <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Invoice / Order Number</p>
                    <p style="margin: 5px 0 0; font-size: 24px; font-weight: 700; color: #D4842A; font-family: monospace;">${data.orderNumber}</p>
                  </td>
                  <td style="width: 50%; text-align: right;">
                    <p style="margin: 0; color: #666; font-size: 12px;">Invoice Date</p>
                    <p style="margin: 5px 0 0; font-size: 14px; color: #2D2D2D;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p style="margin: 10px 0 0; color: #666; font-size: 12px;">Amount Due</p>
                    <p style="margin: 5px 0 0; font-size: 20px; font-weight: 700; color: #D4842A;">$${data.totalPrice.toFixed(2)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Bill To / Ship To -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <table width="100%">
                <tr>
                  <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                    <div style="background: #ffffff; border: 1px solid #eee; border-radius: 6px; padding: 15px;">
                      <p style="margin: 0 0 10px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Bill To</p>
                      <p style="margin: 0; font-weight: 600; color: #2D2D2D;">${data.customerName}</p>
                      <p style="margin: 5px 0 0; font-size: 14px; color: #666;">${data.customerEmail}</p>
                    </div>
                  </td>
                  ${data.deliveryAddress ? `
                  <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                    <div style="background: #ffffff; border: 1px solid #eee; border-radius: 6px; padding: 15px;">
                      <p style="margin: 0 0 10px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Ship To</p>
                      <p style="margin: 0; font-size: 14px; color: #2D2D2D;">
                        ${data.deliveryAddress.line1}<br>
                        ${data.deliveryAddress.line2 ? data.deliveryAddress.line2 + '<br>' : ''}
                        ${data.deliveryAddress.city}, ${data.deliveryAddress.province}<br>
                        ${data.deliveryAddress.postalCode}
                      </p>
                    </div>
                  </td>
                  ` : `
                  <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                    <div style="background: #fff8e6; border: 1px solid #ffeeba; border-radius: 6px; padding: 15px;">
                      <p style="margin: 0 0 10px; font-size: 12px; color: #856404; text-transform: uppercase; letter-spacing: 1px;">🏪 Store Pickup</p>
                      <p style="margin: 0; font-size: 14px; color: #856404;">
                        ${STORE_LOCATION.address}
                      </p>
                    </div>
                  </td>
                  `}
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Payment Instructions -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <table width="100%" style="background-color: #fff8e6; border: 1px solid #ffeeba; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px; color: #856404; font-size: 16px;">📧 Complete Your Payment</h3>
                    <p style="margin: 0 0 15px; color: #856404; font-size: 14px;">
                      Please send an Interac e-Transfer to complete your order:
                    </p>
                    <table style="background: #ffffff; border-radius: 6px; padding: 15px; width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #666; font-size: 13px;">Send to:</span><br>
                          <strong style="color: #2D2D2D;">${etransferEmail}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #666; font-size: 13px;">Amount:</span><br>
                          <strong style="color: #D4842A; font-size: 20px;">$${data.totalPrice.toFixed(2)}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; background: #fff3cd; border: 2px solid #ffc107; border-radius: 4px; padding: 10px;">
                          <span style="color: #856404; font-size: 12px; font-weight: bold;">⚠️ REQUIRED - Message field:</span><br>
                          <strong style="color: #2D2D2D; font-family: monospace; font-size: 16px;">${data.orderNumber}</strong><br>
                          <span style="color: #856404; font-size: 11px; margin-top: 4px; display: block;">
                            You MUST include your order number in the e-transfer message - we use this to confirm your order!
                          </span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 15px 0 0; color: #856404; font-size: 12px;">
                      ⏰ Please complete payment within 24 hours to avoid order cancellation.
                    </p>
                    ${data.fulfillmentMethod === 'delivery' ? `
                      <p style="margin: 10px 0 0; color: #dc3545; font-size: 12px; font-weight: bold;">
                        🚫 No cash accepted at delivery - e-Transfer payment only
                      </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Fulfillment Info -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <h3 style="margin: 0 0 15px; color: #2D2D2D; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                ${data.fulfillmentMethod === 'pickup' ? '🏪 Store Pickup' : data.fulfillmentMethod === 'delivery' ? '🚗 Local Delivery' : '📦 Shipping'}
              </h3>
              ${data.fulfillmentMethod === 'pickup' ? `
                <p style="margin: 0; color: #666; font-size: 14px;">
                  <strong>Pickup Location:</strong><br>
                  ${STORE_LOCATION.address}<br>
                  <span style="color: #D4842A;">Ready for pickup after payment confirmation</span>
                </p>
              ` : data.deliveryAddress ? `
                <p style="margin: 0; color: #666; font-size: 14px;">
                  <strong>Delivery Address:</strong><br>
                  ${data.deliveryAddress.line1}<br>
                  ${data.deliveryAddress.line2 ? data.deliveryAddress.line2 + '<br>' : ''}
                  ${data.deliveryAddress.city}, ${data.deliveryAddress.province} ${data.deliveryAddress.postalCode}
                </p>
                ${data.fulfillmentMethod === 'delivery' && data.deliveryDistance ? `
                  <p style="margin: 10px 0 0; color: #666; font-size: 13px;">
                    <strong>Distance:</strong> ${data.deliveryDistance.toFixed(1)} km • <strong>Delivery Fee:</strong> $${data.deliveryFee.toFixed(2)}
                  </p>
                ` : ''}
                ${data.deliveryDate ? `
                  <p style="margin: 10px 0 0; color: #D4842A; font-size: 14px;">
                    <strong>Scheduled:</strong> ${new Date(data.deliveryDate).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}${data.fulfillmentMethod === 'delivery' ? ' (daily delivery run)' : timeSlotLabel ? `, ${timeSlotLabel}` : ''}
                  </p>
                ` : ''}
                ${data.fulfillmentMethod === 'delivery' ? `
                  <p style="margin: 10px 0 0; color: #666; font-size: 13px;">
                    <strong>⏰ Delivery Window:</strong> 2:00 PM - 7:00 PM (afternoon run)
                  </p>
                  <div style="margin-top: 15px; padding: 12px; background: #fff8e6; border: 1px solid #ffeeba; border-radius: 6px;">
                    <p style="margin: 0 0 8px 0; color: #856404; font-size: 12px;">
                      <strong>⚠️ ID Required at Delivery:</strong> ${LOCAL_DELIVERY_CONFIG.idRequirements.message}
                    </p>
                    <p style="margin: 0; color: #856404; font-size: 12px;">
                      Driver will check ID before completing delivery.
                    </p>
                  </div>
                ` : ''}
              ` : ''}
            </td>
          </tr>
          
          <!-- Invoice Line Items -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <h3 style="margin: 0 0 15px; color: #2D2D2D; font-size: 16px;">Invoice Line Items</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eee; border-radius: 6px; overflow: hidden;">
                <thead>
                  <tr style="background: #f8f5f0;">
                    <th style="text-align: left; padding: 12px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Description</th>
                    <th style="text-align: center; padding: 12px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; width: 80px;">Qty</th>
                    <th style="text-align: right; padding: 12px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; width: 100px;">Price</th>
                    <th style="text-align: right; padding: 12px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; width: 100px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.items.map((item, idx) => `
                    <tr style="border-bottom: ${idx < data.items.length - 1 ? '1px solid #f0f0f0' : 'none'};">
                      <td style="padding: 15px 12px;">
                        <strong style="color: #2D2D2D; font-size: 14px; display: block; margin-bottom: 3px;">${item.productName}</strong>
                        <span style="color: #999; font-size: 12px;">Size: ${item.size}</span>
                      </td>
                      <td style="text-align: center; color: #666; padding: 15px 12px; font-size: 14px;">${item.quantity}</td>
                      <td style="text-align: right; color: #666; padding: 15px 12px; font-size: 14px;">$${item.price.toFixed(2)}</td>
                      <td style="text-align: right; color: #2D2D2D; padding: 15px 12px; font-weight: 600; font-size: 14px;">$${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
                </tbody>
              </table>
            </td>
          </tr>
          
          <!-- Invoice Summary / Totals -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table width="100%" style="background-color: #f8f5f0; border-radius: 8px; padding: 20px;">
                <tr>
                  <td style="padding: 8px 0; text-align: right;">
                    <span style="color: #666; font-size: 14px;">Subtotal:</span>
                  </td>
                  <td style="padding: 8px 0 8px 20px; text-align: right; width: 120px;">
                    <span style="color: #2D2D2D; font-size: 14px; font-weight: 600;">$${data.subtotal.toFixed(2)}</span>
                  </td>
                </tr>
                ${data.deliveryFee > 0 ? `
                <tr>
                  <td style="padding: 8px 0; text-align: right;">
                    <span style="color: #666; font-size: 14px;">${data.fulfillmentMethod === 'delivery' ? `Delivery Fee${data.deliveryDistance ? ' (' + data.deliveryDistance.toFixed(1) + ' km)' : ''}` : 'Shipping'}:</span>
                  </td>
                  <td style="padding: 8px 0 8px 20px; text-align: right;">
                    <span style="color: #2D2D2D; font-size: 14px; font-weight: 600;">$${data.deliveryFee.toFixed(2)}</span>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; text-align: right;">
                    <span style="color: #666; font-size: 14px;">Tax:</span>
                  </td>
                  <td style="padding: 8px 0 8px 20px; text-align: right;">
                    <span style="color: #2D2D2D; font-size: 14px; font-weight: 600;">Included</span>
                  </td>
                </tr>
                <tr style="border-top: 2px solid #D4842A;">
                  <td style="padding: 15px 0 0; text-align: right;">
                    <span style="color: #2D2D2D; font-size: 18px; font-weight: 700;">Total Amount Due:</span>
                  </td>
                  <td style="padding: 15px 0 0 20px; text-align: right;">
                    <span style="color: #D4842A; font-size: 24px; font-weight: 700;">$${data.totalPrice.toFixed(2)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Invoice Terms -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background: #fff8e6; border-left: 4px solid #D4842A; padding: 15px; border-radius: 4px;">
                <p style="margin: 0 0 5px; font-size: 12px; color: #856404; font-weight: 600;">Invoice Terms & Conditions:</p>
                <ul style="margin: 5px 0 0; padding-left: 20px; color: #856404; font-size: 11px; line-height: 1.6;">
                  <li>Payment is due upon receipt of this invoice</li>
                  <li>E-Transfer payment must include order number in message field</li>
                  <li>Orders unpaid after 24 hours may be cancelled</li>
                  <li>Valid ID required for all deliveries (19+ only)</li>
                  <li>No cash accepted at delivery</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #2D2D2D; padding: 25px 30px; text-align: center;">
              <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px;">Questions? Email us at</p>
              <p style="margin: 0; color: #D4842A; font-size: 14px;">
                ${etransferEmail}
              </p>
              <p style="margin: 15px 0 0; color: #888; font-size: 12px;">
                Healing Room Six Nations<br>
                ${STORE_LOCATION.address}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Order Confirmed - ${data.orderNumber}

Thank you for your order, ${data.customerName}!

ORDER NUMBER: ${data.orderNumber}

COMPLETE YOUR PAYMENT
Send an Interac e-Transfer:
- Send to: ${etransferEmail}
- Amount: $${data.totalPrice.toFixed(2)}
- Message: ${data.orderNumber} (REQUIRED - include this in e-transfer message!)

⚠️ IMPORTANT: You MUST include your order number in the e-transfer message field - we use this to confirm your order!

${data.fulfillmentMethod === 'delivery' ? '🚫 No cash accepted at delivery - e-Transfer payment only\n\n' : ''}Please complete payment within 24 hours to avoid order cancellation.

${data.fulfillmentMethod === 'pickup' 
  ? `PICKUP LOCATION\n${STORE_LOCATION.address}\nReady after payment confirmation.`
  : data.deliveryAddress 
    ? `DELIVERY ADDRESS\n${data.deliveryAddress.line1}\n${data.deliveryAddress.line2 ? data.deliveryAddress.line2 + '\n' : ''}${data.deliveryAddress.city}, ${data.deliveryAddress.province} ${data.deliveryAddress.postalCode}${data.fulfillmentMethod === 'delivery' && data.deliveryDistance ? `\nDistance: ${data.deliveryDistance.toFixed(1)} km • Fee: $${data.deliveryFee.toFixed(2)}` : ''}${data.deliveryDate ? '\nScheduled: ' + new Date(data.deliveryDate).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }) + (data.fulfillmentMethod === 'delivery' ? ' (daily delivery run, 2 PM - 7 PM)' : timeSlotLabel ? ', ' + timeSlotLabel : '') : ''}${data.fulfillmentMethod === 'delivery' ? '\n\n⚠️ ID Required at Delivery: ' + LOCAL_DELIVERY_CONFIG.idRequirements.message + '\nDriver will check ID before completing delivery.' : ''}`
    : ''
}

ORDER ITEMS
${data.items.map(item => `- ${item.productName} (${item.size}) × ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Subtotal: $${data.subtotal.toFixed(2)}
${data.fulfillmentMethod === 'pickup' ? 'Pickup' : data.fulfillmentMethod === 'delivery' ? 'Delivery' : 'Shipping'}: ${data.deliveryFee === 0 ? 'FREE' : '$' + data.deliveryFee.toFixed(2)}
Total: $${data.totalPrice.toFixed(2)}

Questions? Email us at ${etransferEmail}

Healing Room Six Nations
${STORE_LOCATION.address}
  `.trim();

  return { subject, html, text };
}

export function generateOrderStatusUpdateEmail(
  orderNumber: string,
  customerName: string,
  newStatus: string,
  message?: string
): { subject: string; html: string; text: string } {
  const statusLabels: Record<string, string> = {
    paid: "Payment Received",
    processing: "Being Prepared",
    ready_for_pickup: "Ready for Pickup",
    out_for_delivery: "Out for Delivery",
    shipped: "Shipped",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const statusEmoji: Record<string, string> = {
    paid: "✅",
    processing: "🔧",
    ready_for_pickup: "📦",
    out_for_delivery: "🚗",
    shipped: "📬",
    delivered: "🎉",
    completed: "✨",
    cancelled: "❌",
  };

  const subject = `${statusEmoji[newStatus] || '📋'} Order ${orderNumber} - ${statusLabels[newStatus] || newStatus}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #2D2D2D; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <tr>
      <td style="background: linear-gradient(135deg, #D4842A 0%, #c47a25 100%); padding: 25px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">${statusEmoji[newStatus] || '📋'} Order Update</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <p style="margin: 0 0 20px;">Hi ${customerName},</p>
        <p style="margin: 0 0 20px;">Your order <strong style="font-family: monospace; color: #D4842A;">${orderNumber}</strong> is now:</p>
        <p style="margin: 0 0 20px; font-size: 24px; font-weight: 700; color: #D4842A; text-align: center;">
          ${statusLabels[newStatus] || newStatus}
        </p>
        ${message ? `<p style="margin: 20px 0; padding: 15px; background: #f8f5f0; border-radius: 8px; font-size: 14px;">${message}</p>` : ''}
        <p style="margin: 20px 0 0; text-align: center;">
          <a href="https://healingroomsixnations.ca/orders" style="display: inline-block; background: #D4842A; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Order</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background: #2D2D2D; padding: 20px; text-align: center;">
        <p style="margin: 0; color: #888; font-size: 12px;">Healing Room Six Nations | ${STORE_LOCATION.email}</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Order Update - ${orderNumber}

Hi ${customerName},

Your order ${orderNumber} is now: ${statusLabels[newStatus] || newStatus}

${message || ''}

View your order at: https://healingroomsixnations.ca/orders

Healing Room Six Nations
${STORE_LOCATION.email}
  `.trim();

  return { subject, html, text };
}

