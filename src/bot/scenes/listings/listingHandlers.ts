import { Bot,Context } from "grammy";

export function registerListingHandlers(bot:Bot<Context>){
    bot.callbackQuery("listing_1",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        await ctx.reply('Listing 1',{
            parse_mode:"Markdown",
            // later i will add submenu
        })
    });
};