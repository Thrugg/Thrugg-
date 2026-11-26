# How v1 of the Paris list was made

These scripts produced the first version of `../data/paris.xlsx` on 26 Nov 2026:

1. `spots_a.py`, `spots_b.py`, `spots_c.py`, `events.py` and `reference.py` hold the researched content (sources in each row).
2. `geocode.py` places every spot with OpenStreetMap's Nominatim (one request a second, cached, with fallbacks and a postcode check). `overrides.json` holds the hand fixes; `geocode_events.py` does the same for events that have no linked spot.
3. `wikidata.py` and `wd_search.py` fetch the number of Wikipedia language editions (the fame cross-check); `wd_fix.json` corrects wrong Wikidata links found in OpenStreetMap.
4. `build_xlsx.py` writes the workbook; `export_csv.py` writes the CSV copies.

**From now on the workbook is the master.** Do not rebuild it from these seed files once it has been edited by hand, or those edits are lost. Later passes should edit the workbook in place (for example, geocode only the rows that have no coordinates). The geocoding and Wikidata scripts are reusable for the next city.
