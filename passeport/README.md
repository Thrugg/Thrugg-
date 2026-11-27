# Passeport

Paris on a 3D map, for a first visit or a tenth. Every place worth the trip is coloured by kind, graded 1 to 5, shown with a photo, and stamped into your passport when you validate the visit with a photo of your own. The Christmas lights, markets and windows switch on by date. Paris is the first city; the data model works for any city or small region.

Open it at https://thrugg.github.io/Thrugg-/passeport/ (on the iPhone: Share → Add to Home Screen).

## What it does

| Screen | What you get |
|---|---|
| Map | A warm paper map by day and a navy city by night (it switches at sunset), with the buildings in 3D. Dots coloured by kind and sized by grade; the grade 4–5 icons turn into round photos as you zoom in; a gold glow on places with a Christmas event today. Filters by kind, "my list", "not visited" and Christmas. |
| Now | What to do right now: daylight left, the next Eiffel Tower sparkle (every hour on the hour after dark until 23:00), today's Christmas events, the weather, and suggestions from your list, the grade, the time of day, the rain and the distance. |
| A place | A photo of the place, why it matters, "the shot" (the photo that proves you were there), tips, what is different in December, dated events, price, booking, closing days, and the nearest car parks with Waze and Google Maps links. A warning when it is closed today (Mondays, Tuesdays, 25 December and 1 January, works). |
| Lists | Your own list (♡ want, ★ must) and ten curated lists: first time, Christmas 2026, palaces & haute cuisine, for two, views, rainy day, free, after dark, eat & drink, beyond Paris. |
| Passport | A navy cover with your name, your stamps (one per validated visit, inked in the colour of the place's kind, slightly crooked like a real one), points, a rank from Tourist to Ambassador, and 14 badges (all the world icons, the Christmas lights, the Seine bridges, ten arrondissements, the Left Bank…). |
| Trip | Your dates and base, a page per day with its places in order, warnings for anything closed that day, sunset and dark times, "park once" groups (one car park for several places within walking distance), a driving route, a fly-over of the day on the map, and a link to share the whole trip. A ready-made **Christmas fortnight by car** (16–30 Dec 2026) loads in one tap: the windows and lights, the museums on their open days, Versailles, châteaux by night and Christmas Day on the Normandy coast (Étretat, Honfleur, Deauville). |
| Postcard | After a visit: your photo, the stamp, the place and the date as a postcard picture to save or send. |

## Validating a visit

The phone's position is read when the photo is taken: within the place's check-in radius (at least 80 m, up to 2 km for a park or a whole district, plus the phone's GPS margin up to 150 m) the stamp says VISITÉ. If the photo comes from the library and still holds its GPS data, that position is used. Otherwise the stamp is grey and says DÉCLARÉ (self-declared). It still counts, for 60% of the points.

Why not trust the photo alone: a photo taken from a web page's camera loses its GPS data on the iPhone, and a photo picked from the library keeps it only if the picker's location option is left on ([WebKit 257534](https://bugs.webkit.org/show_bug.cgi?id=257534), [WebKit 207088](https://bugs.webkit.org/show_bug.cgi?id=207088)). Underground or deep inside a building GPS is weak, so validate at the entrance.

## Privacy

- Your photos are made smaller on the phone and kept in the browser's storage. They are never uploaded.
- Your list, visits, notes and trip are saved on the phone, and on your own account if you sign in (Settings → Sync), so two phones can share one passport. The photos stay on the phone that took them.
- A shared link carries the list or trip inside the link itself, after the `#`, which browsers never send to a server.
- The weather comes from Open-Meteo for central Paris (no position is sent). Your position is only used on the phone.

## The data

`data/paris.json` is what the app reads: 248 places, 55 dated events for the 2026 Christmas season, 689 car parks, 10 curated lists and one ready-made trip. It is written by `tools/export_app_data.py` from the researched content in `tools/` (see [tools/README.md](tools/README.md)).

`data/paris.xlsx` is the same guide as a workbook, with the categories, the importance scale, the yearly seasons and practical notes (driving and parking rules, tickets, closing days, scams, daylight). `data/paris-spots.csv` and `data/paris-events.csv` are plain-text copies, so changes show in git diffs.

How sure each line is: each place says whether it was checked on the web on 26 Nov 2026 (with its source) or comes from general knowledge and needs a check before going. Each event has a confidence level: confirmed, one source, or not confirmed.

### Credits

- Map: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), tiles by [OpenFreeMap](https://openfreemap.org) (OpenMapTiles schema), drawn with MapLibre GL JS.
- Coordinates and car parks: OpenStreetMap through Nominatim. A few places were set by hand.
- Photos: Wikimedia Commons. Each photo shows its author and licence and links to its file page. 31 places have no free photo yet and show a drawn placeholder in their colour until you add your own.
- Fame cross-check: Wikidata (CC0).
- Weather: [Open-Meteo](https://open-meteo.com).
- Fonts: Bodoni Moda, DM Sans and IBM Plex Mono, under the SIL Open Font License (`fonts/OFL.txt`).

## Findings that shaped the app

- **Status matters as much as pins.** The Centre Pompidou is closed until 2030, the Montparnasse observatory since 31 Mar 2026, Giverny for the winter. The map greys out what is closed today.
- **Daylight drives December plans.** Sunset is around 16:55, so sights belong in daylight and the lights come after 17:00.
- **3D is free.** OpenFreeMap tiles carry building heights, so Paris is drawn in 3D with no service or key.
- **By car**, Paris is a low-emission zone (Crit'Air sticker), the centre (1st to 4th) is a limited-traffic zone you may enter only to reach a destination inside it (a car park counts), not to cross it, and heavy cars pay a higher on-street parking rate. The app sends you to underground car parks rather than the street.

## Ideas for later

1. **Plan my day** from the list: closing days, hours, daylight, weather and distance, sights first and lights after dark.
2. **Themed walks** traced on the map: the Christmas windows & lights walk (Haussmann → Vendôme → Saint-Honoré → Concorde → Champs-Élysées → Montaigne), the Seine bridges, Montmartre, the covered passages on a rainy day.
3. **Booking radar**: "book by" dates (Eiffel summit, Galerie Dior, Moulin Rouge, Vaux-le-Vicomte) with official links only.
4. **Couple mode**: one shared list where each of you votes, and both names on a duo stamp.
5. **Live banners**: strikes and line closures, and events from the City of Paris open agenda ([data.gouv.fr](https://www.data.gouv.fr/datasets/que-faire-a-paris-evenements-et-activites)).
6. **Ask Claude** through the hub's `ask.js` flow: check a place's current hours and prices, or read a poster and turn it into an event.
7. **Next cities**: seed a city from OpenStreetMap tourism tags, Wikidata fame and UNESCO, then curate the grades and add its seasonal calendar.
8. **Trip album**: your photos by day on the map at the end of the trip.
