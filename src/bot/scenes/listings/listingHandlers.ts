import { createReadStream } from "fs";
import { Bot,Context, InputFile } from "grammy";
import path from "path";
import { fileURLToPath } from "url";
import {Product} from '../../models/Products.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// here is the listing menu
export async function registerListingHandlers(bot:Bot<Context>){
    const products = await Product.find().select('name -_id');
    for(const product of products){
        const callbackData = `${product.name}list`;
        bot.callbackQuery(callbackData,async(ctx:Context)=>{
            await ctx.answerCallbackQuery();



         });
    }
    
    bot.callbackQuery("price_list",async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const filePath = path.resolve(__dirname,'../../price_list.txt');
        const stream = createReadStream(filePath);
        const inputFile = new InputFile(stream,'price_list.txt');
        await ctx.replyWithDocument(inputFile);
    });
};