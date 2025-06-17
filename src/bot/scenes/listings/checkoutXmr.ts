import { Bot, Context } from 'grammy';
import { Product } from "../../models/Products.ts";
import { logger } from "../../logger/logger.ts";
import { UserCart } from "../../models/Cart.ts";
import { User } from "../../models/User.ts";
import {UserFlowState} from '../../models/UserFlowState.ts';
import {Order} from '../../models/Order.ts';

export function registerCheckoutXmr(bot: Bot<Context>) {
  bot.callbackQuery("checkout_xmr", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from?.id);
    
    
    try {
      const flowState = await UserFlowState.findOne({userId});
      const shippingAddress = flowState?.data.shippingAddress;
      if(!shippingAddress){
        await ctx.reply("📦 Please enter your *shipping address* to continue with checkout:", {
          parse_mode: "Markdown"
      })
  
      await UserFlowState.findOneAndUpdate({userId},{
          $set:{
            flow:'awaiting_address'
          }
        },{upsert:true})
      return
      };
      
      
      const cart = await UserCart.findOne({ userId });
      if (!cart || cart.items.length === 0) {
        return ctx.reply("🛒 Your cart is empty.");
      }
      
      let total = 0;
      for (const item of cart.items) {
        const product = await Product.findById(item.productId).lean();
        const model = product?.models.find((m) => m.name === item.modelName);
        const option = model?.options.find((o) => o.name === item.optionName);
        if (!product || !model || !option) {
          logger.warn(`❌ Could not update stock for item: ${item.productId}`);
          return ctx.reply("❌ Product or option not found. Please update your cart.");
        }
        const price = option?.price ?? 0;
        total += price * item.quantity;
      }
      const telegramId = ctx.from?.id;
      if (!telegramId) return ctx.reply("❌ User ID not found.");
      const user = await User.findOne({ telegramId });
      if (!user) return ctx.reply("❌ User not found.");
      if (user.balance < total) {
        return ctx.reply(`❌ Insufficient balance. You need ${total.toFixed(2)} XMR.`);
      }
      
      // Deduct balance
      const updatedUser = await User.findOneAndUpdate(
        { telegramId, balance: { $gte: total } }, // Ensure balance is still enough
        { $inc: { balance: -total } },            // Atomically deduct balance
        { new: true }
      );
  
      if (!updatedUser) {
        return ctx.reply("❌ Insufficient balance or concurrent transaction occurred.");
      }
      
      // Update stock
      for (const item of cart.items) {
        const productDoc = await Product.findById(item.productId);
        if (!productDoc) {
          logger.warn(`⚠️ Skipping stock update: product not found for item ${item.productId}`);
          continue;
        }
        
        const model = productDoc.models.find((m) => m.name === item.modelName);
        const option = model?.options.find((o) => o.name === item.optionName);
        if (!model) {
          logger.warn(`⚠️ Model "${item.modelName}" not found in product ${item.productId}`);
          continue;
        }
        if (!option) {
          logger.warn(`⚠️ Option "${item.optionName}" not found in product ${item.productId}`);
          continue;
        }
        
        option.quantity = Math.max(0, option.quantity - item.quantity);
        await productDoc.save();
      }
      // Clear cart
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

      await ctx.reply(
        `✅ Purchase successful!\n` +
        `🧾 Order ID: \`${orderId}\`\n` +
        `💸 You’ve spent *${total.toFixed(2)} XMR*\n` +
        `📦 Shipping to:\n\`${shippingAddress}\`\n\n` +
        `Your order is now being processed.`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      logger.error("❌ Checkout error", error);
      await ctx.reply("⚠️ An unexpected error occurred during checkout. Please try again later.");
    }
  });
  
  bot.on("message:text", async (ctx, next) => {
    const userId = String(ctx.from?.id);
    const flowState = await UserFlowState.findOne({ userId });
    
    if (flowState?.flow !== "awaiting_address") return next();

      const address = ctx.message.text.trim();
      if (address.length < 5) {
        return ctx.reply("❌ Address too short. Please enter a valid address.");
      }

      await UserFlowState.findOneAndUpdate(
        { userId },
        {
          $set: {
            "data.shippingAddress": address,
            flow: "checkout"
          }
        }
      );

      await ctx.reply(`✅ Address saved:\n\n📍 ${address}`);
      await ctx.reply("Now press *Buy Now* again to complete your order.", {
        parse_mode: "Markdown"
      });
  });

}
