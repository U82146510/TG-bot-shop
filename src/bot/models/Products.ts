import {Document,Schema,model} from "mongoose";

interface VariantOption {
    name:string;
    price:number;
    quantity:number;
    image:string;
    description:string;
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
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 0 },
  image: { type: String },
  description: { type: String },
});

const productModelSchema = new Schema<Variants>({
  name: { type: String, required: true },
  options: [variantOptionSchema],
});

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true, unique: true },
  models: [productModelSchema],
});

export const Product = model<IProduct>('Product',productSchema);