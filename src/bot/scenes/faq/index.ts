import {Bot,Context} from 'grammy';
import {getFQAMenu} from './faqMenu.ts';
import {registerFAQHandlers} from './faqHandlers.ts';
import {safeEditOrReply} from '../../utils/safeEdit.ts';
import {registerFAQRequestTrack} from './faqRequestTrack.ts'
import {registerFAQReceiveOrder} from './faqReceiveOrder.ts';
import {registerFAQSendToAnAddress} from './faqSendToAnAddress.ts';


export function registerFAQScene(bot:Bot<Context>){
    registerFAQHandlers(bot);
    registerFAQRequestTrack(bot);
    registerFAQReceiveOrder(bot);
    registerFAQSendToAnAddress(bot);
    bot.callbackQuery('faq', async (ctx: Context) => {
    await ctx.answerCallbackQuery();
      await safeEditOrReply(ctx,
        `❓ *FAQ Menu*\n\nChoose a question to see the answer:`,
        getFQAMenu())
  });
}