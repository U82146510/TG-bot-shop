import { Bot, Context,InlineKeyboard } from "grammy";
import { UserFlowState } from "../models/UserFlowState.ts";
import { Payment } from "../models/Payment.ts";
import { logger } from "../logger/logger.ts";
import {redis} from '../utils/redis.ts';
import {deleteCachedMessages} from '../utils/cleanup.ts'

// ✅ This function can be imported in balance.ts
export async function handleTopUpXmr(ctx: Context, telegramId: string) {
    const keyboard = new InlineKeyboard()
     .text("🏠 Back to Menu", "back_to_home");
    try {
    const flowState = await UserFlowState.findOne({ userId: telegramId });
    const amount = flowState?.data?.amount;

    if (!amount || typeof amount !== "number") {
      const redisNoAmount = `noAmount${telegramId}`;
      const noAmount = await ctx.reply("❌ No amount found. Please restart the top-up.");
      await redis.pushList(redisNoAmount,[String(noAmount.message_id)])
      return;
    }
    
    // Check if a pending top-up already exists
    const existing = await Payment.findOne({ userId: telegramId, status: "pending" });
    if (existing) {
      const redisK = `trak_pending_top_up${telegramId}`
      const msg =  await ctx.reply(
          `⚠️ You already have a pending top-up.\n\n🆔 Payment ID: \`${existing.paymentId}\`\n💳 Address: \`${existing.integratedAddress}\``,
          { reply_markup:keyboard }
      );
      await redis.pushList(redisK,[String(msg.message_id)])
      return;
    }


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
    const { integrated_address, payment_id } = data.result;
    if (!data?.result?.integrated_address || !data?.result?.payment_id) {
        logger.error("❌ RPC call succeeded but missing fields", data);
        const redisDataErro=`dataError${telegramId}`;
        const dataErro = await ctx.reply("❌ Payment server responded unexpectedly. Please try again later.");
        await redis.pushList(redisDataErro,[String(dataErro.message_id)])
        return
    }

    await Payment.create({
      userId: telegramId,
      integratedAddress: integrated_address,
      paymentId: payment_id,
      amount,
      status: "pending",
      createdAt: new Date()
    });
    logger.info(`✅ XMR top-up generated: userId=${telegramId}, amount=${amount}, paymentId=${payment_id}`);
    const redisTopUp = `top_up${telegramId}` 
    const topUp =  await ctx.reply(
      `💳 *Top-Up Payment*\n\nSend *${amount} XMR* to:\n\`${integrated_address}\`\n\n🆔 Payment ID: \`${payment_id}\`\n\nYour balance will be updated after confirmation.`,
      { parse_mode: "Markdown",reply_markup:keyboard }
    );
    await redis.pushList(redisTopUp,[String(topUp.message_id)]);
    await UserFlowState.findOneAndUpdate(
      { userId: telegramId },
      { $unset: { flow: true, data: true } }
    );
  } catch (err) {
    logger.error("❌ Failed to generate top-up address", err);
    const redisError = `error_at_add_balance${telegramId}`
    const error_msg = await ctx.reply("Something went wrong while generating your payment address.");
    await redis.pushList(redisError,[String(error_msg.message_id)])
  }
}
