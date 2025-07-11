import { Bot, Context } from 'grammy';
import { getMainMenuKeyboard } from '../keyboards/mainMenu.ts';
import { User } from '../models/User.ts';
import { logger } from '../logger/logger.ts';
import { redis } from '../utils/redis.ts';
import { deleteCachedMessages } from '../utils/cleanup.ts';

export function registerMainMenu(bot: Bot<Context>) {
  // /start command handler
  bot.command("start", async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name ?? 'Anonymous';

    if (!telegramId) return;

    const redisKey = `main_menu:${telegramId}`;
    await deleteCachedMessages(ctx, redisKey);

    try {
      const existUser = await User.findOne({ telegramId });
      if (!existUser) {
        await User.create({ telegramId, username, firstName });
        logger.info(`New user registered: ${telegramId}`);
      } else {
        const hasUpdates = existUser.username !== username || existUser.firstName !== firstName;
        if (hasUpdates) {
          existUser.username = username;
          existUser.firstName = firstName;
          await existUser.save();
          logger.info(`User updated: ${telegramId}`);
        }
      }
    } catch (error) {
      logger.error('Error at the start menu', error);
    }

    const msg = await ctx.reply(`Welcome @${ctx.from?.username || "Anonym"} to Firver TG shop`, {
      reply_markup: getMainMenuKeyboard(),
    });
    await redis.pushList(redisKey, [String(msg.message_id)]);
  });

  // Callback query handler to go back to main menu
  bot.callbackQuery("start", async (ctx) => {
    await ctx.answerCallbackQuery();

    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const redisKey = `main_menu:${telegramId}`;
    await deleteCachedMessages(ctx, redisKey);

    try {
      await ctx.deleteMessage();
    } catch (error) {
      logger.debug('Message already deleted or not found');
    }

    const msg = await ctx.reply("Welcome back to the main menu!", {
      reply_markup: getMainMenuKeyboard(),
    });
    await redis.pushList(redisKey, [String(msg.message_id)]);
  });
};

export { getMainMenuKeyboard };
