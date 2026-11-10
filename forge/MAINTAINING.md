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
| `js/coach.js` | Pure functions for the weekly review, weekly quests, 12-week seasons, closest level-ups, duel codes and healthspan bands. Nothing extra is stored: everything is recomputed from the logs |
| `js/renpho.js` | Renpho smart-scale CSV import and the source rule that merges Renpho, Apple Health and typed values into the daily view every calculation uses |
| `js/health.js` | Apple Health import: Shortcut text payload and Health `export.zip` / `export.xml` (streamed in 4 MB slices) |
| `js/photo.js` | On-device photo measurement (MediaPipe Pose Landmarker, GPU delegate for the mask) and the marker editor |
| `js/store.js` | State, persistence, photos in IndexedDB (never synced), backups |
| `js/i18n.js` | English and French text |
| `vendor/fflate.min.js` | Zip reader (fflate 0.8.2, MIT) |
| `fonts/` | Big Shoulders Display (variable, latin subset, SIL OFL), self-hosted: works offline and sends no request to Google |
| `sw.js` | Offline cache, network first. When a new version takes over, `main.js` shows a "reload" bar instead of swapping silently |
| `test/*.mjs` | `node forge/test/calc.test.mjs`, `node forge/test/coach.test.mjs`, `node forge/test/renpho.test.mjs` and `node forge/test/health.test.mjs <path to fflate/umd/index.js>` |

## Engine (as approved in the design framework v0.9)

