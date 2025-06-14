import {Bot,Context,InlineKeyboard} from 'grammy';
import { Product } from "../../models/Products.ts";
import { safeEditOrReply } from "../../utils/safeEdit.ts";
import { logger } from "../../logger/logger.ts";
import { redis } from "../../utils/redis.ts";
import { UserState } from "../../models/UserState.ts";
import { UserCart } from "../../models/Cart.ts";
import { ObjectId } from "mongodb";

export function registerCartHandlers(bot:Bot<Context>){
    bot.callbackQuery(/^add_([a-f0-9]{24})_(.+)_(.+)_(\d+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const [_, productId, modelName, optionName, quantityStr] = ctx.match ?? [];
        const quantity = parseInt(quantityStr);
        const userId = String(ctx.from?.id);
    
        const product = await Product.findById(productId).lean();
        const model = product?.models.find((m) => m.name === modelName);
        const option = model?.options.find((o) => o.name === optionName);
        if (!option) return ctx.reply("⚠️ Option not found.");
    
        const cart = await UserCart.findOne({ userId });
        const existingQty = cart?.items.find(
          (i) => i.productId === productId && i.modelName === modelName && i.optionName === optionName
        )?.quantity ?? 0;
    
        if (existingQty + quantity > option.quantity) {
          return ctx.reply(`❌ Only ${option.quantity - existingQty} left in stock.`);
        }
    
        if (cart) {
          const existing = cart.items.find(
            (i) => i.productId === productId && i.modelName === modelName && i.optionName === optionName
          );
          if (existing) {
            existing.quantity += quantity;
          } else {
            cart.items.push({
              _id: new ObjectId(),
              productId,
              modelName,
              optionName,
              quantity,
            });
          }
          await cart.save();
        } else {
          await UserCart.create({
            userId,
            items: [
              {
                _id: new ObjectId(),
                productId,
                modelName,
                optionName,
                quantity,
              },
            ],
          });
        }
    
        await ctx.reply(`✅ Added *${optionName}* (x${quantity}) to basket.`, { parse_mode: "Markdown" });
    });

    bot.callbackQuery("view_cart", async (ctx) => {
        await ctx.answerCallbackQuery();
        try {
          await ctx.deleteMessage();
        } catch {}
    
        const userId = String(ctx.from?.id);
        const redisKey = `cart_msgs:${userId}`;
    
        logger.info(`User ${userId} triggered view_cart`);
    
        // Clear previously sent cart messages
        const ids = await redis.getList(redisKey);
        for (const id of ids) {
          try {
            await ctx.api.deleteMessage(ctx.chat!.id, Number(id));
          } catch (e) {
            logger.debug(`Failed to delete message ${id} for user ${userId}`);
          }
        }
        await redis.delete(redisKey);
    
        const cart = await UserCart.findOne({ userId });
        const last = await UserState.findOne({ userId });
    
        if (!cart || cart.items.length === 0) {
          logger.info(`Cart is empty for user ${userId}`);
          const emptyKb = new InlineKeyboard();
          if (last) {
            emptyKb.text("🔙 Continue Shopping", `model_${last.productId}_${last.modelName}`);
          } else {
            emptyKb.text("🔙 Back to Listings", "all_listings");
          }
          return ctx.reply("🛒 Your cart is empty.", {
            reply_markup: emptyKb
          });
        }
    
        const newMsgIds: number[] = [];
        for (const item of cart.items) {
          const keyboard = new InlineKeyboard()
            .text("➖", `cart_dec_${item._id}`)
            .text("🗑 Remove", `cart_del_${item._id}`)
            .text("➕", `cart_inc_${item._id}`);
    
          const msg = await ctx.reply(`*${item.optionName}* (x${item.quantity})\nModel: ${item.modelName}`, {
            parse_mode: "Markdown",
            reply_markup: keyboard,
          });
          newMsgIds.push(msg.message_id);
        }
    
        const continueKeyboard = new InlineKeyboard();
        if (last) {
          continueKeyboard.text("🔙 Continue Shopping", `model_${last.productId}_${last.modelName}`);
        } else {
          continueKeyboard.text("🔙 Back to Listings", "all_listings");
        }
        continueKeyboard.text("✅ Buy Now", "checkout_xmr");
    
        const summaryMsg = await ctx.reply("🧾 You can continue shopping or update your cart.", {
          reply_markup: continueKeyboard,
        });
        newMsgIds.push(summaryMsg.message_id);
    
        // Save to Redis for cleanup
        if (newMsgIds.length) {
          await redis.pushList(redisKey, newMsgIds.map(String), 600);
        }
    });

    bot.callbackQuery(/^cart_(inc|dec|del)_([a-f0-9]{24})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const [_, action, itemId] = ctx.match ?? [];
    const userId = String(ctx.from?.id);

    const cart = await UserCart.findOne({ userId });
    if (!cart) return;

    const item = cart.items.find((i) => String(i._id) === itemId);
    if (!item) return;

    const product = await Product.findById(item.productId).lean();
    const model = product?.models.find((m) => m.name === item.modelName);
    const option = model?.options.find((o) => o.name === item.optionName);
    if (!option) return ctx.reply("⚠️ Option not found.");

    if (action === "del") {
      cart.items = cart.items.filter((i) => String(i._id) !== itemId);
    } else if (action === "inc") {
      if (item.quantity + 1 > option.quantity) {
        return ctx.reply("❌ Cannot increase quantity beyond stock limit.");
      }
      item.quantity += 1;
    } else if (action === "dec") {
      item.quantity = Math.max(1, item.quantity - 1);
    }
    await cart.save();

    if (action === "del") {
      try {
        await ctx.deleteMessage();
      } catch {}
    } else {
      const keyboard = new InlineKeyboard()
        .text("➖", `cart_dec_${item._id}`)
        .text("🗑 Remove", `cart_del_${item._id}`)
        .text("➕", `cart_inc_${item._id}`);

      try {
        await ctx.editMessageText(`*${item.optionName}* (x${item.quantity})\nModel: ${item.modelName}`, {
          parse_mode: "Markdown",
          reply_markup: keyboard,
        });
      } catch {
        await ctx.reply(`*${item.optionName}* (x${item.quantity})\nModel: ${item.modelName}`, {
          parse_mode: "Markdown",
          reply_markup: keyboard,
        });
      }
    }
  });
}