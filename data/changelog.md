# What's new

The newest update is at the top. Hikes added in an update show a **New** badge in the app for 30 days, and the list can be sorted by *Recently added*.

## 10 Nov 2026 (5) · Fifth batch: every country checked

Gains & Greeks: the 29 countries marked "To verify" were checked against 2026-dated sources (tax authorities, PwC Tax Summaries, KPMG, local firms). All 38 are now marked verified. What changed in the numbers:

- Australia: 2026-27 brackets (the 16 % band is now 15 %); note on the Budget proposal to replace the 50 % discount from July 2027.
- Canada: 2026 federal + Ontario brackets (lowest federal rate 14 %).
- Chile: foreign shares now taxed at the global complementary scale in UTA (up to 40 %) instead of the 10 % rate, which only covers Chilean shares with market presence.
- Colombia: short-held gains use the real art. 241 table in UVT 2026 instead of a flat 28 %; foreign dividends at the same table.
- Costa Rica: territorial system, so foreign gains and dividends are untaxed (was 15 %).
- Czechia: the CZK 40m cap on the 3-year exemption is gone from 2026.
- Iceland: ISK 300,000 allowance shared by gains and dividends; losses do not carry forward.
- Israel: 3 % surtax plus 2 % on capital income above ILS 721,560, worked out on your income; losses carry forward.
- Latvia: 3 % extra on yearly income above €200,000.
- Lithuania: 2026 reform. Gains stack on your income at 20 / 25 / 32 %, shares held over 5 years pay 15 %, €500 exemption.
- Luxembourg: the exact 2026 class-1 tariff (23 bands) and the 9 % solidarity rate above €150,000.
- Mexico: 10 % for shares listed in Mexico or on the SIC, also through a foreign broker; derivatives at the 2026 annual table.
- Slovakia: 2026 brackets, €500 exemption, 16 % health insurance on taxable gains, dividends 10 %.
- Türkiye: 2026 progressive brackets instead of a flat 30 % estimate.
- Greece, Hungary, Slovenia: "(verify)" removed; notes on non-UCITS funds (Greece) and the 13 % social contribution on dividends (Hungary).
- Austria, Estonia, Finland, Italy, Japan, Korea, New Zealand, Portugal, Spain, Sweden, United Kingdom, United States: figures confirmed unchanged; sources updated.

## 10 Nov 2026 (4) · Fourth batch

- Safety Net Score: **Household**. Add a partner who shares the budget: the fund needed if you lose your job, if your partner loses theirs, or both at once, against your joint savings.
- Cordée: route lines are now traced on GitHub every week and published in `data/routes.json`; the app uses them first. The build warns when a hike's distance or ascent disagrees with its traced line.
- Gains & Greeks: live prices in the options lab on every device, through a `quote` function in your Supabase project (one-time setup in the README).

## 10 Nov 2026 (3) · Third batch

- Safety Net Score: **Move planner** tab. Pick the country you move to, your last paid day and your first paid day there: it shows what the gap costs, what covers you at each step, the fund to have on the day you leave, and what to save per month until then.
- Gains & Greeks: **Tax years** on the Tax desk. Keep each year's result and start the next year with the loss carry-forwards filled in (worked out for Germany).
- All apps page: one live line per app (hikes logged this year, your safety score, days left for year-end tax moves).
- Weekly Cordée update: from now on it also repairs 5 to 10 older hikes per run (sources, route anchors, car parks, dog rule) until every hike is sourced.

## 10 Nov 2026 (2) · Second batch

- Cordée: **Weekend pick** at the top of the Weather tab (three hikes for Saturday or Sunday, one per area, weighing forecast, drive, snow, season, the dog and what is not done yet); **Year in review** in the Logbook (totals, records, new areas, photos, and the flyover of that year).
- Safety Net Score: **Progress**, one point a month with the score trend and the month you reach the next level.
- Gains & Greeks: **Before 31 December** on the Tax desk: unused allowance, the two loss pots, January cash for the fund prepayment, open short options, and what to set aside (detailed for Germany).

## 10 Nov 2026 · All apps

- Sync (Safety Net Score, Gains & Greeks, Forge): devices are now merged field by field. A phone with old numbers can no longer replace newer ones, and the open tab or filter no longer counts as a change.
- Offline: Cordée, Safety Net Score and Gains & Greeks now open without signal. Cordée keeps the map areas you have looked at (default style and terrain), the catalogue and the last forecast.
- Cordée: **Follow me** shows your position on the route with distance and climb to go; snow depth at the top of every hike and a **Snow-free now** filter; the latest time to leave the car for the daylight of the day; a visible warning if the device cannot save; badges stay once earned; dog advice follows the dog size in Settings.
- Safety Net Score: optional severance amount; a notice when the rules are from last year; the text about where your data is kept is corrected.
- Gains & Greeks: the comparison ranks the verified countries and lists the others separately; a Swiss loss year no longer shows a tax saving; the six shared exchange rates now match Safety Net Score.
- New: automatic checks (`tests/`) and a yearly rule update in January (`RULES.md`).

## 9 Nov 2026 · 160 hikes

