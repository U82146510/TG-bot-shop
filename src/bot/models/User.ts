import {Types, Document,Model,Schema, model } from "mongoose";

interface IUser extends Document{
    telegramId:number;
    balance:number;
    registeredAt:Date;
    orders:Types.ObjectId[];
};

const UserSchema = new Schema<IUser>({
    telegramId:{type:Number,required:true,unique:true},
    balance:{type:Number,default:0},
    registeredAt:{type:Date,default:Date.now},
    orders:[{type:Schema.Types.ObjectId,ref:'Order'}]
});

export const User = model<IUser>('User',UserSchema);