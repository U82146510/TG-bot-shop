import {InlineKeyboard,Bot,Context} from 'grammy';
import { User } from '../models/User.ts';
import { logger } from '../logger/logger.ts';
import {UserFlowState} from '../models/UserFlowState.ts';

export function registerBalanceHandler(bot:Bot<Context>){
    bot.callbackQuery('balance',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const telegramId = ctx.from?.id;
        if(!telegramId) return;
        try {
            const user = await User.findOne({telegramId});
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
        const telegramId = ctx.from?.id;
        if(!telegramId) return;
        
        try {
            await ctx.editMessageText(`To add balance, please select an amount or enter a custom value.\n\n(⚙️ To be implemented...)`)
            await UserFlowState.findOneAndUpdate({userId:String(telegramId)},{
                $set:{
                    flow:'add_balance',
                    data:{}
                }
            },{ upsert: true})
        } catch (error) {
            logger.error('Error at add_balance handler',error);
        }
    });

    bot.on('message:text',async(ctx:Context)=>{
       const telegramId = ctx.from?.id;
       if(!telegramId) return;
        
       const flowState = await UserFlowState.findOne({userId:String(telegramId)});
       if(!flowState || flowState.flow!=='add_balance') return; 
       const input = ctx.message?.text?.trim();
       if(!input){
            return ctx.reply('Please enter the amount:');
       }
       const sanitizedInput = input.replace(/[^\d.]/g, '');
       const amount = parseFloat(sanitizedInput);
       if (isNaN(amount) || amount <= 0) {
            return ctx.reply("❌ Invalid amount. Please enter a positive number (e.g. 0.5).");
       }
       if (!/^(\d+|\d+\.\d{1,8}|\.\d{1,8})$/.test(sanitizedInput)) {
            return ctx.reply("❌ Invalid format. Use up to 8 decimal places.");
       }
       if (amount > 1000) {
            return ctx.reply("❌ Max top-up amount is 1000 XMR.");
       }
    });
};