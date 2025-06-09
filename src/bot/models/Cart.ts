import { Schema, model, Document } from "mongoose";

interface CartItem {
  productId: string;
  modelName: string;
  optionName: string;
  quantity: number;
}

interface IUserCart extends Document {
  userId: string;
  items: CartItem[];
}

const cartItemSchema = new Schema<CartItem>({
  productId: String,
  modelName: String,
  optionName: String,
  quantity: Number,
});

const userCartSchema = new Schema<IUserCart>({
  userId: { type: String, required: true, unique: true },
  items: [cartItemSchema],
});

export const UserCart = model<IUserCart>("UserCart", userCartSchema);