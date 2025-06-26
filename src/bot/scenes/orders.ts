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
      await ctx.deleteMessage();
    } catch (e) {
      logger.debug(`No message to delete when entering orders view for user ${userId}`);
    }

    await deleteCachedMessages(ctx, redisKey);

    try {
      const orders = await Order.find({ userId })
        .select('_id orderId status shippingAddress createdAt')
        .sort({ createdAt: 1 });

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
        const keyboard2 = new InlineKeyboard().text('Delete',`delete_${order._id}`);
        const formattedDate = order.createdAt.toLocaleString("en-GB", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });

        const msg = await ctx.reply(
          `🗓️ Ordered At: \`${escapeMarkdown(formattedDate)}\`\n` +
          `🧾 Order ID: \`${escapeMarkdown(order.orderId)}\`\n` +
          `💸 Order status: *${escapeMarkdown(order.status)}*\n` +
          `📦 Shipping to:\n\`${escapeMarkdown(order.shippingAddress)}\`\n\n`,
          { parse_mode: 'Markdown',reply_markup:keyboard2 }
        );
        messageIds.push(msg.message_id);
      }

      const backBtn = await ctx.reply('Back to main Menu?', { reply_markup: keyboard });
      messageIds.push(backBtn.message_id);

      await redis.pushList(redisKey, messageIds.map(String));
    } catch (error) {
      logger.error('❌ Error in orders handler:', error);
      const failMsg = await ctx.reply("⚠️ Something went wrong while fetching your orders.");
      await redis.pushList(redisKey, [String(failMsg.message_id)]);
    }
  });


  bot.callbackQuery(/^delete_(.+)$/,async(ctx:Context)=>{
    await ctx.answerCallbackQuery();
    const [_, id] = ctx.match ?? [];
    try {
      const product = await Order.findByIdAndDelete(id);
       if (product) {
        await ctx.deleteMessage(); // 🧽 Remove the order message from chat
      } else {
        await ctx.reply("❌ Order not found or already deleted.");
      }
    } catch (error) {
      logger.error(error);
    }
  })
}
