import { Schema, model, Document } from "mongoose";

export interface IUserState extends Document {
  userId: string;
  productId: string;
  modelName: string;
  updatedAt?: Date;
}

const userStateSchema = new Schema<IUserState>(
  {
    userId: { type: String, required: true, unique: true },
    productId: { type: String, required: true },
    modelName: { type: String, required: true },
  },
  {
    timestamps: true, 
  }
);

userStateSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

export const UserState = model<IUserState>("UserState", userStateSchema);
