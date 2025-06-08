import { Bot, Context } from "grammy";
import { getMainMenuKeyboard } from "../keyboards/mainMenu.ts";
import {safeEditOrReply} from '../utils/safeEdit.ts';

export function registerCommonHandlers(bot: Bot<Context>) {
  bot.callbackQuery("back_to_home", async (ctx) => {
  await ctx.answerCallbackQuery();

  await safeEditOrReply(ctx,
    `🏠 *Back to Main Menu*\n\nSelect one of the options below to continue:`,
    getMainMenuKeyboard()
  );
});
}
