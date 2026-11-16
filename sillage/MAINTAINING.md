# Sillage — maintenance notes

A fragrance wardrobe: what he owns, what he wears, and what to try next. First draft built 14 Nov 2026; the plan is to improve it from real use.

## What is where

| File | What it does |
|------|--------------|
| `js/library.js` | About 120 well-known fragrances with their note pyramids, year, family and price band. Only add rows at the end. |
| `js/match.js` | Accords from notes, similarity with reasons, the scent profile, next picks in three lanes, the wear year. Pure functions. |
| `js/engine.js` | Cost per wear, what is left in a bottle, the daily pick, the taste read from his grades, the export for Claude and the reading of Claude's answer. Pure functions. |
| `js/draw.js` | The bottle silhouettes (level = what is left, colour = family) and the notes pyramid. |
| `js/ui.js` | Every screen (Today, Wardrobe, To sample, Settings) and the bottle form. |
| `js/store.js` | Saved state, the example wardrobe, backup export and import. |
| `js/i18n.js` | English and French, including the question sent to Claude. |
| `test/sillage.test.mjs` | `node --test sillage/test/*.mjs` — 17 checks on invented figures and the library. |

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

## Matching, profile and next picks (Nov 2026)

- **Accords from notes** (`match.js`): every note feeds one or more of 14 accords (citrus, aromatic, green, aquatic, floral, fruity, spicy, woody, amber, leather, gourmand, musky, powdery, smoky) through keyword rules; top notes count 0.6, heart 1, base 1.3, and the family adds 1.6 to its own accord. The map is scaled so the strongest accord is 1.
- **Similarity** = 0.68 × cosine of the accord maps + 0.32 × shared notes (weighted Jaccard, each note weighted by tier and by how rare it is in the library) + 0.06 for the same family. The reasons on screen are the three strongest shared notes, "fresher / warmer / sweeter" when the light or warm accords differ by more than 0.5, and the two main notes the match adds.
- **A bottle typed without notes** borrows the library's pyramid when its name matches.
- **Profile**: each bottle weighs grade/10 (ungraded 5) × (1 + 3 × its share of all wears), so what is worn counts as much as what is graded. Gaps: a season nothing covers (tagged, or family carrying well in that weather), an occasion nothing is tagged for (when tags are used), a main family missing; untried notes from a fixed list of 15 notable notes; "worn more than its grade says" from 8 wears on.
- **Next picks**: safe = closest to the profile and to one bottle; gap = covers a gap, still close; wildcard = related (cosine 0.45–0.82) and brings an untried note. Owned, listed and dropped scents are left out.
- **Claude** (through `../ask.js` and the "ask" function, see the README): "Ask Claude for more" on a bottle, "Write my portrait", and next picks checked on the web for price and samples. The portrait and the last picks are saved in the state (`ai`); similar results are kept for the session only.
- The copy-and-paste loop is still there, folded under the next picks, for when the function is not set up.

## Library checks

The twice-yearly scheduled task "Sillage library refresh" (3 March and 3 September) verifies 25 rows against the houses' pages and adds up to 30. It records verified rows here.

| Date | Rows verified | Rows added |
|------|---------------|------------|
| 16 Nov 2026 | none yet (rows compiled from commonly published pyramids) | 120 |

## Similar fragrances (the Claude loop)

There is no free, open fragrance-notes database, so matching is not computed in the app. On the "To sample" tab: "Copy for Claude" puts a ready question on the clipboard with the graded wardrobe (no prices), the taste read from it, and what is already listed or dropped. He pastes it into any Claude chat, then pastes the answer back; the app reads the JSON list, skips what he owns or already listed, and adds the rest to the queue marked "suggested by Claude". A chat was chosen over a built-in companion page because a chat can search the web for current releases and sample availability.

## Data and privacy

State is one browser key, `sillage.v1`, mirrored through `../cloud.js` under the app key `sillage` once signed in. Today's forecast is cached for the day under `sillage.wx` on the device only. Nothing is saved until he changes something. The example wardrobe is five well-known fragrances with invented grades, prices and wears; wearing an example does not make it his, editing it does.

## Left for later

Decant and sample sizes; layering ideas; reminders for the monthly discovery set.

## After a change

Run the tests, then bump `V` in `sw.js` so installed copies pick up the new files.
