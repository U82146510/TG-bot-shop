import {Bot,Context,InlineKeyboard} from 'grammy';
import { Product } from "../../models/Products.ts";
import { safeEditOrReply } from "../../utils/safeEdit.ts";
import { logger } from "../../logger/logger.ts";
import {deleteCachedMessages} from '../../utils/cleanup.ts';


export function registerProductSelection(bot:Bot<Context>){
    bot.callbackQuery(/^product_(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const productId = ctx.match?.[1];
        const product = await Product.findById(productId).lean();
        if (!product || !product.models?.length) {
            return ctx.reply("⚠️ No models available for this category.");
        }
        const keyboard = new InlineKeyboard();
        for (const model of product.models) {
            keyboard.text(model.name, `model_${product._id}_${model.name}`).row();
        }
        keyboard.text("🔙 Back", "all_listings");
        await safeEditOrReply(ctx, `📦 *${product.name} Models*`, keyboard);
    });

    bot.callbackQuery(/^model_([a-f0-9]{24})_(.+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const userId = String(ctx.from?.id);
        const redisKey = `cart_msgs:${userId}`;
        logger.info(`User ${userId} navigated to model variants`);
        await deleteCachedMessages(ctx,redisKey);
        const [_, productId, modelName] = ctx.match ?? [];
        const product = await Product.findById(productId).lean();
        const model = product?.models.find((m) => m.name === modelName);
        if (!model || !model.options?.length) {
            logger.warn(`No options found for model ${modelName} by user ${userId}`);
            return ctx.reply("⚠️ No options found.");
        }

        const keyboard = new InlineKeyboard();
        for (const option of model.options) {
            keyboard.text(option.name, `variant_${productId}_${modelName}_${option.name}`).row();
        }
        keyboard.text("🔙 Back", `product_${productId}`);

        await safeEditOrReply(ctx, `📂 *${model.name} Variants*\nSelect one to view details:`, keyboard);
    });
};