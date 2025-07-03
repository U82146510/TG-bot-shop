import {Document,Schema,Types,model} from "mongoose";


interface VariantOption {
    [x: string]: any;
    name:string;
    price:number;
    quantity:number;
    description:string;
    review:Types.ObjectId[];
};

interface Variants {
  name: string;
  options: VariantOption[];
}

export interface IProduct extends Document{
    name:string,
    models:Variants[];
};

const variantOptionSchema = new Schema<VariantOption>({
  name: { type: String, required: true,lowercase:true},
  price: { type: Number, required: true },
  quantity: { type: Number, default: 0 },
  description: { type: String },
  review: [{ type: Schema.Types.ObjectId, ref: 'Review' }],
});

const productModelSchema = new Schema<Variants>({
  name: { type: String, required: true,lowercase:true},
  options: [variantOptionSchema],
});

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true, unique: true,lowercase:true },
  models: [productModelSchema],
});

export const Product = model<IProduct>('Product',productSchema);