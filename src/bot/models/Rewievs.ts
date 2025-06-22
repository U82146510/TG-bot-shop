import {Document,Schema,model} from "mongoose";

interface IReview extends Document{
    comment:string;
};

const reviewShema = new Schema<IReview>({
    comment:{type:String}
});
export const Review = model<IReview>('Review', reviewShema);