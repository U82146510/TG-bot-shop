import { Bot, Context } from "grammy";
import { getMainMenuKeyboard } from "../keyboards/mainMenu.ts";
import {safeEditOrReply} from '../utils/safeEdit.ts';
import {UserFlowState} from '../models/UserFlowState.ts';
import {deleteCachedMessages} from '../utils/cleanup.ts';

export function registerCommonHandlers(bot: Bot<Context>) {
  bot.callbackQuery("back_to_home", async (ctx) => {
      await ctx.answerCallbackQuery();

      const userId = String(ctx.from?.id);

      // 🧹 Clear checkout state if user had entered an address but didn't complete
      const state = await UserFlowState.findOne({ userId });
      if (state?.flow === "checkout") {
        await UserFlowState.deleteOne({ userId });
      }
      await deleteCachedMessages(ctx, `checkout_msgs:${userId}`);

      await safeEditOrReply(
        ctx,
        `🏠 *Back to Main Menu*\n\nSelect one of the options below to continue:`,
        getMainMenuKeyboard()
      );
  });
}