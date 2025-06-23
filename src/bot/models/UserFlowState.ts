import {Schema,Document,model} from 'mongoose';

interface IUserFlowState extends Document{
    userId:string;
    flow:'add_balance'|'checkout'|'support'|'awaiting_address';
    data?:any;
    updatedAt:Date
};

const userFlowStateSchema = new Schema<IUserFlowState>(
    {
        userId:{type:String,required:true,unique:true},
        flow:{
            type:String,
            enum:['add_balance','checkout','support','awaiting_address','locked','await_comment'],
            required:true,
        },
        data:{type:Schema.Types.Mixed,default:{}}
    }
,{
    timestamps:true
});
userFlowStateSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 1800 });
export const UserFlowState = model<IUserFlowState>('UserFlowState',userFlowStateSchema);