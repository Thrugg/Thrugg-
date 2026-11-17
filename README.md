# Our apps

**All apps on one page:** https://thrugg.github.io/Thrugg-/apps/

| App | What it does | Link | Sync |
|---|---|---|---|
| Cordée | Hikes in the Alps: 3D map, weather, dog filter, logbook | https://thrugg.github.io/Thrugg-/ | Yes |
| Safety Net Score | Emergency fund sized to unemployment insurance in 16 countries, plus the move planner and relocation sprints | https://thrugg.github.io/Thrugg-/safety-net/ | Yes |
| Gains & Greeks | Investor tax desk, country comparison, options lab | https://thrugg.github.io/Thrugg-/gains-greeks/ | Yes |
| Forge | Calories that fit how you live, physique tracking, records ranked from Hobbit to Olympian God | https://thrugg.github.io/Thrugg-/forge/ | Yes (photos stay on the phone) |
| Nocturne | Sleep as a variance bridge: target to actual by cause, regularity, and a bedtime plan counted back from a fixed wake time | https://thrugg.github.io/Thrugg-/nocturne/ | Yes, once switched on in its Settings |
| Seuil | Rent or buy, for any place: the year buying wins, as a range, with every cost counted | https://thrugg.github.io/Thrugg-/seuil/ | Yes, sign in from its Settings |
| The Funds Ladder | The next money targets after the emergency fund, as a ladder: what comes next and when you get there | https://thrugg.github.io/Thrugg-/ladder/ | Yes, sign in from its Settings |
| Grand Tour | Five-star hotels stayed at and wished for, on a five-grade ladder, with value for the grade | https://thrugg.github.io/Thrugg-/grand-tour/ | Yes, sign in from its Settings |
| Sillage | Fragrance wardrobe: today's pick from the weather, cost per wear, what to sample next | https://thrugg.github.io/Thrugg-/sillage/ | Yes, sign in from its Settings |
| Tandem | Ten minutes a day of Polish and German on one spaced-repetition engine, for two learners who check each other's language | https://thrugg.github.io/Thrugg-/tandem/ | Yes, sign in from its Settings |
| BridgeLab | A price, volume and mix bridge with sliders on an invented portfolio, and the order-of-effects trap | https://thrugg.github.io/Thrugg-/bridgelab/ | Yes, sign in from its Settings |
| Révélateur | A photo editor that analyses each photo on the phone, adjusts it for its type (portrait, landscape, food, night…) and the look it already has, then learns your taste | https://thrugg.github.io/Thrugg-/revelateur/ | Taste and presets, sign in from its Settings (photos stay on the device) |
| Écurie | Any car typed in with its year, power, mileage and options: what it is worth, what it costs at your mileage, what falls due, whether the asking price is fair, whether your finances (Safety Net Score) carry it, and four scores out of 100. Replaces Prüfstand | https://thrugg.github.io/Thrugg-/ecurie/ | Yes, sign in from its Profile |
| Our year | Every app's year on one page: hikes, hotel stays, nights, wears, records, savings, practice and photos | https://thrugg.github.io/Thrugg-/year/ | Reads what the apps saved on the device |
| Forkcast | Snap a meal, get the nutrition (opens in Claude) | https://claude.ai/artifact/5wenBM41wM6kANsCCpzwRN | In Claude |

**On the iPhone:** open a link in Safari, tap Share, then **Add to Home Screen**. It opens full-screen like an app. On a Mac, bookmark it (or in Safari, File → Add to Dock).

**Adding an app later:** put it in its own folder (like `safety-net/`), add a row to the table above and a card to `apps/index.html`. For an app copied from a claude.ai artifact, `tools/port_apps.py` adds the Home Screen icon and cloud sync.

# Cordée

A hiking app for mountain and lake hikes in Bavaria, Austria, Switzerland and the Dolomites: a 3D map, the weather at the trailhead and at the top of every hike, a dog filter, and a shared logbook of the hikes you've done.

## Saving and syncing (all apps)

Everything you enter is saved automatically on the device. Sign in once on each device (Cordée: Settings → Sync; Safety Net Score and Gains & Greeks: the "Sign in to sync" button at the bottom left; Forge, Nocturne, Seuil, The Funds Ladder, Grand Tour, Sillage, Tandem, BridgeLab, Révélateur and Écurie: in their own Settings or Profile) and the apps keep the same data on the Mac and the iPhone. On the iPhone, each app added to the Home Screen asks for the sign-in once. The sync runs on Supabase (`tools/supabase-setup.sql`, settings in `cloud.js`).

Your logbook, names, settings and inputs live in your browser and your own Supabase project, never in this repository.

Two devices are merged field by field: a change made on one device never undoes a different change made on the other, and when both changed the same field the later one wins. Which tab or filter is open stays on each device.

## Live prices in the options lab (one-time setup, about 5 minutes)

Gains & Greeks can fill in the last price of a symbol on any device, the phone included, through a small function in your own Supabase project. It answers only when you are signed in to sync.

