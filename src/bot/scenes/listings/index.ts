import { Bot,Context } from "grammy";
import {registerListingHandlers} from './listingHandlers.ts';
import {getListingsMenu} from './listingsMenu.ts';
import { logger } from "../../logger/logger.ts";

export function registerListingScene(bot:Bot<Context>){
    registerListingHandlers(bot);
    bot.callbackQuery("all_listings",async(ctx)=>{
        await ctx.answerCallbackQuery();
        const msg = ctx.callbackQuery.message;
        if(msg){
            try {
                if(!ctx.chat){
                    await ctx.reply("❌ Something went wrong. Please try again later.");
                    logger.warn("Chat ID not found in callback query context.");
                    return;
                }
                await ctx.api.deleteMessage(ctx.chat.id,msg.message_id)
            } catch (error) {
                logger.error(error);
            }
        }
        await ctx.reply(`🗂️ *Available Listings*

Select a listing from the options below:`,{
            parse_mode:"Markdown",
            reply_markup:getListingsMenu(),
        });
    });
};