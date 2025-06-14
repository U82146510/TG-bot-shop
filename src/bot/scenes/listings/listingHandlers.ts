import { Bot, Context, InputFile, InlineKeyboard } from "grammy";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../../logger/logger.ts";
import { registerProductSelection } from "./productSelection.ts";
import { registerVariantSelection } from "./variantSelection.ts";
import { registerCartHandlers } from "./cartHandlers.ts";
import { registerCheckoutXmr } from "./checkoutXmr.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const userMessageMap = new Map<string, number[]>(); // userId => messageIds[]

export async function registerListingHandlers(bot: Bot<Context>) {
  bot.catch((err) => {
    logger.error("Telegram Error:", err);
  });
  registerProductSelection(bot);
  registerVariantSelection(bot);
  registerCartHandlers(bot);
  registerCheckoutXmr(bot);

}