1. Open your project in the Supabase dashboard → **Edge Functions** → **Deploy a new function** → **Via editor**.
2. Name it exactly `quote`.
3. Replace the example code with the content of [`supabase/functions/quote/index.ts`](supabase/functions/quote/index.ts) and press **Deploy**. Leave "Verify JWT" switched on. No keys or secrets are needed.

After that, the **Fetch** button appears in the options lab whenever you are signed in, and the price fills in when you change the symbol. Prices come from Yahoo Finance (Stooq as a fallback for US symbols) and are delayed or last close. Until the function exists, the app shows the Yahoo and TradingView links as before.

## Ask Claude (one-time setup, about 10 minutes)

Sillage (similar fragrances, your scent profile, what to buy next), Seuil (price and rent for a place), Grand Tour (hotel ideas) and Écurie (researching a car, checking live ads, reading an ad screenshot) can ask Claude through a small function in your own Supabase project. Your Anthropic API key stays in Supabase and never reaches the browser; only signed-in accounts can call it, and each account gets at most 40 questions a day.

1. Get an API key at console.anthropic.com (API keys → Create key). Usage is billed there: roughly 5 cents for a plain answer and 15–30 cents for one that searches the web.
2. Supabase dashboard → **Edge Functions** → **Secrets** → add `ANTHROPIC_API_KEY` with the key. Optional: `ASK_ALLOWED` = your email (only that account may ask), `ASK_DAILY_LIMIT` = another daily cap.
3. **Edge Functions** → **Deploy a new function** → **Via editor** → name it exactly `ask` → paste [`supabase/functions/ask/index.ts`](supabase/functions/ask/index.ts) → **Deploy**. Leave "Verify JWT" on.
4. **SQL Editor** → New query → paste [`supabase/ask.sql`](supabase/ask.sql) → **Run** (the table behind the daily cap; without it there is no cap).

The apps only send named tasks (the list is at the top of the function), never a free prompt. Until the function exists, the buttons explain what is missing.

## Tandem for two (one-time setup, about 3 minutes)

Tandem works alone. To flag cards for each other, each learner signs in with their own account and one table is added to your Supabase project:

1. Supabase dashboard → **SQL Editor** → New query → paste the content of [`tandem/supabase.sql`](tandem/supabase.sql) → **Run**. Safe to run again.
2. If your partner has no account yet: **Authentication → Users → Add user** (email and password).
3. In Tandem on your phone: **Together → Create a tandem code → Send the code**. Your partner opens the link on hers, signs in, and joins.

Each learner can only write their own row, and only the two people on a code can read it. What travels: name, colour, the flagged cards, the answers, and the week's totals. Decks, review history and your own cards stay private.

## Routes traced on GitHub

The route line of every hike is traced on GitHub's machines every Tuesday night and whenever the catalogue changes (`.github/workflows/trace-routes.yml`), and published as `data/routes.json`. Phones use those lines directly, so a hike opens with its line at once and needs no routing server. A hike you edited, or a GPX you imported, keeps its own line. To run it by hand: Actions tab → **Trace hike routes** → **Run workflow**.

## Checks and the yearly rule update

`node --test tests/*.mjs` runs the checks: sync between two simulated devices, and both finance engines against published reference figures. Run it before every change to `cloud.js`, Safety Net Score or Gains & Greeks.

Nocturne has its own checks on invented data (Health import, the bridge adding up, regularity index, plan): `node --test nocturne/test/*.mjs`. Its notes are in [`nocturne/MAINTAINING.md`](nocturne/MAINTAINING.md).

Seuil, The Funds Ladder, Grand Tour, Sillage, Tandem, BridgeLab, Révélateur and Écurie have their own checks on invented data: `node --test seuil/test/*.mjs ladder/test/*.mjs grand-tour/test/*.mjs sillage/test/*.mjs tandem/test/*.mjs bridgelab/test/*.mjs revelateur/test/*.mjs ecurie/test/*.mjs`. Each folder has a `MAINTAINING.md` with how it works and what to re-check: [`seuil/`](seuil/MAINTAINING.md) (country rules, once a year), [`ladder/`](ladder/MAINTAINING.md), [`grand-tour/`](grand-tour/MAINTAINING.md) (grade bands, once a year), [`sillage/`](sillage/MAINTAINING.md), [`tandem/`](tandem/MAINTAINING.md) (decks: only add cards at the end), [`bridgelab/`](bridgelab/MAINTAINING.md) (synthetic data only), [`revelateur/`](revelateur/MAINTAINING.md) (the auto rules to tune), [`ecurie/`](ecurie/MAINTAINING.md) (car list and market prices, refreshed by a scheduled task).

The rules in Safety Net Score and Gains & Greeks are updated once a year, in January: see [`RULES.md`](RULES.md).

## New hikes every week

Every Monday morning an update adds the hikes on the wish list, then about six more, each checked against published route descriptions and placed on OpenStreetMap. New hikes get a **New** badge for 30 days.

