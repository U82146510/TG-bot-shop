import {Bot,Context,InlineKeyboard} from 'grammy';
import { Product } from "../../models/Products.ts";
import { safeEditOrReply } from "../../utils/safeEdit.ts";
import { logger } from "../../logger/logger.ts";
import { redis } from "../../utils/redis.ts";
import { UserState } from "../../models/UserState.ts";
import {deleteCachedMessages} from '../../utils/cleanup.ts';

export function registerVariantSelection(bot:Bot<Context>){
    bot.callbackQuery(/^variant_([a-f0-9]{24})_(.+)_(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const userId = String(ctx.from?.id);
        const redisKey = `cart_msgs:${userId}`;
    
        logger.info(`User ${userId} opened variant details`);
 
        deleteCachedMessages(ctx,redisKey);

        await redis.delete(redisKey);
    
        const [_, productId, modelName, optionName] = ctx.match ?? [];
        const product = await Product.findById(productId).lean();
        const model = product?.models.find((m) => m.name === modelName);
        const option = model?.options.find((o) => o.name === optionName);
        if (!option) {
          logger.warn(`Option not found: ${optionName} for user ${userId}`);
          return ctx.reply("⚠️ Option not found.");
        }
    
        await UserState.findOneAndUpdate(
          { userId: String(ctx.from?.id) },
          { productId, modelName },
          { upsert: true }
        );
    
        const msg = `🧩 *${option.name}*\n\n💰 Price: $${option.price}\n📦 Available: ${option.quantity}\n📝 ${option.description || "No description."}`;
        const keyboard = new InlineKeyboard()
          .text("➖", `qty_dec_${productId}_${modelName}_${optionName}_1`)
          .text("1", `qty_current_${productId}_${modelName}_${optionName}_1`)
          .text("➕", `qty_inc_${productId}_${modelName}_${optionName}_1`).row()
          .text("🛒 Add to Basket", `add_${productId}_${modelName}_${optionName}_1`).row()
          .text("🛒 View Cart", "view_cart").row()
          .text("🔙 Back", `model_${productId}_${modelName}`);
    
        await safeEditOrReply(ctx, msg, keyboard);
      });

    bot.callbackQuery(/^qty_(inc|dec)_(.+)_(.+)_(.+)_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const [_, action, productId, modelName, optionName, qtyStr] = ctx.match ?? [];
    let quantity = parseInt(qtyStr);
    const product = await Product.findById(productId).lean();
    const model = product?.models.find((m) => m.name === modelName);
    const option = model?.options.find((o) => o.name === optionName);
    if (!option) return ctx.reply("⚠️ Option not found.");

    if (action === "inc") {
      if (quantity + 1 > option.quantity) {
        return ctx.reply(`⚠️ Only ${option.quantity} available.`);
      }
      quantity++;
    }

    if (action === "dec") {
      quantity = Math.max(1, quantity - 1);
    }

    await UserState.findOneAndUpdate(
      { userId: String(ctx.from?.id) },
      { productId, modelName },
      { upsert: true }
    );

    const msg = `🧩 *${option.name}*\n\n💰 Price: $${option.price}\n📦 Available: ${option.quantity}\n📝 ${option.description || "No description."}`;
    const keyboard = new InlineKeyboard()
      .text("➖", `qty_dec_${productId}_${modelName}_${optionName}_${quantity}`)
      .text(String(quantity), `qty_current_${productId}_${modelName}_${optionName}_${quantity}`)
      .text("➕", `qty_inc_${productId}_${modelName}_${optionName}_${quantity}`).row()
      .text("🛒 Add to Basket", `add_${productId}_${modelName}_${optionName}_${quantity}`).row()
      .text("🛒 View Cart", `view_cart`).row()
      .text("🔙 Back", `model_${productId}_${modelName}`);

    await safeEditOrReply(ctx, msg, keyboard);
  });
}