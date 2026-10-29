# Cordée

A hiking app for mountain and lake hikes in Bavaria, Austria, Switzerland and the Dolomites: a 3D map, the weather at the trailhead and at the top of every hike, a dog filter, and a shared logbook of the hikes you've done.

**Open it:** https://thrugg.github.io/Thrugg-/

## On the iPhone

Open the address in Safari, tap Share, then **Add to Home Screen**. It opens full-screen like an app. On a Mac, just bookmark it (or in Safari, File → Add to Dock).

## Sharing one logbook between devices (optional)

Without this, each device keeps its own logbook. To share one:
1. Create a free project at https://supabase.com.
2. Open its **SQL Editor**, paste the SQL from the app (Settings → Sync → "SQL for the Supabase SQL editor") and run it.
3. Under **Authentication → Users**, add one user (an email and password for both of you) and tick **Auto Confirm User**.
4. Under **Project Settings → API**, copy the **Project URL** and the **publishable (anon) key**.
5. In the app on each device: Settings → Sync → paste both, enter the email and password, then **Save and sign in**.

Your logbook, names and settings live in the browser and in your own Supabase project, never in this repository.

## New hikes every week

Every Monday morning an update adds the hikes on the wish list, then about six more, each checked against published route descriptions and placed on OpenStreetMap. New hikes get a **New** badge for 30 days.

- To ask for a hike: in the app, **Ask for a hike** (under the list), or add a line to [`data/requests.md`](data/requests.md).
- What changed: [`data/changelog.md`](data/changelog.md).
- The rules each new hike follows: [`MAINTAINING.md`](MAINTAINING.md).

## How it's made

- `index.html` is the whole app, built from `src/` and `data/hikes.json` by `python3 tools/build.py` (which also checks every hike). The app also reads `data/hikes.json` live, so a fix to that file shows up even before the page is rebuilt.
- Free services, no keys: map tiles from OpenFreeMap and OpenTopoMap, Esri satellite imagery and swisstopo maps, terrain from the AWS open terrain tiles, weather and elevation from Open-Meteo, routes from BRouter (FOSSGIS OSRM as fallback), drive times from the OSRM demo server, photos from Wikimedia Commons, places from Nominatim and Overpass, the trails overlay from Waymarked Trails. Map data © OpenStreetMap contributors.

## Good to know

- Route lines are traced on OpenStreetMap paths the first time and then cached (and synced). The app traces the rest slowly in the background so it doesn't overload the free routing server.
- The browser can't record GPS in the background or work offline in the mountains. Record in Komoot, Strava or Apple Health and import the GPX (Logbook → Import GPX), and carry a proper offline map.
- Grades, dog rules and conditions are indicative. Check signs and bulletins on the day.
