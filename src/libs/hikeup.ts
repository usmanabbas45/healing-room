/**
 * Hikeup POS API Integration
 * 
 * This module provides functions to interact with Hikeup POS API
 * Documentation: https://docs.hikeup.com
 * Developer Portal: https://developer.hikeup.com
 */

import prisma from "@/libs/prisma";

interface HikeupConfig {
  clientId: string;
  clientSecret: string;
  storeId: string;
  baseUrl?: string;
}

interface HikeupProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
  barcode?: string;
  category?: string;
  inventory?: number;
  images?: string[];
  variants?: Array<{
    id: string;
    name: string;
    price: number;
    sku?: string;
    inventory?: number;
  }>;
}

interface HikeupCustomer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface HikeupOrder {
  id: string;
  customerId?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: string;
  createdAt: string;
}

class HikeupClient {
  private config: HikeupConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseUrl: string;

  constructor(config: HikeupConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.hikeup.com';
  }

  /**
   * Get OAuth access token
   * You'll need to implement OAuth flow - this is a placeholder
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    throw new Error('OAuth token not implemented. Please implement OAuth flow.');
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Hikeup API Error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all products from Hikeup
   */
  async getProducts(): Promise<HikeupProduct[]> {
    return this.apiRequest<HikeupProduct[]>('/v1/products');
  }

  /**
   * Get a single product by ID
   */
  async getProduct(productId: string): Promise<HikeupProduct> {
    return this.apiRequest<HikeupProduct>(`/v1/products/${productId}`);
  }

  /**
   * Get product inventory
   */
  async getInventory(productId?: string): Promise<any> {
    const endpoint = productId 
      ? `/v1/inventory/${productId}`
      : '/v1/inventory';
    return this.apiRequest(endpoint);
  }

  /**
   * Create or update a customer
   */
  async createCustomer(customer: Partial<HikeupCustomer>): Promise<HikeupCustomer> {
    return this.apiRequest<HikeupCustomer>('/v1/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<HikeupCustomer> {
    return this.apiRequest<HikeupCustomer>(`/v1/customers/${customerId}`);
  }

  /**
   * Create an order in Hikeup
   */
  async createOrder(order: Partial<HikeupOrder>): Promise<HikeupOrder> {
    return this.apiRequest<HikeupOrder>('/v1/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<HikeupOrder> {
    return this.apiRequest<HikeupOrder>(`/v1/orders/${orderId}`);
  }

  /**
   * Sync products from Hikeup to PostgreSQL
   */
  async syncProductsToDatabase(): Promise<void> {
    const hikeupProducts = await this.getProducts();
    
    for (const hikeupProduct of hikeupProducts) {
      // Upsert product
      await prisma.product.upsert({
        where: { id: hikeupProduct.id },
        update: {
          name: hikeupProduct.name,
          description: hikeupProduct.description || '',
          price: hikeupProduct.price,
          category: hikeupProduct.category || 'uncategorized',
          images: hikeupProduct.images || [],
        },
        create: {
          id: hikeupProduct.id,
          name: hikeupProduct.name,
          description: hikeupProduct.description || '',
          price: hikeupProduct.price,
          category: hikeupProduct.category || 'uncategorized',
          sizes: ['default'],
          images: hikeupProduct.images || [],
        },
      });

      // Sync variants
      if (hikeupProduct.variants) {
        for (const variant of hikeupProduct.variants) {
          await prisma.productVariant.upsert({
            where: { id: variant.id },
            update: {
              priceId: variant.id,
              color: variant.name,
              images: hikeupProduct.images || [],
            },
            create: {
              id: variant.id,
              priceId: variant.id,
              color: variant.name,
              images: hikeupProduct.images || [],
              productId: hikeupProduct.id,
            },
          });
        }
      }
    }
  }
}

/**
 * Create a Hikeup client instance
 */
export function createHikeupClient(): HikeupClient {
  const clientId = process.env.HIKEUP_CLIENT_ID;
  const clientSecret = process.env.HIKEUP_CLIENT_SECRET;
  const storeId = process.env.HIKEUP_STORE_ID;

  if (!clientId || !clientSecret || !storeId) {
    throw new Error(
      'Missing Hikeup credentials. Please set HIKEUP_CLIENT_ID, HIKEUP_CLIENT_SECRET, and HIKEUP_STORE_ID environment variables.'
    );
  }

  return new HikeupClient({
    clientId,
    clientSecret,
    storeId,
  });
}

export type { HikeupProduct, HikeupCustomer, HikeupOrder, HikeupConfig };
