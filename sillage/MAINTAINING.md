# Sillage — maintenance notes

A fragrance wardrobe: what he owns, what he wears, and what to try next. First draft built 14 Nov 2026; the plan is to improve it from real use.

## What is where

| File | What it does |
|------|--------------|
| `js/engine.js` | Cost per wear, what is left in a bottle, the daily pick, the taste read from his grades, the export for Claude and the reading of Claude's answer. Pure functions. |
| `js/draw.js` | The bottle silhouettes (level = what is left, colour = family) and the notes pyramid. |
| `js/ui.js` | Every screen (Today, Wardrobe, To sample, Settings) and the bottle form. |
| `js/store.js` | Saved state, the example wardrobe, backup export and import. |
| `js/i18n.js` | English and French, including the question sent to Claude. |
| `test/sillage.test.mjs` | `node --test sillage/test/*.mjs` — 11 checks on invented figures. |

## How the daily pick is scored (out of 100)

| Part | Points |
|------|--------|
| His grade (out of 10) × 4; an ungraded bottle counts as 5 | up to 40 |
| How the family carries in today's weather (`FIT` table in `engine.js`) | up to 25 |
| Season tag matches | 15 (7 when the bottle has no season tags) |
| Occasion tag matches, when an occasion is picked | 15 (5 when untagged) |
| Days since last worn, capped at 14 | up to 10 |
| Worn yesterday | −8 |

A bottle already worn today goes to the bottom. Weather comes from Open-Meteo (today's high for the town in Settings), in four bands: hot from 24°, mild from 15°, cool from 7°, cold below. Without a forecast the band follows the calendar season. When he picks the band himself, season tags are read against that feeling, not the calendar.

The weather-fit table is a perfumery convention (fresh for heat, dense for cold), not a measurement. It is the first thing to tune from use.

## What is left in a bottle

Size minus wears × sprays per wear × 0.1 ml. Sprays per wear is a setting (6 to start). It is an estimate and the screens say "about".

## Similar fragrances (the Claude loop)

There is no free, open fragrance-notes database, so matching is not computed in the app. On the "To sample" tab: "Copy for Claude" puts a ready question on the clipboard with the graded wardrobe (no prices), the taste read from it, and what is already listed or dropped. He pastes it into any Claude chat, then pastes the answer back; the app reads the JSON list, skips what he owns or already listed, and adds the rest to the queue marked "suggested by Claude". A chat was chosen over a built-in companion page because a chat can search the web for current releases and sample availability.

## Data and privacy

State is one browser key, `sillage.v1`, mirrored through `../cloud.js` under the app key `sillage` once signed in. Today's forecast is cached for the day under `sillage.wx` on the device only. Nothing is saved until he changes something. The example wardrobe is five well-known fragrances with invented grades, prices and wears; wearing an example does not make it his, editing it does.

## Left for later

A companion page inside claude.ai if the copy-and-paste loop proves tedious; decant and sample sizes; a year view of wears by season; reminders for the monthly discovery set.

## After a change

Run the tests, then bump `V` in `sw.js` so installed copies pick up the new files.
