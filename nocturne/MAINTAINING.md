# Nocturne — maintenance notes

Nocturne is a static web app (no build step) in `nocturne/`. Everything runs in the browser. It turns the gap between a sleep target and the sleep actually recorded into a bridge by cause.

No personal data belongs in this folder: the repository is public. Tests and example nights are invented.

## Files

| Path | What it does |
|---|---|
| `index.html`, `app.css` | Shell, text-only tab bar, design tokens (night by default, a day palette, and the faded palette after 21:00) |
| `js/main.js` | Start-up, the sync switch (`../cloud.js`, app key `nocturne`, localStorage key `nocturne.v1`), service-worker notice |
| `js/sleep.js` | The engine, pure functions: one night from raw Health samples, regularity index, summary, the bridge, the plan, example nights |
| `js/health.js` | Apple Health import: streaming reader for export.zip / export.xml, sleep-record accumulator, merge into stored nights |
| `js/charts.js` | The waterfall (HTML), the night-by-night chart and the columns (SVG) |
| `js/ui.js` | All screens: Bridge, Numbers, Nights, Plan, Guide, Settings, import and night sheets |
| `js/i18n.js` | English and French. A test checks that both have the same keys and that every key used on screen exists |
| `js/store.js` | State, save, backup |
| `test/nocturne.test.mjs` | `node --test nocturne/test/*.mjs` |
| `vendor/fflate.min.js` | Zip reader (MIT), same file as Forge's |
| `fonts/fraunces.woff2` | Fraunces variable, Latin subset (SIL OFL, `fonts/OFL.txt`); served from here, no font request to another site |

After changing anything under `nocturne/`, bump `V` in `nocturne/sw.js` so phones fetch the new files, and add any new file to `CORE` there.

## What is stored

One object under `nocturne.v1`:

- `nights[date]` — `date` is the day you wake up. `a` minutes asleep (main sleep), `b` minutes in bed, `on` / `off` sleep onset and final wake in minutes from midnight of that date (negative = the evening before), `w` minutes awake in between, `s` every asleep interval of the window (naps included), `n` nap minutes, `m: 1` when "in bed" was recorded (`bs` = start of time in bed), `d` `[core, deep, REM]`, `src` source name, `z` time zone when not the usual one. About 140 bytes a night.
- `tags[date]` — `{ t: [causes] or ['clean'], n: note }`. Causes: `winddown`, `screen`, `training`, `social`, `travel`, `other`. `clean` = "nothing special" and excludes the others.
- `plan` — `wake`, `gain`, `conv`, `wind`, `start`, and `base` (the starting point, frozen when the plan starts).
- `target` (minutes, default 510), `lang`, `theme`, `imp` (summary of the last import), `demo`, `ui` (open tab and period; never synced).

Sync is off until the person switches it on for the device (`nocturne.sync` = `1` in localStorage; Settings → Sync, or the question shown on the first screen when the device is already signed in through another app). Only then does `main.js` call `Cloud.mirror`. "Delete on this device only" is carried out at the next page load, before any sync starts, so it cannot empty the account.

## Import rules (`health.js`, `buildNight` in `sleep.js`)

- Only `HKCategoryTypeIdentifierSleepAnalysis` records are read. The file is read in 256 KB slices, unzipped as a stream, and the text is scanned for those records without splitting it into lines. Any XML at the top of the archive is read except `export_cda.xml` (a French iPhone names the file `exportation.xml`).
- A sample belongs to the night of the next morning when it starts at 18:00 or later. Nights older than 24 months are skipped (`sinceDate`).
- One source per night: the one with sleep stages when it holds at least half of the largest source's sleep, otherwise the one with the most sleep. Two sources are never added together.
- The main sleep is the group of asleep stretches less than 2 h apart (`SESSION_GAP`) with the most sleep. Other sleep in the window is a nap: kept for the regularity index, not counted in the night's figure.
- Time in bed = "in bed" samples of any source from 3 h before onset to 90 min after the final wake, merged with onset → wake. Without such samples it is onset → wake and `m` is absent.
- Nights with "in bed" samples only (no sleep tracked) are left out and counted in the import summary.
- Clock times use the offset written in the export (the time zone of the phone when the export was made). A night whose `HKTimeZone` differs from the most frequent one keeps that zone in `z`.
- Merge: nights are keyed by date. A re-import overwrites a night with the file's version (same values = unchanged, different = completed), keeps nights missing from the file, never touches tags.

## The numbers

