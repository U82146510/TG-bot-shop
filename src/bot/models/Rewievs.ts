import { Document, Schema, model } from "mongoose";

interface IReview extends Document {
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
    comment: { type: String }
}, {
    timestamps: true // 👈 enables createdAt and updatedAt
});

export const Review = model<IReview>('Review', reviewSchema);
