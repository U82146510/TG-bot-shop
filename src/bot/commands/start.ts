import {Bot,Context} from 'grammy';
import { getMainMenuKeyboard } from '../keyboards/mainMenu.ts';
import { User } from '../models/User.ts';
import { logger } from '../logger/logger.ts';

export function registerMainMenu(bot:Bot<Context>){
    bot.command("start",async(ctx:Context)=>{
        const telegramId = ctx.from?.id;
        if(!telegramId) return;
        const existUser = User.findOne({telegramId});
        if(!existUser){
            await User.create({telegramId});
            logger.info(`New user registered: ${telegramId}`);
        }
        ctx.reply(`Welcome @${ctx.from?.username||"Anonym"} to Tesseract bot`,{
            reply_markup:getMainMenuKeyboard()
        })
    })
};