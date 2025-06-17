import { Bot, Context } from 'grammy';
import { Product } from "../../models/Products.ts";
import { logger } from "../../logger/logger.ts";
import { UserCart } from "../../models/Cart.ts";
import { User } from "../../models/User.ts";
import {UserFlowState} from '../../models/UserFlowState.ts';

export function registerCheckoutXmr(bot: Bot<Context>) {
  bot.callbackQuery("checkout_xmr", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from?.id);

    const flowState = await UserFlowState.findOne({userId});
    const shippingAddress = flowState?.data.shippingAddress;
    if(!shippingAddress){
        await ctx.reply("📦 Please enter your *shipping address* to continue with checkout:", {
        parse_mode: "Markdown"
      })

      await UserFlowState.findOneAndUpdate({userId},{
      $set:{
          flow:'awaiting_address',data:{}
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
      if (!productDoc) continue;

      const model = productDoc.models.find((m) => m.name === item.modelName);
      const option = model?.options.find((o) => o.name === item.optionName);
      if (option) {
        option.quantity = Math.max(0, option.quantity - item.quantity);
      }
      await productDoc.save();
    }

    // Clear cart
    await UserCart.deleteOne({ userId });

    await ctx.reply(`✅ Purchase successful! You've spent ${total.toFixed(2)} XMR from your balance.\nYour order is now being processed.`);
  });
}
