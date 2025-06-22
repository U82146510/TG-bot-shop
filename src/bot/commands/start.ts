import {Bot,Context} from 'grammy';
import { getMainMenuKeyboard } from '../keyboards/mainMenu.ts';
import { User } from '../models/User.ts';
import { logger } from '../logger/logger.ts';
import {redis} from '../utils/redis.ts';

export function registerMainMenu(bot:Bot<Context>){
    bot.command("start",async(ctx:Context)=>{
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

    bot.callbackQuery("start", async (ctx) => {
        await ctx.answerCallbackQuery();
        const userId = String(ctx.from.id);
        const redisKey = `orders_msgs:${userId}`;
        try {
            await ctx.deleteMessage();
        } catch (error) {
            logger.error('this error is at registerMainMenu start handlers');
        }

        try {
            const oldMsg = await redis.getList(redisKey);
            for(const id of oldMsg){
                try {
                    await ctx.api.deleteMessage(ctx.chat!.id,Number(id));
                } catch (error) {
                     logger.debug(`Failed to delete old message ${id} for user ${userId}`);
                }
            }
            await redis.delete(redisKey);
        } catch (error) {
            logger.error('this error is at registerMainMenu start handlers when using redis ');
        }
        await ctx.reply("Welcome back to the main menu!", {
            reply_markup: getMainMenuKeyboard(),
        });
    });
};

export { getMainMenuKeyboard };
