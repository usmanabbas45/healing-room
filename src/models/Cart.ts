import { Schema, model, models, Document } from "mongoose";

export interface CartItem {
  productId: Schema.Types.ObjectId;
  size: string;
  variantId: string;
  quantity: number;
  price: number;
}

export interface CartDocument extends Document {
  userId: string;
  items: CartItem[];
  updatedAt: Date;
}

const CartItemSchema = new Schema<CartItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  size: {
    type: String,
    required: true,
  },
  variantId: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
});

const CartSchema = new Schema<CartDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: [CartItemSchema],
  },
  {
    timestamps: true,
  }
);

const Cart = models.Cart || model<CartDocument>("Cart", CartSchema);
export default Cart;

