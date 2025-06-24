import { Bot, Context, InlineKeyboard } from 'grammy';
import { Product } from "../../models/Products.ts";
import { UserCart } from "../../models/Cart.ts";
import { User } from "../../models/User.ts";
import { UserFlowState } from '../../models/UserFlowState.ts';
import { Order } from '../../models/Order.ts';
import { safeEditOrReply } from '../../utils/safeEdit.ts';
import { redis } from '../../utils/redis.ts';
import { deleteCachedMessages } from '../../utils/cleanup.ts';

export function registerCheckoutXmr(bot: Bot<Context>) {
  bot.callbackQuery("checkout_xmr", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from?.id);
    const redisCheckoutKey = `checkout_msgs:${userId}`;
    const checkoutMessageIds: number[] = [];

    await deleteCachedMessages(ctx, `checkout_msgs:${userId}`);
    await deleteCachedMessages(ctx, `cart_msgs:${userId}`);
    await deleteCachedMessages(ctx, `orders_msgs:${userId}`); // if you use it

    const flowState = await UserFlowState.findOne({ userId });
    const shippingAddress = flowState?.data.shippingAddress;
    if (!shippingAddress) {
      const cancelKeyboard = new InlineKeyboard().text("❌ Cancel", "cancel_add_balance");
      const msg1 = await ctx.reply("📦 Please enter your *shipping address* to continue with checkout:", {
        parse_mode: "Markdown",
        reply_markup: cancelKeyboard,
      });
      checkoutMessageIds.push(msg1.message_id);
      await redis.pushList(redisCheckoutKey, checkoutMessageIds.map(String), 600);

      // ✅ Ensure `data` is an object so `data.shippingAddress` won't throw error later
      await UserFlowState.findOneAndUpdate(
        { userId },
        { $set: { flow: 'awaiting_address', data: {} } },
        { upsert: true }
      );

      return;
  }


    const cart = await UserCart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      const emptyCartMsg = await ctx.reply("🛒 Your cart is empty.");
      checkoutMessageIds.push(emptyCartMsg.message_id);
      await redis.pushList(redisCheckoutKey, checkoutMessageIds.map(String), 600);
      return;
    }

    let total = 0;
    for (const item of cart.items) {
      const product = await Product.findById(item.productId).lean();
      const model = product?.models.find((m) => m.name === item.modelName);
      const option = model?.options.find((o) => o.name === item.optionName);
      if (!product || !model || !option) {
        const errorMsg = await ctx.reply("❌ Product or option not found. Please update your cart.");
        checkoutMessageIds.push(errorMsg.message_id);
        await redis.pushList(redisCheckoutKey, checkoutMessageIds.map(String), 600);
        return;
      }
      const price = option?.price ?? 0;
      total += price * item.quantity;
    }

    const telegramId = ctx.from?.id;
    if (!telegramId) {
      const msg = await ctx.reply("❌ User ID not found.");
      checkoutMessageIds.push(msg.message_id);
      await redis.pushList(redisCheckoutKey, checkoutMessageIds.map(String), 600);
      return;
    }

    const user = await User.findOne({ telegramId });
    if (!user) {
      const msg = await ctx.reply("❌ User not found.");
      checkoutMessageIds.push(msg.message_id);
      await redis.pushList(redisCheckoutKey, checkoutMessageIds.map(String), 600);
      return;
    }

    if (user.balance < total) {
      const cancelKeyboard = new InlineKeyboard()
      .text("🔙 Back to Listings", "all_listings")
      .text("Add Balance","balance").row()
      const msg = await ctx.reply(`❌ Insufficient balance. You need ${total.toFixed(2)} XMR.`,{
        reply_markup:cancelKeyboard
      });
      checkoutMessageIds.push(msg.message_id);
      await redis.pushList(redisCheckoutKey, checkoutMessageIds.map(String), 600);
      return;
    }

    const updatedUser = await User.findOneAndUpdate(
      { telegramId, balance: { $gte: total } },
      { $inc: { balance: -total } },
      { new: true }
    );

    if (!updatedUser) {
      const msg = await ctx.reply("❌ Insufficient balance or concurrent transaction occurred.");
      checkoutMessageIds.push(msg.message_id);
      await redis.pushList(redisCheckoutKey, checkoutMessageIds.map(String), 600);
      return;
    }

    for (const item of cart.items) {
      const productDoc = await Product.findById(item.productId);
      if (!productDoc) continue;
      const model = productDoc.models.find((m) => m.name === item.modelName);
      const option = model?.options.find((o) => o.name === item.optionName);
      if (!model || !option) continue;
      option.quantity = Math.max(0, option.quantity - item.quantity);
      await productDoc.save();
    }

    await UserCart.deleteOne({ userId });
    await UserFlowState.deleteOne({ userId });

    const orderId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

    const newOrder = await Order.create({
      userId,
      orderId,
      items: cart.items.map((item) => ({
        productId: item.productId,
        modelName: item.modelName,
        optionName: item.optionName,
        quantity: item.quantity,
      })),
      shippingAddress,
      total,
      status: "pending",
    });

    await User.findOneAndUpdate(
      { telegramId },
      { $push: { orders: newOrder._id } }
    );

    const keyboard = new InlineKeyboard().text("🔙 Back to Listings", "all_listings");
    const msg = await ctx.reply(
      `✅ Purchase successful!\n` +
      `🧾 Order ID: \`${orderId}\`\n` +
      `💸 You’ve spent *${total.toFixed(2)} XMR*\n` +
      `📦 Shipping to:\n\`${shippingAddress}\`\n\n` +
      `Your order is now being processed.`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
    checkoutMessageIds.push(msg.message_id);
    await redis.pushList(redisCheckoutKey, checkoutMessageIds.map(String), 600);
  });

  bot.callbackQuery("cancel_add_balance", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from?.id);
    const redisCheckoutKey = `checkout_msgs:${userId}`;
    await deleteCachedMessages(ctx, redisCheckoutKey);
    await UserFlowState.deleteOne({ userId });
    const keyboard = new InlineKeyboard().text("🔙 Back to Menu", "back_to_home");
    const msg = await safeEditOrReply(ctx, "❌ Checkout canceled. Your address was not saved.", keyboard);
  });



  bot.callbackQuery("cancel_checkout", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from?.id);
    const redisCheckoutKey = `checkout_msgs:${userId}`;

    await deleteCachedMessages(ctx, redisCheckoutKey);

    // Remove flow state if user entered address but canceled
    const state = await UserFlowState.findOne({ userId });
    if (state?.flow === "checkout") {
      await UserFlowState.deleteOne({ userId });
    }

    const keyboard = new InlineKeyboard().text("🔙 Back to Menu", "back_to_home");
    await safeEditOrReply(ctx, "❌ Checkout canceled. Address was discarded.", keyboard);
  });


  bot.on("message:text", async (ctx, next) => {
    const userId = String(ctx.from?.id);
    const redisCheckoutKey = `checkout_msgs:${userId}`;
    const flowState = await UserFlowState.findOne({ userId });

    if (flowState?.flow !== "awaiting_address") return next();

    await deleteCachedMessages(ctx, redisCheckoutKey);

    const address = ctx.message.text.trim();
    if (address.length < 5) {
      const msg = await ctx.reply("❌ Address too short. Please enter a valid address.");
      await redis.pushList(redisCheckoutKey, [String(msg.message_id)], 600);
      return;
    }

    await UserFlowState.findOneAndUpdate(
      { userId },
      { $set: { "data.shippingAddress": address, flow: "checkout" } }
    );

    function escapeMarkdown(text: string): string {
      return text.replace(/[_*\[\]()~`>#+=|{}.!\\-]/g, '\\$&');
    }

    const msg1 = await ctx.reply(`✅ Address saved:\n\n📍 ${escapeMarkdown(address)}`, { parse_mode: "Markdown" });
    const keyboard = new InlineKeyboard()
      .text("🔙 Continue Shopping", "all_listings")
      .text("✅ Buy Now", "checkout_xmr")
      .row()
      .text("❌ Cancel", "cancel_checkout");

    const msg2 = await ctx.reply("🧾 You can now proceed to checkout:", { reply_markup: keyboard });
    await redis.pushList(redisCheckoutKey, [String(msg1.message_id), String(msg2.message_id)], 600);
  });
}
