import { Bot, Context } from "grammy";
import { registerListingHandlers } from './listingHandlers.ts';
import { getListingsMenu } from './listingsMenu.ts';
import { safeEditOrReply } from '../../utils/safeEdit.ts';
import {UserFlowState} from '../../models/UserFlowState.ts';
import {deleteCachedMessages} from '../../utils/cleanup.ts';

export function registerListingScene(bot: Bot<Context>): void {
    registerListingHandlers(bot);

    bot.callbackQuery("all_listings", async (ctx) => {
        await ctx.answerCallbackQuery();

        const userId = String(ctx.from?.id);

        const state = await UserFlowState.findOne({ userId });
        if (state?.flow === "checkout") {
            await UserFlowState.deleteOne({ userId });
        }
        await deleteCachedMessages(ctx, `checkout_msgs:${userId}`);

        const keyboard = await getListingsMenu();
        await safeEditOrReply(
            ctx,
            `🗂️ *Available Listings*\n\nSelect a listing from the options below:`,
            keyboard
        );
    });
}
