import { InlineKeyboard } from "grammy";
import {Product} from '../../models/Products.ts';

export async function getListingsMenu():Promise<InlineKeyboard>{

    const menu_names = await Product.find().select('name -_id').lean();
    const keyboard = new InlineKeyboard();
    for(const arg of menu_names){
        keyboard.text(arg.name,`${arg.name}list`).row()
    }

    keyboard.text("Back","back_to_home").text("Price List","price_list").text("Balance","balance").row()
    return keyboard
};