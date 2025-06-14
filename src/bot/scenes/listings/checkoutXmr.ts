import {Bot,Context} from 'grammy';
import { Product } from "../../models/Products.ts";
import { logger } from "../../logger/logger.ts";
import { UserCart } from "../../models/Cart.ts";
import {Payment} from '../../models/Payment.ts';

export function registerCheckoutXmr(bot:Bot<Context>){
      bot.callbackQuery("checkout_xmr", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from?.id);

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

    try {
      const res = await fetch("http://localhost:18082/json_rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "0",
          method: "make_integrated_address"
        })
      });

      const data = await res.json();
      const { payment_id, integrated_address } = data.result;

      // 💾 Save payment tracking info
      await Payment.create({
        userId,
        integratedAddress: integrated_address,
        paymentId: payment_id,
        amount: total,
        status: "pending",
        createdAt: new Date(),
      });

      const msg = `🧾 *Checkout*

💰 *Total:* $${total.toFixed(2)}

To complete your order, please send the total amount in XMR to the following address:

\`${integrated_address}\`

🔑 Payment ID: \`${payment_id}\`

After the payment is confirmed, your order will be processed.`;

      return ctx.reply(msg, { parse_mode: "Markdown" });
    } catch (err) {
      logger.error("Failed to create XMR invoice", err);
      return ctx.reply("❌ Failed to create XMR payment address.");
    }
  });

}