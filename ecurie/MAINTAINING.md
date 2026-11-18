# Écurie — how it works and what to maintain

Écurie replaces Prüfstand (the claude.ai car analyst). You type any car with its model year, power, mileage, asking price and options; Écurie finds it in its checked list, or the person's own Claude app researches it once (or the weekly task adds it to the list), then shows what it is worth at that mileage, what it costs a month at your mileage, what falls due while you own it, whether the asking price is fair, whether your finances carry it, and four scores out of 100. Germany only for now (euros with VAT, Kfz-Steuer, TÜV, no-claims classes). English only.

## What is where

| File | What it does |
|------|--------------|
| `data/cars.json` | The checked list, carried over from Prüfstand's database in November 2026: one car per line, sorted by make, model, first year. Refreshed twice a year by a scheduled task (below). |
| `data/market.json` | Fuel and electricity prices, loan rates, leasing factors, DAT residual values, and a short changelog. |
| `js/engine.js` | All the arithmetic, pure functions: value by year **and mileage**, price check, value curve, running costs, Kfz-Steuer, what falls due, financing, the four scores, coverage, fit, road trips, the test-drive checklist, matching typed names to the list, turning Claude's research into a record. |
| `js/store.js` | One localStorage key `ecurie.v1`, synced by `cloud.js` (app key `ecurie`): profile, the car on the Analyse tab, garage, my car, researched cars, live-ad checks, the Funds Ladder target. Read-only links to Safety Net Score, Grand Tour, Seuil and The Funds Ladder. |
| `js/ui.js` | Analyse (search and report), Garage (compare), My car, Profile. |
| `js/adread.js` | Reading an ad screenshot on the phone: Tesseract text recognition (`vendor/tesseract`, Apache 2.0, German model, about 4 MB, loaded only when an ad is read and then cached), then `parseAd` picks name, year, power, mileage, price, fuel, gearbox and equipment out of the text (mobile.de, AutoScout24, German or English). Nothing is sent anywhere. “Read it with Claude instead” remains for what the phone could not read. |
| `js/art.js` | The side-profile illustrations by body archetype, from Prüfstand. |
| `js/charts.js` | Value curve, score rings, bars. |
| `test/ecurie.test.mjs` | `node --test ecurie/test/*.mjs` — checks on invented finances. |
| `../ask.js` | The Claude tasks `car_lookup` (research one exact car), `car_market` (live ads), `car_ad_read` (read an ad screenshot): Écurie writes the question, the person pastes it into their own Claude app and pastes the answer back. |
| `data/requests.md` | The weekly list: cars a scheduled task researches every Wednesday and adds to `cars.json`. |

## Every car

A car that is not in the checked list is analysed straight away from an **estimate** (`estimateCar`): the make's price level, reliability, driven wheels and value retention (`MAKES`), the power, the year, the fuel and the body (both guessed from the name when not chosen: `guessFuel`, `guessBody`). List price, weight, consumption, insurance, upkeep and tyres follow from those; everyday cars use the `std` depreciation curve (the German market since 2022). Checked on real cars in the tests: a 2019 BMW 118i at 68,400 km comes out between €14,000 and €21,000. Estimates are marked “Estimated” and offer research in Claude or the weekly list for model-specific figures. They are not matched against later searches; they are rebuilt each time.

## Costs

“What leaves your account a month” lists only cash: loan instalment, fuel or charging, insurance, upkeep and repairs (with the items from options), tyres, tax and TÜV (`cashParts`). The loss in value is shown with the value, not as a monthly cost.

## The model

