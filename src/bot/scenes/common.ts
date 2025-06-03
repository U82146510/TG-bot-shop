import {Bot,Context} from 'grammy';
import { getMainMenuKeyboard } from '../keyboards/mainMenu.ts';

export function registerCommonHandlers(bot:Bot<Context>){
    bot.callbackQuery("back_to_home",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        await ctx.reply('🏠 Back to Main Menu',{
            reply_markup:getMainMenuKeyboard()
        });
    });
}