import { type IPayment, Payment } from "../models/Payment.ts";
import { logger } from "../logger/logger.ts";
import { User } from "../models/User.ts";
import { Bot, InlineKeyboard } from "grammy";

export function startXmrPaymentWatcher(bot: Bot): void {
  setInterval(async () => {
    const pendingPayments = await Payment.find({ status: "pending" });
    const expiryThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
    const cleanupThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

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

        const data = await response.json();
        const receivedPayments = data.result?.payments;

        if (Array.isArray(receivedPayments) && receivedPayments.length > 0) {
          const totalReceivedAtomic = receivedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
          const amountDueAtomic = Math.floor(payment.amount * 1e12);

          if (totalReceivedAtomic >= amountDueAtomic) {
            // 1. Mark as confirmed
            payment.status = "confirmed";
            payment.confirmedAt = new Date();
            await payment.save();

            // 2. Increment user balance
            await User.updateOne(
              { telegramId: Number(payment.userId) },
              { $inc: { balance: payment.amount } }
            );

            logger.info(`✅ XMR top-up confirmed for user ${payment.userId} (${payment.amount} XMR)`);

            // 3. Notify the user
            try {
              const keyboard = new InlineKeyboard().text("🏠 Back to Menu", "back_to_home");
              await bot.api.sendMessage(
                Number(payment.userId),
                `✅ *Top-Up Successful!*\n\nYou’ve added *${payment.amount} XMR* to your balance.`,
                { parse_mode: "Markdown", reply_markup: keyboard }
              );
            } catch (notifyErr) {
              logger.warn(`⚠️ Could not notify user ${payment.userId}:`, notifyErr);
            }
          }
        }
      } catch (err) {
        logger.error("❌ Error during payment check:", err);
      }
    }

    // Expire old pending payments
    await Payment.updateMany(
      { status: "pending", createdAt: { $lt: expiryThreshold } },
      { $set: { status: "expired" } }
    );

    // Delete expired and old confirmed payments
    await Payment.deleteMany({
      $or: [
        { status: "expired", createdAt: { $lt: cleanupThreshold } },
        { status: "confirmed", confirmedAt: { $lt: cleanupThreshold } }
      ]
    });
  }, 60_000); // Every 60 seconds
}
