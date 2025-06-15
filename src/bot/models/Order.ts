import {Schema,model,Types} from 'mongoose';

interface IOrder extends Document{
    user:Types.ObjectId,
    items:{
        productId:string;
        modelName:string;
        optionName:string;
        quantity:number;
        priceAtPurchase:number;
    }[];
    total:number;
    status:'pending'|'processing'|'delivered';
    shippingAddress: string;
    createdAt:Date;
    updatedAt:Date;
};

const OrderSchema = new Schema<IOrder>({
    user:{type:Schema.Types.ObjectId,ref:'User',required:true},
    items:[
        {
            productId:{type:String,require:true},
            modelName:{type:String,required:true},
            optionName:{type:String,required:true},
            quantity:{type:Number,required:true},
            priceAtPurchase:{type:String,required:true}
        }
    ],
    total:{type:Number,required:true},
    status:{type:String,enum:['pending','processing','delivered'],default:'pending'},
    shippingAddress:{type:String,required:true}

},{
    timestamps:true
});

export const Order = model<IOrder>('User',OrderSchema);