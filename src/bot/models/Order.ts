import { Schema, model, Document } from "mongoose";

interface IOrderItem {
  productId: string;
  modelName: string;
  optionName: string;
  quantity: number;
}

interface IOrder extends Document {
  userId: string;
  orderId: string;
  items: IOrderItem[];
  shippingAddress: string;
  total: number;
  status: "pending" | "delivered" | "cancelled";
  deliveredAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String, required: true },
    modelName: { type: String, required: true },
    optionName: { type: String, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: String, required: true },
    orderId: { type: String, required: true, unique: true }, // ✅ this alone defines the unique index
    items: [orderItemSchema],
    shippingAddress: { type: String, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "delivered", "cancelled"],
      default: "pending",
    },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  }
);

// ✅ Keep only this compound index (optional but useful)
orderSchema.index({ userId: 1, createdAt: -1 });

export const Order = model<IOrder>("Order", orderSchema);