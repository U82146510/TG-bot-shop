import { Bot,Context,InlineKeyboard } from "grammy";
import { logger } from "../../logger/logger.ts";
import {getFQAMenu} from './faqMenu.ts';

export function registerFAQHandlers(bot:Bot<Context>){
    bot.callbackQuery('order_question',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const keyboard = new InlineKeyboard().text("🔙 Back to FAQ", "faq_back");
        await ctx.reply(`❌ My order has been cancelled

Occasionally, orders are cancelled when there is an incorrect amount of BTC or XMR sent. To ensure a smooth purchase process, please follow these steps:

1. Please contact our bot through the "Contact" option.
2. In your message, kindly include your order ID and TXiD.
3. This will assist us in promptly investigating the issue and proceeding with your purchase without any delays.

We apologize for any inconvenience caused and appreciate your understanding. If you have any additional questions or require assistance, our support team is readily available to assist you.`,{
    parse_mode:'Markdown',
    reply_markup:keyboard
        })
    });

    bot.callbackQuery("faq_back", async (ctx: Context) => {
        await ctx.answerCallbackQuery();
        const msg = ctx.callbackQuery?.message;
        if (msg && ctx.chat) {
        // Import faqMenu dynamically to avoid circular deps if needed
        await ctx.api.editMessageText(ctx.chat.id, msg.message_id, "❓ *FAQ Menu*", {
            parse_mode: "Markdown",
            reply_markup: getFQAMenu(),
        });
        }
    });
}