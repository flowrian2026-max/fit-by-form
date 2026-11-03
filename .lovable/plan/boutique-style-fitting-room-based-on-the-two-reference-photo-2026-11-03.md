# Boutique-style fitting room (based on the two reference photos)

## Look
- Switch from black-and-gold to a light boutique look like photo 1: bright shop background, white frosted-glass panels, dark slate buttons, soft shadows.
- Holographic touches from photo 2: a glowing ring on the floor under the model, a thin glowing mirror frame, and a translucent blue body outline in the size panel.
- Keep Playfair Display (English) and Vazirmatn (Persian). Persian opens first, right-to-left, with Persian digits. The English switch stays.

## Layout (desktop)
- **Title bar:** "اتاق پرو مجازی" with the language and currency switches.
- **Select Outfit column:** tabs for Dresses, Tops and Bottoms (Outer and Shoes are kept as extra tabs) and photo-style product cards with prices. Tapping a card puts it on the model.
- **Center mirror:** a full-height model inside a glowing mirror frame, with Front/Back turning, zoom, and a large **TRY ON** button. An "Upload your full-length photo" button swaps the model for the shopper's photo.
- **Style Options panel:** four round icon buttons, as in photo 1:
  - Change Style: cycles through the product's colours.
  - Adjust Fit: opens the measurements panel.
  - Lock Fit: freezes the size and measurements so browsing doesn't change them.
  - Switch Background: cycles through 3–4 boutique backgrounds (generated images).
- **Preview Looks strip:** saved outfits as small cards. Tap one to wear it again, pick two to compare side by side, or delete one. Saved in the browser.

## Mobile
- The mirror comes first and takes up most of the screen. Outfit cards appear in a strip that wraps, and Style Options become a row of icons. Measurements open in a bottom sheet. There is no sideways scrolling at 360px.

## Size finder (holographic panel)
- Inputs: height, weight, bust, waist and hips, plus a fit preference (Slim / Regular / Relaxed).
- The fit preference moves the comfort range: Slim 0–5 cm, Regular 2–8 cm, Relaxed 6–12 cm. It still recommends the smallest size that fits every measurement.
- The result shows the size and the label "Estimate, not a guarantee of fit". There is no percentage.
- A glowing body outline has markers at the bust, waist and hips in green (within range), amber (tight) or blue (roomy). Each marker shows "X cm above/below".

## Try-On service
- Pressing TRY ON sends your photo and the garment to a try-on service.
- **Demo mode (default):** places the garment photo over your photo in the browser and marks the result "Demo". It costs nothing and needs no server.
- **Own server:** a settings box where you enter the address of your own CatVTON or ComfyUI server. The app sends the two images there and shows the result. If the server can't be reached, you see a clear message and the app goes back to demo.
- No paid AI services are used.

## Images
- New boutique backgrounds and a standing model image will be generated. They are labelled as stand-ins until you send real photos. The six demo products keep their "Demo" labels.

## Technical details
- `src/styles.css`: new light tokens (oklch), glass and holo utilities. Memory and design rules will be updated to the light theme.
- `src/lib/fit.ts`: add a `fitPreference` that changes MIN/MAX ease, plus tests for each preference.
- New `src/lib/tryon/` with a `TryOnProvider` interface, `mockProvider` (canvas composite) and `httpProvider` (POST multipart to a user-set URL for CatVTON/ComfyUI, with a timeout). The selection is stored in localStorage.
- New components: `StyleOptions`, `PreviewLooks`, `HoloSizePanel`, `MirrorStage` (wraps the existing PhotoStage), `PhotoUpload`. `src/routes/index.tsx` gets a new layout. Check the existing build error first and fix it.
- i18n: add all new strings in English and Persian.
- Verify in Playwright at 1280px and 360px, in both languages.
