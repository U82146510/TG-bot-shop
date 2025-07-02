import { type IPayment, Payment } from "../models/Payment.ts";
import { logger } from "../logger/logger.ts";
import { User } from "../models/User.ts";
import { Bot, InlineKeyboard } from "grammy";

// Config
const MONERO_RPC_URL = process.env.MONERO_RPC_URL || "http://localhost:18082/json_rpc";
const RPC_TIMEOUT_MS = 10000; 
const CHECK_INTERVAL_MS = 60000;
const PAYMENT_EXPIRY_MINUTES = 30;
const PAYMENT_CLEANUP_HOURS = 24;

interface MoneroPayment {
  amount: number;
}

interface MoneroRPCResponse {
  result?: {
    payments?: MoneroPayment[];
  };
  error?: {
    code: number;
    message: string;
  };
}

export function startXmrPaymentWatcher(bot: Bot): void {
  let isProcessing = false; // Simple lock to prevent overlapping runs

  setInterval(async () => {
    if (isProcessing) {
      logger.debug("Skipping payment check - previous run still in progress");
      return;
    }

    isProcessing = true;
    try {
      await checkPendingPayments(bot);
    } catch (err) {
      logger.error("Critical error in payment watcher:", err);
    } finally {
      isProcessing = false;
    }
  }, CHECK_INTERVAL_MS);
}

async function checkPendingPayments(bot: Bot): Promise<void> {
  const expiryThreshold = new Date(Date.now() - PAYMENT_EXPIRY_MINUTES * 60 * 1000);
  const cleanupThreshold = new Date(Date.now() - PAYMENT_CLEANUP_HOURS * 60 * 60 * 1000);

  // 1. Process pending payments
  try {
    const pendingPayments = await Payment.find({ status: "pending" });
    for (const payment of pendingPayments) {
      await processPayment(payment, bot);
    }
  } catch (dbError) {
    logger.error("Database error fetching pending payments:", dbError);
    return;
  }

  // 2. Expire old pending payments
  try {
    await Payment.updateMany(
      { status: "pending", createdAt: { $lt: expiryThreshold } },
      { $set: { status: "expired" } }
    );
  } catch (expireError) {
    logger.error("Database error expiring payments:", expireError);
  }

  // 3. Cleanup old payments
  try {
    await Payment.deleteMany({
      $or: [
        { status: "expired", createdAt: { $lt: cleanupThreshold } },
        { status: "confirmed", confirmedAt: { $lt: cleanupThreshold } }
      ]
    });
  } catch (cleanupError) {
    logger.error("Database error cleaning up payments:", cleanupError);
  }
}

async function processPayment(payment: IPayment, bot: Bot): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

    const response = await fetch(MONERO_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "0",
        method: "get_payments",
        params: { payment_id: payment.paymentId },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data: MoneroRPCResponse = await response.json();

    if (data.error) {
      logger.error(`Monero RPC error for payment ${payment._id}:`, data.error);
      return;
    }

    const receivedPayments = data.result?.payments || [];
    const totalReceivedAtomic = receivedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const amountDueAtomic = Math.floor(payment.amount * 1e12);

    if (totalReceivedAtomic >= amountDueAtomic) {
      const session = await Payment.startSession();
      session.startTransaction();

      try {
        payment.status = "confirmed";
        payment.confirmedAt = new Date();
        await payment.save({ session });

        await User.updateOne(
          { telegramId: Number(payment.userId) },
          { $inc: { balance: payment.amount } },
          { session }
        );

        await session.commitTransaction();
        logger.info(`✅ XMR top-up confirmed for user ${payment.userId} (${payment.amount} XMR)`);

        await notifyUser(bot, payment.userId, payment.amount);
      } catch (transactionError) {
        await session.abortTransaction();
        logger.error(`Transaction failed for payment ${payment._id}:`, transactionError);
      } finally {
        session.endSession();
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      logger.warn(`Timeout checking payment ${payment._id}`);
    } else {
      logger.error(`Error processing payment ${payment._id}:`, err);
    }
  }
}

async function notifyUser(bot: Bot, userId: string, amount: number): Promise<void> {
  try {
    const keyboard = new InlineKeyboard().text("🏠 Back to Menu", "back_to_home");
    await bot.api.sendMessage(
      Number(userId),
      `✅ *Top-Up Successful!*\n\nYou’ve added *${amount} XMR* to your balance.`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
  } catch (notifyErr) {
    logger.warn(`⚠️ Could not notify user ${userId}:`, notifyErr);
  }
}