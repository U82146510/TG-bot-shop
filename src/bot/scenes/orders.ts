import {Order} from '../models/Order.ts';
import {Bot,Context, InlineKeyboard} from 'grammy';
import { logger } from '../logger/logger.ts';
import {redis} from '../utils/redis.ts';

export function registerOrdersHandler(bot:Bot<Context>){
    bot.callbackQuery('orders',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const userId = String(ctx.from?.id);
        const redisKey = `orders_msgs:${userId}`;
        const messageIds: number[] = [];
        try {
            await ctx.deleteMessage()
            const previousMsgs = await redis.getList(redisKey);
            for (const id of previousMsgs) {
                try {
                    await ctx.api.deleteMessage(ctx.chat!.id, Number(id));
                } catch (e) {
                    logger.debug(`Could not delete old order message ${id} for user ${userId}`);
                }
            }
            await redis.delete(redisKey); // clean slate
        } catch (e) {
            logger.warn(`Failed to cleanup old messages for user ${userId}`);
        }

        try {
            const orders =  await Order.find({userId}).select('-_id orderId status shippingAddress createdAt');
            if(!orders || orders.length === 0){
                await ctx.reply('your orders list is empty');
                logger.info('your orders list is empty');
                return;
            }
            const keyboard = new InlineKeyboard().text("🔙 Continue Shopping", "start").row();
            function escapeMarkdown(text: string): string {
                return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
            }
            for(const order of orders){
               const msg = await ctx.reply(
                    `🧾 Order ID: \`${escapeMarkdown(order.orderId)}\`\n` +
                    `💸 Order status: *${escapeMarkdown(order.status)} *\n` +
                    `📦 Shipping to:\n\`${escapeMarkdown(order.shippingAddress)}\`\n\n`
                ,{
                    parse_mode:'Markdown'
                })
                messageIds.push(msg.message_id)
            }
            const back_to_main = await ctx.reply('Back to main Menu?:',{reply_markup:keyboard})
            messageIds.push(back_to_main.message_id);
            await redis.pushList(`orders_msgs:${userId}`, messageIds.map(String), 600);
        } catch (error) {
            logger.error('its an error at the orders handler');
        }
    });
}