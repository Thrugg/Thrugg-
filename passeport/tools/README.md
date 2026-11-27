# How the Paris guide is made

These scripts produce the app's data (`../data/paris.json`) and the workbook (`../data/paris.xlsx`, with CSV copies). Nothing personal goes in them: the repository is public, and each person's lists, visits and trips stay on their own phone or account.

1. **Content.** `spots_a.py` to `spots_d.py`, `events.py` and `reference.py` hold the researched places, the dated events of the 2026 Christmas season and the reference sheets, with a source on each row. `common.py` holds the 13 categories and their colours.
2. **Places on the map.** `geocode.py` places every spot with OpenStreetMap's Nominatim (one request a second, cached, with fallbacks and a postcode check) into `geocoded.json`. `overrides.json` holds the hand fixes; `geocode_events.py` does the same for events with no linked spot (`geocoded_events.json`).
3. **Fame cross-check.** `wikidata.py` and `wd_search.py` count each place's Wikipedia language editions (`wikidata.json`); `wd_fix.json` corrects wrong Wikidata links found in OpenStreetMap.
4. **Photos.** `fetch_photos.py` takes each place's Wikidata image, else the best picture of its Commons category, else a Commons search near its position, and records the author, the licence and the file page (`photos.json`). `photo_search.py` and `photo_fix.py` replaced the wrong automatic picks (plaques, portraits, paintings) with hand picks listed in `photo_overrides.json`. Only standard thumbnail widths are used (250, 500, 960 px), from `upload.wikimedia.org`.
5. **Car parks.** `fetch_parking.py` asks Nominatim for car parks around each place (`parking.json`, from OpenStreetMap). The Overpass API would be the usual source but was not reachable from where this was built.
6. **Ready-made trips.** `trips.py` holds the suggested trips (days, titles, notes, places by name); the export checks every place exists.
7. **French names.** `names_fr.json` gives the French name of the places whose name is in English ("Tour Eiffel", "Musée du Louvre"); the app shows it when it is in French and search finds both.
8. **Outputs.** `export_app_data.py ../data/paris.json` writes the app's file (ids are slugs of the names, so saved visits survive a re-sort; a renamed place needs an entry in its `ALIASES`). `build_xlsx.py` writes the workbook (then recalculate it once in LibreOffice or Excel so the formulas carry values) and `export_csv.py ../data/paris.xlsx ../data` the CSV copies.

Run them from this folder with Python 3. The network steps (2 to 5) are cached and polite: one request a second, a clear user agent, and nothing re-fetched that is already in the JSON files.

To add places: append rows to `spots_d.py` (name, category, grade, area, why, the shot, tips, December notes…), geocode the new rows, fetch their photos, then run the exports. Keep existing names unchanged, or add the old slug to `ALIASES`.
