# Tandem — maintenance notes

One spaced-repetition engine, two learners: ten minutes a day, and each checks the other's language over dinner. First draft built 16 Nov 2026; the plan is to improve it from real use. Works alone as well: the partner link is optional.

## What is where

| File | What it does |
|------|--------------|
| `js/decks.js` | The three starter decks (207 cards): Polish for a family weekend in the mountains (EN + FR meanings), German at work for controlling (EN + FR), German for every day in Munich (EN + PL + FR). |
| `js/engine.js` | The day's queue, answering and undoing, practice time per day and device, streaks, deck counts, and what is shared with the partner. Pure functions. |
| `vendor/ts-fsrs.mjs` | The FSRS scheduler, ts-fsrs 5.4.2 (MIT), copied unchanged from npm. |
| `js/pair.js` | The partner link through Supabase (table `tandem_pair`). |
| `js/ui.js` | Every screen: first day, Today and the review, Decks, Together, Settings. |
| `js/store.js` | Saved state, backup export and import. |
| `js/i18n.js` | English and French. |
| `supabase.sql` | The one-time table for the partner link. |
| `test/tandem.test.mjs` | `node --test tandem/test/*.mjs` — 13 checks on invented reviews. |

## Scheduling

- FSRS with the library defaults: 90 % target retention, learning steps of 1 and 10 minutes for a new card, 10 minutes after a lapse, at most ten years between reviews, a little random spread on long intervals.
- Ten new cards a day by default (Settings), taken in turn from each deck that is switched on, so Polish and German move forward together. Due cards come first, those in their short learning steps before older reviews.
- Cards still in a learning step and due within 20 minutes can be pulled forward at the end ("Review them now").
- The daily goal is ten minutes. A card counts for at most a minute of practice, so a phone left open does not inflate the day.
- Only the card states are kept, not a log of every answer. If the FSRS parameters are ever to be fitted to his own memory, a review log has to be added first.

## Changing a deck

Card ids are the deck id plus the position (`pl-weekend:041`), and the review history hangs on that id. So: **only add cards at the end of a deck, never reorder or delete.** To drop a card, give it `x: 1`; it then never shows. A new deck needs a new id, a title and subtitle in English and French, and `lang` (`pl` or `de`).

## The partner link (Together tab)

Each learner signs in to sync on their own phone with their own account in the hub's Supabase project, then one creates a tandem code and the other enters it (or opens the shared link, which carries the code).

One-time setup, before the first link:

1. Supabase dashboard → **SQL Editor** → New query → paste [`supabase.sql`](supabase.sql) → **Run**. Safe to run again.
2. The partner needs an account: **Authentication → Users → Add user** (email and password), unless she already has one.

How it works: each learner writes one row per tandem code (`tandem_pair`, key = code + account). A row holds the name, colour, the cards flagged for checking (with their text, since the other may not have that deck), the answers given to the other's flags, and the week's totals. Row-level security lets each account write only its own row and read only the rows of a code it has joined; a code holds two accounts at most. The policies were checked against a local Postgres with two simulated accounts and a third that tries to join. Decks, review history and own cards stay in `app_state` and are never shared.

The flag loop: a card flagged during review (rope button, or F on a keyboard) lands in the partner's "For you to check" list. The partner answers "That's right" or "Not quite", with an optional correction. The answer shows on the flagger's side, who closes it with "Got it". Without a partner the flagged cards still gather on the Together tab, to show at dinner.

Partner news is read when the app opens, when it comes back to the screen, when the Together tab opens and every minute while Today or Together is on screen. Changes are sent a few seconds after they happen and when the app is put away.

If the table is missing, the Together tab says so and names `supabase.sql`.

## Data and privacy

State is one browser key, `tandem.v1`, mirrored through `../cloud.js` under the app key `tandem` once signed in. Practice time is stored per day and per device (`tandem.dev`, never synced) so two devices on the same day add up. The last copy of the partner's row is kept on the device under `tandem.partner` for offline use. Nothing is saved until something is changed. The repo holds only the public decks; own cards (personal sentences) live in the account.

## Left for v2 (from the brief)

- Polish case and declension drills from a pre-processed Wiktionary (kaikki.org) frequency subset stored in the repo.
- A claude.ai companion that turns pasted real sentences (a work email, a family message) into cloze cards.
- Audio through the phone's built-in speech.
- Reverse cards (meaning → phrase), once recognition is solid.

## After a change

Run the tests, then bump `V` in `sw.js` so installed copies pick up the new files.
