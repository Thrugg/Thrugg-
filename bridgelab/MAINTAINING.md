# BridgeLab — maintenance notes

A controller's simulator: one price / volume / mix bridge with sliders, on an invented dairy and plant-based portfolio, with the order-of-effects trap and how to present it. First draft built 16 Nov 2026; the plan is to improve it from real use.

## The rule

Synthetic data only. Hollow Creek Foods, its eight products, tonnes and prices are invented (`js/portfolio.js`). Nothing from an employer: no real products, volumes, prices or structures. A test fails if an employer or brand name appears in the folder.

## What is where

| File | What it does |
|------|--------------|
| `js/portfolio.js` | The invented portfolio (two categories, eight products) and five scenarios. |
| `js/engine.js` | The bridge under four conventions, the mix split, the joint effects, product rows, materiality. Pure functions. |
| `js/chart.js` | The waterfall, drawn as HTML rows. |
| `js/ui.js` | Bridge, The trap, Table and Settings. |
| `js/store.js`, `js/i18n.js` | Saved choices; English and French. |
| `test/bridgelab.test.mjs` | `node --test bridgelab/test/*.mjs` — 10 checks, including a two-product case worked by hand. |

## The maths

q = tonnes, p = net price per kilo, 0 = last year, 1 = this year, Q = total tonnes. Three averages:

- P0 = Σq0·p0 / Q0 (last year's prices at last year's mix)
- A1 = Σq1·p0 / Q1 (last year's prices at this year's mix)
- P0\* = Σq0·p1 / Q0 (this year's prices at last year's mix)

| Convention | Volume | Mix | Price | Joint |
|---|---|---|---|---|
| Vol → Mix → Price (default) | (Q1 − Q0) × P0 | Σq1·p0 − Q1 × P0 | Σq1 × (p1 − p0) | in price |
| Price → Vol → Mix | (Q1 − Q0) × P0\* | Σq1·p1 − Q1 × P0\* | Σq0 × (p1 − p0) | in volume and mix |
| Mix → Vol → Price | (Q1 − Q0) × A1 | Q0 × (A1 − P0) | Σq1 × (p1 − p0) | vol × mix in volume |
| Pure + joint | (Q1 − Q0) × P0 | Q0 × (A1 − P0) | Σq0 × (p1 − p0) | own bars: (Q1 − Q0) × (A1 − P0) and Σ(q1 − q0)(p1 − p0) |

Every convention adds up exactly to the change in net sales (tested for every scenario). Price differs between "price last" and "price first" by exactly the price × volume joint effect; mix differs between "at this year's tonnes" and "at last year's tonnes" by exactly the volume × mix joint effect.

The mix is split in two: between categories (category shares move, valued at last year's inner mix) and within categories (products move inside each category, at this year's category shares). That split is a convention too, and the formula panel says so.

Materiality: the joint price × volume effect deserves a line in the pack when it is at least 10 % of the change being explained or 0.5 % of net sales; otherwise a footnote is enough. "A typical year" shows a small one (about 2 %), "Price-led year" a large one (24 %).

## The chart

Increases blue, decreases red (a pair that passes the colour-blind checks in light and dark), totals neutral grey, joint effects hatched; every bar prints its signed value, so colour is never the only cue. The deltas are a few per cent of the totals, so the axis starts above zero; the totals carry a break mark and the note under the chart gives the starting value. The Table tab is the chart's twin, product by product.

## Open decision

Own repository and site under the owner's real name (recommended in the brief, since it is meant to be found by recruiters), or this folder in the personal hub. The draft lives here so it can be used now. Moving it means copying the folder, plus either copying `cloud.js` or dropping sync (only slider positions are synced), and adding a short About page.

## Left for later (from the brief)

The executive-translation drill in a claude.ai artifact (three sentences for a supply-chain director, graded on answer first, one number, one action); accrual walk-throughs; FX translation (average versus closing rate) on real ECB series from Frankfurter; standard-cost variance decomposition; downloadable Power Query templates. Templates stay free; selling them means a registered side business and telling the employer.

## After a change

Run the tests, then bump `V` in `sw.js` so installed copies pick up the new files.
