import {Bot,Context,InlineKeyboard} from 'grammy';
import { logger } from '../logger/logger.ts';


export function registerReadWarning(bot:Bot<Context>){
    bot.callbackQuery('read',async(ctx:Context)=>{
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
      await ctx.reply(
`⚠️ READ BEFORE ORDERING \\! ⚠️

1 ➜ Pay the *EXACT* amount \\(repeat *EXACT*\\) in cryptocurrency, NOT GBP/EUR, to avoid over or underpayment\\.

2 ➜ Use a secure wallet like *Exodus* or *Cake Wallet* instead of sending from an exchange\\.

3 ➜ Don't deduct the transaction fee from the payment amount to prevent discrepancies\\.

🆘 If you're using temp\\.pm set the timer to at least 7 days to avoid difficulties\\.

➜ EVERY ORDER THAT IS NOT PAID CORRECTLY WILL BE REFUNDED\\. DOUBLE CHECK HOW YOUR FEES WORK\\!\\!\\!

➜ You can retrieve your tracking after \\~30h since dispatch Tues\\-Fri around 6PM through our dedicated tracking bot at @MrWispaGoldTracking\\_tsbot, follow instructions after starting the bot\\.

⚠️ If you cannot find your tracking, it most likely has not been added yet, the tracking bot displays when it was last updated\\.`,
{
  parse_mode: "MarkdownV2",
  reply_markup: keyboard,
});


    });
}