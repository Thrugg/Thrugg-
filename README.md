# Our apps

**All apps on one page:** https://thrugg.github.io/Thrugg-/apps/

| App | What it does | Link | Sync |
|---|---|---|---|
| Cordée | Hikes in the Alps: 3D map, weather, dog filter, logbook | https://thrugg.github.io/Thrugg-/ | Yes |
| Safety Net Score | Emergency fund sized to unemployment insurance in 16 countries | https://thrugg.github.io/Thrugg-/safety-net/ | Yes |
| Gains & Greeks | Investor tax desk, country comparison, options lab | https://thrugg.github.io/Thrugg-/gains-greeks/ | Yes |
| Forge | Calories that fit how you live, physique tracking, records ranked from Hobbit to Olympian God | https://thrugg.github.io/Thrugg-/forge/ | Yes (photos stay on the phone) |
| Forkcast | Snap a meal, get the nutrition (opens in Claude) | https://claude.ai/artifact/5wenBM41wM6kANsCCpzwRN | In Claude |
| Prüfstand | German car market analyst (opens in Claude) | https://claude.ai/artifact/EsViuZGJAHhRTYqBgBnQSu | In Claude |

**On the iPhone:** open a link in Safari, tap Share, then **Add to Home Screen**. It opens full-screen like an app. On a Mac, bookmark it (or in Safari, File → Add to Dock).

**Adding an app later:** put it in its own folder (like `safety-net/`), add a row to the table above and a card to `apps/index.html`. For an app copied from a claude.ai artifact, `tools/port_apps.py` adds the Home Screen icon and cloud sync.

# Cordée

A hiking app for mountain and lake hikes in Bavaria, Austria, Switzerland and the Dolomites: a 3D map, the weather at the trailhead and at the top of every hike, a dog filter, and a shared logbook of the hikes you've done.

## Saving and syncing (all apps)

Everything you enter is saved automatically on the device. Sign in once on each device (Cordée: Settings → Sync; other apps: the "Sign in to sync" button at the bottom left) and the apps keep the same data on the Mac and the iPhone. On the iPhone, each app added to the Home Screen asks for the sign-in once. The sync runs on Supabase (`tools/supabase-setup.sql`, settings in `cloud.js`).

Your logbook, names, settings and inputs live in your browser and your own Supabase project, never in this repository.

Two devices are merged field by field: a change made on one device never undoes a different change made on the other, and when both changed the same field the later one wins. Which tab or filter is open stays on each device.

## Checks and the yearly rule update

`node --test tests/*.mjs` runs the checks: sync between two simulated devices, and both finance engines against published reference figures. Run it before every change to `cloud.js`, Safety Net Score or Gains & Greeks.

The rules in Safety Net Score and Gains & Greeks are updated once a year, in January: see [`RULES.md`](RULES.md).

## New hikes every week

Every Monday morning an update adds the hikes on the wish list, then about six more, each checked against published route descriptions and placed on OpenStreetMap. New hikes get a **New** badge for 30 days.

- To ask for a hike: in the app, **Ask for a hike** (under the list), or add a line to [`data/requests.md`](data/requests.md).
- What changed: [`data/changelog.md`](data/changelog.md).
- The rules each new hike follows: [`MAINTAINING.md`](MAINTAINING.md).

## How it's made

- `index.html` is the whole app, built from `src/` and `data/hikes.json` by `python3 tools/build.py` (which also checks every hike). The app also reads `data/hikes.json` live, so a fix to that file shows up even before the page is rebuilt.
- Free services, no keys: map tiles from OpenFreeMap and OpenTopoMap, Esri satellite imagery and swisstopo maps, terrain from the AWS open terrain tiles, weather and elevation from Open-Meteo, routes from BRouter (FOSSGIS OSRM as fallback), drive times from the OSRM demo server, photos from Wikimedia Commons, places from Nominatim and Overpass, the trails overlay from Waymarked Trails. Map data © OpenStreetMap contributors.

## Your own routes

**Draw a route** (pencil button on the map, or under the hike list): search or tap the start and the finish, tap any place you pass, and the line follows the trails on OpenStreetMap. Distance, ascent, descent, signposted time, your time, the grade (from the trail difficulty tags on the map) and what's underfoot are worked out automatically; one way, out and back or loop. Turn off "Follow the trails" for a path that isn't on the map. After the hike, **Mark as done** takes the numbers from your watch, typed in or read from a screenshot of the summary (the text is recognised on the phone; nothing is uploaded).

## Parking

Select a hike and the car parks for it appear around the start as P icons with their names: the ones researched for that hike (from tourism boards, lift operators and route descriptions, with fees and access rules), plus the other car parks mapped on OpenStreetMap nearby. For lift and boat hikes it's the car park at the valley station. Tap one for Waze, Google Maps or Apple Maps; **Directions** goes to the main one. The icons disappear when no hike is selected. New hikes get their car parks in the weekly update.

## Your photos

Add as many photos as you like to any day in the logbook: in **Mark as done** (or **Edit** on an entry), or with **Add photos** in the **Photos** tab. The Photos tab shows them all, grouped by hike and filterable by year; tap one to see the whole day: the hike, date, distance, ascent, your time and pace, who came, the dog, your rating and note, the weather at the top that day (Open-Meteo history), and every other photo from that outing. Photos taken on one day also fill in the date of a new entry.

Photos are made smaller on the device (about 0.3–0.6 MB each) and kept in the browser. When signed in, they are also stored privately in your Supabase project (bucket `cordee-photos`, one folder per account), so they appear on every device. This needs the photo part of `tools/supabase-setup.sql` run once (also under Settings → Photos). Photos are never put in this repository and are not in the JSON backup.

## On the trail and in winter

- **Follow me** (on any hike): a blue dot shows where you are on the route, with the distance and climb still to go, and it says so when you are off the marked line. It works while the app is open with the screen on; the phone is kept awake while it runs.
- **Without signal** the app still opens with the catalogue, your logbook, the last forecast you loaded and the map areas you looked at before (default map style and 3D terrain only; satellite and the other map styles need signal). Open the hike once at home and it is there on the mountain.
- **Snow**: each hike shows the snow depth at its top right now (a weather-model estimate, so a guide and not a measurement), and Find has **Snow-free at the top now**.
- **Daylight**: the forecast of a hike tells you the latest time to leave the car and still be back an hour before sunset, at your own pace.

## Good to know

- Route lines are traced on OpenStreetMap paths the first time and then cached (and synced). The app traces the rest slowly in the background so it doesn't overload the free routing server.
- The browser can't record a GPS track in the background. Record in Komoot, Strava or Apple Health and import the GPX (Logbook → Import GPX), and carry a proper offline map as well: the app only keeps the map areas you have already looked at.
- Grades, dog rules and conditions are indicative. Check signs and bulletins on the day.
