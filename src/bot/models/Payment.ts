import { Schema, Document, model } from 'mongoose';

export interface IPayment extends Document {
  userId: string;
  integratedAddress: string;
  paymentId: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'expired';
  createdAt: Date;
  confirmedAt?: Date;
}

const paymentSchema = new Schema<IPayment>({
  userId: { type: String, required: true },
  integratedAddress: { type: String, required: true },
  paymentId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'expired'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date, default: null },
});


paymentSchema.index({ status: 1, createdAt: 1 }); // Optional compound index
paymentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });

export const Payment = model<IPayment>('Payment', paymentSchema);