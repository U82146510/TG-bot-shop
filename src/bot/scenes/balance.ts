import {InlineKeyboard,Bot,Context} from 'grammy';
import { User } from '../models/User.ts';
import { logger } from '../logger/logger.ts';
import { parse } from 'path';

export function registerBalanceHandler(bot:Bot<Context>){
    bot.callbackQuery('balance',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const telegramId = ctx.from?.id;
        if(!telegramId) return;
        let user;
        try {
            user = await User.findOne({telegramId});
            if(!user) return ctx.answerCallbackQuery({ text: 'User not found.' });

            const keyboard = new InlineKeyboard()
            .text('➕ Add Balance', 'add_balance')
            .text("🔙 Back", "back_to_home");
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

    bot.on('message:text',async(ctx:Context)=>{
       const telegramId = ctx.from?.id;
       if(!telegramId) return;
       const input = ctx.message?.text?.trim();
       if(!input){
            return ctx.reply('please enter the amount');
       }
       const amount = parseFloat(input);
       if (isNaN(amount) || amount <= 0) {
            return ctx.reply("❌ Invalid amount. Please enter a positive number (e.g. 0.5).");
       }
       if (!/^\d+(\.\d{1,8})?$/.test(input)) {
            return ctx.reply("❌ Invalid format. Use up to 8 decimal places.");
       }
       if (amount > 1000) {
            return ctx.reply("❌ Max top-up amount is 1000 XMR.");
       }
    });
};