- **Value.** `as-sold price × class retention(age)^gamma`, calibrated to the market anchors in the record (as in Prüfstand), gives the value at the **typical mileage for the age** (14,000 km a year). A factor then moves it for this car's mileage: about 3.5 % per 10,000 km away from typical (more for sports cars, GTs and supercars, `KM_K`), plus the steps buyers make at 100,000, 150,000 and 200,000 km (`KM_STEPS`). Options and condition add a share of the price (`OPTIONS`, capped at +12 %; repaired accident damage −12 %).
- **Anchors.** Anchors in the checked list are normalised to 42,500 km (the Prüfstand rule); researched ones carry the mileage their price refers to (`atKm`). A live-ads check pulls the fair price towards the listings' median, adjusted to this car's mileage, weighted by how many listings it rests on.
- **Your mileage.** The value curve adds your kilometres a year from today, so driving 30,000 km a year shows a lower resale and more items due.
- **What falls due.** Generic jobs by interval and class price level (`GENERIC`, `TIER`): due at the next mileage or birthday, whichever comes first. Researched cars add their own `milestones`. Items from options (air suspension, carbon-ceramic brakes) are marked “on top” and added to the monthly cost; the rest are part of the yearly upkeep figure.
- **Financial burden** (100 = barely felt): the monthly cash the car takes (instalment + running costs) against what is left after essentials, minus points when it cuts the savings plan or lowers the Safety Net level after the down payment. “Fully covered” = score ≥ 65, savings plan untouched, safety net still at least Good.
- **Awe effect**: the record's public-reaction 1–10 × 10, plus options (colour, exhaust, carbon…), fading with age for ordinary cars.
- **Power-to-pleasure**: power with diminishing returns (35), lightness (20), how it drives — gearbox, driven wheels, engine character, chassis (30), sound (10), power usable on German roads (5). An MX-5 scores close to a 911 Carrera on purpose; a GT3 tops both.
- **Reliability**: the record's TÜV/ADAC 1–5 × 20, minus mileage above 100,000 km and age above 8 years, plus parts supply and options (warranty, service history, air suspension).

Calibration checks on real cars are in the tests (GT3 > Golf GTI on pleasure, MX-5 > 320d, a €200k car weighs more on the same income…). Change a constant, then run the tests.

## Data refresh (scheduled task “Écurie half-yearly market refresh”)

Runs on 5 and 6 January and July. It edits `data/cars.json` and `data/market.json` only, keeps one car per line, sorted, and never removes a car or changes an `id` (garages refer to ids). Rules for the records, as in Prüfstand:

- Prices in euros with 19 % VAT. `price.list`: `[[year, base list price], …]`; `opt` options factor; `gamma` residual strength.
- `price.anchors["<model year>"] = { v, src, date "YYYY-MM", n, km }`: the median German asking price for that year from listings between 20,000 and 70,000 km, normalised to 42,500 km with `v = median × (1 + 0.015 × (medianKm − 42500) / 10000)` capped at ±12 %, `n` the real number of ads, `km` their median mileage. Fewer than 8 ads makes a weak anchor (wider range in the app); fewer than 3, write none. Keep the old anchor in `price.history` (at most 12).
- `a200.kind` measured / estimated / na; never replace a measured time with an estimate. `rel` 1–5 from the newest TÜV-Report (January) or ADAC Pannenstatistik (July).
- New launches: up to 10 per run, full record, `conf` M or L.
- `market.json`: fuel (ADAC), electricity (BDEW/Verivox), loans, DAT, `asOf`, and one changelog entry per refresh (keep 12).

Then run `node --test ecurie/test/*.mjs`, bump `V` in `sw.js`, commit and push to main.

## Weekly list (scheduled task “Écurie weekly car requests”, Wednesdays 18:33 Berlin)

“Add to the weekly list” gives one line for `data/requests.md` (make and model, year, power); the person pastes it under **Waiting** on GitHub. The task researches each waiting car (at most 6 a run; when fewer are waiting, it fills up to 6 with Germany's most registered models not yet listed) into a full record in `cars.json` following the rules above, with its own id, `conf` M or L and its sources in `src`, moves the line to **Done** with the id, runs the tests, bumps `V` and pushes. With nothing waiting it changes nothing.

## After changing a file

Bump `V` in `sw.js`; add new files to its `CORE` list. Run the tests. Never put real figures, names or garages in the repository: they live in the browser and the person's own Supabase account.
