import {Bot,Context,InlineKeyboard} from 'grammy';
import { logger } from '../logger/logger.ts';

export function registerAboutMenu(bot:Bot<Context>){
    bot.callbackQuery("about",async(ctx:Context)=>{
        console.log("⚠️ read callback triggered"); // <--- LOG THIS
        await ctx.answerCallbackQuery();
        const keyboard = new InlineKeyboard()
        .text("🔙 Back", "back_to_home");
        const msg = ctx.callbackQuery?.message;
        if(msg){
            try {
                if(!ctx.chat){
                    await ctx.reply("❌ Something went wrong. Please try again later.");
                    logger.warn("Chat ID not found in callback query context.");
                    return;
                }
                await ctx.api.deleteMessage(ctx.chat.id,msg.message_id);
            } catch (error) {
                logger.error(error);
            }
        }
        await ctx.reply(`About

WELCOME TO THE OFFICIAL WISPA STORE!

With our unbeatable prices, let Wispa take you to the future. `,{
            parse_mode:"Markdown",reply_markup:keyboard
        })
    });
};