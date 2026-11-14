# The Funds Ladder — maintenance notes

The next financial targets after the emergency fund, as a ladder: what comes next, how much is left, and when each rung is reached at the current monthly pace. First draft built 14 Nov 2026; the plan is to improve it from real use.

## What is where

| File | What it does |
|------|--------------|
| `js/engine.js` | The sums: how one monthly amount is shared between rungs (`split`), when each rung is reached (`project`), and the "812 maths" card (`carMaths`). Pure functions. |
| `js/ui.js` | Every screen (Ladder, 812 maths, Log, Settings). |
| `js/store.js` | Saved state, the example ladder, reading Safety Net Score, backup export and import. |
| `js/i18n.js` | English and French. |
| `test/ladder.test.mjs` | `node --test ladder/test/*.mjs` — 7 checks on invented figures. |

## How it works

- A rung has a target (typed, or the sum of several lines), an amount already set aside, an optional "wanted by" month and a share.
- One monthly amount is shared by one of two rules. **One after the other:** the lowest unfinished rung takes everything it needs, the rest overflows upward. **By shares:** each open rung takes its percentage; a rung that fills up hands its surplus to the others.
- The projection repeats that month after month and gives the month each rung is reached. A rung reached after its date is flagged, with the monthly amount the dated rungs would need.
- "Put this month's amount on the ladder" applies the split to the saved amounts and records it in the Log. The last entry can be undone.
- Paused rungs are skipped. Rungs can be moved sooner or later.

## Link with Safety Net Score

The emergency-fund rung can read its figures from Safety Net Score on the same device: cash savings from the active profile, and the "Excellent" level as the target. Safety Net Score writes its four levels into its own saved state (`levels`) each time its score tab is drawn, so it must have been opened once since 14 Nov 2026. If the levels are missing, or the currencies differ, the amounts typed on the rung are used. The link is read-only: money allocated to that rung is logged here, and the person updates their savings in Safety Net Score.

## 812 maths

Yearly loss of value + insurance + service, divided by the price of one premium rental day, gives the rental days the same money buys. With the days the person would really drive, it compares the cost per driven day. All inputs are typed by hand in this draft. The money tied up in the car is left out, which the screen says.

## Data and privacy

State is one browser key, `ladder.v1`, mirrored through `../cloud.js` under the app key `ladder` once signed in. Nothing is saved until the person changes something. The example ladder uses invented amounts, and its dates are counted from the day the app is opened, so the repository describes no real plan.

## Left for later (from the brief)

Feed the 812 card from Prüfstand's used-price model; pull the dog rung from Doodle Window's cost ledger; link the move-buffer rung to Seuil and the move planner.

## After a change

Run the tests, then bump `V` in `sw.js` so installed copies pick up the new files.
