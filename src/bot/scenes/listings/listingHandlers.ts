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
    bot.callbackQuery("listing_2",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        await ctx.reply('Listing 2',{
            parse_mode:"Markdown",
            // later i will add submenu
        })
    });
    bot.callbackQuery("listing_3",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        await ctx.reply('Listing 3',{
            parse_mode:"Markdown",
            // later i will add submenu
        })
    });
    bot.callbackQuery("listing_4",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        await ctx.reply('Listing 4',{
            parse_mode:"Markdown",
            // later i will add submenu
        })
    });
    bot.callbackQuery("listing_5",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        await ctx.reply('Listing 5',{
            parse_mode:"Markdown",
            // later i will add submenu
        })
    });
    bot.callbackQuery("listing_6",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        await ctx.reply('Listing 6',{
            parse_mode:"Markdown",
            // later i will add submenu
        })
    });
    bot.callbackQuery("listing_7",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        await ctx.reply('Listing 7',{
            parse_mode:"Markdown",
            // later i will add submenu
        })
    });
    bot.callbackQuery("price_list",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const filePath = path.resolve(__dirname,'../../price_list.txt');
        const stream = createReadStream(filePath);
        const inputFile = new InputFile(stream);
        await ctx.replyWithDocument(inputFile);
    });
};