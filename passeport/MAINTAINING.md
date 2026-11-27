# Passeport — maintenance notes

Paris on a 3D map with a passport you stamp by validating visits with a photo. First version built 27 Nov 2026 for the December 2026 Christmas season; the guide data is checked as of 26 Nov 2026.

## What is where

| File | What it does |
|------|--------------|
| `data/paris.json` | The guide the app reads: places, events, car parks, lists. Written by `tools/export_app_data.py`; never edit it by hand. |
| `js/rules.js` | Distances, closing days (`closedOn`), events on a day, "what now" suggestions, search. Pure functions. |
| `js/sky.js` | Sunrise, sunset, civil dusk (NOAA/SunCalc formulas), Paris wall-clock time, the Eiffel Tower sparkle. Pure. |
| `js/stamp.js` | The stamps (one shape per kind of place, ink in its colour, a fixed tilt per place), points, ranks and the 14 badges. Pure. |
| `js/plan.js` | Trip days, "park once" groups, day warnings, navigation links, share links (`#share=`). Pure. |
| `js/camera.js` | Photo picking, EXIF GPS and date, shrinking on the phone, the visit decision (`judge`), photos in IndexedDB. |
| `js/map.js` | MapLibre on OpenFreeMap tiles: the day and night styles, spot layers, round photo markers, car parks, the day route. |
| `js/ui.js` | The shell: filters, the bottom sheet (Now, or a place), search, tabs, the single click dispatcher. |
| `js/views.js` | Lists, Passport, Trip and Settings. |
| `js/flows.js` | Validating a visit (the stamp falls), a stamp's page, the postcard, sharing and opening links. |
| `js/postcard.js` | The 1800×1200 postcard picture. |
| `js/store.js` | Saved state (`passeport.v1`), backup export and import. |
| `js/i18n.js` | French and English for every word of the interface. |
| `test/passeport.test.mjs` | `node --test passeport/test/*.mjs`: data integrity, sun times against `tools/sun.json`, sparkle, closing days of the real guide, suggestions, search, stamps, badges, trips, share links, EXIF, the visit decision, and that every word exists in both languages. |

## Rules worth knowing

- **Closing days** are read from the guide's text ("Mondays", "Tuesdays, 1 Jan, 1 May, 25 Dec", "Fri evening–Sat", "Open Thu & Sun mornings only", "Closed Nov–Mar"…). A museum, château or shop with no closing text is "may close" on 25 Dec and 1 Jan. A new phrasing needs a case in `closedOn` and in the test; the test also fails if a place would be closed more than four days a week.
- **Suggestions** score = grade × 2.2, +4 for a must, +2 for a want, +1.6 when an event runs there today, +1.5 for night places after dark and −3 for parks, museums and châteaux after dark, −2.5 for outdoor places in the rain, −0.9 per km (at most −7), −1.5 when it may be closed. Visited and closed places are left out; day trips only when you are there.
- **Validation**: on site when the phone is within the place's radius (at least 80 m, as set in the guide) plus its GPS accuracy (counted up to 150 m) at the moment the photo is taken; else by the photo's own GPS (radius + 60 m); else self-declared (grey stamp, 60% of the points). The photo never leaves the phone.
- **Points** = grade × 10, × 0.6 if self-declared, × 1.2 if marked "together". Ranks at 0, 60, 180, 380, 700 and 1,100 points.
- **Sparkle**: on the hour from civil dusk until the 23:00 one (lights off at 23:45). If the tower's schedule changes, change `nextSparkle` and its test.
- **Car parks**: the three nearest public ones within 900 m in Paris (1.6 km outside), named underground or multi-storey first. Disabled bays, bus, staff, resident and private car parks are dropped by name in the export.
- **Names**: places keep their English name as `n` in the data (it is the key for photos and coordinates); `nf` is the French name used when the app is in French. Ids are slugs of the English names: never rename a place without adding the old slug to `ALIASES` in the export, or saved visits and lists lose it.

## Updating the guide

1. Edit the content in `tools/` (see `tools/README.md`), geocode and fetch photos for new places.
2. `cd passeport/tools && python3 export_app_data.py ../data/paris.json`
3. `node --test passeport/test/*.mjs`
4. Bump the cache name `V` in `sw.js` so phones pick up the new guide and code.

Every place says whether it was checked on the web (and when) or comes from general knowledge. Christmas events carry a confidence level. Before next season: refresh the event dates, the closures (Centre Pompidou until 2030, Montparnasse observatory) and the prices.

## Outside services

| Service | Used for | If it is down |
|---|---|---|
| tiles.openfreemap.org | Map tiles and fonts | The rest of the app works; tiles you opened before are kept offline (newest 3,000). |
| upload.wikimedia.org | Place photos (with credit) | The drawn placeholder shows. Seen photos are kept offline (newest 900). |
| unpkg.com | MapLibre GL JS 5.24.0 | Kept offline after the first visit. |
| api.open-meteo.com | Weather for central Paris | No weather pill; rain does not weigh in the suggestions. |
| nominatim.openstreetmap.org | Finding a trip base by name (on request only) | Use "my position" instead. |
