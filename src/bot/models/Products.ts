import mongoose,{Document,Schema,model} from "mongoose";

interface IProduct extends Document{
    name:string,
    type_of:{
        type_of:string;
        name:string;
        price:number;
        quantity:number;
        image:string;
        reviews:Array<string>;
    }
};

const productSchema = new Schema<IProduct>({
    name:{type:String,unique:true,required:true},
    type_of:{
        type_of:{type:String,unique:true,required:true},
        name:{type:String,required:true},
        price:{type:Number,required:true,default:0},
        quantity:{type:Number,required:true,default:0},
        image:{type:String},
        reviews:[{type:String}]
    }
});

export const Product = model<IProduct>('Product',productSchema);