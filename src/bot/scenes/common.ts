import { Bot, Context } from "grammy";
import { getMainMenuKeyboard } from "../keyboards/mainMenu.ts";

export function registerCommonHandlers(bot: Bot<Context>) {
  bot.callbackQuery("back_to_home", async (ctx) => {
    await ctx.answerCallbackQuery();

    const msg = ctx.callbackQuery.message;
    const chatId = ctx.chat?.id;

    if (msg && chatId) {
      try {
        await ctx.api.deleteMessage(chatId, msg.message_id);
      } catch (err) {
        console.warn("Could not delete previous message:", err);
      }
    }

    // ✅ Delay new message slightly to force Telegram layout refresh
    setTimeout(async () => {
      await ctx.reply("🏠 *Back to Main Menu*", {
        parse_mode: "Markdown",
        reply_markup: getMainMenuKeyboard(),
      });
    }, 200); // 200ms delay — enough for Telegram to clear UI context
  });
}
