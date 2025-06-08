import { createReadStream } from "fs";
import { Bot,Context, InputFile } from "grammy";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// here is the listing menu
export function registerListingHandlers(bot:Bot<Context>){
    bot.callbackQuery("listing_1",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        await ctx.reply('Listing 1',{
            parse_mode:"Markdown",
            // later i will add submenu
        })
    });
    bot.callbackQuery("price_list",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const filePath = path.resolve(__dirname,'../../price_list.txt');
        const stream = createReadStream(filePath);
        const inputFile = new InputFile(stream,'price_list.txt');
        await ctx.replyWithDocument(inputFile);
    });
};