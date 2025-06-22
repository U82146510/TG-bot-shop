import { Bot, Context, InlineKeyboard } from 'grammy';
import { Product } from "../../models/Products.ts";
import { redis } from "../../utils/redis.ts";
import { UserState } from "../../models/UserState.ts";
import { UserCart } from "../../models/Cart.ts";
import { ObjectId } from "mongodb";
import { deleteCachedMessages } from "../../utils/cleanup.ts";

export function registerCartHandlers(bot: Bot<Context>) {
    bot.callbackQuery(/^add_([a-f0-9]{24})_(.+)_(.+)_(\d+)$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const [_, productId, modelName, optionName, quantityStr] = ctx.match ?? [];
        const quantity = parseInt(quantityStr);
        const userId = String(ctx.from?.id);
        const redisCheckoutKey = `checkout_msgs:${userId}`;

        await deleteCachedMessages(ctx, redisCheckoutKey);

        const product = await Product.findById(productId).lean();
        const model = product?.models.find((m) => m.name === modelName);
        const option = model?.options.find((o) => o.name === optionName);
        if (!option) {
            const msg = await ctx.reply("⚠️ Option not found.");
            await redis.pushList(redisCheckoutKey, [String(msg.message_id)], 600);
            return;
        }

        const cart = await UserCart.findOne({ userId });
        const existingQty = cart?.items.find(
            (i) => i.productId === productId && i.modelName === modelName && i.optionName === optionName
        )?.quantity ?? 0;

        if (existingQty + quantity > option.quantity) {
            const msg = await ctx.reply(`❌ Only ${option.quantity - existingQty} left in stock.`);
            await redis.pushList(redisCheckoutKey, [String(msg.message_id)], 600);
            return;
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

        const msg = await ctx.reply(`✅ Added *${optionName}* (x${quantity}) to basket.`, { parse_mode: "Markdown" });
        await redis.pushList(redisCheckoutKey, [String(msg.message_id)], 600);
    });

    bot.callbackQuery("view_cart", async (ctx) => {
        await ctx.answerCallbackQuery();
        try {
            await ctx.deleteMessage();
        } catch {}

        const userId = String(ctx.from?.id);
        const redisKey = `cart_msgs:${userId}`;
        const redisCheckoutKey = `checkout_msgs:${userId}`;

        await deleteCachedMessages(ctx, redisKey);
        await deleteCachedMessages(ctx, redisCheckoutKey);

        const cart = await UserCart.findOne({ userId });
        const last = await UserState.findOne({ userId });

        if (!cart || cart.items.length === 0) {
            const emptyKb = new InlineKeyboard();
            if (last) {
                emptyKb.text("🔙 Continue Shopping", `model_${last.productId}_${last.modelName}`);
            } else {
                emptyKb.text("🔙 Back to Listings", "all_listings");
            }
            const msg = await ctx.reply("🛒 Your cart is empty.", {
                reply_markup: emptyKb
            });
            await redis.pushList(redisKey, [String(msg.message_id)], 600);
            return;
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

        // Count the total to pay:

        let total = 0;
        for (const item of cart.items) {
        const product = await Product.findById(item.productId).lean();
        const model = product?.models.find((m) => m.name === item.modelName);
        const option = model?.options.find((o) => o.name === item.optionName);
        const price = option?.price ?? 0;
        total += price * item.quantity;
        }

        const summaryMsg = await ctx.reply(`💰 Total amount to be paid: ${total} XMR, You can continue shopping .`, {
            reply_markup: continueKeyboard,
        });
        newMsgIds.push(summaryMsg.message_id);

        if (newMsgIds.length) {
            await redis.pushList(redisKey, newMsgIds.map(String), 600);
        }
    });

    bot.callbackQuery(/^cart_(inc|dec|del)_([a-f0-9]{24})$/, async (ctx) => {
        await ctx.answerCallbackQuery();
        const [_, action, itemId] = ctx.match ?? [];
        const userId = String(ctx.from?.id);

        const redisKey = `cart_msgs:${userId}`;
        await deleteCachedMessages(ctx, redisKey);

        const cart = await UserCart.findOne({ userId });
        if (!cart) return;

        const item = cart.items.find((i) => String(i._id) === itemId);
        if (!item) return;

        const product = await Product.findById(item.productId).lean();
        const model = product?.models.find((m) => m.name === item.modelName);
        const option = model?.options.find((o) => o.name === item.optionName);
        if (!option) {
            const msg = await ctx.reply("⚠️ Option not found.");
            await redis.pushList(redisKey, [String(msg.message_id)], 600);
            return;
        }

        if (action === "del") {
            cart.items = cart.items.filter((i) => String(i._id) !== itemId);
        } else if (action === "inc") {
            if (item.quantity + 1 > option.quantity) {
                const msg = await ctx.reply("❌ Cannot increase quantity beyond stock limit.");
                await redis.pushList(redisKey, [String(msg.message_id)], 600);
                return;
            }
            item.quantity += 1;
        } else if (action === "dec") {
            item.quantity = Math.max(1, item.quantity - 1);
        }
        await cart.save();

        // Re-render the whole cart view again after item change
        ctx.callbackQuery!.data = "view_cart";
        await bot.handleUpdate(ctx.update);
    });
}
