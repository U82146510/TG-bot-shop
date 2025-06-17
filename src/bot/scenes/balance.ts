import {InlineKeyboard,Bot,Context} from 'grammy';
import { User } from '../models/User.ts';
import { logger } from '../logger/logger.ts';
import {UserFlowState} from '../models/UserFlowState.ts';
import { handleTopUpXmr } from './addBalancePayment.ts';

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
        const keyboard = new InlineKeyboard().text("❌ Cancel", "cancel_add_balance");
        try {
            await ctx.editMessageText(`To add balance, please select an amount or enter a custom value.\n\n(⚙️ To be implemented...)`,{
                reply_markup:keyboard
            })
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

    bot.callbackQuery('cancel_add_balance',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const telegramId = ctx.from?.id;
        if(!telegramId) return;
        try {
            await UserFlowState.findOneAndUpdate({userId:String(telegramId)},{
                $unset:{
                    flow:true,data:true
                }
            });
            const user = await User.findOne({telegramId});
            if(!user) return ctx.editMessageText("User not found. Please start again with /start.");
            const keyboard = new InlineKeyboard()
            .text('➕ Add Balance', 'add_balance')
            .text("🔙 Back", "back_to_home");
            await ctx.editMessageText(
                `💰 Your current balance: ${user.balance.toFixed(2)} XMR`,
                { reply_markup: keyboard });
        } catch (error) {
            logger.error('error ad the cancel_add_balance',error);
            await ctx.reply("⚠️ Something went wrong.");
        }
    });

   bot.on('message:text', async (ctx: Context, next) => {
        const telegramId = ctx.from?.id;
        if (!telegramId) return next();

        const flowState = await UserFlowState.findOne({ userId: String(telegramId) });

        // Only handle if user is in the add_balance flow
        if (!flowState || flowState.flow !== 'add_balance') return next();

        const cancelKeyboard = new InlineKeyboard().text("❌ Cancel", "cancel_add_balance");

        try {
            const input = ctx.message?.text?.trim();
            if (!input) {
            return ctx.reply('Please enter the amount:', { reply_markup: cancelKeyboard });
            }

            if (!/^(\d+|\d+\.\d{1,8}|\.\d{1,8})$/.test(input)) {
            return ctx.reply("❌ Invalid format. Use up to 8 decimal places.", { reply_markup: cancelKeyboard });
            }

            const amount = parseFloat(input);
            if (isNaN(amount) || amount <= 0) {
            return ctx.reply("❌ Invalid amount. Please enter a positive number (e.g. 0.5).", { reply_markup: cancelKeyboard });
            }

            if (amount > 1000) {
            return ctx.reply("❌ Max top-up amount is 1000 XMR.", { reply_markup: cancelKeyboard });
            }

            await UserFlowState.findOneAndUpdate(
            { userId: String(telegramId) },
            { $set: { 'data.amount': amount } }
            );

            await ctx.reply(`✅ Amount accepted: ${amount} XMR\nGenerating payment address...`, {
            reply_markup: cancelKeyboard,
            });

            await handleTopUpXmr(ctx, String(telegramId));

        } catch (error) {
            logger.error('Error while handling XMR amount input', error);
            await ctx.reply("⚠️ Something went wrong while processing your amount.");
        }
        });

};