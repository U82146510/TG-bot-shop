import {Bot,Context} from 'grammy';
import {getFQAMenu} from './faqMenu.ts';
import { logger } from '../../logger/logger.ts';
import {registerFAQHandlers} from './faqHandlers.ts';

export function registerFAQScene(bot:Bot<Context>){
    registerFAQHandlers(bot);
    bot.callbackQuery('faq',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const msg = ctx.callbackQuery?.message;
        if(msg && ctx.chat?.id){
            try {
                await ctx.api.deleteMessage(ctx.chat.id,msg.message_id);
            } catch (error) {
                logger.error(error)
            }
        }

        await ctx.reply(`❓ *FAQ Menu*\n\nChoose a question to see the answer:`,{
            parse_mode:'Markdown',
            reply_markup:getFQAMenu()
        })
    });
}