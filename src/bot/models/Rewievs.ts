import { Document, Schema, model } from "mongoose";


interface IReview extends Document {
  comment: string;
  post: boolean;
  variantName: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
  comment: { type: String },
  post: { type: Boolean, default:false },
  variantName: { type: String, required: true } // Just track the variant
}, { timestamps: true });

export const Review = model<IReview>('Review', reviewSchema);
