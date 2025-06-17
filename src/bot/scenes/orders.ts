import {Order} from '../models/Order.ts';
import {Bot,Context} from 'grammy';
import { logger } from '../logger/logger.ts';

export function registerOrdersHandler(bot:Bot<Context>){
    bot.callbackQuery('orders',async(ctx:Context)=>{
        const userId = String(ctx.from?.id);
        
        try {
            const orders =  await Order.findOne({userId});
            if(!orders){
                ctx.reply('your orders list is empty');
                logger.info('your orders list is empty');
                return;
            }
            console.log(orders)
            
        } catch (error) {
            logger.error('its an error at the orders handler');
        }
    });
}