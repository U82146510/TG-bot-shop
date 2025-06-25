import { InlineKeyboard } from "grammy";
import {Product} from '../../models/Products.ts';

export async function getListingsMenu():Promise<InlineKeyboard>{
    const products = await Product.find().select('name').lean();
    const keyboard = new InlineKeyboard();
    for (const product of products) {
        keyboard.text(product.name, `product_${product._id}`).row();
    }
    keyboard.text("Back","back_to_home").text("Balance","balance").row()
    return keyboard
};