- **RMR**: Mifflin-St Jeor always. When body fat rests only on a smart scale or own guess (SD > 4 points), the lean-mass set gets half weight and the weight-based set the other half. Body fat known + lifting ≥ 3×/week (or ≥ 2× with ≥ 1 training year): 25 % Mifflin + 75 % mean(Tinsley-FFM, ten Haaf-FFM, Cunningham). Body fat known, untrained: mean(Mifflin, Katch-McArdle). Trained, body fat unknown: 50 % Mifflin + 25 % Tinsley-BW + 25 % ten Haaf-BW. SD = 10 %.
- **Maintenance** = (RMR + daily life + steps + stairs + workouts + after-burn) / 0.9. Daily life = awake non-exercise hours × (job MET − 1) + sleep × (0.95 − 1), all × own RMR per kg-hour (CF). Steps = net walking cost from height and speed (`walkCost`, Ludlow & Weyand 2016: VO₂ − rest = 3.85 + 5.97·V²/height ml/kg/min, 4.9 kcal per litre; 0.59 kcal/kg/km at 1.80 m and the default 1.25 m/s; the old ACSM constant 0.5 under-counted by 15–20 %). Walking speed and step length can come from the Health export (iPhone mobility metrics). Walking time is taken out of the job hours, so job and steps are not counted twice. Stride 0.415 / 0.413 × height unless measured, minus steps counted inside workouts: measured from the Health export (step samples overlapping each workout, largest source) or, without it, an estimated cadence per activity (weight training 25/min, boxing 70/min, etc.). Workouts = (MET − 1) × CF × kg × h, 2024 Compendium codes; runs with a pace = 1 kcal/kg/km. Weight-training intensity: typical session 3.5 (02054), heavy compounds 5.0 (02052), hard 6.0 (02050). From Health, lifting and sprint sessions map average heart rate with cut-offs 75/85/93 % HRmax (other activities 64/77/90 %). Apple Watch active kcal per session is shown next to Forge's figure as a cross-check (flagged when Forge is > 25 % higher), never used in the sum. After-burn 5 % of non-light sessions. SD = √(RMR SD² + (25 % × activity)²) / 0.9.
- **Trend weight**: local-linear-trend Kalman filter (level + daily slope, process noise 0.08 kg and 0.004 kg/day per day) with a Rauch–Tung–Striebel smoothing pass; scale noise learned from the person's consecutive weigh-ins (robust SD of day-to-day differences, 0.2–1.0 kg, default 0.5). It replaced a 10 % moving average that read about 0.8 kg high during a 0.6 kg/week cut.
- **Measured maintenance** (`adaptiveTdee`): last 28 days, ≥ 14-day span, ≥ 4 weigh-ins, calories on ≥ 70 % of days. Energy balance: mean logged intake − (trend at end − trend at start) / days × energy density (Forbes partition: lean share = 10.4 / (10.4 + fat kg), halved in a deficit when lifting, +0.15 in a surplus; Hall's 1,816 / 9,440 kcal/kg). Days under half the median intake count as not fully logged and are left out. If a plan began inside the window, the first 10 days after it are skipped when 14 days remain (water and glycogen), otherwise the SD is widened by 150 kcal. SD = √((ED × SE of the slope)² + SE of the intake mean² + 60²), where the intake SE includes 15 % × the share of days without a log. In simulation (noise 0.5 kg, 80 % of days weighed) its error is about 80 kcal against 115 for the earlier 28-day regression.
- **Formula vs logs** (`blend`): the measured figure is in the person's own logging units (food logs run 0–20 % under true intake in lean adults), and targets are logged the same way. The formula therefore only acts as a prior with ±12 % added for the unknown logging ratio (`LOG_UNIT_SD`), combined by inverse variance. Fuel shows the logging ratio (measured ÷ formula) with a plain reading of it.
- **Plans**: cut 0.25–1 %/week; recomp −5 %; lean bulk +15 / 10 / 5 % by training years (< 1, 1–3, > 3), slow bulk ≤ 7 % near the FFMI ceiling. Protein: cut 2.7 g/kg FFM (2.2 g/kg reference weight if FFM unknown), recomp 2.6 g/kg FFM, bulk 1.9 g/kg, maintain 2.0 g/kg; reference weight = weight at BMI 25 when BMI > 30. Fat 25 % (floor 0.5 g/kg). Energy availability = (intake − exercise) / FFM: amber < 30, blocked < 25, shown with a range (exercise ± 25 %, FFM ± body-fat SD) and sex-specific wording (IOC REDs 2023: the 30 cut-off is debated, lower in men; symptoms matter more than the number). A 30-second recovery check-in (fatigue, illness, libido, mood, performance, cycle) is offered in any deficit; two or more signs → advice to return to maintenance and see a doctor. The research suggested turning the block into a confirmation; the block was kept on purpose. Floors: never below RMR, 1,500 (men) / 1,200 (women). Safety answers switch deficits off.
- **Body fat**: inverse-variance ensemble of DXA (SD 1.5), BodPod 2.5, pro BIA 4.5, smart scale 6.0, tape US Navy 3.8 (3.0 once calibrated against a DXA within 14 days; 70 % of the offset applied), tape RFM 3.8, photo-derived Navy/RFM 4.8 (4.2 calibrated), own estimate 5.0; Deurenberg (BMI) only when nothing else exists and never used for the lean-mass equations. Inputs older than 30 days are shown but not used. A heterogeneity term widens the range when methods disagree.

## Arena

- Domains (radar, Peak, Balance): Strength, Explosive power, Speed, Power endurance, Aerobic, Upper-body endurance. Leanness is a secondary score shown apart. Aerobic keeps the best result (VO₂max and race times measure one quality); other domains average the best three events.
- **Vertical jump**: CHMS cycle 5 (2016–17) countermovement jump with arm swing on a force plate, survey-weighted GAMLSS percentiles P5–P95 by 5-year band (18–19 separate). Population data. Wall-reach results are ranked with a warning.
- **Pull-ups / push-ups**: Strength Level max-rep standards by bodyweight (lb converted to kg). "< 1" stored as 0.5; tied anchors keep the highest percentile.
- **BikeErg 1,000 m, SkiErg 500 m**: Concept2 2024 (men n = 492 / 615, women n = 146 / 135), same method as the RowErg events. Confidence low for women.
  - **The bike event is Wattbike-only** (`bike1000`, label "Wattbike max effort", source `wb`). Wattbike publishes no population ranking (its leaderboards are not public by sex or weight; its training guide only has five coarse ramp-test levels), so entries (`machine: 'wattbike'`, `watts`, `dur`) are ranked through watts against the Concept2 BikeErg 1,000 m distribution: BikeErg pace P = 0.35 / (s per m)³, power moved to the equivalent duration with P ∝ t^−0.35 (`wattbikeEquiv`); efforts outside 0.75–1.33 × that duration are flagged as rough. Shown everywhere in watts. Old BikeErg-time records still rank. Wattbike Pro/Trainer read 1.5 % high on average against a calibration rig (Wainwright et al. 2017).
- **5 km / 10 km**: Daniels–Gilbert VDOT (VO₂ = −4.60 + 0.182258 v + 0.000104 v²; %max = 0.8 + 0.1894393 e^(−0.012778 t) + 0.2989558 e^(−0.1932605 t)), ranked on FRIEND by decade; the time for the next tier is solved by bisection.
- Not added (no defensible adult reference data): standing broad jump, agility tests (5-10-5, T-test, Illinois), 10–40 m acceleration, assault bike, mobility.
- Tier lower bounds (percentile among people who do the event): 5, 20, 50, 80, 95, 99, 99.9 % → Hobbit, Gaulish Villager, Roman Legionary, Viking (Shieldmaiden), Spartan (Amazon), Saiyan, Viltrumite, Olympian God.
- Percentiles: linear in z between anchor points, end segments extended linearly beyond them.
- **Lifts**: Strength Level bodyweight tables (5/20/50/80/95 %), interpolated by bodyweight; 99 / 99.9 % extrapolated. e1RM = mean of Epley, Brzycki, Lombardi (≤ 10 reps incl. reps in reserve). With squat, bench and deadlift logged, the Strength card shows the total and its IPF GL points (classic coefficients; bench-only coefficients for the bench), with the IPF age class as a label. No age adjustment of the percentile.
- **Sprints** (60/100/200/400 m): time × WMA 2023 one-year age factor (ages 30–90, 1 below 30) = open-equivalent time, placed on the FFA performance grid (23 levels D7 → IA, `FFA` in data.js, checked against the Ligue Île-de-France 2025 rulebook). Forge tiers start at D7 (Gaulish Villager), D4, R6, IR4, N4, IB and IA (Olympian God); slower than D7 = Hobbit. The levels in between are spread evenly on the z-scale inside their tier, so the score keeps moving level by level. Shown: FFA level, open-equivalent time, next level, and decathlon/heptathlon points (a·(b − t)^1.81). No "% of all adults" for sprints: no population data exist. Hand timing +0.24 s (400 m +0.14 s); GPS times stored, never ranked. Entries beyond the world record are refused (`plausible`, all events).
- **Rowing**: Concept2 2024 rankings (25/50/75/90 %) for 100 m and 500 m on −ln(time). 200 m, 250 m and 1 minute modelled per percentile on a log-log line between 100 m and 500 m (labelled "modelled").
- **VO₂max**: FRIEND 2022 treadmill, RER ≥ 1.10, by decade (population data, so one percentile only). Cooper: (m − 504.9) / 44.73. Watch values flagged low confidence.
- **All adults**: (1 − q) · Φ(z + 1.5) + q · p, range with (1.5q, Δ 1.0) and (0.5q, Δ 2.25). q per event in `EVENTS` (Forge estimates).
- **Overall levels**: Peak, Balance and each domain score get a tier from the same ladder applied to score / 100 (`scoreTier`), with a progress bar and the points to the next tier. Scores are shown rounded down so the number, its tier and the gap agree.
- **Scores**: event score = 100 × percentile (× decay after 24 months, −25 %/year); domain = mean of the best 3 events, taken on the z-scale (`zmean`: probit of each score, mean, back to a percentile), because percentiles are not evenly spaced; Leanness = 100 × (1 − NHANES body-fat percentile), secondary. Peak = z-scale mean of the best 2 performance domains; Balance = geometric mean of all performance domains logged (≥ 3, each floored at 1). Records older than a year are marked for a re-test; the score decay still starts at 24 months.

## Refreshing the benchmark data (yearly is enough)

1. Strength Level: re-read the four lift tables and the pull-up and push-up rep tables (bench, squat, deadlift, shoulder press; men and women) and replace the rows in `STRENGTH`. Update the date in `SOURCES.sl`.
2. Concept2: take the latest complete season (May–April) for RowErg 100 m and 500 m, BikeErg 1,000 m and SkiErg 500 m, men and women: the summary box gives the 90/75/50/25 % times. Update `C2` and `SOURCES.c2`.
3. Sprints: the FFA grid (`FFA`, published in the federation's and the leagues' rulebooks) and the WMA age factors (`WMA`, revised every few years). `SPRINT.wr` only feeds the sanity check on entries.
4. Bump `DATA_VERSION`, run both tests, check the Arena standards sheet for a lift and a sprint.

## Apple Health

- **Shortcut** payload: `FORGE1`, then `@steps @kcal @protein @carbs @fat @weight @bf @rhr` sections, each a block of ISO dates followed by an equal block of values (or `date;value` lines). German/French number formats are handled ("92,6", "3.050" kcal). Earliest weigh-in of a day wins. The app reads it from the clipboard (Today → Paste from Shortcut), from a text box (Settings → Paste the text by hand, also the fallback when the clipboard is blocked), from a `.txt` file, or from `#hk=<url-encoded text>` (desktop only: on an iPhone a URL opens in Safari, whose storage is separate from the Home Screen app). The `FORGE1` line is optional when a known `@section` is present.
- **Export**: walking speed and walking step length (iPhone mobility metrics) are averaged over the last 4 weeks and offered for the step-energy model; they are not written into the daily log. After an import one sheet offers every profile update (steps, sessions, speed, step length, Watch VO₂max) with checkboxes. Steps and calories take the largest source per day (watch and phone overlap), weight/body fat the earliest sample of the day, resting HR/HRV the daily mean, VO₂max the last value. Workouts read `WorkoutStatistics` (heart rate, energy, distance). Manual edits always win over imports (`m` list on a log day).

## Privacy

Photos live only in IndexedDB on the device that took them. Numbers sync through `../cloud.js` to the hub's Supabase (`app_state`, one row per user and app, row-level security). Each person signs in with their own account, after ticking an explicit consent box that lists what is synced. No personal data in this repository.

"Delete everything" while signed in would also blank the account, because the newest edit wins the sync. The app therefore asks: *this device only* (signs out, clears, and removes `cloud.meta.forge` so a later sign-in pulls the account's copy back) or *everywhere*.

Duel codes (`FORGE-DUEL1:` + base64url JSON) carry a first name and 0–100 scores only; the person shares them by hand and the receiving side clamps and sanitises every field.

## Next (v1.5 and later)

- Built-in food logger: Open Food Facts barcodes, BLS 4.0 (free since Dec 2025) and CIQUAL, saved meals, training-day vs rest-day targets.
- More events (vertical/broad jump, pull-ups, HYROX, cycling W/kg, swimming), age adjustment for lifts, Concept2 by age group.
- Sprint percentiles among all adults, if population data ever appear.
- Verified reference data still missing for: HYROX, cycling W/kg, swimming, grip centiles by age (the panel uses the young-adult T-score), masters coefficients for lifts.

## MyFitnessPal

No direct connection: MyFitnessPal writes Dietary Energy and macros to Apple Health, and Forge reads them through the Shortcut (`@kcal @protein @carbs @fat`) or the Health export. Settings → MyFitnessPal explains the setup and shows how many of the last 28 days have imported calories; Today shows yesterday's imported calories; Fuel → Daily log shows imported vs typed-in days.

## State migrations

- v2 (31 Oct 2026): weight-training sessions saved as "moderate" (5.0 MET) become "typical session" (3.5 MET).

## Renpho smart scale (since 1 Nov 2026)

- Import: Settings → Renpho smart scale → Choose Renpho CSV (the export of the Renpho Health app). Parser: comma, semicolon or tab separated, decimal commas, kg or lb (stone refused), dates `YYYY.MM.DD`, `YYYY-MM-DD` or day-first, `--` = empty. Earliest reading of a day wins; duplicates are counted. Height is derived from Renpho's BMI (median of √(weight/BMI)) and compared with Forge's profile height (warning from 1.5 cm).
- Re-import: readings inside the file's date range replace the stored ones (deletions carry over), readings outside it are kept. Stored in `S.renpho.rows`, synced like the rest of the state.
- Source rule, applied when reading (`mergeLogs`, nothing is overwritten in `S.logs`): body source `auto` = Renpho once a file is imported. Weight and body fat = Renpho reading of the day; else a value typed in Forge; Apple Health weight/body fat are ignored from the first Renpho day (kept before it). All other fields: typed in Forge, else Apple Health. Each day carries `_s` with the source of every field (shown as R / H / ✎ in Fuel → Daily log).
- Engine use: weight (trend, adaptive maintenance) and the smart-scale body fat (median of the readings in the 7 days up to the latest one, used up to 30 days, SD 6). Renpho's BMR is shown next to Forge's resting metabolism but not used (it is Katch-McArdle on Renpho's own fat-free mass). Physique → Smart scale leads with Renpho's subcutaneous fat (with its share of total body fat when that share is constant); visceral fat is parsed but not shown. Total body fat stays the calculation input because DEXA, NHANES percentiles, FFM-based equations and energy availability all work on total fat. Other Renpho values are shown in Physique → Smart scale with the change against the reading closest to 4 weeks earlier, and a note when body fat moves in lockstep with weight (r > 0.9 over 90 days).

### Renpho calibration against a DEXA

`dxaCalibration` (js/renpho.js): mean Renpho body fat of the readings within 7 days of the most recent DEXA that has such readings; offset = DEXA − Renpho. Forge adds the offset to the Renpho smart-scale item of the body-fat ensemble (SD 3.5 instead of 6.0 for 90 days after the scan, then widening linearly back to 6.0 at one year: a calibration fixes the scale's bias, not its scatter, and a 12-week validation found a foot-to-foot scale did not track real change) and shows the calibration in Physique → Smart scale. Pairs further apart are ignored, because scale weight and body water shift too much over a few weeks. Renpho's height setting should stay unchanged after a calibration.

## Coach layer (since 10 Nov 2026)

- **Weekly quests** (`coreQuests`): weigh in on 4 mornings, log calories on 6 days, reach 90 % of the step average on 5 days. Behaviours only, never a body number. Calm mode (Settings) or the eating-disorder flag drops the calorie quest and hides calorie numbers on Today. One side quest is picked from: closest level-up within 6 %, a record older than a year, tape, healthspan check, photos.
- **Seasons** (`season`): 12 weeks from the Monday of the week Forge was first opened (`meta.created`); the strip on Today shows one bar per week filled by quests completed; the sheet recaps this season and the previous one.
- **Weekly review** (`weeklyReview`): last 7 days against the plan; one win and one adjustment chosen by fixed priority (see the function).
- **Closest level-ups** (`bosses`): next FFA level for sprints, next tier otherwise, sorted by the relative improvement needed.
- **Healthspan panel** (Physique): VO₂max band (Mandsager 2018 groups on the FRIEND percentile), grip T-score against the young-adult peak (Dodds 2014: men 51.9 ± 9.9 kg, women 31.4 ± 6.1 kg; weak below 27 / 16 kg), 10-second one-leg stance (Araujo 2022, studied at 51–75), waist ÷ height, resting heart rate (trend only). Never merged into one figure.
- **Level-up sheet**: shown when a saved record reaches a higher tier than the previous best in that event; the only animation in the app, off under `prefers-reduced-motion`.
- **Design**: tokens in `app.css` (ash/iron light, soot/ember dark; the hero plate is always dark). Text and controls meet WCAG AA contrast; every non-button control gets `role=button` and keyboard activation in `a11y()`; charts carry a text label.
