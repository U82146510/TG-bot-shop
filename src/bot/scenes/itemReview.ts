import {Bot,InlineKeyboard,Context} from 'grammy';
import { logger } from '../logger/logger.ts';
import { Product } from '../models/Products.ts';

export function registerReviewHandler(bot:Bot){
    bot.callbackQuery('review',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        try {
            
        } catch (error) {
            logger.error('this is an error that happend at itemReview handler',error);
        }
    });
}