- To ask for a hike: in the app, **Ask for a hike** (under the list), or add a line to [`data/requests.md`](data/requests.md).
- What changed: [`data/changelog.md`](data/changelog.md).
- The rules each new hike follows: [`MAINTAINING.md`](MAINTAINING.md).

## How it's made

- `index.html` is the whole app, built from `src/` and `data/hikes.json` by `python3 tools/build.py` (which also checks every hike). The app also reads `data/hikes.json` live, so a fix to that file shows up even before the page is rebuilt.
- Free services, no keys: map tiles from OpenFreeMap and OpenTopoMap, Esri satellite imagery and swisstopo maps, terrain from the AWS open terrain tiles, weather and elevation from Open-Meteo, routes from BRouter (FOSSGIS OSRM as fallback), drive times from the OSRM demo server, photos from Wikimedia Commons, places from Nominatim and Overpass, the trails overlay from Waymarked Trails. Map data © OpenStreetMap contributors.

## More like this, GPX out, and Forge

- **More like this**: every hike shows three similar ones you have not done (same kind of area, grade, tags, length and climb, and dog rules). The logbook adds "More like the hikes you loved", from the hikes you gave 4 or 5 stars.
- **GPX**: the GPX button on a hike sends its line (the traced or imported one) with named waypoints to a watch or a navigation app.
- **Forge** reads the hikes you log here: they count as a "Hiking" workout in its maintenance calories, with your real weekly rate, length and climbing rate.
- **Repair sprint** (Nov 2026): a nightly scheduled task brings 20 older hikes a night up to the standard of a new one (sources, place names, car parks, dog rules) and fixes the hikes whose figures disagree with their traced line, then switches itself off.

## Your own routes

**Draw a route** (pencil button on the map, or under the hike list): search or tap the start and the finish, tap any place you pass, and the line follows the trails on OpenStreetMap. Distance, ascent, descent, signposted time, your time, the grade (from the trail difficulty tags on the map) and what's underfoot are worked out automatically; one way, out and back or loop. Turn off "Follow the trails" for a path that isn't on the map. After the hike, **Mark as done** takes the numbers from your watch, typed in or read from a screenshot of the summary (the text is recognised on the phone; nothing is uploaded).

## Parking

Select a hike and the car parks for it appear around the start as P icons with their names: the ones researched for that hike (from tourism boards, lift operators and route descriptions, with fees and access rules), plus the other car parks mapped on OpenStreetMap nearby. For lift and boat hikes it's the car park at the valley station. Tap one for Waze, Google Maps or Apple Maps; **Directions** goes to the main one. The icons disappear when no hike is selected. New hikes get their car parks in the weekly update.

## Your photos

Add as many photos as you like to any day in the logbook: in **Mark as done** (or **Edit** on an entry), or with **Add photos** in the **Photos** tab. The Photos tab shows them all, grouped by hike and filterable by year; tap one to see the whole day: the hike, date, distance, ascent, your time and pace, who came, the dog, your rating and note, the weather at the top that day (Open-Meteo history), and every other photo from that outing. Photos taken on one day also fill in the date of a new entry.

Photos are made smaller on the device (about 0.3–0.6 MB each) and kept in the browser. When signed in, they are also stored privately in your Supabase project (bucket `cordee-photos`, one folder per account), so they appear on every device. This needs the photo part of `tools/supabase-setup.sql` run once (also under Settings → Photos). Photos are never put in this repository and are not in the JSON backup.

## On the trail and in winter

- **Follow me, anywhere**: the target button on the map shows where you are, even when you are not on one of the hikes. The map follows you (drag it to look around, then **Recenter**), your path is drawn in blue, and the box at the bottom shows your height, how far and how high you have walked, for how long, and the nearest hike start (tap it to open that hike). Tap the target button again, or **Stop**, to end; a walk of more than 200 m can then go straight into the logbook as a track. A walk you have not saved stays on the phone for two hours, so it carries on if the app is closed by mistake.
- **Follow me on a hike**: from a hike's page, the blue dot is shown on its route with the distance and climb still to go, and it says so when you are off the marked line. Both work while the app is open with the screen on; the phone is kept awake while they run.
- **Without signal** the app still opens with the catalogue, your logbook, the last forecast you loaded and the map areas you looked at before (default map style and 3D terrain only; satellite and the other map styles need signal). Open the hike once at home and it is there on the mountain.
- **Snow**: each hike shows the snow depth at its top right now (a weather-model estimate, so a guide and not a measurement), and Find has **Snow-free at the top now**.
- **Daylight**: the forecast of a hike tells you the latest time to leave the car and still be back an hour before sunset, at your own pace.

## Good to know

- Route lines are traced on OpenStreetMap paths the first time and then cached (and synced). The app traces the rest slowly in the background so it doesn't overload the free routing server.
- The browser can't record a GPS track in the background. Record in Komoot, Strava or Apple Health and import the GPX (Logbook → Import GPX), and carry a proper offline map as well: the app only keeps the map areas you have already looked at.
- Grades, dog rules and conditions are indicative. Check signs and bulletins on the day.
