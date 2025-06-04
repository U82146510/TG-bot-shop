import {InlineKeyboard} from 'grammy';

export function getMainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🛍️ Listings", "all_listings").row()
    .text("⚠️ READ BEFORE ORDERING", "read").row()
    .text("ℹ️ About", "about").row()
    .text("❓ FAQ", "faq").row()
    .text("⭐ Rating", "raiting").text("🔐 PGP", "gen_pgp").row()
    .text("📦 Orders", "orders").text("📝 Wishlist", "whishlist").text("💰 Balance", "balance").row()
    .text("📩 Contact", "contact").row();
};
