# Adding hikes to Cordée

This is the rulebook for the weekly update, and for anyone adding a hike by hand. The catalogue is `data/hikes.json`, one hike per line. The app reads that file directly, so a correct line is all a new hike needs; `python3 tools/build.py` checks every line and also rebuilds `index.html`.

## The weekly update, step by step

1. **Wish list first.** Read `data/requests.md`. Every line under **Waiting** gets handled this week: add the hike (or the best-known version of it, plus an easier variant when one is popular), or say why not. Then move the line to **Done** with the date and the name it got in the app.
2. **Then grow the catalogue by 6 hikes.** Pick from the ideas list at the bottom, or from good gaps you find. Cover at least two countries each week. Order of preference:
   - places close to areas already loved: Eibsee and Garmisch, Tegernsee, Ramsau and Berchtesgaden, Wilder Kaiser, Reutte and the Tannheimer Tal;
   - classic, signposted hikes within about 2.5 hours' drive of Munich;
   - famous mountain and lake hikes further away (Switzerland, the Dolomites, Salzburg, Hohe Tauern).
   - Mix the grades: roughly two easy, two moderate, one or two hard, and an expert one now and then.
3. **No duplicates.** Before adding, search `data/hikes.json` for the place names. A different route to the same summit is fine if it is a distinct, well-known route (different start, or a loop instead of out-and-back). The build warns when two hikes share both their start and their top.
4. **Research each hike** from at least two sources, and put one to three of them in `ref`. Good sources: official tourism boards, the Alpine clubs (alpenvereinaktiv.com, sac-cas.ch, cai.it), Outdooractive, Bergfex, hikr.org, the hut's own website, Wikipedia for coordinates and elevations.
5. **Check and build:** `python3 tools/build.py`. Fix every error. Read the warnings and fix them unless they are clearly fine.
6. **Record it:** add a section at the top of `data/changelog.md` (date, hike count, what was added or changed).
7. **Commit and push** to `main` with a message like `Weekly hikes: +7 (Hexenseen, Taubensee, …)`. GitHub Pages publishes within a minute or two.

Never delete a hike or change an `id`: logbook entries point at ids. If a hike is wrong, fix its fields; if a trail has closed, keep the hike and say so at the start of `b`. Don't touch `src/` unless a build is broken. Keep personal names out of the repository: it is public.

## One hike, field by field

Example (the Seebensee line from the catalogue, plus the fields new hikes should have):

```json
{"id":"seebensee","n":"Seebensee & Coburger Hütte","ar":"Zugspitz Arena (Ehrwald)","rg":"Tyrol","c":"AT","p":[[47.3965,10.935],[47.36847,10.9345],[47.36001,10.93353]],"pq":["Talstation Ehrwalder Almbahn","Seebensee","Coburger Hütte"],"hi":2,"tn":"Coburger Hütte","tk":"hut","ty":"out","km":12.5,"up":950,"mx":1927,"lo":1100,"g":"moderate","sc":"T2","tg":["lake","hut","views","cablecar"],"ss":[6,10],"d":{"r":"free","t":"ok","cow":1,"h2o":1,"n":"Cattle at the Ehrwalder Alm; lakes for a drink and a swim."},"lf":"Ehrwalder Almbahn saves 500 m.","b":"Seebensee mirrors the Zugspitze; the Drachensee and its hut sit one step higher.","ref":["https://www.zugspitzarena.com/…"],"ad":"2026-11-02"}
```

| Field | Meaning |
|---|---|
| `id` | Unique, lowercase with dashes, never changed later. |
| `n` | Name as people say it: "Schrecksee from Hinterstein", "Lago di Sorapis". |
| `ar` | Area. Reuse an existing area name when it fits (the logbook counts hikes per area); create a new one only for a new valley or region. |
| `rg` | State or region: Bavaria, Tyrol, Salzburg, Upper Austria, Vorarlberg, Carinthia, Styria, a Swiss canton region (Bernese Oberland, Valais, Graubünden…), South Tyrol, Trentino, Veneto, Lombardy. |
| `c` | `DE`, `AT`, `CH` or `IT`. |
| `p` | Waypoints `[lat, lon]` in order, 5 decimals. First = trailhead (car park, station or lift). Add the summit, hut or lake, and one or two points that fix the route (a pass, the far shore of a lake). For a loop, don't repeat the start at the end. For one-way hikes, end where the lift or bus is. |
| `pq` | One OpenStreetMap-style name per waypoint (or `null`). The app looks each name up near the given point and moves the waypoint onto it before tracing the route, so slightly rough coordinates still give a correct line. Always fill it for new hikes. |
| `hi` | Index in `p` of the main goal (summit, hut, lake). Weather "at the top" uses this point. |
| `tn`, `tk` | Name and kind of the main goal: `peak`, `hut`, `lake`, `pass`, `view`, `ridge`, `fall`, `gorge`. For `peak`, `hut` and `pass`, the app also snaps the goal onto the OSM feature named `tn`. |
| `ty` | `loop`, `out` (there and back) or `trav` (one way, lift or bus back). |
| `km` | Total distance as walked (round trip for `out`), rounded to 0.5. |
| `up` | Total ascent in metres, rounded to 10. `dn` (descent) only for `trav`. |
| `mx`, `lo` | Highest point and trailhead elevation in metres. |
| `g`, `sc` | Difficulty, graded by the hardest section (table below), and the local scale. |
| `tg` | Tags: `lake` `swim` `summit` `hut` `waterfall` `gorge` `ridge` `views` `glacier` `larch` `family` `history` `cablecar` `boat`, plus `train` `castle` `meadow` `viaferrata`. `family` means genuinely easy-going. |
| `ss` | Season `[first month, last month]` when the route is normally snow-free and huts or lifts run. |
| `d` | Dog, for a medium-size Goldendoodle: `r` = `free` / `leash` / `banned`; `t` = `ok` / `care` / `no` (ladders, chains, scrambles or grated stairs = `no`; exposed, narrow, scree = `care`); `cow: 1` if cattle graze on the route in summer; `h2o: 1` if there is water for the dog; `n` = one short practical note; `src: "rule"` only when a published dog rule is linked in `ref`. Known rules: dogs banned in the Swiss National Park; leash in Berchtesgaden National Park and the Karwendel nature park; muzzle on Italian lifts and the Königssee boats. |
| `lf` | Optional practical line: lift or boat, toll road, bus back, closures. |
| `b` | One or two sentences on why it's worth it. Plain, specific, no hype. |
| `ref` | One to three https links to the sources used. |
| `ad` | Date the hike was added (`YYYY-MM-DD`). The app shows a **New** badge for 30 days and a "new hikes" strip. |

