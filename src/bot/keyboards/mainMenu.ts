import { InlineKeyboard } from 'grammy';

export function getMainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    // 🛍️ Top section
    .text("🛍️ Listings", "all_listings").row()

    // ⚠️ Must-read section
    .text("⚠️ READ FIRST", "read").row()

    // Info and help
    .text("ℹ️ About", "about")
    .text("❓ FAQ", "faq").row()

    // Review & security
    .text("⭐ Reviews", "review")
    .text("🔐 PGP", "gen_pgp").row()

    // Orders & Wishlist
    .text("📦 Orders", "orders")
    .text("📝 Wishlist", "view_cart")
    .text("💰 Balance", "balance").row()

    // Contact & community
    .text("📩 Contact", "contact")
    .url("👥 Community", "https://t.me/+gwqw0iz5shhhODcy").row();
}
