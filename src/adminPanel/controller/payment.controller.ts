import {type Request,type Response,type NextFunction} from 'express';
import { logger } from '../../bot/logger/logger.ts';
import { Payment } from '../../bot/models/Payment.ts';
import {z} from 'zod';


const paymentSchema = z.object({
  page: z.string().default('1').transform(Number).refine(p => p >= 1, {
    message: "Page must be at least 1"
  }),
  limit: z.string().default('10').transform(Number).refine(l => l > 0 && l <= 100, {
    message: "Limit must be between 1 and 100"
  }),
  userId: z.string()
    .regex(/^\d{5,32}$/, "User ID must be 5 to 32 digits")
    .optional(),

  paymentId: z.string()
    .regex(/^[a-f0-9]{6,32}$/i, "Payment ID must be a 6 to 32 character hexadecimal string")
    .optional(),

  status: z.enum(['pending', 'confirmed', 'expired']).optional(),
});


export const paymentHandler = async(req:Request,res:Response,next:NextFunction)=>{
    const cleanQuery = Object.fromEntries(
        Object.entries(req.query).filter(([_, value]) => value !== '')
    );

    const parsed = paymentSchema.safeParse(cleanQuery);

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
            res.status(404).json({msg:'Payment DB is empty'});
            return;
        }
        res.status(200).json({message:payments});
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Server error while retrieving payments.' });
        return;
    }
};
