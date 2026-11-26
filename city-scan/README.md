# City Scan (working name)

A city companion built on Cordée's 3D map: every spot worth visiting, colour-coded by kind, graded 1–5 by importance, validated with a photo when you have been there, and with seasonal layers (Christmas first) that switch on by date. Paris is the first city; the data model is the same for any city or small region.

Status: **research and shared data (v1)**. The app itself is not built yet.

## The shared list

[`data/paris.xlsx`](data/paris.xlsx) is the master list we both edit:

| Sheet | What it holds |
|---|---|
| Start here | How to use the file, the trip dates and base (yellow cells), live counts |
| Spots | 211 places, one row each: category (map colour), importance 1–5, "the shot" to validate the visit, December 2026 notes, price, booking, closures, transport, coordinates, check-in radius, sources |
| Christmas 2026 | 52 dated events (windows, lights, markets, rinks, light festivals, châteaux, masses, concerts, New Year's Eve, closures) with a "During our trip?" column and a confidence level |
| Categories | The 12 categories and their colours |
| Importance scale | What 1–5 means, and how the grades were set |
| Yearly seasons | Candidate seasonal layers for the rest of the year |
| Practical | Tickets, passes, free days, closing days, scams, daylight in December |

To add a spot, fill **Name** and **City** on a new row of "Spots" and put "You" in **Added by**; Claude completes the rest on the next pass. The yellow columns (For us, Visited on, Photo validated, Our notes) are yours.

`data/paris-spots.csv` and `data/paris-events.csv` are plain-text copies of the two main sheets, so changes show up in git diffs. The workbook stays the master.

How sure each line is: "Info checked" says whether a spot was checked on the web on 26 Nov 2026 (with its source) or comes from general knowledge and needs a check before going. Each event has a confidence level: Confirmed, One source or Not confirmed.

Coordinates: © OpenStreetMap contributors (ODbL), geocoded with Nominatim. A few were placed by hand, as the "Location source" column says. "Wikipedia editions" comes from Wikidata (CC0) and is a rough cross-check on global fame.

## Data model (for the app)

- **Spot** (permanent): id, city, name, category, importance 1–5, zone, area, why, the shot, tips, visit time, indoor/outdoor, price, booking, closed days, free-for, getting there, tags, romantic, status (open / closed until … / closed for the season), lat/lon, check-in radius, sources, checked-on date.
- **Event** (time-bound layer): id, name, type, start, end, hours, price, season importance, linked spot (or its own lat/lon), confidence, source. The app shows an event only between its start and end dates.
- **Season** (recurring calendar): which layer to prepare each year (Christmas, Fête de la Musique, 14 July, Heritage Days…).
- **Visit** (personal, synced): spot id, date, photos, the location at capture, who was there, rating, note.

## Findings that shape the app

- **Photo validation can't rely on the photo's own location data.** A photo taken from the web page's camera loses its GPS data on the iPhone, and a photo picked from the library keeps it only if the picker's "Location" option is left on ([WebKit 257534](https://bugs.webkit.org/show_bug.cgi?id=257534), [WebKit 207088](https://bugs.webkit.org/show_bug.cgi?id=207088)). So the app should check the phone's location when the photo is taken (inside the spot's check-in radius) plus the time, and treat the photo's GPS data as a bonus. Underground or deep inside buildings (Catacombs, Louvre), GPS is weak: allow validating at the entrance, or mark the visit "self-validated".
- **Status matters as much as pins.** The Centre Pompidou is closed until 2030, the Montparnasse observatory since 31 Mar 2026, and Giverny for the winter. The map must say so.
- **Daylight drives December plans.** Sunset is around 16:55, so sights belong in daylight and the illuminations come after 17:00.
- **3D is cheap.** Cordée's MapLibre + OpenFreeMap tiles already carry building heights, so Paris can be drawn in 3D with no new service or key. Landmark 3D models can come later.
- **Live data sources:** the City of Paris "Que faire à Paris ?" open events agenda ([data.gouv.fr](https://www.data.gouv.fr/datasets/que-faire-a-paris-evenements-et-activites)); DATAtourisme for French cities (free, Licence Ouverte, but its distribution platform is announced to close in 2027); OpenStreetMap + Wikidata for any country.

## Ideas beyond the brief

1. **Plan my day**: picks from your Must/Want spots and respects closing days, hours, daylight, weather (Open-Meteo, already used by Cordée) and distance, with daylight sights first and lights after dark.
2. **Themed walks** traced with Cordée's route engine: the Christmas windows & lights walk (Haussmann → Vendôme → Saint-Honoré → Concorde → Champs-Élysées → Montaigne), Seine bridges, Montmartre, the covered passages on a rainy day.
3. **Booking radar**: "book by" dates (Eiffel summit, Galerie Dior, Septime, Moulin Rouge, Vaux) with reminders and official links only.
4. **Couple mode**: one shared list where each of you votes, duo validation (both of you in the photo), and the partner's "firsts". Pairing can reuse Tandem's code.
5. **Passport & badges**: points weighted by importance; collections (all 20 arrondissements, every grade-5 spot, Christmas lights hunter, Seine bridges). Feeds the "Our year" page.
6. **Rainy-day mode** using the indoor/outdoor flag.
7. **Live banners**: metro strikes and disruptions, the Eiffel Tower sparkle on the hour, and events from the open agenda.
8. **Ask Claude** through the existing `ask.js` flow: check a spot's current hours and prices, or read a poster or screenshot and turn it into an event.
9. **Weekly refresh** by a scheduled task, as with Cordée and Écurie: prices, closures and new events, plus a requests list.
10. **Next cities**: seed a city from OpenStreetMap tourism tags + Wikidata fame + UNESCO, then curate the grades and add that city's seasonal calendar.
11. **Trip album**: photos by day on the map at the end of the trip (Cordée's album, reused).

## Open questions

- Exact trip dates and hotel area (they drive "During our trip?", distances and a day-by-day plan).
- Where the common file should live day to day: this repo, Google Drive or OneDrive.
- The app's name.
