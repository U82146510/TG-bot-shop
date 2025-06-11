import { createReadStream } from "fs";
import { Bot,Context, InputFile,InlineKeyboard } from "grammy";
import path from "path";
import { fileURLToPath } from "url";
import {Product} from '../../models/Products.ts';
import {safeEditOrReply} from '../../utils/safeEdit.ts';
import {UserCart} from '../../models/Cart.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lastVisitedModel = new Map<number, { productId: string; modelName: string }>();


// here is the listing menu
export async function registerListingHandlers(bot:Bot<Context>){
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

    bot.callbackQuery(/^model_([a-f0-9]{24})_(.+)$/, async (ctx: Context) => {
        await ctx.answerCallbackQuery();
        const [_, productId, modelName] = ctx.match ?? [];

        const product = await Product.findById(productId).lean();
        const model = product?.models.find((m) => m.name === modelName);

        if (!model || !model.options?.length) {
            return ctx.reply("⚠️ No options found.");
        }

        const keyboard = new InlineKeyboard();

        for (const option of model.options) {
            keyboard.text(option.name, `variant_${productId}_${modelName}_${option.name}`).row();
        }
        keyboard.text("🔙 Back", `product_${productId}`);
        await safeEditOrReply(ctx, `📂 *${model.name} Variants*\nSelect one to view details:`, keyboard);
    });


    bot.callbackQuery(/^variant_([a-f0-9]{24})_(.+)_(.+)$/, async (ctx: Context) => {
        await ctx.answerCallbackQuery();
        const [_, productId, modelName, optionName] = ctx.match ?? [];

        const product = await Product.findById(productId).lean();
        const model = product?.models.find((m) => m.name === modelName);
        const option = model?.options.find((o) => o.name === optionName);

        if (!option) {
            return ctx.reply("⚠️ Option not found.");
        }

        const msg = `🧩 *${option.name}*\n\n💰 Price: $${option.price}\n📦 Available: ${option.quantity}\n📝 ${option.description || "No description."}`;


        const keyboard = new InlineKeyboard()
            .text("➖", `qty_dec_${productId}_${modelName}_${optionName}_1`)
            .text("1", `qty_current_${productId}_${modelName}_${optionName}_1`)
            .text("➕", `qty_inc_${productId}_${modelName}_${optionName}_1`).row()
            .text("🛒 Add to Basket", `add_${productId}_${modelName}_${optionName}_1`).row()
            .text("🛒 View Cart", "view_cart")
            .row()
            .text("🔙 Back", `model_${productId}_${modelName}`);

        await safeEditOrReply(ctx, msg, keyboard);
    });

   
    bot.callbackQuery(/^add_([a-f0-9]{24})_(.+)_(.+)_(\d+)$/,async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const [_, productId, modelName, optionName, quantityStr] = ctx.match ?? [];
        const quantity = parseInt(quantityStr);
        const userId = String(ctx.from?.id);

        const cartEntry = {
            productId,
            modelName,
            optionName,
            quantity,
        };

        await UserCart.findOneAndUpdate(
            { userId },
            { $push: { items: cartEntry } },
            { upsert: true, new: true }
        );
        await ctx.reply(`✅ Added *${optionName}* (x${quantity}) to basket.`, { parse_mode: "Markdown" });
    });

    bot.command("cart", async (ctx) => {
        const userId = String(ctx.from?.id);
        const cart = await UserCart.findOne({ userId });

        if (!cart || cart.items.length === 0) {
            return ctx.reply("🛒 Your cart is empty.");
        }

        for (const [index, item] of cart.items.entries()) {
            const keyboard = new InlineKeyboard()
                .text("➖", `cart_dec_${index}`)
                .text("🗑 Remove", `cart_del_${index}`)
                .text("➕", `cart_inc_${index}`);

            await ctx.reply(`*${item.optionName}* (x${item.quantity})\nModel: ${item.modelName}`, {
                parse_mode: "Markdown",
                reply_markup: keyboard,
            });
        }
    });


  bot.callbackQuery(/^cart_(inc|dec|del)_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const [_, action, indexStr] = ctx.match ?? [];
    const index = parseInt(indexStr);
    const userId = String(ctx.from?.id);

    const cart = await UserCart.findOne({ userId });
    if (!cart || index >= cart.items.length) return;

    // Update cart state
    if (action === "del") {
      cart.items.splice(index, 1);
    } else if (action === "inc") {
      cart.items[index].quantity += 1;
    } else if (action === "dec") {
      cart.items[index].quantity = Math.max(1, cart.items[index].quantity - 1);
    }

    await cart.save();

    // Handle item deleted
    if (!cart.items[index]) {
      try {
        await ctx.deleteMessage();
      } catch (e) {
        console.error("Cannot delete message", e);
      }
      return;
    }

    const item = cart.items[index];
    const message = `*${item.optionName}* (x${item.quantity})\nModel: ${item.modelName}`;
    const keyboard = new InlineKeyboard()
      .text("➖", `cart_dec_${index}`)
      .text("🗑", `cart_del_${index}`)
      .text("➕", `cart_inc_${index}`);

    try {
      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    } catch {
      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    }
  });


bot.callbackQuery("view_cart", async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    await ctx.deleteMessage(); // 🔧 This line removes the previous message like "🗂️ Available Listings"
  } catch (e) {
    console.warn("Message already deleted or cannot be deleted");
  }

  const userId = String(ctx.from?.id);
  const cart = await UserCart.findOne({ userId });

  if (!cart || cart.items.length === 0) {
    return ctx.reply("🛒 Your cart is empty.");
  }

  for (const [index, item] of cart.items.entries()) {
    const keyboard = new InlineKeyboard()
      .text("➖", `cart_dec_${index}`)
      .text("🗑", `cart_del_${index}`)
      .text("➕", `cart_inc_${index}`);

    await ctx.reply(`*${item.optionName}* (x${item.quantity})\nModel: ${item.modelName}`, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });

    await ctx.reply("────────────"); // separator
  }

  const last = lastVisitedModel.get(ctx.from?.id!);
  const continueKeyboard = new InlineKeyboard();
  if (last) {
    continueKeyboard.text("🔙 Continue Shopping", `model_${last.productId}_${last.modelName}`);
  } else {
    continueKeyboard.text("🔙 Back to Listings", "all_listings");
  }

  await ctx.reply("🧾 You can continue shopping or update your cart.", {
    reply_markup: continueKeyboard,
  });
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

            lastVisitedModel.set(ctx.from?.id!, { productId, modelName });

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

    bot.callbackQuery("price_list",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const filePath = path.resolve(__dirname,'../../price_list.txt');
        const stream = createReadStream(filePath);
        const inputFile = new InputFile(stream,'price_list.txt');
        await ctx.replyWithDocument(inputFile);
    });
};