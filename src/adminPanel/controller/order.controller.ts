import {type Request,type Response,type NextFunction} from 'express';
import { logger } from '../../bot/logger/logger.ts';
import { Order } from '../../bot/models/Order.ts';
import {z} from 'zod';



const orderSchema = z.object({
  page: z.string().default('1').transform(Number).refine(p => p >= 1, {
    message: "Page must be at least 1"
  }),
  limit: z.string().default('10').transform(Number).refine(l => l > 0 && l <= 100, {
    message: "Limit must be between 1 and 100"
  }),
  status:z.enum(["pending", "delivered", "cancelled"]).optional(),
  userId:z.string().optional(),
  orderId:z.string().optional(),
});


export const orderHandler = async(req:Request,res:Response,next:NextFunction)=>{
    const parsed = orderSchema.safeParse(req.query);
    if(!parsed.success){
        res.status(400).json({error:'Dont try to do any stupid inputs'});
        return;
    } 

    const {page,limit,status,orderId,userId} = parsed.data;

    const skip = (page-1) * limit;
    try {
        const filter: Record<string, any> = {};
        if (status) filter.status = status;
        if (orderId) filter.orderId = orderId;
        if (userId) filter.userId = userId;

        const orders = await Order.find(filter).skip(skip).limit(limit);
        if(orders.length === 0){
            res.status(404).json({message:'No orders in the DB'});
            return;
        }
        const total = await Order.countDocuments(filter);
        res.status(200).json({
            total,
            page,
            limit,
            orders
        });
    } catch (error) {
        logger.error(error);
    }
};