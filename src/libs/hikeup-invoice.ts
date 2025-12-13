/**
 * Hikeup Invoice Creation
 * Create sales invoices in Hikeup POS when customers place orders
 */

import { hikeupPost, isHikeupConnected, ensureHikeupCustomer } from './hikeup';
import { getBasePrice } from './pricing';

export interface HikeupInvoiceLineItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number; // Base price (without markup)
  totalPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount?: number;
  note?: string;
}

export interface HikeupInvoicePayment {
  paymentType: string; // "Cash", "Credit Card", "E-Transfer", etc.
  amount: number;
  note?: string;
}

export interface CreateHikeupInvoiceData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number; // Marked up price
  }>;
  subtotal: number; // Marked up subtotal
  deliveryFee: number;
  total: number; // Marked up total
  paymentMethod: string;
  paymentStatus: string;
  transactionDate: Date;
  notes?: string;
}

/**
 * Create an invoice in Hikeup POS
 * Converts website order to Hikeup invoice format
 */
export async function createHikeupInvoice(data: CreateHikeupInvoiceData): Promise<{
  success: boolean;
  hikeupInvoiceId?: number;
  error?: string;
}> {
  try {
    // Check if Hikeup is connected
    const connected = await isHikeupConnected();
    if (!connected) {
      console.log('⚠️ Hikeup not connected, skipping invoice creation');
      return { success: false, error: 'Hikeup not connected' };
    }

    console.log(`📄 Creating Hikeup invoice for order: ${data.orderNumber}`);

    // Ensure customer exists in Hikeup
    const customerResult = await ensureHikeupCustomer(
      data.customerEmail,
      data.customerName
    );

    if (!customerResult.customer) {
      console.error('❌ Failed to create/get Hikeup customer');
      return { success: false, error: 'Failed to create customer in Hikeup' };
    }

    const hikeupCustomerId = customerResult.customer.id;
    console.log(`✅ Hikeup customer ID: ${hikeupCustomerId}${customerResult.created ? ' (newly created)' : ''}`);

    // Convert line items - use base prices (remove markup for Hikeup)
    const invoiceLineItems = data.items.map((item) => {
      const basePricePerUnit = getBasePrice(item.price);
      const totalPrice = basePricePerUnit * item.quantity;

      return {
        productId: parseInt(item.productId, 10),
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: basePricePerUnit,
        totalPrice: totalPrice,
        taxRate: 0, // Hikeup will calculate if tax is enabled
        taxAmount: 0,
        note: '',
      };
    });

    // Calculate totals using base prices (without markup)
    const baseSubtotal = getBasePrice(data.subtotal);
    const baseDeliveryFee = getBasePrice(data.deliveryFee);
    const baseTotal = getBasePrice(data.total);

    // Map payment method to Hikeup format
    const paymentType = data.paymentMethod === 'etransfer' ? 'E-Transfer' : 
                       data.paymentMethod === 'cash_on_delivery' ? 'Cash' : 
                       'Other';

    // Map payment status
    const hikeupPaymentStatus = data.paymentStatus === 'received' || data.paymentStatus === 'confirmed' ? 'Paid' : 'Pending';
    const hikeupStatus = hikeupPaymentStatus === 'Paid' ? 'Finalized' : 'Quote';

    // Build invoice data
    const invoiceData = {
      number: data.orderNumber,
      transactionDate: data.transactionDate.toISOString(),
      customerId: hikeupCustomerId,
      customerName: data.customerName,
      customerEmailId: data.customerEmail,
      customerPhone: data.customerPhone || '',
      status: hikeupStatus, // "Quote", "Layby", "Finalized", etc.
      paymentStatus: hikeupPaymentStatus, // "Pending", "Paid", "Partial", etc.
      taxInclusive: true,
      applyTaxAfterDiscount: true,
      discountIsAsPercentage: false,
      discountValue: 0,
      subTotal: baseSubtotal,
      totalDiscount: 0,
      totalShippingCost: baseDeliveryFee,
      shippingDiscount: 0,
      totalTax: 0, // Hikeup will calculate if needed
      netAmount: baseTotal,
      totalPaid: hikeupPaymentStatus === 'Paid' ? baseTotal : 0,
      totalTender: hikeupPaymentStatus === 'Paid' ? baseTotal : 0,
      changeAmount: 0,
      currency: 'CAD',
      note: data.notes || `Online order from website - Order #${data.orderNumber}`,
      doNotUpdateInvenotry: false, // Update inventory in Hikeup
      doCalculation: true, // Let Hikeup calculate totals
      invoiceLineItems: invoiceLineItems,
      invoicePayments: hikeupPaymentStatus === 'Paid' ? [
        {
          paymentType: paymentType,
          amount: baseTotal,
          note: `${paymentType} payment for order ${data.orderNumber}`,
        },
      ] : [],
    };

    console.log('📤 Sending invoice to Hikeup:', JSON.stringify(invoiceData, null, 2));

    // Create invoice in Hikeup
    const response = await hikeupPost<any>('/sales/create', invoiceData);

    console.log('✅ Hikeup invoice created successfully:', response);

    return {
      success: true,
      hikeupInvoiceId: response.id || response.invoice_id,
    };

  } catch (error: any) {
    console.error('❌ Error creating Hikeup invoice:', error);
    return {
      success: false,
      error: error.message || 'Unknown error creating Hikeup invoice',
    };
  }
}

/**
 * Update invoice payment status in Hikeup
 * Call this when payment is confirmed
 */
export async function updateHikeupInvoicePayment(
  hikeupInvoiceId: number,
  paymentAmount: number,
  paymentMethod: string = 'E-Transfer'
): Promise<{ success: boolean; error?: string }> {
  try {
    const connected = await isHikeupConnected();
    if (!connected) {
      return { success: false, error: 'Hikeup not connected' };
    }

    console.log(`💳 Updating Hikeup invoice ${hikeupInvoiceId} payment`);

    // Update invoice with payment
    const updateData = {
      id: hikeupInvoiceId,
      paymentStatus: 'Paid',
      status: 'Finalized',
      totalPaid: paymentAmount,
      invoicePayments: [
        {
          paymentType: paymentMethod,
          amount: paymentAmount,
        },
      ],
    };

    await hikeupPost<any>('/sales/create', updateData);

    console.log(`✅ Updated Hikeup invoice ${hikeupInvoiceId} to Paid`);

    return { success: true };

  } catch (error: any) {
    console.error('❌ Error updating Hikeup invoice payment:', error);
    return { success: false, error: error.message };
  }
}