**Difficulty**

| Cordée | Switzerland (SAC) | Austria and Bavaria | Italy (CAI) |
|---|---|---|---|
| easy | T1, yellow trail | valley and blue trails | T |
| moderate | T2, red-white | red mountain trails | E |
| hard | T3, demanding red-white | red to black, sure-footed | EE |
| expert | T4–T6, blue-white | black, alpine routes | EE+, EEA (via ferrata) |

**Coordinates.** Take summit, hut and lake positions from Wikipedia, Wikidata or the hut's website, and car parks from the tourism board or the trail description. Trailhead elevations come from the same source or from the nearest village. If you can open `https://nominatim.openstreetmap.org/search?q=NAME&format=jsonv2`, use it to confirm; if not, the `pq` names let the app correct the points.

## Ideas not yet in the app

Strike an idea out (or delete the line) when it is added.

**Near the favourite areas**
- Ramsau: Soleleitungsweg (easy balcony path), Taubensee, Halsalm
- Berchtesgaden: Kärlingerhaus and Funtensee via the Saugasse, Toter Mann, Untersberg (Berchtesgadener Hochthron), Predigtstuhl from Bad Reichenhall
- Wilder Kaiser: Stripsenjochhaus from the Griesner Alm, Walleralm, Brentenjoch, Steinerne Rinne (expert)
- Reutte: Frauensee and Urisee, Gehrenspitze from the Reuttener Seilbahn, Gaichtspitze
- Tegernsee and Schliersee: Roß- and Buchstein with the Tegernseer Hütte, Setzberg, Brecherspitz, Jägerkamp, Spitzingsee circuit
- Garmisch and Eibsee: Kreuzeck and Osterfelderkopf, Krottenkopf, Grainau to the Riessersee
- Walchensee and Kochel: Rabenkopf, Lainbach waterfalls, Walchensee shore walk

**Bavaria**
- Chiemgau: Hochfelln, Hochgern, Geigelstein, Taubensee at Reit im Winkl
- Allgäu: Nebelhorn and the Seealpsee in the Oytal, Hochgrat ridge, Grünten, Gaisalpsee, Rappensee hut
- Füssen: Tegelberg, Alatsee, Pöllat gorge
- Bayrischzell: Tatzelwurm waterfalls

**Austria**
- Serfaus-Fiss-Ladis: Hexenseen from Serfaus, Furgler
- Pitztal and Kaunertal: Rifflsee, Gepatschhaus
- Stubai: Wilde Wasser Weg to the Grawa waterfall, Pinnistal to the Karalm, Starkenburger Hütte
- Zillertal: Berliner Hütte, Schlegeis reservoir to the Pfitscher Joch
- Achensee and Karwendel: Bärenkopf, Seeberg- and Seekarspitze ridge, Dalfaz waterfall, Hallerangerhaus, Falkenhütte, Karwendelhaus
- Kitzbühel: Kitzbüheler Horn, Schwarzsee
- Arlberg and Lech: Formarinsee and the Freiburger Hütte, Spullersee
- Montafon and Silvretta: Silvretta reservoir to the Wiesbadener Hütte
- Salzkammergut: Altausseer See circuit, Loser, Grundlsee–Toplitzsee–Kammersee, Laudachsee, Traunstein (hard), Langbathseen, Feuerkogel
- Salzburg and Hohe Tauern: Innergschlöss (Venediger), Pasterze and Gamsgrube at the Grossglockner, Gasteiner Höhenweg, Bockhartsee, Mooserboden reservoir
- Carinthia: Weissensee shore, Dobratsch

**Switzerland**
- Lucerne: Pilatus, Bürgenstock Felsenweg
- Bernese Oberland: Blausee, Gemmi Pass (Leukerbad to Kandersteg), Lauenensee, Brienzer Rothorn
- Valais: Saas-Fee Gemsweg, Mattmark reservoir
- Ticino: Val Verzasca, Lago Ritom and the Piora lakes
- Eastern Switzerland: Säntis, Quinten on the Walensee, Flumserberg seven lakes
- Engadin: Silsersee to Val Fex, Lej da Staz, Lago Bianco at the Bernina

**Italy**
- South Tyrol: Geisler Alm in Val di Funes, Lago di Dobbiaco, Lago di Anterselva, Reschensee circuit, Rifugio Firenze
- Cortina: Lagazuoi, Lago di Limides, Lago Antorno, Lago Coldai under the Civetta
- Fassa and Pale: Val Venegia, Rifugio Rosetta, Marmolada and Lago di Fedaia
- Brenta and Ortler: Lago di Molveno, Rifugio Tuckett, Rifugio Payer
- Lakes: Monte Brione at Riva, Cascata del Varone
