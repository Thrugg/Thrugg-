# Forge — maintenance notes

Forge is a static web app (no build step). Open `forge/` on GitHub Pages; everything runs in the browser.

## Files

| Path | What it does |
|---|---|
| `index.html`, `app.css` | Shell, tab bar, design tokens (light and dark) |
| `js/main.js` | Start-up, cloud sync hook (`../cloud.js`, app key `forge`, localStorage key `forge.v1`) |
| `js/ui.js` | All screens: Today, Fuel, Physique, Arena, Settings, onboarding, sheets |
| `js/calc.js` | The engine (pure functions): RMR, maintenance, adaptive maintenance, plans, body fat, percentiles, tiers, Peak/Balance |
| `js/data.js` | Benchmark packs, Compendium activity catalogue, tiers, helplines. **Every number has a source in `SOURCES`.** |
| `js/health.js` | Apple Health import: Shortcut text payload and Health `export.zip` / `export.xml` (streamed in 4 MB slices) |
| `js/photo.js` | On-device photo measurement (MediaPipe Pose Landmarker, GPU delegate for the mask) and the marker editor |
| `js/store.js` | State, persistence, photos in IndexedDB (never synced), backups |
| `js/i18n.js` | English and French text |
| `vendor/fflate.min.js` | Zip reader (fflate 0.8.2, MIT) |
| `sw.js` | Offline cache, network first |
| `test/*.mjs` | `node forge/test/calc.test.mjs` and `node forge/test/health.test.mjs <path to fflate/umd/index.js>` |

## Engine (as approved in the design framework v0.9)

- **RMR**: Mifflin-St Jeor always. Body fat known + lifting ≥ 3×/week (or ≥ 2× with ≥ 1 training year): 25 % Mifflin + 75 % mean(Tinsley-FFM, ten Haaf-FFM, Cunningham). Body fat known, untrained: mean(Mifflin, Katch-McArdle). Trained, body fat unknown: 50 % Mifflin + 25 % Tinsley-BW + 25 % ten Haaf-BW. SD = 10 %.
- **Maintenance** = (RMR + daily life + steps + stairs + workouts + after-burn) / 0.9. Daily life = awake non-exercise hours × (job MET − 1) + sleep × (0.95 − 1), all × own RMR per kg-hour (CF). Steps = 0.5 kcal/kg/km net (ACSM), stride 0.415 / 0.413 × height, minus watch-counted steps inside workouts (cadence per activity). Workouts = (MET − 1) × CF × kg × h, 2024 Compendium codes; runs with a pace = 1 kcal/kg/km. After-burn 5 % of non-light sessions. SD = √(RMR SD² + (25 % × activity)²) / 0.9.
- **Adaptive maintenance**: last 28 days, ≥ 14-day span, ≥ 4 weigh-ins, calories on ≥ 70 % of days. Linear regression of weight on day; maintenance = mean intake − slope × energy density. Energy density from the Forbes partition (lean share = 10.4 / (10.4 + fat kg); halved in a deficit when lifting, +0.15 in a surplus) with Hall's 1,816 / 9,440 kcal/kg. SD = √((ED × SE)² + 100²). Blended with the prediction by inverse variance.
- **Plans**: cut 0.25–1 %/week; recomp −5 %; lean bulk +15 / 10 / 5 % by training years (< 1, 1–3, > 3), slow bulk ≤ 7 % near the FFMI ceiling. Protein: cut 2.7 g/kg FFM (2.2 g/kg reference weight if FFM unknown), recomp 2.6 g/kg FFM, bulk 1.9 g/kg, maintain 2.0 g/kg; reference weight = weight at BMI 25 when BMI > 30. Fat 25 % (floor 0.5 g/kg). Energy availability = (intake − exercise) / FFM: amber < 30, blocked < 25. Floors: never below RMR, 1,500 (men) / 1,200 (women). Safety answers switch deficits off.
- **Body fat**: inverse-variance ensemble of DXA (SD 1.5), BodPod 2.5, pro BIA 4.5, smart scale 6.0, tape US Navy 3.8 (3.0 once calibrated against a DXA within 14 days; 70 % of the offset applied), tape RFM 3.8, photo-derived Navy/RFM 4.8 (4.2 calibrated), own estimate 5.0; Deurenberg (BMI) only when nothing else exists and never used for the lean-mass equations. Inputs older than 30 days are shown but not used. A heterogeneity term widens the range when methods disagree.

