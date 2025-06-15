import {InlineKeyboard,Bot,Context} from 'grammy';
import { User } from '../models/User.ts';
import { logger } from '../logger/logger.ts';

export function registerBalanceHandler(bot:Bot<Context>){
    bot.callbackQuery('balance',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const telegramId = ctx.from?.id;
        if(!telegramId) return;
        let user;
        try {
            user = await User.findOne({telegramId});
            if(!user) return ctx.answerCallbackQuery({ text: 'User not found.' });

            const keyboard = new InlineKeyboard().text('➕ Add Balance', 'add_balance');
            await ctx.editMessageText(
                `💰 Your current balance: ${user.balance.toFixed(2)} XMR`,
            {
                reply_markup:keyboard
            })
        } catch (error) {
            logger.error('error at the balance handler',error);
            await ctx.answerCallbackQuery({ text: 'Something went wrong.' });
        }
        
    });

    bot.callbackQuery('add_balance',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(`To add balance, please select an amount or enter a custom value.\n\n(⚙️ To be implemented...)`)
    });
};