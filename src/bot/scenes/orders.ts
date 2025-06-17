import {Order} from '../models/Order.ts';
import {Bot,Context} from 'grammy';
import { logger } from '../logger/logger.ts';

export function registerOrdersHandler(bot:Bot<Context>){
    bot.callbackQuery('orders',async(ctx:Context)=>{
        try {
            
        } catch (error) {
            
        }
    });
}