import { Bot,Api,Context } from "grammy";
import dotnev from  "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import {registerMainMenu} from './commands/start.ts';
import {registerAboutMenu} from './scenes/about.ts';
import {registerCommonHandlers} from './scenes/common.ts';

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
registerMainMenu(bot);
registerAboutMenu(bot);
registerCommonHandlers(bot);
bot.start();