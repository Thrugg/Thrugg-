# Seuil — maintenance notes

Rent or buy: for any place, how many years you must stay before buying wins, as a range, with every cost counted. First draft built 14 Nov 2026; the plan is to improve it from real use.

## What is where

| File | What it does |
|------|--------------|
| `js/packs.js` | Country rule packs: Germany, Switzerland, Denmark, Poland, France, and a neutral "Other country". Purchase tax by region for Germany (16 Länder) and Switzerland (10 cantons). Each value has a source link shown on the Rules tab. |
| `js/engine.js` | The model. `simulate` runs one scenario month by month for 40 years; `analyse` adds the threshold, its range and the bridge. Pure functions, no screen. |
| `js/charts.js` | The two drawings: the crossing curves with the doorway, and the comparison lines. |
| `js/ui.js` | Every screen (Threshold, Compare, Rules, Settings). |
| `js/store.js` | Saved state, the three example places, backup export and import. |
| `js/i18n.js` | English and French. |
| `test/seuil.test.mjs` | `node --test seuil/test/*.mjs` — 11 checks on invented figures. |

## How the answer is worked out

Two people start with the same cash. One buys; the other rents an equivalent home and invests what the buyer spent on day one (own funds, fees, works). Each month whoever pays less for housing invests the difference. For each year the model compares what each would have if they stopped there: the owner sells (selling cost, tax on the gain, loan repaid), the tenant keeps the investments after tax on gains. The threshold is the first year the owner is ahead.

The range moves four guesses one at a time (price growth ±1 point, rent growth ±1, investment return ±1.5, mortgage rate ±0.5) and keeps the earliest and latest threshold.

The bridge at the planned stay splits the difference into ten causes. They add up to the difference exactly; a test checks this for every pack and every year.

Swiss loans are modelled the Swiss way: repaid down to 65 % of the price over 15 years, then interest only. All other packs repay in full over the term.

## Yearly check (rule packs)

Once a year, and after any tax reform, re-check `js/packs.js` against the sources listed in each pack and update `PACKS_ASOF`. Points most likely to move:

- **Germany:** Grunderwerbsteuer by Land; mortgage rate.
- **Switzerland:** imputed rental value ends on 1 January 2029 (interest and upkeep deductions end with it). The pack leaves the net owner's tax at 0 for the person to fill in; from 2029 nothing needs filling in. The 20 % tax on the gain is a placeholder for the cantonal tax.
- **Denmark:** deed and mortgage-deed fees are re-set each January; property value tax thresholds.
- **Poland:** PCC exemptions; mortgage rate (it moves fastest).
- **France:** department transfer-duty rates (6.32 % or 5.81 %); flat tax on investment gains (31.4 %, same figure as Gains & Greeks).

Mortgage rates in the packs are November 2026 starting values only; the person types the rate of their own offer.

## Limits stated in the app

No free worldwide feed of prices and rents exists, so both are the person's own figures. It is a decision model, not advice. The mortgage rate is held for the whole period. Costs that tenant and owner both pay (heating, electricity) are left out.

## Data and privacy

State is one browser key, `seuil.v1`, mirrored through `../cloud.js` under the app key `seuil` once signed in. Nothing is saved until the person changes something, so a new device never uploads the examples. The three example places hold invented round figures.

## Left for later (from the brief)

"Ask Claude for a place" request button with a scheduled refresh of researched price and rent levels; ranges by simulation instead of one-at-a-time shifts; link to the Funds Ladder's move-buffer rung and to the Relocation sprints scores; renewal of the mortgage rate after the fixed period; Norway pack.

## After a change

Run the tests, then bump `V` in `sw.js` so installed copies pick up the new files.
