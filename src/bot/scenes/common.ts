import { Bot, Context } from "grammy";
import { getMainMenuKeyboard } from "../keyboards/mainMenu.ts";
import { safeEditOrReply } from "../utils/safeEdit.ts";
import { UserFlowState } from "../models/UserFlowState.ts";
import { deleteCachedMessages } from "../utils/cleanup.ts";

export function registerCommonHandlers(bot: Bot<Context>) {
  bot.callbackQuery("back_to_home", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from?.id);
    const flowState = await UserFlowState.findOne({ userId });

    // 🧹 Delete cached messages for all relevant flows
    await deleteCachedMessages(ctx,`checkout_msgs:${userId}`);
    await deleteCachedMessages(ctx,`balance_msgs:${userId}`);
    await deleteCachedMessages(ctx,`clear_amount_accepted:${userId}`);
    await deleteCachedMessages(ctx,`top_up${userId}`);
    await deleteCachedMessages(ctx,`review_menu_${userId}`);
    await deleteCachedMessages(ctx,`delete_option_key${userId}`);
    await deleteCachedMessages(ctx,`rate_limit${userId}`);

    // 🧼 Optionally delete flow state if it's known and abandoned
    if (["checkout", "add_balance"].includes(flowState?.flow || "")) {
      await UserFlowState.deleteOne({ userId });
    }

    await safeEditOrReply(
      ctx,
      `🏠 *Back to Main Menu*\n\nSelect one of the options below to continue:`,
      getMainMenuKeyboard()
    );
  });
}