- From our own trail-sign photos around the Jochberg and the Kesselberg (Walchensee) and a screenshot of the signpost at the Axamer Lizum car park.
- Added, Walchensee & Kochelsee: Jochberg loop via the Jocheralm and Sachenbach, Hirschhörnlkopf from Jachenau via the Pfundalm and Kotalm, Rabenkopf from Pessenbach via the Staffelalm, Lovis-Corinth-Weg at Urfeld.
- Added, Innsbruck: Nockspitze (Saile) from Axamer Lizum over the Halsl, Birgitzköpfl round from Axamer Lizum, Ampferstein & Marchreisenspitze over the Lustige-Bergler-Steig (expert).
- Already in the app from the same signs: Jochberg, Herzogstand, Tutzinger Hütte (on the Benediktenwand hike).
- Changed: Kesselberg parking fee updated to the Kochel municipal ticket (€8 per day; the old €2 Kurbeitrag no longer applies to hikers) on Jochberg and Herzogstand from Kesselberg.

## 8 Nov 2026 · 153 hikes

- From our Hikes List spreadsheet (2 new rows).
- Added, Garmisch & Zugspitze: Kramerspitz loop via St. Martin and the Stepbergalm (the full round; the out-and-back Kramerspitz stays).
- Added, Zugspitz Arena (Ehrwald): Zugspitzplatt to the Ehrwalder Alm over the Gatterl, the Knorrhütte–Ehrwald stage as a day walk with the lifts at both ends.

## 4 Nov 2026 (3) · Parking

- New: select a hike and its car parks appear around the start as P icons with their names, with Waze, Google Maps and Apple Maps links (also in the new Parking section of the hike). Directions now goes to the main car park.
- 125 hikes have researched car parks with fees and access rules (Braies and Tovel bookings, Auronzo, Eng and Schlegeis toll roads, Vilsalpsee closure, Swiss valley stations…); 37 positions are checked against the operator or a route description. For lift and boat hikes it's the valley station (Täsch for Zermatt, Stechelberg for Mürren, Königssee for the boats).
- The car parks mapped on OpenStreetMap near the start are added for every hike and move approximate points onto the mapped car park, so new hikes get parking automatically.

## 4 Nov 2026 (2) · 151 hikes

- From our Hikes List spreadsheet (first batch, 32 rows).
- Added, Berchtesgaden & Ramsau: Malerwinkel loop, Wimbachklamm & Wimbachschloss, Kühroint & Archenkanzel from Hammerstiel, St. Bartholomä to the Eiskapelle, Halsalm loop, Ramsau to the Hintersee through the Zauberwald, Jenner from Hinterbrand via the Wasserfallalm, Jenner to the Mittelstation via the Schneibsteinhaus.
- Added, Innsbruck and Karwendel: Hafelekarspitze & down to the Seegrube, Höttinger Bild & Rauschbrunnen, Gleirschklamm loop from Scharnitz, Bärenkopf via the Bärenbadalm and Weißenbachsattel.
- Added, elsewhere: Stuiben falls, Frauenbrünnele & Kleiner Plansee from Reutte; Rigi Panorama Trail; Unterer Gaisalpsee, Rubihorn, and the Oytal on the Dr.-Hohenadel-Weg (Allgäu); Seebensee from the Ehrwalder Almbahn.
- Changed: Jenner is now "Jenner via the Königsbachalm" with its route points; Obersee & Fischunkelalm gets route points and sources.

## 4 Nov 2026 · 133 hikes

- From our own trail-sign photos (Wochenbrunner Alm, Griesen, the Partnach at Garmisch): every destination on the signs that wasn't in the app yet.
- Added, Wilder Kaiser: Wilder Kaiser crossing via the Ellmauer Tor and Steinerne Rinne (one way to the Griesner Alm), Ellmauer Halt via the Gamsängersteig, Kopftörl from the Gruttenhütte, Gruttenhütte round from Ellmau via the Riedlhütte, Spatlahner gorge to the Wochenbrunner Alm, Baumgartenköpfl & Gaudeamushütte.
- Added, Garmisch & Zugspitze: Schellschlicht from Griesen, Friederspitz from the Ochsenhütte car park, Reintalangerhütte through the Partnachklamm, Schachen through the Reintal and Oberreintal.
- Already in the app from the same signs: Gruttenhütte, Gaudeamushütte, Ellmauer Tor, Stripsenjochhaus, Schachen from Elmau, Zugspitze via Reintal.

## 3 Nov 2026 · 123 hikes

- Added: Soleleitungsweg: Zipfhäusl to Söldenköpfl (Berchtesgaden & Ramsau), Stripsenjochhaus from the Griesner Alm and Walleralm from the Hintersteiner See (Wilder Kaiser), Frauensee loop from Lechaschau (Reutte), Tegernseer Hütte & Roßstein from Bayerwald (Tegernsee), Hexenseen & Hexenseehütte from Lazid (Serfaus-Fiss-Ladis).
- Changed: no existing hikes; the wish list was empty.

## 29 Oct 2026 · 117 hikes

- Added: Schönjöchl from Fiss, Schönjöchl from the Schönjochbahn (Serfaus-Fiss-Ladis, Tyrol).
- Changed: Vorderer Gosausee is now the full lake circuit from the Gasthof Gosausee.
- First version on GitHub Pages, with weekly additions.
