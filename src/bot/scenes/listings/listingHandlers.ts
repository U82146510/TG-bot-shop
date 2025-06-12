import { createReadStream } from "fs";
import { Bot, Context, InputFile, InlineKeyboard } from "grammy";
import path from "path";
import { fileURLToPath } from "url";
import { Product } from "../../models/Products.ts";
import { safeEditOrReply } from "../../utils/safeEdit.ts";
import { UserCart } from "../../models/Cart.ts";
import { ObjectId } from "mongodb";
import { UserState } from "../../models/UserState.ts";
import { logger } from "../../logger/logger.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const userMessageMap = new Map<string, number[]>(); // userId => messageIds[]

export async function registerListingHandlers(bot: Bot<Context>) {
  bot.catch((err) => {
    logger.error("Telegram Error:", err);
  });

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

    logger.info(`User ${userId} navigated to model variants`);
    // Cleanup old cart messages
    const previousMessages = userMessageMap.get(userId) || [];
    for (const msgId of previousMessages) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, msgId);
      } catch {}
    }
    userMessageMap.set(userId, []);

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

    await safeEditOrReply(ctx, `📂 *${model.name} Variants*
Select one to view details:`, keyboard);
  });

  bot.callbackQuery(/^variant_([a-f0-9]{24})_(.+)_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from?.id);

    logger.info(`User ${userId} opened variant details`);

    // Cleanup old cart messages
    const previousMessages = userMessageMap.get(userId) || [];
    for (const msgId of previousMessages) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, msgId);
      } catch {}
    }
    userMessageMap.set(userId, []);

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

    const msg = `🧩 *${option.name}*

💰 Price: $${option.price}
📦 Available: ${option.quantity}
📝 ${option.description || "No description."}`;
    const keyboard = new InlineKeyboard()
      .text("➖", `qty_dec_${productId}_${modelName}_${optionName}_1`)
      .text("1", `qty_current_${productId}_${modelName}_${optionName}_1`)
      .text("➕", `qty_inc_${productId}_${modelName}_${optionName}_1`).row()
      .text("🛒 Add to Basket", `add_${productId}_${modelName}_${optionName}_1`).row()
      .text("🛒 View Cart", "view_cart").row()
      .text("🔙 Back", `model_${productId}_${modelName}`);

    await safeEditOrReply(ctx, msg, keyboard);
  });

  bot.callbackQuery(/^add_([a-f0-9]{24})_(.+)_(.+)_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const [_, productId, modelName, optionName, quantityStr] = ctx.match ?? [];
    const quantity = parseInt(quantityStr);
    const userId = String(ctx.from?.id);

    const cart = await UserCart.findOne({ userId });
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
    logger.info(`User ${userId} triggered view_cart`);
    // Clear previously sent cart messages
    const previousMessages = userMessageMap.get(userId) || [];
    for (const msgId of previousMessages) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, msgId);
      } catch(e) {
        logger.debug(`Failed to delete message for user ${userId}`);
      }
    }
    userMessageMap.set(userId, []);

    const cart = await UserCart.findOne({ userId });
    if (!cart || cart.items.length === 0) return ctx.reply("🛒 Your cart is empty.");

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

    const last = await UserState.findOne({ userId });
    const continueKeyboard = new InlineKeyboard();
    if (last) {
      continueKeyboard.text("🔙 Continue Shopping", `model_${last.productId}_${last.modelName}`);
    } else {
      continueKeyboard.text("🔙 Back to Listings", "all_listings");
    }
    const summaryMsg = await ctx.reply("🧾 You can continue shopping or update your cart.", {
      reply_markup: continueKeyboard,
    });
    newMsgIds.push(summaryMsg.message_id);

    // Save for cleanup
    userMessageMap.set(userId, newMsgIds);
  });


  bot.callbackQuery(/^cart_(inc|dec|del)_([a-f0-9]{24})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const [_, action, itemId] = ctx.match ?? [];
    const userId = String(ctx.from?.id);
    const cart = await UserCart.findOne({ userId });
    if (!cart) return;

    const item = cart.items.find((i) => String(i._id) === itemId);
    if (!item) return;

    if (action === "del") {
      cart.items = cart.items.filter((i) => String(i._id) !== itemId);
    } else if (action === "inc") {
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
        .text("🗑", `cart_del_${item._id}`)
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

  bot.callbackQuery(/^qty_(inc|dec)_(.+)_(.+)_(.+)_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const [_, action, productId, modelName, optionName, qtyStr] = ctx.match ?? [];
    let quantity = parseInt(qtyStr);

    if (action === "inc") quantity++;
    if (action === "dec") quantity = Math.max(1, quantity - 1);

    const product = await Product.findById(productId).lean();
    const model = product?.models.find((m) => m.name === modelName);
    const option = model?.options.find((o) => o.name === optionName);
    if (!option) return ctx.reply("⚠️ Option not found.");

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

  bot.callbackQuery("price_list", async (ctx) => {
    await ctx.answerCallbackQuery();
    const filePath = path.resolve(__dirname, "../../price_list.txt");
    const stream = createReadStream(filePath);
    const inputFile = new InputFile(stream, "price_list.txt");
    await ctx.replyWithDocument(inputFile);
  });
}