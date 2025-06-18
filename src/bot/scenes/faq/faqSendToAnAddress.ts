import { Bot,Context,InlineKeyboard } from "grammy";
import {getFQAMenu} from './faqMenu.ts';
import {safeEditOrReply} from '../../utils/safeEdit.ts';

export function registerFAQSendToAnAddress(bot:Bot<Context>){
    bot.callbackQuery('my_address',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const keyboard = new InlineKeyboard().text("🔙 Back to FAQ", "faq_back");
        const msg = `📮 How do I send my address?

We strongly encourage you to use PGP encryption when sending your address details as it is the safest way of doing so. Otherwise, please use a temp.pm note set to expire within 5 DAYS.`
    await safeEditOrReply(ctx,msg,keyboard);
    });

   bot.callbackQuery("faq_back", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const msg = `🏠 *Back to Main Menu*\n\nSelect one of the options below to continue:`; 
    await safeEditOrReply(ctx,msg,getFQAMenu());
    });
}