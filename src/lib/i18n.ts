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
    roomy: "roomy", snug: "snug", exact: "exact", eur: "EUR", toman: "Toman", aiTitle: "Smart Stylist", fitMap: "Fit Map", aiSub: "Describe your moment — we'll style a complete look in your sizes.",
    occasion: "Occasion", occasionPh: "e.g. Rooftop dinner in autumn", style: "Style preferences", stylePh: "e.g. minimal, warm neutrals",
    budget: "Budget (€)", styleMe: "Style me", styling: "Styling…", total: "Total", overBudget: "Slightly over budget", applyLook: "Try on this look",
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
    roomy: "جادار", snug: "جذب", exact: "دقیق", eur: "یورو", toman: "تومان", aiTitle: "استایلیست هوشمند", fitMap: "نقشه فیت", aiSub: "موقعیت خود را توصیف کنید تا یک ست کامل در سایز شما پیشنهاد دهیم.",
    occasion: "مناسبت", occasionPh: "مثلاً شام پاییزی روی پشت‌بام", style: "سلیقه استایل", stylePh: "مثلاً مینیمال، رنگ‌های گرم",
    budget: "بودجه (یورو)", styleMe: "پیشنهاد بده", styling: "در حال استایل…", total: "جمع", overBudget: "کمی بیش از بودجه", applyLook: "امتحان این ست",
    outfitNames: ["مهمانی شب", "کلاسیک شهری", "آخر هفته آرام"],
  },
} as const;

export const toFaDigits = (s: string | number) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d] ?? d);
