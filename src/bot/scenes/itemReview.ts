import { Bot, InlineKeyboard, Context } from 'grammy';
import { logger } from '../logger/logger.ts';
import { Product } from '../models/Products.ts';
import { Review } from '../models/Rewievs.ts';
import { redis } from '../utils/redis.ts';
import { deleteCachedMessages } from '../utils/cleanup.ts';
import { UserFlowState } from '../models/UserFlowState.ts';
import { z } from 'zod';
import mongoose from 'mongoose';

export function registerReviewHandler(bot: Bot) {


  bot.callbackQuery('review', async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    await deleteCachedMessages(ctx, `msg_item_review${userId}`);
    await deleteCachedMessages(ctx, `input_msg${userId}`);

    try {
      await ctx.deleteMessage();
    } catch (e) {
      logger.debug(`No message to delete when entering review menu for user ${userId}`);
    }

    try {
      const products = await Product.find().select('models');
      const variants = products.flatMap(p => p.models.flatMap(m => m.options));

      if (!variants.length) {
        logger.error('No variants found');
        return;
      }

      const keyboard = new InlineKeyboard();
      for (const variant of variants) {
        keyboard.text(`💬 ${variant.name}`, `comments_${variant._id}`).row();
      }

      keyboard.text("🔙 Back to Main Menu", "back_to_home");

      const redisKey = `review_menu_${userId}`;
      const msg = await ctx.reply('📝 *Select a variant to view or leave a comment:*', {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      await redis.pushList(redisKey, [String(msg.message_id)]);
    } catch (error) {
      logger.error('Error in review menu handler', error);
    }
  });


  bot.callbackQuery(/^comments_([a-f0-9]{24})$/, async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await deleteCachedMessages(ctx, `review_menu_${userId}`);

    try {
      const [_, id] = ctx.match ?? [];
      const variantId = new mongoose.Types.ObjectId(id);

      const products = await Product.find();
      const variants = products.flatMap(p => p.models.flatMap(m => m.options));
      const variant = variants.find(v => variantId.equals(v._id));
      if (!variant) {
        logger.error('Variant not found');
        return;
      }

      const reviews = await Review.find({ _id: { $in: variant.review } });
      const redisKeyMsg = `msg_item_review${userId}`;
      const msgIds: string[] = [];

      for (const r of reviews) {
            const formatted = r.createdAt?.toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short'
            }) ?? 'unknown time';

            const msg = await ctx.reply(`💭 ${r.comment}\n🕒 _${formatted}_`, {
                parse_mode: 'Markdown'
            });

            msgIds.push(String(msg.message_id));
        }


      await redis.pushList(redisKeyMsg, msgIds);

      await UserFlowState.findOneAndUpdate({ userId: String(userId) }, {
        $set: {
          flow: 'await_comment',
          data: id
        }
      }, { upsert: true });

      const keyboard = new InlineKeyboard().text("🔙 Back to Variants", "review").row();

      const redisKey = `comment_${userId}`;
      const msg = await ctx.reply('✏️ *Enter your comment below:* and press "enter"', {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      await redis.pushList(redisKey, [String(msg.message_id)]);
    } catch (error) {
      logger.error('Error in comments handler', error);
    }
  });


  bot.on('message:text', async (ctx: Context, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const inputSchema = z.string().max(500).transform(val => val.trim().toLowerCase());
    await deleteCachedMessages(ctx, `comment_${userId}`);

    try {
      const flowState = await UserFlowState.findOne({ userId: String(userId) });
      if (!flowState || flowState.flow !== 'await_comment') return next();

      const input = ctx.message?.text;
      const parsed = inputSchema.safeParse(input);
      if (!parsed.success) {
        logger.error('Invalid comment input');
        return;
      }

      const comment = await Review.create({ comment: parsed.data });

      const variantId = new mongoose.Types.ObjectId(flowState.data);
      await Product.findOneAndUpdate({
        'models.options._id': variantId
      }, {
        $push: { 'models.$[].options.$[opt].review': comment.id }
      }, {
        arrayFilters: [{ 'opt._id': variantId }]
      });

      await UserFlowState.deleteOne({ userId: String(userId) });
      await deleteCachedMessages(ctx, `msg_item_review${userId}`);

      const redisKey = `input_msg${userId}`;
      const keyboard = new InlineKeyboard().text("🔙 Back to Variants", "review").row();
      const msg = await ctx.reply('✅ *Comment added successfully!*', {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      await redis.pushList(redisKey, [String(msg.message_id)]);
    } catch (error) {
      logger.error('Error while submitting comment:', error);
    }
  });
}