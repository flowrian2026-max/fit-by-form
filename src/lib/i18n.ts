export type Lang = "en" | "fa";

export const dict = {
  en: {
    brand: "MAISON ÉCLAT", subtitle: "Virtual Fitting Room", addToCart: "Add to Cart", added: "Added to cart",
    color: "Color", size: "Size", front: "Front", back: "Back", side: "Side",
    rotate: "Rotate", zoom: "Zoom", compare: "Compare", save: "Save Look", saved: "Look saved",
    measurements: "Your Measurements", height: "Height", weight: "Weight", bust: "Bust", waist: "Waist", hips: "Hips",
    fitRec: "Fit Recommendation", recommended: "Recommended size", confidence: "Confidence",
    tight: "Tight", perfect: "Perfect", loose: "Loose", noFit: "Fit is not body-dependent for this item.",
    bodyTypes: "See it on different body types", outfits: "Outfit Ideas",
    slim: "Slim", regular: "Regular", athletic: "Athletic", curvy: "Curvy", tall: "Tall",
    selected: "Selected", wearing: "Wearing", tryOutfit: "Try this outfit", cart: "Cart",
    top: "Top", bottom: "Bottom", outer: "Outer", shoes: "Shoes", savedLooks: "Saved looks",
    outfitNames: ["Evening Gala", "City Classic", "Soft Weekend"],
  },
  fa: {
    brand: "میزون اکلا", subtitle: "اتاق پرو مجازی", addToCart: "افزودن به سبد", added: "به سبد افزوده شد",
    color: "رنگ", size: "سایز", front: "جلو", back: "پشت", side: "کنار",
    rotate: "چرخش", zoom: "بزرگنمایی", compare: "مقایسه", save: "ذخیره استایل", saved: "استایل ذخیره شد",
    measurements: "اندازه‌های شما", height: "قد", weight: "وزن", bust: "سینه", waist: "کمر", hips: "باسن",
    fitRec: "پیشنهاد سایز", recommended: "سایز پیشنهادی", confidence: "اطمینان",
    tight: "تنگ", perfect: "عالی", loose: "گشاد", noFit: "اندازه این محصول به فرم بدن وابسته نیست.",
    bodyTypes: "روی فرم‌های مختلف بدن ببینید", outfits: "ایده‌های ست",
    slim: "لاغر", regular: "معمولی", athletic: "ورزشی", curvy: "پرانحنا", tall: "بلندقد",
    selected: "انتخابی", wearing: "پوشیده", tryOutfit: "امتحان این ست", cart: "سبد",
    top: "بالاتنه", bottom: "پایین‌تنه", outer: "رویی", shoes: "کفش", savedLooks: "استایل‌های ذخیره‌شده",
    outfitNames: ["مهمانی شب", "کلاسیک شهری", "آخر هفته آرام"],
  },
} as const;

export const toFaDigits = (s: string | number) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d] ?? d);
