import { Bot,Context } from "grammy";
import {registerListingHandlers} from './listingHandlers.ts';
import {getListingsMenu} from './listingsMenu.ts';
import { get } from "http";
 
export function registerListingScene(bot:Bot<Context>){
    registerListingHandlers(bot);
    bot.callbackQuery("all_listings",async(ctx)=>{
        await ctx.answerCallbackQuery();
        await ctx.reply("Available Listing",{
            parse_mode:"Markdown",
            reply_markup:getListingsMenu(),
        });
    });
};