import {Bot,Context,InlineKeyboard} from 'grammy';
import {safeEditOrReply} from '../utils/safeEdit.ts'

export function registerAboutMenu(bot:Bot<Context>){
    bot.callbackQuery("about",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const keyboard = new InlineKeyboard()
        .text("🔙 Back", "back_to_home");
        const msg = `About

WELCOME TO THE OFFICIAL WISPA STORE!

With our unbeatable prices, let Wispa take you to the future. `

        await safeEditOrReply(ctx,msg,keyboard);
    });
};