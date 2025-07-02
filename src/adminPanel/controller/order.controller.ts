import {type Request,type Response,type NextFunction} from 'express';
import { logger } from '../../bot/logger/logger.ts';
import { Order } from '../../bot/models/Order.ts';
import {z} from 'zod';




const orderSchema = z.object({
  page: z.string().default('1')
    .transform(val => Number(val))
    .refine(val => !isNaN(val) && val >= 1, {
      message: "Page must be a number greater than or equal to 1"
    }),
  limit: z.string().default('10')
    .transform(val => Number(val))
    .refine(val => !isNaN(val) && val > 0 && val <= 100, {
      message: "Limit must be a number between 1 and 100"
    }),
  status: z.enum(["pending", "delivered", "cancelled"]).optional(),
  userId: z.string().optional(),
  orderId: z.string().regex(/^\d{14}$/, "Order ID must be a 14-digit number").optional()
});



export const getOrder = async(req:Request,res:Response,next:NextFunction)=>{
    const cleanQuery = Object.fromEntries(
    Object.entries(req.query).filter(([_, value]) => value !== '')
    );

    const parsed = orderSchema.safeParse(cleanQuery);

    if(!parsed.success){
        res.status(400).json({ error: 'Invalid query parameters' });
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
        res.status(500).json({error:'Error at the getOrder route'})
    }
};


const orderIdParamSchema = z.object({
  orderId: z.string().regex(/^\d{14}$/, 'Order ID must be a 14-digit number')
});

const editOrderBodySchema = z.object({
  status: z.enum(["pending", "delivered", "cancelled"]),
});

export const editOrder = async (req: Request, res: Response, next: NextFunction) => {
  const paramValidation = orderIdParamSchema.safeParse(req.params);
  const bodyValidation = editOrderBodySchema.safeParse(req.body);

  if (!paramValidation.success) {
    res.status(400).json({ error: "Order ID must be a valid 14-digit number" });
    return
  }
  if (!bodyValidation.success) {
    res.status(400).json({ error: "Status must be one of: pending, delivered, or cancelled" });
    return
  }

  const { orderId } = paramValidation.data;
  const { status } = bodyValidation.data;

  try {
    const order = await Order.findOneAndUpdate(
      { orderId },
      { $set: { status } },
      { new: true }
    );

    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return
    }

    res.status(200).json({ message: "Order updated", order });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Error at editOrder route" });
  }
};




export const deleteOrder = async(req:Request,res:Response,next:NextFunction)=>{
  const parsed = orderIdParamSchema.safeParse(req.params);
  try {
    if(!parsed.success){
      res.status(400).json({ error: 'Invalid order ID format for deletion' });
      return;
    }
    const {orderId} = parsed.data;
    const order = await Order.findOneAndDelete({orderId});
    if(!order){
      res.status(404).json({ message: 'Order not found or already deleted' });
      return;
    }
    res.status(200).json({message:`Order ${orderId} deleted`});
  } catch (error) {
    logger.error(error);
    res.status(500).json({error:'Error at the getOrder route'})
  }
};