## Arena

- Tier lower bounds (percentile among people who do the event): 5, 20, 50, 80, 95, 99, 99.9 % → Hobbit, Gaulish Villager, Roman Legionary, Viking (Shieldmaiden), Spartan (Amazon), Saiyan, Viltrumite, Olympian God.
- Percentiles: linear in z between anchor points, end segments extended linearly beyond them.
- **Lifts**: Strength Level bodyweight tables (5/20/50/80/95 %), interpolated by bodyweight; 99 / 99.9 % extrapolated. e1RM = mean of Epley, Brzycki, Lombardi (≤ 10 reps incl. reps in reserve). No age adjustment yet.
- **Sprints** (60/100/200/400 m): age-graded % of the world record (WR ÷ age factor; factor 1.0 to 35, then −0.75 %/y men, −0.78 %/y women, fitted to the 5-year masters records). Ladder bounds 64 / 71 / 76.5 / 81 / 85.5 / 89.5 / 94 %, calibrated so that 100 m men 18–39 = 15.0 / 13.5 / 12.5 / 11.8 / 11.2 / 10.7 / 10.2 s. Expert-set: confidence low. Hand timing +0.24 s (400 m +0.14 s); GPS times stored, never ranked.
- **Rowing**: Concept2 2024 rankings (25/50/75/90 %) for 100 m and 500 m on −ln(time). 200 m, 250 m and 1 minute modelled per percentile on a log-log line between 100 m and 500 m (labelled "modelled").
- **VO₂max**: FRIEND 2022 treadmill, RER ≥ 1.10, by decade (population data, so one percentile only). Cooper: (m − 504.9) / 44.73. Watch values flagged low confidence.
- **All adults**: (1 − q) · Φ(z + 1.5) + q · p, range with (1.5q, Δ 1.0) and (0.5q, Δ 2.25). q per event in `EVENTS` (Forge estimates).
- **Scores**: event score = 100 × percentile (× decay after 24 months, −25 %/year); domain = mean of the best 3 events; Leanness = 100 × (1 − NHANES body-fat percentile). Peak = mean of the best 2 domains; Balance = geometric mean of all domains (≥ 3).

## Refreshing the benchmark data (yearly is enough)

1. Strength Level: re-read the four bodyweight tables (bench, squat, deadlift, shoulder press; men and women) and replace the rows in `STRENGTH`. Update the date in `SOURCES.sl`.
2. Concept2: take the latest complete season (May–April) for RowErg 100 m and 500 m, men and women: the summary box gives the 90/75/50/25 % times. Update `C2` and `SOURCES.c2`.
3. Sprint world records in `SPRINT.wr` (60, 100, 200, 400 m).
4. Bump `DATA_VERSION`, run both tests, check the Arena standards sheet for a lift and a sprint.

## Apple Health

- **Shortcut** payload: `FORGE1`, then `@steps @kcal @protein @carbs @fat @weight @bf @rhr` sections, each a block of ISO dates followed by an equal block of values (or `date;value` lines). German/French number formats are handled ("92,6", "3.050" kcal). Earliest weigh-in of a day wins. The app reads it from the clipboard (Today → Paste from Shortcut) or from `#hk=<url-encoded text>`.
- **Export**: steps and calories take the largest source per day (watch and phone overlap), weight/body fat the earliest sample of the day, resting HR/HRV the daily mean, VO₂max the last value. Workouts read `WorkoutStatistics` (heart rate, energy, distance). Manual edits always win over imports (`m` list on a log day).

## Privacy

Photos live only in IndexedDB on the device that took them. Numbers sync through `../cloud.js` to the hub's Supabase (`app_state`, one row per user and app, row-level security). Each person signs in with their own account. No personal data in this repository.

## Next (v1.5 and later)

- Built-in food logger: Open Food Facts barcodes, BLS 4.0 (free since Dec 2025) and CIQUAL, saved meals, training-day vs rest-day targets.
- More events (vertical/broad jump, pull-ups, HYROX, cycling W/kg, swimming), age adjustment for lifts, Concept2 by age group.
- Calibrate the sprint ladder against real recreational sprint data.
