import {type Request,type Response,type NextFunction} from 'express';
import { logger } from '../../bot/logger/logger.ts';
import { Order } from '../../bot/models/Order.ts';
import { Payment } from '../../bot/models/Payment.ts';
import {z} from 'zod';


const paymentSchema = z.object({
    page: z.string().default('1').transform(Number).refine(p => p >= 1, {
        message: "Page must be at least 1"
    }),
    limit: z.string().default('10').transform(Number).refine(l => l > 0 && l <= 100, {
        message: "Limit must be between 1 and 100"
    }),
    userId:z.string().optional(),
    paymentId:z.string().optional(),
    status:z.enum(["pending", "delivered", "cancelled"]).optional(),

});

export const paymentHandler = async(req:Request,res:Response,next:NextFunction)=>{
    const parsed = paymentSchema.safeParse(req.query);

    if(!parsed.success){
        res.status(400).json({error:'Dont try to do stupid inpus at payment route'});
        return;
    }
    const {page,limit,userId,paymentId,status} = parsed.data;
    const skip = (page-1)*limit;

    const filter:Record<string,any> = {};
    if(userId) filter.userId = userId;
    if(paymentId) filter.paymentId = paymentId;
    if(status) filter.status = status;

    try {
        const payments = await Payment.find(filter).skip(skip).limit(limit);
        if(payments.length===0){
            res.status(400).json({msg:'Payment DB is empty'});
            return;
        }
        res.status(200).json({message:payments});
    } catch (error) {
        logger.error(error);
    }
};
