# Fit By Form

Build a luxury virtual fitting room web app for a fashion brand. React + TypeScript + Tailwind, no external APIs, no backend, all data local (JSON).



DESIGN: dark luxury glassmorphism (use glass sparingly). Colors: bg #0D0D0D, surface #1C1C1E, gold #D4AF37, cream #F5E9D6. Fonts: Playfair Display (EN), Vazirmatn (FA). Subtle gold glow, smooth micro-animations. Fully bilingual: Persian (RTL) and English (LTR) with a language switcher. Responsive, mobile-first.



LAYOUT (desktop 3 columns):

- Left: product card (name, price, color swatches, size buttons XS–XL, Add to Cart).

- Center: large stage with a glowing ring floor, mannequin placeholder, Front/Back/Side toggle, bottom bar: Rotate, Zoom, Compare, Save Look.

- Right: "Your Measurements" sliders (height, weight, bust, waist, hips) and a "Fit Recommendation" card: recommended size, confidence %, and per-zone fit (Tight / Perfect / Loose) with colored indicators.

- Below: "See it on different body types" presets (Slim, Regular, Athletic, Curvy, Tall) that fill the sliders, and "Outfit Ideas".



FIT ENGINE: size chart as JSON per garment (bust/waist/hips in cm per size). For each zone compute ease = garment measurement − body measurement; tight < 2cm, perfect 2–8cm, loose > 8cm. Recommend the size with the best total score, and show confidence.



Make the mannequin a separate component so a 3D GLB model can replace the placeholder later. Use 6 sample garments in JSON with layers (top, bottom, outer, shoes).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fit-by-form.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0ad26372-0463-4727-a450-5f76ce941093).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
