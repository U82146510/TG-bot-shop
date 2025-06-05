import { InlineKeyboard } from "grammy";

export function getListingsMenu():InlineKeyboard{
    return new InlineKeyboard()
    .text("Item 1","listing_1").row()
    .text("Item 2","listing_2").row()
    .text("Item 3","listing_3").row()
    .text("Item 4","listing_4").row()
    .text("Item 5","listing_5").row()
    .text("Item 6","listing_6").row()
    .text("Item 7","listing_7").row()
    .text("Back","back_to_home").text("Price List","price_list").text("Balance","balance").row()
};