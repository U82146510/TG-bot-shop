import { Bot, Context } from "grammy";
import { getMainMenuKeyboard } from "../keyboards/mainMenu.ts";
import { logger } from "../logger/logger.ts";

export function registerCommonHandlers(bot: Bot<Context>) {
  bot.callbackQuery("back_to_home", async (ctx) => {
    await ctx.answerCallbackQuery();

    const chatId = ctx.chat?.id;
    const msg = ctx.callbackQuery.message;

    if (chatId && msg) {
      try {

        await ctx.api.deleteMessage(chatId, msg.message_id);
      } catch (err) {
        logger.warn("Could not delete old message:", err);
      }

      await new Promise((r) => setTimeout(r, 250));

      await ctx.api.sendMessage(chatId, 
        `🏠 *Back to Main Menu*\n\nSelect one of the options below to continue:`,
        {
          parse_mode: "Markdown",
          reply_markup: getMainMenuKeyboard(),
        }
      );
    }
  });
}
