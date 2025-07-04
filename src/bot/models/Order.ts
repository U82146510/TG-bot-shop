import { Schema, model, Document } from "mongoose";
import { required } from "zod/v4-mini";

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
  delivery: {
    type: "tracked" | "not_tracked" | "special_stealth" | "top_stealth";
    price: number;
  };
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
    orderId: { type: String, required: true, unique: true },
    items: [orderItemSchema],
    shippingAddress: { type: String, required: true },
    delivery:{
      type:{
        type:String,
        enum:["tracked", "not_tracked", "special_stealth", "top_stealth"],
        required:true,
    },
      price:{type:Number,required:true}
    },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "delivered", "cancelled"],
      default: "pending",
    },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    createdAt: { type: Date, default: Date.now},
  }
);


orderSchema.index({ userId: 1, createdAt: -1 });

export const Order = model<IOrder>("Order", orderSchema);