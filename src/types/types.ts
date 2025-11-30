// Types for Healing Room E-commerce

export interface EnrichedOrders {
  id: string;
  name: string;
  email: string;
  phone: string | null; // Shipping contact phone (kept for orders)
  address: AddressType;
  products: EnrichedProducts[];
  orderId: string;
  total_price: number;
  orderNumber: string;
  expectedDeliveryDate: Date | null;
  purchaseDate: Date;
  status: string;
}

export interface EnrichedProducts {
  _id: string;
  id?: string;
  name: string;
  category: string;
  image: string[];
  price: number;
  purchased: boolean;
  color: string;
  size: string;
  quantity: number;
  productId: string;
  variantId: string;
}

export interface AddressType {
  city: string;
  country: string;
  line1: string;
  line2?: string | null;
  postal_code: string;
  state?: string | null;
}

export interface ProductType {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sizes: string[];
  images: string[];
  variants: VariantType[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VariantType {
  id: string;
  priceId: string;
  color: string;
  name?: string;
  fullName?: string;
  sku?: string;
  barcode?: string;
  images: string[];
  productId: string;
  inventory?: number;
  price?: number;
}

export interface UserType {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role: string; // "user" or "staff"
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemType {
  id: string;
  productId: string;
  variantId?: string | null;
  size: string;
  quantity: number;
  price: number;
}

export interface OrderItemType {
  id: string;
  productId: string;
  variantId?: string | null;
  size: string;
  quantity: number;
  price: number;
  color?: string | null;
  image?: string | null;
}

// Legacy types for compatibility
export interface ProductDocument extends ProductType {
  _id?: string;
  image?: string[];
}

export interface VariantsDocument {
  _id?: string;
  priceId: string;
  color: string;
  name?: string;
  fullName?: string;
  sku?: string;
  barcode?: string;
  images: string[];
  inventory?: number;
  price?: number;
}

export interface ItemDocument {
  productId: string;
  color: string;
  size: string;
  quantity: number;
  variantId: string;
  price: number;
}

export interface UserDocument {
  id: string;
  email: string;
  password?: string | null;
  name: string;
  image?: string | null;
  role?: string; // "user" or "staff"
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
