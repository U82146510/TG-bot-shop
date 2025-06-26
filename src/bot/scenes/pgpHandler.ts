import { Bot, Context, InputFile } from "grammy";
import { logger } from "../logger/logger.ts";
import path from "path";
import { fileURLToPath } from "url";
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerPgpHandler(bot: Bot) {
  bot.callbackQuery('gen_pgp', async (ctx: Context) => {
    await ctx.answerCallbackQuery();

    try {
      const filePath = path.join(__dirname, '../../../pgp.txt'); // file content is fine
      const file = new InputFile(fs.createReadStream(filePath), 'public_key.asc'); // send it as .asc

      await ctx.replyWithDocument(file, {
        caption: "🔐 Here is your *PGP public key*.\nUse this to encrypt messages you send to us.",
        parse_mode: "Markdown"
      });
    } catch (error) {
      logger.error("❌ Failed to send PGP key:", error);
      await ctx.reply("❌ Failed to send the PGP key.");
    }
  });
}
