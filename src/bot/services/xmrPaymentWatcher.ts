import { IPayment, Payment } from "../models/Payment.ts";
import { logger } from "../logger/logger.ts";
import { UserCart } from "../models/Cart.ts";
import { Product, IProduct } from "../models/Products.ts";
import { Bot } from "grammy";

export function startXmrPaymentWatcher(bot: Bot): void {
  setInterval(async () => {
    const pendingPayments: IPayment[] = await Payment.find({ status: "pending" });
    const expiryThreshold: Date = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
    const cleanupThreshold: Date = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    for (const payment of pendingPayments) {
      try {
        const response = await fetch("http://localhost:18082/json_rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "0",
            method: "get_payments",
            params: { payment_id: payment.paymentId },
          }),
        });

        const data: any = await response.json();
        const received: boolean = Array.isArray(data.result?.payments) && data.result.payments.length > 0;

        if (received) {
          payment.status = "confirmed";
          payment.confirmedAt = new Date();
          await payment.save();

          logger.info(`✅ Payment confirmed for ${payment.userId}`);

          try {
            await bot.api.sendMessage(payment.userId, `✅ Payment confirmed for $${payment.amount.toFixed(2)}. Your order is now being processed.`);
          } catch (notifyErr) {
            logger.warn(`⚠️ Failed to notify user ${payment.userId}:`, notifyErr);
          }

          const cart = await UserCart.findOne({ userId: payment.userId });
          if (cart) {
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
            await UserCart.deleteOne({ userId: payment.userId });
          }
        }
      } catch (error) {
        logger.error("❌ Error checking XMR payment", error);
      }
    }

    await Payment.updateMany(
      {
        status: "pending",
        createdAt: { $lt: expiryThreshold },
      },
      {
        status: "expired"
      }
    );

    await Payment.deleteMany({
      status: { $in: ["confirmed", "expired"] },
      confirmedAt: { $lt: cleanupThreshold },
    });
  }, 60_000);
}
