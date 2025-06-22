import {InlineKeyboard} from 'grammy';

export function getMainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🛍️ Listings", "all_listings").row()
    .text("⚠️ READ BEFORE ORDERING", "read").row()
    .text("ℹ️ About", "about").row()
    .text("❓ FAQ", "faq").row()
    .text("⭐ Review", "review").text("🔐 PGP", "gen_pgp").row()
    .text("📦 Orders", "orders").text("📝 Wishlist", "view_cart").text("💰 Balance", "balance").row()
    .text("📩 Contact", "contact").text("👥 Community", "community_handler").row();
};
