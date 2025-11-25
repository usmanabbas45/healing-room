import { Schema, model, models, Document } from "mongoose";

export interface WishlistItem {
  productId: Schema.Types.ObjectId;
}

export interface WishlistDocument extends Document {
  userId: string;
  items: WishlistItem[];
  updatedAt: Date;
}

const WishlistItemSchema = new Schema<WishlistItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
});

const WishlistSchema = new Schema<WishlistDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: [WishlistItemSchema],
  },
  {
    timestamps: true,
  }
);

const Wishlist = models.Wishlist || model<WishlistDocument>("Wishlist", WishlistSchema);
export default Wishlist;

