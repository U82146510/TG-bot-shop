import { InlineKeyboard } from "grammy";

export function getFQAMenu():InlineKeyboard{
    return new InlineKeyboard()
    .text('My order has been cancelled','order_question').row()
    .text('When and how can I request tracking?','request_track').row()
    .text('How long before I receive my order?','how_long_receive_order').row()
    .text('How do I send my address?','my_address').row()
    .text('Back to Main Menu','back_to_home').row()
};