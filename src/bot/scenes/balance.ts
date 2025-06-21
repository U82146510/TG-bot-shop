import {InlineKeyboard,Bot,Context} from 'grammy';
import { User } from '../models/User.ts';
import { logger } from '../logger/logger.ts';
import {UserFlowState} from '../models/UserFlowState.ts';
import { handleTopUpXmr } from './addBalancePayment.ts';
import {redis} from '../utils/redis.ts';
import {deleteCachedMessages} from '../utils/cleanup.ts';

export function registerBalanceHandler(bot:Bot<Context>){
    bot.callbackQuery('balance',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const telegramId = ctx.from?.id;
        if(!telegramId) return;
        const redisKey = `balance_msgs:${telegramId}`
        await deleteCachedMessages(ctx, redisKey);
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
        const redisKey = `balance_msgs:${telegramId}`
        
        if(!telegramId) return;
        const keyboard = new InlineKeyboard().text("❌ Cancel", "cancel_add_balance");
        try {
            const msg1 = await ctx.reply(`To add balance, please select an amount or enter a custom value.\n\n`,{
                reply_markup:keyboard
            });
            redis.pushList(redisKey,[String(msg1.message_id)])
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
        const redisKey = `balance_msgs:${telegramId}`
        try {
            await deleteCachedMessages(ctx, redisKey);
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
            const msg = await ctx.reply("⚠️ Something went wrong.");
            redis.pushList(redisKey,[String(msg.message_id)])
        }
    });

   bot.on('message:text', async (ctx: Context, next) => {
        const telegramId = ctx.from?.id;
        if (!telegramId) return next();
        const redisKey = `balance_msgs:${telegramId}`
        const flowState = await UserFlowState.findOne({ userId: String(telegramId) });

        // Only handle if user is in the add_balance flow
        if (!flowState || flowState.flow !== 'add_balance') return next();

        const cancelKeyboard = new InlineKeyboard().text("❌ Cancel", "cancel_add_balance");

        try {
            const input = ctx.message?.text?.trim();
            if (!input) {
                const msg = await ctx.reply('Please enter the amount:', { reply_markup: cancelKeyboard });
                await redis.pushList(redisKey,[String(msg.message_id)])
                return
            }

            if (!/^(\d+|\d+\.\d{1,8}|\.\d{1,8})$/.test(input)) {
                const msg = await ctx.reply("❌ Invalid format. Use up to 8 decimal places.", { reply_markup: cancelKeyboard });
                await redis.pushList(redisKey,[String(msg.message_id)])
                return
            }

            const amount = parseFloat(input);
            if (isNaN(amount) || amount <= 0) {
                const msg = await ctx.reply("❌ Invalid amount. Please enter a positive number (e.g. 0.5).", { reply_markup: cancelKeyboard });
                await redis.pushList(redisKey,[String(msg.message_id)])
                return
            }

            if (amount > 1000) {
                const msg = await ctx.reply("❌ Max top-up amount is 1000 XMR.", { reply_markup: cancelKeyboard });
                await redis.pushList(redisKey,[String(msg.message_id)])
                return
            }

            await UserFlowState.findOneAndUpdate(
            { userId: String(telegramId) },
            { $set: { 'data.amount': amount } }
            );

            const msg = await ctx.reply(`✅ Amount accepted: ${amount} XMR\nGenerating payment address...`, {
            reply_markup: cancelKeyboard,
            });
            await redis.pushList(redisKey,[String(msg.message_id)])
            
            await handleTopUpXmr(ctx, String(telegramId));

        } catch (error) {
            logger.error('Error while handling XMR amount input', error);
            const msg = await ctx.reply("⚠️ Something went wrong while processing your amount.");
            await redis.pushList(redisKey,[String(msg.message_id)])
        }
        });

};