import { Bot, Context, InlineKeyboard } from "grammy";
import { getFQAMenu } from './faqMenu.ts';
import { safeEditOrReply } from '../../utils/safeEdit.ts';

export function registerFAQRequestTrack(bot: Bot<Context>) {
  bot.callbackQuery('request_track', async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard().text("🔙 Back to FAQ", "faq_back");

    const msg = `📌 When and how can I request tracking?

📮 Wispa Tracking Bot 📮

Tracking gets uploaded after ~30h since dispatch (usually around 6pm on the next day) ⏰  
On Fridays we make an exception and offer same day tracking at 6pm for the weekend 📅

With our Wispa Tracking Bot, accessing your orders' tracking information has never been easier, providing you with timely updates and peace of mind 🕒

Accessing Your Order Status: Simply search for *Wispa TrackBot* in Telegram or use the link: [t.me/wispa_trackbot](https://t.me/wispa_trackbot) 💼`;

    await safeEditOrReply(ctx, msg, keyboard);
  });

  bot.callbackQuery("faq_back", async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    const msg = `🏠 *Back to Main Menu*\n\nSelect one of the options below to continue:`;
    await safeEditOrReply(ctx, msg, getFQAMenu());
  });
}
