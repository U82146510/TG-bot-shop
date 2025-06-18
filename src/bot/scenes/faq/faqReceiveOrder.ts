import { Bot,Context,InlineKeyboard } from "grammy";
import {getFQAMenu} from './faqMenu.ts';
import {safeEditOrReply} from '../../utils/safeEdit.ts';

export function registerFAQReceiveOrder(bot:Bot<Context>){
    bot.callbackQuery('how_long_receive_order',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const keyboard = new InlineKeyboard().text("🔙 Back to FAQ", "faq_back");
        const msg = `📌 When and how can I request tracking?

📮 Wispa Tracking Bot 📮

Tracking gets uploaded after ~30h since disp🚚 How long before I receive my order?

🕑 Delivery times for your order vary depending on the shipping method and your location. Once your order is marked as dispatched, please allow the following timeframes:

📬 Track24: Usually arrives within 1-3 business days but may take up to 5 business days

📬 Special Delivery: Typically delivered within 1-2 business days

📬 European and Worldwide customers: Generally arrives within 5 business days

✏️ Please note that these timeframes are approximate and may be subject to variations due to customs procedures and local postal servicesc`
    await safeEditOrReply(ctx,msg,keyboard);
    });

   bot.callbackQuery("faq_back", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const msg = `🏠 *Back to Main Menu*\n\nSelect one of the options below to continue:`; 
    await safeEditOrReply(ctx,msg,getFQAMenu());
    });
}