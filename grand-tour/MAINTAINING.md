# Grand Tour — maintenance notes

A personal atlas of five-star hotels, stayed at and wished for, graded his way. First draft built 14 Nov 2026; the plan is to improve it from real use.

## What is where

| File | What it does |
|------|--------------|
| `js/engine.js` | The ladder (grade from a nightly rate), the experience score, value for the grade, distance and bearing, filters, the stay figures. Pure functions. |
| `js/atlas.js` | The drawings: the compass plate, the value chart, and the real map (loaded only when asked for). |
| `js/ui.js` | Every screen (Atlas, Stays, Grades, Settings) and the hotel form. |
| `js/store.js` | Saved state, the five example hotels, backup export and import. |
| `js/i18n.js` | English and French. |
| `test/grandtour.test.mjs` | `node --test grand-tour/test/*.mjs` — 10 checks on invented figures. |

## The ladder

Five grades of five stars, from the rate a hotel asks for a standard double in its main season:

| Grade | Name | Band per night | Par |
|-------|------|----------------|-----|
| I | Maison | under €250 | 60 |
| II | Grand Hôtel | €250–450 | 68 |
| III | Palace | €450–800 | 76 |
| IV | Sanctuaire | €800–1,500 | 84 |
| V | Légende | above €1,500 | 92 |

Names and bands are his to change on the Grades tab. A hotel takes its own grade if one was picked, else the grade of its season rate, else the grade of what was paid.

**Calibration (Nov 2026).** One hotel per grade, at the rate found for its main season: NH Collection Prague Carlo IV about €220 (I), Sofitel Munich Bayerpost about €300 (II), Hotel Sacher Salzburg about €520 (III), Bürgenstock Hotel & Alpine Spa about €1,300 (IV), Six Senses Crans-Montana about €1,700 in winter (V). His three reference hotels land in grades I, IV and V. A test keeps it that way. Re-check the sample once a year: there is no free source of live hotel prices.

## Experience and value

- Eight criteria scored 1 to 5: pool, sauna and spa, parking, gym, room, service, food, dog policy. Unscored criteria are left out. Each criterion has a weight (ignore, once, double, triple) on the Grades tab.
- Experience = weighted mean × 20, out of 100.
- Value for the grade = experience minus the par of the grade. The par (60, then +8 per grade) is a convention; once he has about ten stays it could be fitted to his own scores.
- A stay scoring 80 or more is "memorable". Cost per memorable night = everything spent on stays ÷ nights of the memorable stays.

## Several stays, own par, hikes nearby, ideas (Nov 2026)

- **Several stays** (`staysOf`, `newStay`): a hotel's own stay fields hold the latest stay; "Add another stay" moves it into `h.past` and opens the form for the new one. Stats count every stay (`visits`), nights and money included. Value for the grade and the ranking still read the latest stay.
- **Own par** (`fitPar`): least-squares line through (grade, experience) of every scored stay, earlier ones included; needs 10 stays over 3 grades and a rising line. "Use my own par" saves it in `S.par`; `usePar` applies it before every render.
- **Hikes nearby** (`hikesNear`): Cordée's catalogue (`../data/hikes.json`), hike starts within a rough 30-minute drive (straight line × 1.3 at 85 km/h), with the dog rule. Weekend ideas list the hotels with the most nearby hikes, wish-list hotels first.
- **Hotel ideas from Claude** (task `hotel_suggest` of the "ask" function): five hotels within about five hours matching the criterion weights, with season rate; "Add to my wish list" creates the hotel with its pin, rate and facilities.
- **Candidates** (`js/candidates.js`): a public list filled and re-checked by the scheduled task "Grand Tour refresh" (2 April and 2 October), which also re-checks the calibration hotels below.

## The compass and the map

- The compass is the default view and works offline: home in the middle, each hotel at its true bearing, further out the longer the drive (square-root scale, rings every two hours).
- "Map" loads MapLibre from unpkg and the OpenFreeMap "positron" style. If either fails to load, the app says so and returns to the compass.
- "Find on the map" looks the name up with OpenStreetMap Nominatim, then asks OSRM for the drive from home. Without a routed time the drive is estimated: straight-line distance × 1.3 at 85 km/h, and shown as "about".
- Not exercised from the build machine (the sandbox blocks these hosts): the real map, the place lookup and the routed drive time. Their failure paths were tested.

## Data and privacy

State is one browser key, `grandtour.v1`, mirrored through `../cloud.js` under the app key `grandtour` once signed in. Nothing is saved until he changes something. The five example hotels are real; the two example stays carry invented dates and scores.

## Left for later (from the brief)

A chapter in the year in review across the apps.

## After a change

Run the tests, then bump `V` in `sw.js` so installed copies pick up the new files.
