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
    const knownErrors = [
      "MESSAGE_ID_INVALID",
      "MESSAGE_CANNOT_BE_EDITED",
      "MESSAGE_NOT_MODIFIED",
    ];

    const errMsg = error?.description ?? "";
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
