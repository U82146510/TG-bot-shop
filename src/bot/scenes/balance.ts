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
        const redisKey =`clear_balance${telegramId}`
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
        const redisKey = `balance_msgs:${telegramId}`
        if(!telegramId) return;

        const keyboard = new InlineKeyboard().text("❌ Cancel", "cancel_add_balance");

        try {

            try {
                await ctx.deleteMessage();
            } catch (e) {
                logger.debug(`Failed to delete balance message for user ${telegramId}`);
            }

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

    bot.callbackQuery('cancel_add_balance', async (ctx: Context) => {
        await ctx.answerCallbackQuery();
        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const userId = String(telegramId);
        const redisKey = `last_amount_msg:${userId}`;

        // 🧹 Clear cached confirmation messages
        await deleteCachedMessages(ctx,`clear_amount_accepted:${userId}`);
        await deleteCachedMessages(ctx,`trak_pending_top_up${userId}`);
        await deleteCachedMessages(ctx,`balance_msgs:${userId}`);
        await deleteCachedMessages(ctx,`top_up${userId}`);
        await deleteCachedMessages(ctx,`error_at_add_balance${userId}`);
        await deleteCachedMessages(ctx,`noAmount${userId}`);
        await deleteCachedMessages(ctx,`dataError${userId}`)
        // 🧼 Clear user flow state
        await UserFlowState.findOneAndUpdate(
            { userId },
            { $unset: { flow: true, data: true } }
        );

        try {
            const user = await User.findOne({ telegramId });
            if (!user) {
                return ctx.reply("User not found. Please start again with /start.");
            }

            const keyboard = new InlineKeyboard()
                .text('➕ Add Balance', 'add_balance')
                .text("🔙 Back", "back_to_home");

            const lastMsgId = await redis.get(redisKey);
            if (lastMsgId) {
                try {
                    await ctx.api.editMessageText(
                        ctx.chat!.id,
                        Number(lastMsgId),
                        `💰 Your current balance: ${user.balance.toFixed(2)} XMR`,
                        { reply_markup: keyboard }
                    );
                } catch (e) {
                    logger.warn("❌ Could not edit last amount message. Sending new one.");
                    await ctx.reply(`💰 Your current balance: ${user.balance.toFixed(2)} XMR`, {
                        reply_markup: keyboard
                    });
                }
            } else {
                await ctx.reply(`💰 Your current balance: ${user.balance.toFixed(2)} XMR`, {
                    reply_markup: keyboard
                });
            }

            await redis.delete(redisKey); // 🧹 clean up

        } catch (error) {
            logger.error('error at cancel_add_balance', error);
            await ctx.reply("⚠️ Something went wrong.");
        }
    });


   bot.on('message:text', async (ctx: Context, next) => {
        const telegramId = ctx.from?.id;
        if (!telegramId) return next();
        const redisKey =`clear_balance${telegramId}`
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
                await deleteCachedMessages(ctx,redisKey)
                const msg = await ctx.reply("❌ Invalid format. Use up to 8 decimal places.", { reply_markup: cancelKeyboard });
                redis.pushList(redisKey,[String(msg.message_id)])
                return
            }

            const amount = parseFloat(input);
            if (isNaN(amount) || amount <= 0) {
                const msg = await ctx.reply("❌ Invalid amount. Please enter a positive number (e.g. 0.5).", { reply_markup: cancelKeyboard });
                redis.pushList(redisKey,[String(msg.message_id)])
                return
            }

            if (amount > 1000) {
                await deleteCachedMessages(ctx,redisKey)
                const msg = await ctx.reply("❌ Max top-up amount is 1000 XMR.", { reply_markup: cancelKeyboard });
                redis.pushList(redisKey,[String(msg.message_id)])
                return
            }
            await deleteCachedMessages(ctx, `balance_msgs:${telegramId}`); 
            await UserFlowState.findOneAndUpdate(
            { userId: String(telegramId) },
            { $set: { 'data.amount': amount } }
            );
            const redisK = `clear_amount_accepted:${telegramId}`
            const msg = await ctx.reply(`✅ Amount accepted: ${amount} XMR\nGenerating payment address...`, {
                reply_markup: cancelKeyboard,
            });
            await redis.pushList(redisK, [String(msg.message_id)]);

            await handleTopUpXmr(ctx, String(telegramId));

        } catch (error) {
            logger.error('Error while handling XMR amount input', error);
            await ctx.reply("⚠️ Something went wrong while processing your amount.");
        }
    });

};