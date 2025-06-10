import { createReadStream } from "fs";
import { Bot,Context, InputFile,InlineKeyboard } from "grammy";
import path from "path";
import { fileURLToPath } from "url";
import {Product} from '../../models/Products.ts';
import {safeEditOrReply} from '../../utils/safeEdit.ts';
import {UserCart} from '../../models/Cart.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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

    bot.callbackQuery("price_list",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const filePath = path.resolve(__dirname,'../../price_list.txt');
        const stream = createReadStream(filePath);
        const inputFile = new InputFile(stream,'price_list.txt');
        await ctx.replyWithDocument(inputFile);
    });
};