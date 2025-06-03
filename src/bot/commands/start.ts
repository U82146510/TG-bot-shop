import {Bot,Context} from 'grammy';
import { getMainMenuKeyboard } from '../keyboards/mainMenu.ts';

export function registerMainMenu(bot:Bot<Context>){
    bot.command("start",(ctx:Context)=>{
        ctx.reply(`Welcome @${ctx.from?.username||"Anonym"} to Tesseract bot`,{
            reply_markup:getMainMenuKeyboard()
        })
    })
};