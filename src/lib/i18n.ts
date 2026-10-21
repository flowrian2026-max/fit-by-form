export type Lang = "en" | "fa";

export const dict = {
  en: {
    brand: "MAISON ÉCLAT", subtitle: "Virtual Fitting Room", addToCart: "Add to Cart", added: "Added to cart",
    color: "Color", size: "Size", front: "Front", back: "Back", side: "Side",
    rotate: "Rotate", zoom: "Zoom", compare: "Compare", save: "Save Look", saved: "Look saved",
    measurements: "Your Measurements", height: "Height", weight: "Weight", bust: "Bust", waist: "Waist", hips: "Hips",
    fitRec: "Fit Recommendation", recommended: "Recommended size", estimate: "Estimate, not a guarantee of fit.", rangesUsed: "Body ranges used (cm)", within: "Within range", below: "cm below range · roomy", above: "cm above range · tight", noChart: "No size chart for this product yet. Needed: bust, waist and hips ranges in cm for each size XS–XL.", invalidMsg: "Please enter a valid measurement (40–200 cm) for:", outside: "Your measurements fall outside every size in this chart. Closest size shown — please check the details or contact us.", closest: "Closest size", demo: "Demo", demoNote: "Demo product — sample data", comingSoon: "Coming soon", stageDemo: "Demo · placeholder model",
    tight: "Tight", perfect: "Perfect", loose: "Loose", noFit: "Fit is not body-dependent for this item.",
    bodyTypes: "See it on different body types", outfits: "Outfit Ideas",
    slim: "Slim", regular: "Regular", athletic: "Athletic", curvy: "Curvy", tall: "Tall",
    selected: "Selected", wearing: "Wearing", tryOutfit: "Try this outfit", cart: "Cart",
    top: "Top", bottom: "Bottom", outer: "Outer", shoes: "Shoes", savedLooks: "Saved looks",
    roomy: "roomy", snug: "snug", exact: "exact", eur: "EUR", toman: "Toman", aiTitle: "Smart Stylist · rule-based recommendations", fitMap: "Fit Map", aiSub: "Describe your moment — we'll style a complete look in your sizes.",
    occasion: "Occasion", occasionPh: "e.g. Rooftop dinner in autumn", style: "Style preferences", stylePh: "e.g. minimal, warm neutrals",
    budget: "Budget", styleMe: "Style me", styling: "Styling…", total: "Total", overBudget: "Slightly over budget", applyLook: "Try on this look",
    outfitNames: ["Evening Gala", "City Classic", "Soft Weekend"],
  },
  fa: {
    brand: "میزون اکلا", subtitle: "اتاق پرو مجازی", addToCart: "افزودن به سبد", added: "به سبد افزوده شد",
    color: "رنگ", size: "سایز", front: "جلو", back: "پشت", side: "کنار",
    rotate: "چرخش", zoom: "بزرگنمایی", compare: "مقایسه", save: "ذخیره استایل", saved: "استایل ذخیره شد",
    measurements: "اندازه‌های شما", height: "قد", weight: "وزن", bust: "سینه", waist: "کمر", hips: "باسن",
    fitRec: "پیشنهاد سایز", recommended: "سایز پیشنهادی", estimate: "این یک تخمین است، نه تضمین اندازه بودن.", rangesUsed: "بازه‌های بدن (سانتی‌متر)", within: "در محدوده", below: "سانتی‌متر کمتر از محدوده · جادار", above: "سانتی‌متر بیشتر از محدوده · تنگ", noChart: "این محصول هنوز جدول سایز ندارد. لازم است: بازه سینه، کمر و باسن به سانتی‌متر برای هر سایز XS تا XL.", invalidMsg: "لطفاً اندازه معتبر (۴۰ تا ۲۰۰ سانتی‌متر) وارد کنید برای:", outside: "اندازه‌های شما خارج از همه سایزهای این جدول است. نزدیک‌ترین سایز نشان داده شده — لطفاً جزئیات را بررسی کنید یا با ما تماس بگیرید.", closest: "نزدیک‌ترین سایز", demo: "نمونه", demoNote: "محصول نمونه — داده آزمایشی", comingSoon: "به‌زودی", stageDemo: "نمونه · مدل موقت",
    tight: "تنگ", perfect: "عالی", loose: "گشاد", noFit: "اندازه این محصول به فرم بدن وابسته نیست.",
    bodyTypes: "روی فرم‌های مختلف بدن ببینید", outfits: "ایده‌های ست",
    slim: "لاغر", regular: "معمولی", athletic: "ورزشی", curvy: "پرانحنا", tall: "بلندقد",
    selected: "انتخابی", wearing: "پوشیده", tryOutfit: "امتحان این ست", cart: "سبد",
    top: "بالاتنه", bottom: "پایین‌تنه", outer: "رویی", shoes: "کفش", savedLooks: "استایل‌های ذخیره‌شده",
    roomy: "جادار", snug: "جذب", exact: "دقیق", eur: "یورو", toman: "تومان", aiTitle: "استایلیست · پیشنهادهای مبتنی بر قانون", fitMap: "نقشه فیت", aiSub: "موقعیت خود را توصیف کنید تا یک ست کامل در سایز شما پیشنهاد دهیم.",
    occasion: "مناسبت", occasionPh: "مثلاً شام پاییزی روی پشت‌بام", style: "سلیقه استایل", stylePh: "مثلاً مینیمال، رنگ‌های گرم",
    budget: "بودجه", styleMe: "پیشنهاد بده", styling: "در حال استایل…", total: "جمع", overBudget: "کمی بیش از بودجه", applyLook: "امتحان این ست",
    outfitNames: ["مهمانی شب", "کلاسیک شهری", "آخر هفته آرام"],
  },
} as const;

export const toFaDigits = (s: string | number) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d] ?? d);

export const TOMAN_PER_EUR = 60000; // placeholder rate, not confirmed
export type Currency = "eur" | "toman";
/** One price format everywhere: "€420" or "25,200,000 Toman" (Persian digits in FA). */
export function formatPrice(eur: number, cur: Currency, lang: Lang) {
  const s = cur === "eur" ? `€${eur.toLocaleString("en-US")}` : `${(eur * TOMAN_PER_EUR).toLocaleString("en-US")} ${dict[lang].toman}`;
  return lang === "fa" ? toFaDigits(s).replace(/,/g, "٬") : s;
}
