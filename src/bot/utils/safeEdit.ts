import { Context, InlineKeyboard } from "grammy";

export async function safeEditOrReply(
  ctx: Context,
  text: string,
  keyboard?: InlineKeyboard
): Promise<void> {
  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (error: any) {
    const errMsg = error?.description ?? "";

    // Ignore harmless error
    if (errMsg.includes("message is not modified")) return;

    // Handle known fallbacks
    const knownErrors = [
      "MESSAGE_ID_INVALID",
      "MESSAGE_CANNOT_BE_EDITED",
      "Bad Request: message to edit not found"
    ];

    if (knownErrors.some((code) => errMsg.includes(code))) {
      await ctx.reply(text, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    } else {
      throw error;
    }
  }
}
