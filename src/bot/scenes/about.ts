import {Bot,Context,InlineKeyboard} from 'grammy';
import{getMainMenuKeyboard} from '../keyboards/mainMenu.ts';
import { INSPECT_MAX_BYTES } from 'buffer';

export function registerAboutMenu(bot:Bot<Context>){
    bot.callbackQuery("about",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const keyboard = new InlineKeyboard()
        .text("🔙 Back", "back_to_home")
        await ctx.reply(`About

WELCOME TO THE OFFICIAL WISPA STORE!

With our unbeatable prices, let Wispa take you to the future. `,{
            parse_mode:"Markdown",reply_markup:keyboard
        })
    });
};