- **Bridge** (`bridge`): gap = target − average asleep over nights with data in the period (calendar days ending at the last imported night). Ordinary night = average of nights tagged "nothing special" in the 56 days to the period's end, once there are 3. Each night carries target − ordinary night into the first bar; what a tagged night lost beyond the ordinary night is split equally between its causes; untagged nights go to "Untagged"; "nothing special" nights keep their own difference in the first bar. Without an ordinary level, causes carry the whole shortfall of their nights. Every night's shortfall is handed out exactly once, so the bars add up; `roundToSum` rounds them to whole minutes without breaking the total. A test checks this on many periods.
- **Second bridge** (`bedBridge`): gap = (target − time in bed) + (time in bed − asleep).
- **Sleep Regularity Index** (`sri`): Phillips et al. 2017, Sci Rep 7:3216. Minute by minute over 18:00 → 18:00, only pairs of consecutive days that both have data; shown from 4 pairs. Reference shown in the app: UK Biobank, 60,977 adults, median 81.0, IQR 73.8–86.3 (Windred et al., Sleep 2024;47(1):zsad253).
- **Onset spread**: sample standard deviation of onset clock time, with median and range. Conversion = total asleep ÷ total time in bed.
- **Plan** (`baseline`, `planTimes`, `tonight`, `progress`): starting point = last 28 days with data (average asleep, average time in bed, median lights-out and wake). Extra time in bed = extra sleep ÷ conversion (default 65 %; 60–67 % gives the brief's 75–90 min for +45–60 min). Lights out = wake − (starting time in bed + extra). It moves 15 min earlier every 3 nights from the starting bedtime. When "in bed" is not recorded on most nights, 15 min to fall asleep is assumed (`LATENCY`). Progress compares nights after the start date with the frozen starting point and shows the measured conversion once there are 5 nights and 15 more minutes in bed.

## Three kinds of night (`dayType`, `baselineBy`, `planBy`, `progressBy`)

The plan does not treat the week as uniform. A night is a **workday**, **weekend** or **time-off** night according to the day you wake up on: time off = wake date inside a range in `S.off` (`[{ a, b }]`, entered in the Plan tab), otherwise Saturday/Sunday = weekend, otherwise workday.

- `plan.wake = { work, weekend, off }`; an unset one defaults to the median wake of that kind of night. `plan.base = { work, weekend, off }`, frozen at the start.
- Starting point per kind: last 28 days for workdays and weekends, last 180 days for time off, at least 3 nights; otherwise borrowed (time off ← weekend ← workday ← all nights) with `from` set and a note on screen.
- Per kind: extra sleep = min(phase gain, target − starting sleep), lights out = that kind's wake − (its time in bed + extra ÷ conversion), same 15 min / 3 nights stepping counted in calendar days from the start.
- "Tonight" is the kind of the next wake-up (`tonightWake`: from 15:00 on, tomorrow).
- Week figure = (5 × workday + 2 × weekend) ÷ 7. A note warns when weekend and workday mid-sleep in the plan are an hour or more apart.
- Progress compares each night with the starting point of its own kind.
- A plan saved before this change (single wake time and starting point) keeps its wake time for workdays and has to be started again (`migrate` in `store.js`).
- The guide's "days off vs workdays" counts time off as days off. The bridge and the numbers are not split by kind of night.

## The guide (`advice`, `timing` in `sleep.js`; `renderGuide` in `ui.js`)

Always on the last 28 days. Findings are ranked: 2 = change first, 1 = keep an eye on it, 0 = fine.

- Volume: average asleep against a working range by training load (`ACTIVITY`, minutes `[bottom, top, aim]`: light 7 h–9 h aim 7 h 45, regular 7 h 30–9 h aim 8 h 15, heavy 8 h–9 h 30 aim 8 h 45). These are judgement figures built on the 7–9 h adult recommendation, Sargent 2021 (175 elite athletes: self-assessed need 8.3 h, SD 0.9; obtained 6.7 h) and Walsh 2021 (individual figure over one rule). There is no validated formula from training load to sleep need; the screen says so.
- Target outside the range → a finding. Onset: median at or after midnight. Days off vs workdays: difference of median mid-sleep (nights ending Sat/Sun vs the rest; needs 3 and 2 nights), 30 and 60 min thresholds. Regularity against UK Biobank quartiles 74 / 81 / 86. Conversion under 85 %. Costliest tagged cause from the 28-day bridge (5 min a night or more).
- Explainers (before midnight, testosterone, mood, recovery) quote: Nikbakhtian 2021 (88,026 adults; onset 22:00–22:59 lowest CVD incidence; HR 1.12 for 23:00–23:59, 1.25 after midnight, 1.24 before 22:00; in men only before 22:00 significant), Leproult & Van Cauter 2011 (10 men, 8 nights of 5 h, daytime testosterone −10 to −15 %), Schmid 2012 (first-half-only sleep lowered morning testosterone; 02:45–07:00 for two nights did not), Daghlas 2021 (OR 0.77 per hour earlier midpoint, 95 % CI 0.63–0.94, Mendelian randomisation), Walsh 2021. Each is worded as small study or association. Update the text in `i18n.js` (`ex.*`, `guide.*`, `adv.*`) and the `SOURCES` list together.

## Not done yet

- Never run on a real iPhone or against a real Health export: the import is tested on invented archives (ordinary zip, streamed zip with data descriptors, French file name, 400 MB of XML). First real import: check the count of nights and one or two nights against the Health app.
- v1.5 from the brief: if-then quests, "open the window tonight?" (Open-Meteo), link to Forge, puppy nights.
- Naps are not part of the bridge. Travel nights are shown on the export's clock.
