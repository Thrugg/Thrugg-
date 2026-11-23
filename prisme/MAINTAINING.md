# Prisme — how it works and what to maintain

Prisme is a tech advisor for buyers in Germany or France (chosen in the profile, English or French). It builds a PC from a goal and a budget and checks the parts fit, finds and scores ready-made PCs, matches monitors and TVs to the room, the desk and the graphics card, ranks phones, headphones, soundbars, laptops and tablets by what matters to the person, keeps their gear with its warranty and value, watches prices, says when to buy, and shows daily headlines about what they own.

## What is where

| File | What it does |
|------|--------------|
| `data/catalog.json` | The products, one per line: parts (gpu, cpu, board, ram, ssd, psu, cooler, case), monitors, TVs (one price per size), soundbars, phones, headphones, laptops, tablets. Fields below. Refreshed every week. |
| `data/market.json` | VAT, the French price factor, legal warranty rules (DE, FR), assembly premium and Windows price for ready-made PCs, price pressure per category (the 2026 memory and graphics-card shortage), product cycles and launch months, sales calendar, depreciation per category, shop and seller links, the source URLs that catalogue entries cite, and a changelog. |
| `data/prebuilts.json` | Ready-made PCs on sale now, one offer per line, filled by the weekly refresh. Offers older than 21 days are hidden. |
| `data/news.json` | Headlines written every morning by `tools/prisme_news.mjs` (GitHub Action `prisme-news.yml`). Titles, links, dates and a short summary only. |
| `js/engine.js` | All the arithmetic, pure functions: prices per market, frame-rate model, balance, the builder and its checks, alternatives, ready-made fair price, reading and scoring an offer, display maths (data rate, DSC, PPI, pixels per degree, field of view, burn-in), monitor, TV and product scores, warranty, value, upgrade check, sales dates and timing, affordability, news matching. |
| `js/store.js` | One localStorage key `prisme.v1`, synced by `cloud.js` (app key `prisme`): profile, builder settings and swaps, ready-made filters, kept offers, monitor/TV/choose settings, gear, watch list, saved builds, products researched by Claude. Read-only link to Safety Net Score (the DE or FR profile). |
| `js/ui.js` | Build (Build it, Ready-made, Check an offer), Screens (Monitor, TV, Size calculator), Choose, Gear (My gear, Watch list, Builds), Pulse (News, Rankings, Market), Profile sheet. |
| `js/i18n.js` | English and French texts. The tests check every key the screens use exists in both, with the same placeholders. |
| `js/ocr.js` | Reads a screenshot on the phone (an offer's spec list, a shop price) with Tesseract, **shared with Écurie** at `../ecurie/vendor/tesseract`; if Écurie's folder moves, update the path here and in nothing else. |
| `../ask.js` | Claude tasks `tech_lookup` (research a product not in the list), `prebuilt_find` (today's ready-made offers for the filters), `tech_prices` (today's prices for one product): Prisme writes the question, the person pastes it into their Claude app and pastes the answer back. |
| `test/prisme.test.mjs` | `node --test prisme/test/*.mjs` |

## The model

- **Prices.** Guide prices in euros with VAT. `p.de` is the base; `p.fr` when known, else the German price × `frFactor` (1.03 for the VAT difference), marked "from the German price". Each item has `pd` (month checked) and `conf`: H checked at a shop or comparison, M from a dated report, L estimate. The app shows the label next to every price.
- **Performance.** Graphics cards carry `perf4k`, `perf1440`, `rt` relative to an RTX 5080 (= 100); processors `game` relative to a Ryzen 7 9800X3D (= 100) and `multi` relative to a 16-core. Frame rates scale from typical RTX 5080 averages (`REF`) and are capped by what the processor can feed (`CAP`). Upscaling and frame generation multiply (`UP`, `FG`; 4× only on cards with `mfg`). Calibrated to the review averages; a single game differs.
- **Builder.** The graphics card gets the use's share of the budget (`USES[].share`) unless the person picks one; the rest is the cheapest part that meets the needs (processor fast enough for the card at that use, board for the socket and tier, memory, drive, power supply at (card + CPU peak + 75 W) × 1.2 with a native 12V-2x6 cable for cards that need it and an A-tier unit above 300 W, cooler above the CPU peak, case that fits the card, the cooler and the size wish). If that is over budget the preferences loosen, then the card steps down. Leftover money upgrades the processor only where it shows (high frame rates, creators, a top card) and buys quieter cooling. Swapped parts are kept (`lock`) and re-checked.
- **Checks.** Socket, card length, cooler height or radiator, cooler capacity, power-supply watts, connector and tier, SFX in small cases, airflow for the heat, video memory at 4K, entry boards under top processors, micro-ATX and ITX reminders.
- **Ready-made PCs.** Fair price = the same parts bought one by one × (1.06 to 1.15) + Windows. An offer scores 60 % on its price against that and 40 % on what it cuts (power supply unnamed or too small, one memory stick, slow or too little memory, small or QLC drive, entry chipset under a top processor, a processor that holds the card back).
- **Displays.** Data rate by CVT reduced blanking v2 at 10-bit; a link carries it natively, with DSC up to 3:1, or not. DisplayPort first, HDMI 2.1 when it carries what DisplayPort cannot. Sharpness in pixels per degree (60 = no visible pixels), field of view for the desk, OLED burn-in risk from the static hours a day, minus a little when the maker covers burn-in for 3 years or more. TV size: about 32° of view from the seat.
- **Scores.** Monitors, TVs and the other categories weight the review scores (`r`, 1–10) by what the person said matters, then subtract for what does not fit them (budget, cable, card, distance, burn-in, too few HDMI 2.1 ports, the wrong style or system). Owning gear from the same maker adds 5.
- **Timing.** Buy, wait or watch: a target price reached, a sale within 14 days (Black Friday week, Prime Day, 11.11, French soldes, after-Christmas in Germany), a successor due within 2 months (phones and tablets by maker launch month), or a shortage (pressure level 3).
- **Warranty.** Germany: 24 months legal, the seller must prove for the first 12. France: 24 months, presumed for all 24 on new goods, 12 on second-hand. A maker's warranty on top.
- **Affordability.** A one-off cost against Safety Net Score's figures (or the profile): months of free cash, months of the savings plan, and whether the safety-net level drops.

## Weekly refresh (scheduled task "Prisme weekly price refresh", Sundays)

It edits `data/catalog.json`, `data/prebuilts.json` and `data/market.json` only:

1. Prices: for every item with `conf` L first, then the oldest `pd`, look up the lowest current price from a reputable shop or comparison (Geizhals or idealo.de for Germany, idealo.fr or LeDénicheur for France); set `p.de` (and `p.fr` when found), `pd` to this month, `conf` H, and add the source to `market.json` `sources` and the item's `src`. At least 40 items per run. Never guess a price.
2. Ready-made PCs: up to 12 current offers in Germany and 6 in France across budgets (about €1,200 to €4,500), named power supply and memory layout only, in the `prebuilts.json` format; remove offers older than 21 days.
3. Pressure and notes: update `pressure` levels and notes when graphics-card, memory or drive prices clearly moved; add new models that reviewers now recommend (full record, `conf` M or L), never remove an item or change an `id` (gear and builds refer to ids).
4. Prepend a changelog entry (keep 12), bump `V` in `sw.js`, run the tests, commit only `prisme/` files and push to main.

## After changing a file

Bump `V` in `sw.js`; add new files to its `CORE` list. Run the tests. Never put real gear, prices paid, names or finances in the repository: they live in the browser and the person's own sync account.
