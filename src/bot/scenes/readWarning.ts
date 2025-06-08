import {Bot,Context,InlineKeyboard} from 'grammy';
import {safeEditOrReply} from '../utils/safeEdit.ts';


export function registerReadWarning(bot:Bot<Context>){
    bot.callbackQuery('read',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const keyboard = new InlineKeyboard()
        .text("🔙 Back", "back_to_home");
        const msg = `⚠️ READ BEFORE ORDERING \\! ⚠️

1 ➜ Pay the *EXACT* amount \\(repeat *EXACT*\\) in cryptocurrency, NOT GBP/EUR, to avoid over or underpayment\\.

2 ➜ Use a secure wallet like *Exodus* or *Cake Wallet* instead of sending from an exchange\\.

3 ➜ Don't deduct the transaction fee from the payment amount to prevent discrepancies\\.

🆘 If you're using temp\\.pm set the timer to at least 7 days to avoid difficulties\\.

➜ EVERY ORDER THAT IS NOT PAID CORRECTLY WILL BE REFUNDED\\. DOUBLE CHECK HOW YOUR FEES WORK\\!\\!\\!

➜ You can retrieve your tracking after \\~30h since dispatch Tues\\-Fri around 6PM through our dedicated tracking bot at @MrWispaGoldTracking\\_tsbot, follow instructions after starting the bot\\.

⚠️ If you cannot find your tracking, it most likely has not been added yet, the tracking bot displays when it was last updated\\.`
    await safeEditOrReply(ctx,msg,keyboard);
    });
}