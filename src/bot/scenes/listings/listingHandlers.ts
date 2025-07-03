import { Bot, Context} from "grammy";
import { logger } from "../../logger/logger.ts";
import { registerProductSelection } from "./productSelection.ts";
import { registerVariantSelection } from "./variantSelection.ts";
import { registerCartHandlers } from "./cartHandlers.ts";
import { registerCheckoutXmr } from "./checkoutXmr.ts";

export async function registerListingHandlers(bot: Bot<Context>) {
  bot.catch((err) => {
    logger.error("Telegram Error:", err);
  });
  registerProductSelection(bot);
  registerVariantSelection(bot);
  registerCartHandlers(bot);
  registerCheckoutXmr(bot);

}