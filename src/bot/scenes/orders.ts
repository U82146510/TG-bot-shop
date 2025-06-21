import { Order } from '../models/Order.ts';
import { Bot, Context, InlineKeyboard } from 'grammy';
import { logger } from '../logger/logger.ts';
import { redis } from '../utils/redis.ts';
import { deleteCachedMessages } from '../utils/cleanup.ts';

export function registerOrdersHandler(bot: Bot<Context>) {
  bot.callbackQuery('orders', async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from?.id);
    const redisKey = `orders_msgs:${userId}`;

    try {
      await ctx.deleteMessage(); // delete triggering button msg (if any)
    } catch (e) {
      logger.debug(`No message to delete when entering orders view for user ${userId}`);
    }

    await deleteCachedMessages(ctx, redisKey); // ✅ clean previous order messages

    try {
      const orders = await Order.find({ userId }).select('-_id orderId status shippingAddress createdAt');
      if (!orders || orders.length === 0) {
        const msg = await ctx.reply('🗒️ Your orders list is empty.');
        logger.info(`Empty order list for user ${userId}`);
        await redis.pushList(redisKey, [String(msg.message_id)], 600);
        return;
      }

      const keyboard = new InlineKeyboard().text("🔙 Continue Shopping", "start").row();

      function escapeMarkdown(text: string): string {
        return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
      }

      const messageIds: number[] = [];

      for (const order of orders) {
        const msg = await ctx.reply(
          `🧾 Order ID: \`${escapeMarkdown(order.orderId)}\`\n` +
          `💸 Order status: *${escapeMarkdown(order.status)}*\n` +
          `📦 Shipping to:\n\`${escapeMarkdown(order.shippingAddress)}\`\n\n`,
          { parse_mode: 'Markdown' }
        );
        messageIds.push(msg.message_id);
      }

      const backBtn = await ctx.reply('Back to main Menu?', { reply_markup: keyboard });
      messageIds.push(backBtn.message_id);

      await redis.pushList(redisKey, messageIds.map(String), 600); // set 10min TTL
    } catch (error) {
      logger.error('❌ Error in orders handler:', error);
      const failMsg = await ctx.reply("⚠️ Something went wrong while fetching your orders.");
      await redis.pushList(redisKey, [String(failMsg.message_id)], 600);
    }
  });
}