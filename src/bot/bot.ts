import { Bot,Api,Context } from "grammy";
import dotnev from  "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import {registerMainMenu} from './commands/start.ts';
import {registerAboutMenu} from './scenes/about.ts';
import {registerCommonHandlers} from './scenes/common.ts';
import {registerListingScene} from './scenes/listings/index.ts';
import {registerReadWarning} from './scenes/readWarning.ts';
import {registerFAQScene} from './scenes/faq/index.ts';
import { logger } from "./logger/logger.ts";
import {connect_db} from './config/atlas.ts';
import {redis} from './utils/redis.ts';
import {startXmrPaymentWatcher} from './services/xmrPaymentWatcher.ts';
import {registerBalanceHandler} from './scenes/balance.ts';
import {registerOrdersHandler} from './scenes/orders.ts';
import {registerReviewHandler} from './scenes/itemReview.ts';
import {registerPgpHandler} from './scenes/pgpHandler.ts';
import {startAdminPanel} from '../adminPanel/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotnev.config({
    path:path.resolve(__dirname,'../../.env')
});

const token = process.env.bot_token;

if(!token){
    throw new Error('missing api bot token');
};

const bot:Bot<Context,Api> = new Bot(token);

const start = async()=>{
    try {
        await connect_db();
        await redis.connect();
        registerMainMenu(bot);
        startXmrPaymentWatcher(bot);
        registerBalanceHandler(bot);
        registerReviewHandler(bot)
        registerAboutMenu(bot);
        registerReadWarning(bot);
        registerListingScene(bot);
        registerFAQScene(bot);
        registerCommonHandlers(bot);
        registerOrdersHandler(bot);
        registerPgpHandler(bot);
        await startAdminPanel();
        await bot.start();
    } catch (error) {
        logger.error(error);
    }
};

start()