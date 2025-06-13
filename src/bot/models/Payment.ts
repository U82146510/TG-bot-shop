import {Schema,Document,Model, model} from 'mongoose';

interface IPayment extends Document{
    userId:string;
    integratedAddress:string;
    paymentId:string;
    amount:number;
    status:'pending'|'confirmed'|'expired';
    createdAt:Date;
    confirmedAt?:Date;
};

const paymentSchema = new Schema<IPayment>({
    userId:{type:String,required:true},
    integratedAddress:{type:String,required:true},
    paymentId:{type:String,required:true,unique:true},
    amount:{type:Number,required:true},
    status:{
        type:String,
        enume:['pending','confirmed','expired'],
        default:'pending'
    },
    createdAt:{type:Date,default:Date.now},
    confirmedAt:{type:Date}
});

export const Payment = model<IPayment>("Payment",paymentSchema);