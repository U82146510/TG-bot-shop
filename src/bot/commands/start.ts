import {Bot,Context} from 'grammy';
import { getMainMenuKeyboard } from '../keyboards/mainMenu.ts';
import { User } from '../models/User.ts';
import { logger } from '../logger/logger.ts';

export function registerMainMenu(bot:Bot<Context>){
    bot.command("start",async(ctx:Context)=>{
        console.log('test')
        const telegramId = ctx.from?.id;
        const username = ctx.from?.username;
        const firstName = ctx.from?.first_name ?? 'Anonymous';
        try {
            if(!telegramId) return;
            const existUser = await User.findOne({telegramId});
            if(!existUser){
                await User.create({telegramId,username,firstName});
                logger.info(`New user registered: ${telegramId}`);
            }else{
                const hasUpdates = existUser.username !== username || existUser.firstName !== firstName;
                  if (hasUpdates) {
                    existUser.username = username;
                    existUser.firstName = firstName;
                    await existUser.save();
                    logger.info(`User updated: ${telegramId}`);
                }
            }
        } catch (error) {
            logger.error('error at the start menu',error)         
        }
       
        await ctx.reply(`Welcome @${ctx.from?.username||"Anonym"} to Tesseract bot`,{
            reply_markup:getMainMenuKeyboard()
        })
    })
};