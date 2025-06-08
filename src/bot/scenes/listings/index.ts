import { Bot, Context } from "grammy";
import { registerListingHandlers } from './listingHandlers.ts';
import { getListingsMenu } from './listingsMenu.ts';
import { safeEditOrReply } from '../../utils/safeEdit.ts';

export function registerListingScene(bot: Bot<Context>): void {
    registerListingHandlers(bot);

    bot.callbackQuery("all_listings", async (ctx) => {
        await ctx.answerCallbackQuery();

        await safeEditOrReply(ctx,
            `🗂️ *Available Listings*\n\nSelect a listing from the options below:`,
            getListingsMenu()
        );
    });
}
