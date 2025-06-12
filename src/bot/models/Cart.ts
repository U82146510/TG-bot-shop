import { Schema, model,Types, Document } from "mongoose";

interface CartItem {
  _id?: Types.ObjectId;
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
  productId: { type: String, required: true },
  modelName: { type: String, required: true },
  optionName: { type: String, required: true },
  quantity: { type: Number, required: true },
}, { _id: true });


const userCartSchema = new Schema<IUserCart>({
  userId: { type: String, required: true, unique: true },
  items: [cartItemSchema],
});

export const UserCart = model<IUserCart>("UserCart", userCartSchema);