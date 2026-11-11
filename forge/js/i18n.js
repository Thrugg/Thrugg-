/* Forge — interface text, English and French. t('key', {var}) */
const EN = {
  app: 'Forge', tag: 'Calories that fit how you live. Records ranked from Hobbit to Olympian God.',
  tab: { today: 'Today', fuel: 'Fuel', physique: 'Physique', arena: 'Arena', settings: 'Settings' },
  common: { save: 'Save', cancel: 'Cancel', close: 'Close', add: 'Add', edit: 'Edit', del: 'Delete', next: 'Next', back: 'Back', skip: 'Skip for now', done: 'Done', optional: 'optional', date: 'Date', kg: 'kg', cm: 'cm', kcal: 'kcal', g: 'g', yes: 'Yes', no: 'No', none: 'None yet', how: 'How it’s calculated', source: 'Source', confidence: 'Confidence', conf: { high: 'High', medium: 'Medium', low: 'Low' }, perDay: '/day', perWeek: '/week', min: 'min', more: 'More', saved: 'Saved', confirmDel: 'Delete this entry?', notMedical: 'Forge is not medical advice.' },
  units: { metric: 'Metric (kg, cm)', imperial: 'Imperial (lb, in)' },
  sexPl: { m: 'men', f: 'women' },
  sex: { m: 'Male', f: 'Female', why: 'Used by the equations and the benchmarks, which are published by biological sex.' },
  ob: {
    start: 'Get started', restore: 'Restore a Forge backup', step: 'Step {n} of {m}',
    you: 'About you', name: 'First name', dob: 'Date of birth', height: 'Height', weight: 'Weight today',
    safety: 'A few safety questions', safetyLead: 'If any applies, Forge shows maintenance only and never suggests a calorie deficit.',
    s_under18: 'I am under 18', s_preg: 'I am pregnant or breastfeeding', s_ed: 'I have or had an eating disorder', s_med: 'I have a condition or take medication that affects weight (thyroid, diabetes, GLP-1, steroids, beta-blockers)',
    week: 'Your usual week', weekLead: 'This is what makes Forge more accurate than a standard calculator. You can refine it any time under Fuel.',
    steps: 'Average daily steps', stepsHint: 'Health app → Steps → Show more data: use the 4-week average.',
    occupation: 'Job', occ: { desk: 'Desk / office', mixed: 'Mixed (some standing)', standing: 'On my feet (retail, care)', manual: 'Manual / physical' },
    sleep: 'Sleep (hours a night)', years: 'Years of regular strength training',
    workouts: 'Your training', addWorkout: 'Add a session type',
    bfTitle: 'Body fat (optional)', bfLead: 'Any recent estimate helps: a DXA scan, a smart scale, or tape measurements (Physique tab). You can skip this.',
    bfNow: 'Body fat % if you know it', finish: 'Open Forge'
  },
  today: {
    hello: 'Hello {name}', target: 'Today’s target', noPlan: 'No plan yet', setPlan: 'Set your plan', protein: 'Protein', carbs: 'Carbs', fat: 'Fat',
    quick: 'Log today', weight: 'Weight', intake: 'Calories eaten', logged: 'Logged', trend: 'Trend weight', week: 'per week', noWeight: 'Log your weight in the morning, after the bathroom, before eating.', fromMfp: 'Yesterday from MyFitnessPal (via Apple Health): {k} kcal', fromRenpho: 'From Renpho at {t}', t_renpho: 'Import this week’s Renpho file (Settings → Renpho)',
    maintenance: 'Your maintenance', arena: 'Arena', peak: 'Peak', balance: 'Balance', todo: 'Next steps',
    t_weigh: 'Weigh in today', t_health: 'Bring in your Apple Health data', t_photo: 'Photo check-in due ({d} days since the last)', t_photoFirst: 'Take your first photo check-in', t_tape: 'Tape measurements this week', t_bf: 'Add a body-fat estimate to unlock the lean-mass equations', t_pr: 'Log a personal record in the Arena', t_mfp: 'Bring in your MyFitnessPal calories (Settings → MyFitnessPal)',
    paste: 'Paste from Shortcut'
  },
  fuel: {
    maint: 'Maintenance', band68: 'Likely range', band95: '95 % range', src: { predicted: 'Predicted from your profile', blended: 'Predicted + learned from your logs' },
    breakdown: 'What makes up your day', c_rmr: 'Resting metabolism', c_neat: 'Daily life (job, sleep)', c_steps: 'Steps', c_flights: 'Stairs', c_ex: 'Workouts', c_epoc: 'After-burn', c_tef: 'Digesting food',
    stepsDetail: '{steps} steps → {km} km', rmrMethod: 'Method: {m}',
    activity: 'Your activity', stepsAvg: 'Average daily steps', stepsInc: 'My step count includes the steps of my workouts', flights: 'Floors climbed a day', stride: 'Stride length', strideHint: 'Leave empty to use your height. To measure: walk 20 steps, measure the distance, divide by 20.',
    sessions: 'Training sessions', type: 'Activity', minutes: 'Minutes', per: 'Per week', intensity: 'Intensity', pace: 'Pace (km/h)', watts: 'Average watts', fromHealth: 'Fill from Apple Health workouts',
    int: { light: 'Light — can sing', moderate: 'Moderate — can talk', vigorous: 'Hard — a few words', very: 'Very hard — no talking' },
    intS: { light: 'Typical session, full rests', moderate: 'Heavy compound lifts (squat, deadlift)', vigorous: 'Hard session, short rests', very: 'Very hard, minimal rest' },
    fromHealthNote: 'From Apple Health, last 4 weeks', watchSession: 'Apple Watch: {k} kcal per session', spm: '{s} steps/min counted during it', perSession: 'kcal per session', watchCmp: 'Watch {k}',
    watchHigh: 'For some sessions Forge is more than 25 % above your Apple Watch: check the intensity you picked.', kcalSrc: 'Last 28 days: calories from Apple Health (MyFitnessPal) on {n} days, typed in on {m}.', srcLegend: 'R Renpho · H Apple Health · ✎ typed in Forge', rpLocked: 'Renpho reading for this day: change it in the Renpho app.',
    rpBmr: 'Renpho’s own BMR: {v} kcal ({d}). Shown for comparison only: it is the Katch-McArdle formula on the scale’s fat-free mass, which Forge’s ensemble already covers.',
    plan: 'Your plan', rec: 'Recommended', why: 'Why', mode: { cut: 'Cut', recomp: 'Recomp', maintain: 'Maintain', bulk: 'Lean bulk', custom: 'Custom' },
    rate: 'Weekly loss', fatPct: 'Fat (% of calories)', meals: 'Meals a day', custom: 'Daily calories', target: 'Daily target', change: 'Expected change', perMeal: '{g} g protein per meal ({gkg} g/kg)',
    ea: 'Energy availability', eaText: '{v} kcal per kg of lean mass after training', eaOk: 'Healthy', eaAmber: 'Low — recovery and hormones suffer below 30', eaRed: 'Too low — Forge blocks plans under 25',
    reason: {
      safety: 'Your safety answers switch Forge to maintenance only.', underweight: 'Your BMI is under 18.5, so Forge does not suggest a deficit.', needBf: 'Add a body-fat estimate and Forge will recommend cut, recomp or bulk.',
      highBf: 'At this body fat a cut gives the best health and visual return.', novice: 'With less than a year of training you can build muscle while losing fat.', cutFirst: 'A cut first makes the next bulk leaner. A slow bulk is a valid choice too.',
      leanBulk: 'You are lean enough to bulk: muscle gain is the priority.', nearCeiling: 'You are near the typical drug-free muscle ceiling, so a slow bulk fits.', veryLean: 'You are very lean. Maintain or bulk, and watch sleep, mood and libido.'
    },
    flags: { safetyBlock: 'Deficits are off because of your safety answers.', belowFloor: 'This is below your resting metabolism or the absolute floor ({min} kcal). Forge will not apply it.', lowCarb: 'Under 100 g carbs: training performance may drop.', eaRed: 'Energy availability under 25. The lowest safe target for you is {min} kcal.', eaAmber: 'Energy availability under 30. Consider a slower rate or a diet break every 6–12 weeks.', fastCut: 'Faster than 1 %/week risks muscle loss.' },
    apply: 'Use this plan', applied: 'Current plan', projection: 'Projection (16 weeks)', projNote: 'Shaded: likely range from the maintenance uncertainty.',
    dietBreak: 'Plan a 1–2 week maintenance break every 6–12 weeks of cutting.', bulkNote: 'Aim for {lo}–{hi} %/week. If you gain faster, Forge will suggest trimming the surplus.',
    learn: 'Learning your real maintenance', learnLead: 'Equations miss by ±10 % for a third of people. Log weight and calories and Forge learns your true maintenance from your weight trend.',
    learnNeed: 'Need: 14+ days, 4+ weigh-ins and calories on 70 % of days. Now: {w} weigh-ins, {k} days of calories over {s} days.',
    learnOk: 'Observed from your last {s} days: {v} kcal ± {sd}. Weight trend {slope} kg/week.', learnWeight: 'Your logs now carry {pct} % of the estimate.',
    log: 'Daily log', addEntry: 'Add or edit a day', steps: 'Steps', protein: 'Protein (g)', carbs: 'Carbs (g)', fat: 'Fat (g)', noLog: 'No entries yet. Log here, or bring in Apple Health under Settings.',
    howText: 'Resting metabolism: an ensemble of published equations. Mifflin-St Jeor always; when your body fat is known and you lift 3+ times a week, 75 % comes from lean-mass equations built on athletes (Tinsley 2019, ten Haaf 2014, Cunningham 1980). Daily life: awake hours at your job’s MET level. Steps: 0.5 kcal per kg per km above rest (ACSM walking equation), minus the steps of your workouts. Workouts: (MET − 1) × your own resting rate × hours, METs from the 2024 Adult Compendium; runs with a pace use 1 kcal per kg per km. After-burn: 5 % of moderate and hard sessions. Digestion: 10 % of intake. The band combines ±10 % on resting metabolism and ±25 % on activity. Once you log, a regression of your weight trend against your intake replaces the guesswork; weight change is converted with the Forbes partition and Hall’s tissue energies.'
  },
  phys: {
    bf: 'Body fat', bfRange: 'Most likely {lo}–{hi} %', bfNone: 'No estimate yet. Add tape measurements, a scan or a photo check-in.', methods: 'What it is based on', weight: 'weight', stale: 'older than 30 days — not used',
    m: { dxa: 'DXA scan', bodpod: 'BodPod', bia_pro: 'Pro bioimpedance (InBody)', bia: 'Smart scale', biaRenpho: 'Renpho scale (mean of {n} readings)', biaRenphoCal: 'Renpho scale, corrected by your DEXA ({o} points; mean of {n} readings)', navy: 'Tape: US Navy', rfm: 'Tape: Relative Fat Mass', navy_photo: 'Photo: US Navy', rfm_photo: 'Photo: Relative Fat Mass', deurenberg: 'BMI formula (Deurenberg)', visual: 'Your own estimate' },
    compare: 'How you compare', vsAdults: 'Leaner than {p} % of {sex} aged {a}–{b}', vsSrc: 'NHANES 1999–2004 DXA (Hologic), US adults. Compare with DXA results first; tape and photo estimates carry more error. European adults are leaner on average.',
    ffmi: 'Fat-free mass index', ffmiText: '{v} (normalised to 1.80 m)', ffmiRef: 'Drug-free male athletes averaged 21.8; values above ~25 are rare without drugs (Kouri 1995).', ffmiRefF: 'Reference data for women are limited.',
    whtr: 'Waist ÷ height', whtrText: '{v}: {band}', whtrBand: { ok: 'healthy (under 0.5)', mid: 'raised risk (0.5–0.6)', high: 'high risk (over 0.6)' },
    bmi: 'BMI', bmiText: '{v} — BMI cannot tell muscle from fat.', bmiDxa: 'Your DXA of {d} put you at BMI {b} (“overweight”) with {f} % fat.', almi: 'Appendicular lean mass index', almiText: '{v} kg/m² (DXA of {d})',
    tape: 'Tape measurements', tapeAdd: 'Add measurements', neck: 'Neck', waist: 'Waist (at the navel)', hip: 'Hips (widest point)', chest: 'Chest', arm: 'Upper arm', thigh: 'Thigh', calf: 'Calf',
    tapeHow: 'How to measure', tapeSteps: ['Neck: just below the Adam’s apple, tape sloping slightly down to the front.', 'Waist: horizontal at the navel, at the end of a normal breath out. Do not suck in.', 'Hips: widest point of the buttocks, feet together.', 'Snug, not compressing. Measure twice; if the two differ by more than 1 cm, measure again.', 'Same tape, same time of day, weekly.'],
    scans: 'Scans', scanAdd: 'Add a scan', scanMethod: 'Method', fatPct: 'Body fat %', lean: 'Lean mass (kg)', bmc: 'Bone mineral (kg)', alm: 'Arms + legs lean (kg)', vat: 'Visceral fat (g)',
    photos: 'Photo check-ins', photoNew: 'New check-in', photoHow: 'How to take them', front: 'Front', side: 'Side', back: 'Back', choose: 'Take or choose photo',
    photoOnDevice: 'Photos stay on this device. They are never uploaded or synced.', photoElsewhere: 'Stored on another device',
    protocol: [
      ['Clothing', 'Upper body uncovered (women: sports bra). Fitted briefs or short tights, navel and mid-thigh visible. Hair above the neck, no watch or jewellery.'],
      ['Timing', 'Morning, fasted, after the bathroom, before training. No pump, no salty dinner the night before.'],
      ['Poses', 'Front: arms 30–45° away from the body, palms forward, feet hip-width. Side: arms crossed on the chest so the waist outline is free. Back: like the front. Relaxed, normal breath out. Do not suck in or flex.'],
      ['Camera', 'Portrait, phone level, lens at navel height on a shelf or tripod, 10 s timer. 2–3 m away so head to feet fill about 80 % of the frame. Main lens, no zoom, no portrait mode.'],
      ['Place', 'Plain wall, even light from the front (window or two lamps). Avoid a single overhead light: it carves fake abs. Mark the floor so the setup is identical every time.'],
      ['Rhythm', 'Every 2–4 weeks. Tape weekly.']
    ],
    measure: 'Measure from photos', measuring: 'Detecting your outline…', measureFail: 'Automatic detection did not work. Drag the markers yourself.', measureManual: 'Drag the markers to the edges of your body, the top of your head and your heels.',
    measureNeed: 'Needs a front and a side photo with your whole body, head to heels.', cropped: 'Your head or feet touch the edge of a photo, so the scale is wrong. Retake with your whole body in the frame, or drag the blue lines to where your head and heels really are.', measured: 'From photos: waist {w} cm, neck {n} cm{h}', calibrate: 'Calibrated against your tape measurements of {d}.', uncal: 'Not calibrated yet: add tape measurements within a week of a photo check-in to calibrate.',
    compareWith: 'Compare with', reference: 'Reference', history: 'Weight history', subqLine: 'Subcutaneous fat (Renpho): {v} %. Forge’s calculations and comparisons use total body fat, which is what DEXA and the reference data measure.',
    rp: { title: 'Smart scale (Renpho)', lead: 'Latest reading {d}, {t}.', subqHead: 'Subcutaneous fat', same: 'No change', calOn: 'Calibrated on your DEXA of {d}: Renpho read {r} % that week, DEXA {x} %. Forge applies {o} points to Renpho’s total body fat in its calculations.', calOff: 'Not calibrated yet: weigh on the Renpho the morning of a DEXA (any day within a week works), add the DEXA under Scans and import the Renpho file. Forge then corrects Renpho automatically.', subqLead: 'The fat under the skin: the part that shows in the mirror.', subqShare: 'Renpho puts it at {k} % of your total body fat on every reading, so it moves exactly with the total.', bfTotal: 'Total body fat (used in calculations)', latest: 'Latest', change: 'vs {d}', bf: 'Body fat', fm: 'Fat mass', ffm: 'Fat-free mass', sm: 'Skeletal muscle', mus: 'Muscle (fat-free minus bone)', water: 'Body water', bone: 'Bone mass', prot: 'Protein', subq: 'Subcutaneous fat', vis: 'Visceral fat (Renpho index)', bmr: 'BMR (Renpho)', mage: 'Metabolic age (Renpho)',
      lockstep: 'Renpho’s body fat follows your weight almost exactly (r = {r}): of every kilo gained or lost it books {f} kg as fat and {l} kg as fat-free mass. That split comes from the scale’s formula, not a measurement: trust the weight trend, and the DEXA for composition.',
      caveat: 'Bioimpedance estimates: day-to-day changes under about 1 kg or 1 % are noise. Forge’s calculations use the weight and the body-fat figure (as a smart-scale estimate, ±6 points); the other values are shown for reference.' }
  },
  arena: {
    title: 'Arena', lead: 'Your records ranked against people who do the same thing.', peak: 'Peak', balance: 'Balance',
    peakText: 'Average of your two best domains: your ceiling.', balanceText: 'Geometric mean of every domain: it drops hard when one is weak.', gapText: 'The gap between them shows how specialised you are.',
    needMore: 'Log records in at least three domains to get a Balance score.', limiter: '{d} is holding your Balance back. Reaching the next tier there lifts Balance from {a} to {b}.', limiterUp: '{d} is holding your Balance back. Reaching the next tier there lifts Balance from {a} to {b}, and makes you {tier} overall.', toNext: '{gap} points to {tier}',
    overallNote: 'Overall levels use the same ladder as single records, applied to the score: they show where your domains sit on average, not a ranking against everyone.',
    dom: { strength: 'Strength', explosive: 'Explosive power', speed: 'Speed', power: 'Power endurance', aerobic: 'Aerobic', upper: 'Upper-body endurance', lean: 'Leanness' },
    domS: { strength: 'Strength', explosive: 'Explosive', speed: 'Speed', power: 'Power end.', aerobic: 'Aerobic', upper: 'Upper body' },
    leanTitle: 'Leanness (secondary score)', leanText: 'Shown for reference. Peak and Balance measure performance only.', repsU: 'reps', timeLong: 'Time (mm:ss or h:mm:ss)', cm: 'Jump height', jumpMethod: 'Measured with',
    jm: { mat: 'Jump mat, force plate or My Jump app', reach: 'Wall reach (chalk or Vertec)' }, jumpHow: 'Countermovement jump with arm swing, best of 3–5 tries. The reference was measured on a force plate.',
    repsMax: 'Max reps in one set', repsHow: { pullups: 'From a dead hang to chin over the bar, no kipping.', pushups: 'Full range, body straight, no resting on the floor.' },
    add: 'Log a record', event: 'Event', none: 'No record yet', vsPart: 'Top {p} % of people who do this', vsAll: 'Top {p} % of all {sex} (estimate, {lo}–{hi} %)', vsAge: 'Top {p} % of {sex} your age (measured population data)', next: '{gap} to {tier}', top: 'Top tier reached',
    ev: { bench: 'Bench press', squat: 'Back squat', deadlift: 'Deadlift', ohp: 'Overhead press', sprint60: '60 m sprint', sprint100: '100 m sprint', sprint200: '200 m sprint', sprint400: '400 m sprint', row100: 'Row 100 m', row200: 'Row 200 m', row250: 'Row 250 m', row500: 'Row 500 m', row1min: 'Row 1 minute', vo2: 'VO₂max', vjump: 'Vertical jump', pullups: 'Pull-ups', pushups: 'Push-ups', bike1000: 'BikeErg 1,000 m', ski500: 'SkiErg 500 m', run5k: '5 km run', run10k: '10 km run' },
    weightKg: 'Weight lifted', reps: 'Reps', rir: 'Reps left in the tank', bwThen: 'Bodyweight that day', time: 'Time (s or m:ss.t)', meters: 'Metres', value: 'ml/kg/min',
    timing: 'Timing', t: { electronic: 'Electronic (gates, photocell)', hand: 'Hand stopwatch (+0.24 s)', gps: 'Watch GPS (not ranked)' }, wind: 'Tailwind (m/s)',
    method: 'Measured by', vm: { lab: 'Lab test, treadmill', cycle: 'Lab test, bike', watch: 'Apple Watch estimate', cooper: 'Cooper 12-minute run' }, cooperM: 'Distance in 12 min (m)',
    note: { reps: 'More than 10 reps: stored as a rep record, not converted to a 1RM.', gps: 'GPS times are not accurate enough to rank.', hand: 'Hand timing: +0.24 s added.', wind: 'Wind over 2 m/s: not record-legal.', watch: 'Watch estimates run about 6 ml/kg/min low on average (small study): low confidence.', cycle: 'Compared with treadmill norms: bike tests read lower.', cooper: 'Estimated from the Cooper test.', est: 'Estimated 1RM (mean of Epley, Brzycki, Lombardi).', clampedBw: 'Bodyweight outside the table: nearest row used.', modelled: 'Modelled between the 100 m and 500 m rankings.', vdot: 'Ranked through the VO₂max this time usually takes (VDOT); running economy matters, so it can differ from a lab test.', reach: 'Measured differently from the reference force plate: compare with care.' },
    standards: 'Standards for you', history: 'History', improve: 'How to reach the next tier', ladder: 'The ladder', variant: 'Tier names',
    calc: '1RM calculator', calcText: '{w} × {r} → about {v} kg',
    tips: {
      lift: ['Train the lift 2–3 times a week, 3–6 sets of 1–6 reps at RPE 7–9.', 'Add load whenever all sets feel RPE 8 or less; deload every 4–8 weeks.', 'Beginners progress weekly, intermediates monthly, advanced lifters over a block.'],
      sprint: ['Two speed sessions a week: 4–8 sprints of 20–60 m at full effort, full recovery (2–5 min).', 'Strength underpins speed: work toward a squat of 1.5–2× bodyweight.', 'Low-volume plyometrics (bounds, hurdle hops) and technique drills (A-skips, wall drives).'],
      row: ['Technique first: legs–body–arms, sharp catch, stroke rate 34–40 for sprints.', 'Weekly: 8 × 250 m hard with 2 min rest, and one 30-minute steady row.', 'Damper around 5–7 suits most people; check the drag factor (115–135).'],
      vo2: ['About 80 % of training easy, 20 % hard.', 'One VO₂max session a week: 4–6 × 3–4 min at 90–95 % of max heart rate.', 'One threshold session a week; raise volume by about 10 % a week at most.'],
      jump: ['Plyometrics twice a week: 3–5 sets of 3–5 maximal jumps (box jumps, depth drops), full rest.', 'Heavy squats and hip hinges build the force behind the jump: aim for a squat of 1.5–2× bodyweight.', 'Jump fresh, at the start of a session. Losing body fat raises the jump on its own.'],
      reps: ['Train the movement 2–3 times a week, sets stopped 1–2 reps short of failure.', 'Past 10–15 clean reps, add load (belt or vest) for sets of 3–6.', 'Spread several easy sets through the day (greasing the groove).'],
      erg: ['Technique first, then intervals: 8 × 30 s hard / 90 s easy.', 'Pacing: start just under target pace and sprint the last quarter.', 'One longer steady session a week builds the base these efforts rely on.'],
      lean: ['Losing 0.5–1 % of bodyweight a week keeps muscle best.', 'Protein 2.3–3.1 g per kg of lean mass while cutting.', 'Keep lifting heavy and plan diet breaks every 6–12 weeks.']
    }
  },
  tier: {
    hobbit: ['Hobbit', 'Second breakfast counts as a warm-up'], gaul: ['Gaulish Villager', 'Brave, loud, still waiting for the magic potion'], legionary: ['Roman Legionary', 'Drilled, disciplined, shows up every day'],
    viking: ['Viking', 'Rows, raids, lifts heavy things'], shieldmaiden: ['Shieldmaiden', 'Rows, raids, lifts heavy things'], spartan: ['Spartan', 'Forged in the agoge'], amazon: ['Amazon', 'Forged on the banks of the Thermodon'],
    saiyan: ['Saiyan', 'Comes back stronger after every beating'], viltrumite: ['Viltrumite', 'Nearly indestructible'], olympian: ['Olympian God', 'Beyond mortal tables'],
    band: ['Bottom 5 %', '5–20 %', '20–50 %', '50–80 %', '80–95 %', '95–99 %', 'Top 1 %', 'Top 0.1 %, world class']
  },
  set: {
    profile: 'Profile', language: 'Language', units: 'Units', variant: { classic: 'Classic names', f: 'Women’s variants (Shieldmaiden, Amazon)' },
    sync: 'Sync', syncLead: 'Your numbers sync to your own account through the apps hub’s Supabase. Photos never leave the device. Each person has their own login, so nobody sees anyone else’s data.',
    signIn: 'Sign in', signUp: 'Create an account', signOut: 'Sign out', email: 'Email', password: 'Password (8+ characters)', syncOff: 'Not signed in', checkInbox: 'Account created. If Supabase asks you to confirm, open the email, then sign in here.', signupsOff: 'New sign-ups are turned off in Supabase. Add the user under Authentication → Users, then sign in.',
    rp: 'Renpho smart scale', rpLead: 'Import the CSV export from the Renpho Health app, for example once a week. Forge then takes weight and body composition from Renpho and everything else from Apple Health.', rpHow: 'How to export',
    rpSteps: ['In the Renpho Health app, open your profile settings and use the data export (CSV). Menu names vary between app versions: it is the same export you already used.', 'Save the file to Files (or email it to yourself), then choose it here.', 'Re-importing the full file every week is safe: readings are replaced, never duplicated, and a reading deleted in Renpho disappears here too.'],
    rpChoose: 'Choose Renpho CSV', rpStatus: '{n} days of readings, {a} – {b} · imported {d}', rpNone: 'No Renpho file imported yet',
    rpHeight: 'Renpho is set to {r} cm, Forge to {f} cm. Keep Renpho’s setting as it is: changing it would shift every reading from that day on, and the DEXA calibration absorbs it. Make sure Forge’s height (Profile) is your real height.',
    rpSource: 'Weight and body composition come from', rpSrc: { auto: 'Automatic (Renpho once a file is imported)', renpho: 'Renpho file', health: 'Apple Health' }, rpNow: 'Now: {s}.',
    rpFromR: 'From Renpho', rpFromRList: 'Weight, subcutaneous and total body fat, fat mass, fat-free mass, muscle and skeletal muscle, bone, protein, body water, Renpho BMR, metabolic age.',
    rpFromH: 'From Apple Health', rpFromHList: 'Steps, workouts, calories and macros (MyFitnessPal), resting heart rate, HRV, VO₂max. Apple Health weight and body fat are ignored from your first Renpho day.',
    rpFromM: 'Typed in Forge', rpFromMList: 'Fills a day with no Renpho reading. For calories and steps it wins over Apple Health.',
    rpClear: 'Remove Renpho data', rpClearConfirm: 'Remove all Renpho readings from Forge? Your Renpho app keeps them.', rpDone: 'Renpho: {n} days imported ({r} readings).', rpDupes: '{d} extra reading(s) on the same day merged (earliest kept).',
    rpErr: { empty: 'This file is empty.', columns: 'Columns not recognised: export the CSV from the Renpho app.', dates: 'Dates not recognised.', stone: 'Weights in stone are not supported: switch Renpho to kg or lb before exporting.', norows: 'No readings found in this file.', other: 'Could not read this file.' },
    guideRenpho: 'You use the Renpho file, so Weight and Body Fat can be left out of the Shortcut: Forge ignores them anyway.',
    mfp: 'MyFitnessPal', mfpLead: 'Forge reads your MyFitnessPal calories and macros through Apple Health. There is no separate MyFitnessPal login.',
    mfpSteps: ['Health app → your picture (top right) → Apps → MyFitnessPal → allow it to write Dietary Energy, Protein, Carbohydrates and Total Fat. If MyFitnessPal is not listed, open MyFitnessPal → More → Settings → Sharing & Privacy → HealthKit Sharing.', 'Keep logging in MyFitnessPal as usual.', 'Bring the data into Forge with the Shortcut below (daily, one tap) or the full Health export (history).', 'Calories then appear in Fuel → Daily log and feed “Learning your real maintenance”.'],
    mfpStatus: 'Calories found on {n} of the last 28 days (latest {d})', mfpNone: 'No calories imported yet',
    health: 'Apple Health', healthLead: 'Bring in steps, weight, body fat, calories from MyFitnessPal, workouts, resting heart rate and the Watch’s VO₂max. Everything stays on your phone.',
    hQuick: 'Quick sync (Shortcut)', hQuickLead: 'Five minutes to set up once, then one tap brings in the last 35 days.', hFull: 'Full history (Health export)', hFullLead: 'No setup. Health app → your picture (top right) → Export All Health Data → Export → Save to Files. Then choose the file here.',
    hChoose: 'Choose export.zip', hPaste: 'Paste from Shortcut', hReading: 'Reading {p} %…', hDone: 'Imported {d} days and {w} workouts.', hNone: 'Nothing new found.', hErr: 'Could not read this file: {e}', hNoExport: 'This zip has no export.xml. Choose the file the Health app created.',
    hApplySteps: 'Use your 4-week step average ({v})?', hApplyWorkouts: 'Replace your training sessions with the last 4 weeks from Apple Health?', hApplyVo2: 'Log the Watch VO₂max ({v}) in the Arena?', hLast: 'Last import: {d}',
    guide: 'Build the Shortcut', guideSteps: [
      'Open Shortcuts, tap +, and name the shortcut “Forge sync”.',
      'Add “Find Health Samples”. Set Type: Step Count. Start Date: is in the last 35 days. Group by: Day. Sort by: Start Date, Oldest First.',
      'Add the same action for Dietary Energy, Protein, Carbohydrates and Total Fat, each with Group by: Day.',
      'Add it again for Weight (Unit: kg) and Body Fat Percentage, with no grouping, and for Resting Heart Rate with Group by: Day.',
      'Add a “Text” action. Type FORGE1 on the first line. Then, for each search, add two lines: a label, then the variable. Labels: @steps @kcal @protein @carbs @fat @weight @bf @rhr. Under each label insert the search’s variable twice: first tap it and choose Start Date (Date Format: ISO 8601), then on the next line the same variable with Value. Example:\n@steps\n[Health Samples · Start Date]\n[Health Samples · Value]',
      'Add “Copy to Clipboard” (input: Text).',
      'Run it once and allow Health access. Then open Forge and tap “Paste from Shortcut” on Today.',
      'Optional: Share → Add to Home Screen, or add the Shortcuts widget, so the sync is one tap.'
    ],
    guideNote: 'I could not test these steps on an iPhone. If a menu is named differently on your iOS version, the full Health export always works.',
    data: 'Your data', export: 'Download backup', import: 'Restore backup', wipe: 'Delete everything on this device', wipeConfirm: 'Delete all Forge data on this device? Synced data stays in your account until you delete it there.', imported: 'Backup restored.',
    safety: 'Safety', helpTitle: 'Support for eating disorders', sources: 'Sources and method', dataVer: 'Benchmark data version {v}', about: 'About',
    disclaimer: 'Forge gives estimates for healthy adults. It is not medical advice. Talk to a doctor before big changes, especially with a medical condition.'
  }
};

const FR = {
  app: 'Forge', tag: 'Des calories adaptées à ta vie. Des records classés du Hobbit au Dieu de l’Olympe.',
  tab: { today: 'Aujourd’hui', fuel: 'Énergie', physique: 'Physique', arena: 'Arène', settings: 'Réglages' },
  common: { save: 'Enregistrer', cancel: 'Annuler', close: 'Fermer', add: 'Ajouter', edit: 'Modifier', del: 'Supprimer', next: 'Suivant', back: 'Retour', skip: 'Plus tard', done: 'Terminé', optional: 'facultatif', date: 'Date', kg: 'kg', cm: 'cm', kcal: 'kcal', g: 'g', yes: 'Oui', no: 'Non', none: 'Rien pour l’instant', how: 'Comment c’est calculé', source: 'Source', confidence: 'Fiabilité', conf: { high: 'Élevée', medium: 'Moyenne', low: 'Faible' }, perDay: '/jour', perWeek: '/semaine', min: 'min', more: 'Plus', saved: 'Enregistré', confirmDel: 'Supprimer cette entrée ?', notMedical: 'Forge ne remplace pas un avis médical.' },
  units: { metric: 'Métrique (kg, cm)', imperial: 'Impérial (lb, in)' },
  sexPl: { m: 'hommes', f: 'femmes' },
  sex: { m: 'Homme', f: 'Femme', why: 'Utilisé par les équations et les références, publiées par sexe biologique.' },
  ob: {
    start: 'Commencer', restore: 'Restaurer une sauvegarde Forge', step: 'Étape {n} sur {m}',
    you: 'À propos de toi', name: 'Prénom', dob: 'Date de naissance', height: 'Taille', weight: 'Poids aujourd’hui',
    safety: 'Quelques questions de sécurité', safetyLead: 'Si l’une s’applique, Forge affiche seulement la maintenance et ne propose jamais de déficit.',
    s_under18: 'J’ai moins de 18 ans', s_preg: 'Je suis enceinte ou j’allaite', s_ed: 'J’ai ou j’ai eu un trouble du comportement alimentaire', s_med: 'J’ai une maladie ou un traitement qui influe sur le poids (thyroïde, diabète, GLP-1, corticoïdes, bêtabloquants)',
    week: 'Ta semaine type', weekLead: 'C’est ce qui rend Forge plus précis qu’un calculateur classique. Tu peux affiner à tout moment dans Énergie.',
    steps: 'Pas moyens par jour', stepsHint: 'App Santé → Pas → Afficher plus de données : prends la moyenne sur 4 semaines.',
    occupation: 'Travail', occ: { desk: 'Bureau', mixed: 'Mixte (un peu debout)', standing: 'Debout (commerce, soins)', manual: 'Manuel / physique' },
    sleep: 'Sommeil (heures par nuit)', years: 'Années de musculation régulière',
    workouts: 'Ton entraînement', addWorkout: 'Ajouter un type de séance',
    bfTitle: 'Masse grasse (facultatif)', bfLead: 'Toute estimation récente aide : un DXA, une balance connectée ou des mesures au mètre ruban (onglet Physique). Tu peux passer.',
    bfNow: 'Masse grasse en % si tu la connais', finish: 'Ouvrir Forge'
  },
  today: {
    hello: 'Salut {name}', target: 'Objectif du jour', noPlan: 'Pas encore de plan', setPlan: 'Définir ton plan', protein: 'Protéines', carbs: 'Glucides', fat: 'Lipides',
    quick: 'Saisie du jour', weight: 'Poids', intake: 'Calories mangées', logged: 'Enregistré', trend: 'Poids tendance', week: 'par semaine', noWeight: 'Pèse-toi le matin, après les toilettes, avant de manger.', fromMfp: 'Hier depuis MyFitnessPal (via Apple Santé) : {k} kcal', fromRenpho: 'Depuis Renpho à {t}', t_renpho: 'Importer le fichier Renpho de la semaine (Réglages → Renpho)',
    maintenance: 'Ta maintenance', arena: 'Arène', peak: 'Pic', balance: 'Équilibre', todo: 'Prochaines étapes',
    t_weigh: 'Pèse-toi aujourd’hui', t_health: 'Importer tes données Apple Santé', t_photo: 'Photos de suivi à refaire ({d} jours depuis les dernières)', t_photoFirst: 'Faire tes premières photos de suivi', t_tape: 'Mensurations cette semaine', t_bf: 'Ajoute une estimation de masse grasse pour activer les équations de masse maigre', t_pr: 'Enregistre un record dans l’Arène', t_mfp: 'Importer tes calories MyFitnessPal (Réglages → MyFitnessPal)',
    paste: 'Coller depuis le Raccourci'
  },
  fuel: {
    maint: 'Maintenance', band68: 'Fourchette probable', band95: 'Fourchette à 95 %', src: { predicted: 'Calculée depuis ton profil', blended: 'Calculée + apprise de tes saisies' },
    breakdown: 'De quoi est faite ta journée', c_rmr: 'Métabolisme de repos', c_neat: 'Vie quotidienne (travail, sommeil)', c_steps: 'Pas', c_flights: 'Escaliers', c_ex: 'Entraînements', c_epoc: 'Post-combustion', c_tef: 'Digestion',
    stepsDetail: '{steps} pas → {km} km', rmrMethod: 'Méthode : {m}',
    activity: 'Ton activité', stepsAvg: 'Pas moyens par jour', stepsInc: 'Mon nombre de pas inclut ceux de mes séances', flights: 'Étages montés par jour', stride: 'Longueur de foulée', strideHint: 'Laisse vide pour utiliser ta taille. Pour mesurer : fais 20 pas, mesure la distance, divise par 20.',
    sessions: 'Séances d’entraînement', type: 'Activité', minutes: 'Minutes', per: 'Par semaine', intensity: 'Intensité', pace: 'Allure (km/h)', watts: 'Watts moyens', fromHealth: 'Remplir depuis les séances Apple Santé',
    int: { light: 'Légère — tu peux chanter', moderate: 'Modérée — tu peux parler', vigorous: 'Intense — quelques mots', very: 'Très intense — impossible de parler' },
    intS: { light: 'Séance classique, repos complets', moderate: 'Gros mouvements lourds (squat, soulevé)', vigorous: 'Séance dure, repos courts', very: 'Très dure, repos minimal' },
    fromHealthNote: 'Depuis Apple Santé, 4 dernières semaines', watchSession: 'Apple Watch : {k} kcal par séance', spm: '{s} pas/min comptés pendant la séance', perSession: 'kcal par séance', watchCmp: 'Montre {k}',
    watchHigh: 'Pour certaines séances, Forge dépasse ton Apple Watch de plus de 25 % : vérifie l’intensité choisie.', kcalSrc: '28 derniers jours : calories d’Apple Santé (MyFitnessPal) sur {n} jours, saisies à la main sur {m}.', srcLegend: 'R Renpho · H Apple Santé · ✎ saisi dans Forge', rpLocked: 'Mesure Renpho de ce jour : à modifier dans l’app Renpho.',
    rpBmr: 'Métabolisme de base selon Renpho : {v} kcal ({d}). Affiché pour comparaison : c’est la formule de Katch-McArdle appliquée à la masse non grasse de la balance, déjà couverte par l’ensemble de Forge.',
    plan: 'Ton plan', rec: 'Recommandé', why: 'Pourquoi', mode: { cut: 'Sèche', recomp: 'Recomposition', maintain: 'Maintien', bulk: 'Prise de masse', custom: 'Personnalisé' },
    rate: 'Perte par semaine', fatPct: 'Lipides (% des calories)', meals: 'Repas par jour', custom: 'Calories par jour', target: 'Objectif quotidien', change: 'Évolution attendue', perMeal: '{g} g de protéines par repas ({gkg} g/kg)',
    ea: 'Disponibilité énergétique', eaText: '{v} kcal par kg de masse maigre après l’entraînement', eaOk: 'Saine', eaAmber: 'Basse — récupération et hormones en pâtissent sous 30', eaRed: 'Trop basse — Forge bloque les plans sous 25',
    reason: {
      safety: 'Tes réponses de sécurité passent Forge en maintenance uniquement.', underweight: 'Ton IMC est sous 18,5 : Forge ne propose pas de déficit.', needBf: 'Ajoute une estimation de masse grasse et Forge recommandera sèche, recomposition ou prise de masse.',
      highBf: 'À ce taux de gras, une sèche apporte le meilleur bénéfice santé et visuel.', novice: 'Avec moins d’un an d’entraînement, tu peux prendre du muscle en perdant du gras.', cutFirst: 'Une sèche d’abord rend la prise de masse suivante plus propre. Une prise lente reste valable.',
      leanBulk: 'Tu es assez sec pour une prise de masse : priorité au muscle.', nearCeiling: 'Tu es proche du plafond musculaire naturel habituel : une prise lente convient.', veryLean: 'Tu es très sec. Maintien ou prise de masse, et surveille sommeil, humeur et libido.'
    },
    flags: { safetyBlock: 'Les déficits sont désactivés à cause de tes réponses de sécurité.', belowFloor: 'C’est sous ton métabolisme de repos ou le plancher absolu ({min} kcal). Forge ne l’appliquera pas.', lowCarb: 'Moins de 100 g de glucides : la performance peut baisser.', eaRed: 'Disponibilité énergétique sous 25. L’objectif le plus bas sans risque pour toi est {min} kcal.', eaAmber: 'Disponibilité énergétique sous 30. Envisage un rythme plus lent ou une pause tous les 6 à 12 semaines.', fastCut: 'Plus de 1 %/semaine expose à une perte de muscle.' },
    apply: 'Utiliser ce plan', applied: 'Plan actuel', projection: 'Projection (16 semaines)', projNote: 'Zone grisée : fourchette probable selon l’incertitude sur la maintenance.',
    dietBreak: 'Prévois une pause d’1 à 2 semaines à la maintenance toutes les 6 à 12 semaines de sèche.', bulkNote: 'Vise {lo}–{hi} %/semaine. Si tu prends plus vite, Forge proposera de réduire le surplus.',
    learn: 'Apprendre ta vraie maintenance', learnLead: 'Les équations se trompent de ±10 % pour un tiers des gens. Saisis poids et calories : Forge apprend ta vraie maintenance à partir de ta tendance de poids.',
    learnNeed: 'Il faut : 14 jours ou plus, 4 pesées et des calories 70 % des jours. Actuellement : {w} pesées, {k} jours de calories sur {s} jours.',
    learnOk: 'Observé sur tes {s} derniers jours : {v} kcal ± {sd}. Tendance de poids {slope} kg/semaine.', learnWeight: 'Tes saisies pèsent maintenant {pct} % de l’estimation.',
    log: 'Journal', addEntry: 'Ajouter ou modifier un jour', steps: 'Pas', protein: 'Protéines (g)', carbs: 'Glucides (g)', fat: 'Lipides (g)', noLog: 'Aucune saisie. Saisis ici, ou importe Apple Santé dans Réglages.',
    howText: 'Métabolisme de repos : un ensemble d’équations publiées. Mifflin-St Jeor toujours ; quand ta masse grasse est connue et que tu fais de la musculation 3 fois par semaine ou plus, 75 % vient d’équations de masse maigre construites sur des sportifs (Tinsley 2019, ten Haaf 2014, Cunningham 1980). Vie quotidienne : heures d’éveil au niveau MET de ton travail. Pas : 0,5 kcal par kg et par km au-dessus du repos (équation de marche ACSM), moins les pas de tes séances. Séances : (MET − 1) × ton propre métabolisme de repos × heures, MET du Compendium 2024 ; les courses avec allure utilisent 1 kcal par kg et par km. Post-combustion : 5 % des séances modérées et intenses. Digestion : 10 % des apports. La fourchette combine ±10 % sur le métabolisme de repos et ±25 % sur l’activité. Dès que tu saisis, une régression de ta tendance de poids contre tes apports remplace les hypothèses ; la variation de poids est convertie avec la répartition de Forbes et les énergies tissulaires de Hall.'
  },
  phys: {
    bf: 'Masse grasse', bfRange: 'Le plus probable : {lo}–{hi} %', bfNone: 'Pas encore d’estimation. Ajoute des mensurations, un examen ou des photos.', methods: 'Sur quoi elle repose', weight: 'poids', stale: 'plus de 30 jours — non utilisé',
    m: { dxa: 'Examen DXA', bodpod: 'BodPod', bia_pro: 'Impédancemètre pro (InBody)', bia: 'Balance connectée', biaRenpho: 'Balance Renpho (moyenne de {n} mesures)', biaRenphoCal: 'Balance Renpho, corrigée par ton DEXA ({o} points ; moyenne de {n} mesures)', navy: 'Mètre ruban : US Navy', rfm: 'Mètre ruban : Relative Fat Mass', navy_photo: 'Photo : US Navy', rfm_photo: 'Photo : Relative Fat Mass', deurenberg: 'Formule IMC (Deurenberg)', visual: 'Ta propre estimation' },
    compare: 'Où tu te situes', vsAdults: 'Plus sec que {p} % des {sex} de {a} à {b} ans', vsSrc: 'DXA NHANES 1999–2004 (Hologic), adultes américains. Compare d’abord avec un DXA ; les estimations au ruban ou en photo sont moins précises. Les adultes européens sont en moyenne plus secs.',
    ffmi: 'Indice de masse non grasse (FFMI)', ffmiText: '{v} (normalisé à 1,80 m)', ffmiRef: 'Les athlètes masculins sans dopage avaient 21,8 en moyenne ; au-delà de ~25, c’est rare sans produits (Kouri 1995).', ffmiRefF: 'Les données de référence pour les femmes sont limitées.',
    whtr: 'Tour de taille ÷ taille', whtrText: '{v} : {band}', whtrBand: { ok: 'sain (sous 0,5)', mid: 'risque accru (0,5–0,6)', high: 'risque élevé (au-delà de 0,6)' },
    bmi: 'IMC', bmiText: '{v} — l’IMC ne distingue pas muscle et gras.', bmiDxa: 'Ton DXA du {d} indiquait un IMC de {b} (« surpoids ») avec {f} % de gras.', almi: 'Indice de masse maigre appendiculaire', almiText: '{v} kg/m² (DXA du {d})',
    tape: 'Mensurations', tapeAdd: 'Ajouter des mesures', neck: 'Cou', waist: 'Taille (au nombril)', hip: 'Hanches (point le plus large)', chest: 'Poitrine', arm: 'Bras', thigh: 'Cuisse', calf: 'Mollet',
    tapeHow: 'Comment mesurer', tapeSteps: ['Cou : juste sous la pomme d’Adam, ruban légèrement incliné vers l’avant.', 'Taille : horizontale au nombril, en fin d’expiration normale. Ne rentre pas le ventre.', 'Hanches : point le plus large des fesses, pieds joints.', 'Ajusté, sans serrer. Mesure deux fois ; si l’écart dépasse 1 cm, recommence.', 'Même ruban, même heure, chaque semaine.'],
    scans: 'Examens', scanAdd: 'Ajouter un examen', scanMethod: 'Méthode', fatPct: 'Masse grasse %', lean: 'Masse maigre (kg)', bmc: 'Contenu minéral osseux (kg)', alm: 'Masse maigre bras + jambes (kg)', vat: 'Graisse viscérale (g)',
    photos: 'Photos de suivi', photoNew: 'Nouvelle série', photoHow: 'Comment les prendre', front: 'Face', side: 'Profil', back: 'Dos', choose: 'Prendre ou choisir une photo',
    photoOnDevice: 'Les photos restent sur cet appareil. Elles ne sont jamais envoyées ni synchronisées.', photoElsewhere: 'Stockée sur un autre appareil',
    protocol: [
      ['Tenue', 'Haut du corps découvert (femmes : brassière). Slip ou cuissard court ajusté, nombril et mi-cuisse visibles. Cheveux au-dessus du cou, ni montre ni bijou.'],
      ['Moment', 'Le matin, à jeun, après les toilettes, avant l’entraînement. Pas de congestion, pas de dîner salé la veille.'],
      ['Poses', 'Face : bras écartés de 30–45°, paumes vers l’avant, pieds écartés à largeur de hanches. Profil : bras croisés sur la poitrine pour dégager la taille. Dos : comme de face. Relâché, fin d’expiration normale. Ne rentre pas le ventre, ne contracte pas.'],
      ['Appareil', 'Portrait, téléphone à niveau, objectif à hauteur du nombril sur une étagère ou un trépied, retardateur 10 s. 2–3 m de distance : de la tête aux pieds sur environ 80 % de l’image. Objectif principal, sans zoom ni mode portrait.'],
      ['Lieu', 'Mur uni, lumière égale de face (fenêtre ou deux lampes). Évite une seule lumière au plafond : elle dessine de faux abdos. Marque le sol pour retrouver le même cadre.'],
      ['Rythme', 'Toutes les 2 à 4 semaines. Mensurations chaque semaine.']
    ],
    measure: 'Mesurer depuis les photos', measuring: 'Détection de ta silhouette…', measureFail: 'La détection automatique n’a pas marché. Place les repères toi-même.', measureManual: 'Fais glisser les repères sur les bords du corps, le haut de la tête et les talons.',
    measureNeed: 'Il faut une photo de face et une de profil, de la tête aux talons.', cropped: 'Ta tête ou tes pieds touchent le bord d’une photo : l’échelle est fausse. Reprends la photo avec tout le corps dans le cadre, ou place les lignes bleues là où sont vraiment ta tête et tes talons.', measured: 'Depuis les photos : taille {w} cm, cou {n} cm{h}', calibrate: 'Calibré sur tes mensurations du {d}.', uncal: 'Pas encore calibré : ajoute des mensurations dans la semaine d’une série de photos.',
    compareWith: 'Comparer avec', reference: 'Référence', history: 'Historique du poids', subqLine: 'Graisse sous-cutanée (Renpho) : {v} %. Les calculs et comparaisons de Forge utilisent la masse grasse totale, celle que mesurent le DEXA et les données de référence.',
    rp: { title: 'Balance connectée (Renpho)', lead: 'Dernière mesure : {d}, {t}.', subqHead: 'Graisse sous-cutanée', same: 'Inchangé', calOn: 'Calibrée sur ton DEXA du {d} : Renpho indiquait {r} % cette semaine-là, le DEXA {x} %. Forge applique {o} points à la masse grasse totale Renpho dans ses calculs.', calOff: 'Pas encore calibrée : pèse-toi sur la Renpho le matin d’un DEXA (dans la semaine, ça marche aussi), ajoute le DEXA dans Examens et importe le fichier Renpho. Forge corrige alors Renpho automatiquement.', subqLead: 'La graisse sous la peau : celle qui se voit dans le miroir.', subqShare: 'Renpho l’estime à {k} % de ta masse grasse totale à chaque mesure : elle évolue donc exactement comme le total.', bfTotal: 'Masse grasse totale (utilisée dans les calculs)', latest: 'Dernière', change: 'vs {d}', bf: 'Masse grasse', fm: 'Masse grasse (kg)', ffm: 'Masse non grasse', sm: 'Muscle squelettique', mus: 'Muscle (masse non grasse moins os)', water: 'Eau corporelle', bone: 'Masse osseuse', prot: 'Protéines', subq: 'Graisse sous-cutanée', vis: 'Graisse viscérale (indice Renpho)', bmr: 'Métabolisme de base (Renpho)', mage: 'Âge métabolique (Renpho)',
      lockstep: 'La masse grasse Renpho suit presque exactement ton poids (r = {r}) : sur chaque kilo pris ou perdu, elle compte {f} kg de gras et {l} kg de masse non grasse. Cette répartition vient de la formule de la balance, pas d’une mesure : fie-toi à la tendance du poids, et au DEXA pour la composition.',
      caveat: 'Estimations par impédance : les variations d’un jour à l’autre sous ~1 kg ou 1 % sont du bruit. Les calculs de Forge utilisent le poids et la masse grasse (comme estimation de balance, ±6 points) ; les autres valeurs sont affichées pour info.' }
  },
  arena: {
    title: 'Arène', lead: 'Tes records comparés aux personnes qui pratiquent la même chose.', peak: 'Pic', balance: 'Équilibre',
    peakText: 'Moyenne de tes deux meilleurs domaines : ton plafond.', balanceText: 'Moyenne géométrique de tous les domaines : elle chute dès qu’un domaine est faible.', gapText: 'L’écart entre les deux montre à quel point tu es spécialisé.',
    needMore: 'Enregistre des records dans au moins trois domaines pour obtenir un score d’Équilibre.', limiter: '{d} freine ton Équilibre. Atteindre le palier suivant le ferait passer de {a} à {b}.', limiterUp: '{d} freine ton Équilibre. Atteindre le palier suivant le ferait passer de {a} à {b}, et te ferait passer {tier} au global.', toNext: '{gap} points pour {tier}',
    overallNote: 'Les niveaux globaux utilisent la même échelle que les records, appliquée au score : ils montrent où se situent tes domaines en moyenne, pas un classement face à tout le monde.',
    dom: { strength: 'Force', explosive: 'Explosivité', speed: 'Vitesse', power: 'Puissance-endurance', aerobic: 'Aérobie', upper: 'Endurance haut du corps', lean: 'Sécheresse' },
    domS: { strength: 'Force', explosive: 'Explosivité', speed: 'Vitesse', power: 'Puiss.-end.', aerobic: 'Aérobie', upper: 'Haut du corps' },
    leanTitle: 'Sécheresse (score secondaire)', leanText: 'Affichée pour info. Le Pic et l’Équilibre ne mesurent que la performance.', repsU: 'rép.', timeLong: 'Temps (mm:ss ou h:mm:ss)', cm: 'Hauteur du saut', jumpMethod: 'Mesurée avec',
    jm: { mat: 'Tapis de saut, plateforme ou appli My Jump', reach: 'Marque au mur (craie ou Vertec)' }, jumpHow: 'Saut avec contre-mouvement et élan des bras, meilleur de 3 à 5 essais. La référence a été mesurée sur plateforme de force.',
    repsMax: 'Répétitions max en une série', repsHow: { pullups: 'Bras tendus jusqu’au menton au-dessus de la barre, sans élan.', pushups: 'Amplitude complète, corps gainé, sans repos au sol.' },
    add: 'Enregistrer un record', event: 'Épreuve', none: 'Pas encore de record', vsPart: 'Top {p} % des pratiquants', vsAll: 'Top {p} % de tous les {sex} (estimation, {lo}–{hi} %)', vsAge: 'Top {p} % des {sex} de ton âge (données mesurées en population)', next: '{gap} pour {tier}', top: 'Palier maximal atteint',
    ev: { bench: 'Développé couché', squat: 'Squat', deadlift: 'Soulevé de terre', ohp: 'Développé militaire', sprint60: 'Sprint 60 m', sprint100: 'Sprint 100 m', sprint200: 'Sprint 200 m', sprint400: 'Sprint 400 m', row100: 'Rameur 100 m', row200: 'Rameur 200 m', row250: 'Rameur 250 m', row500: 'Rameur 500 m', row1min: 'Rameur 1 minute', vo2: 'VO₂max', vjump: 'Détente verticale', pullups: 'Tractions', pushups: 'Pompes', bike1000: 'BikeErg 1 000 m', ski500: 'SkiErg 500 m', run5k: 'Course 5 km', run10k: 'Course 10 km' },
    weightKg: 'Charge', reps: 'Répétitions', rir: 'Répétitions en réserve', bwThen: 'Poids de corps ce jour-là', time: 'Temps (s ou m:ss.d)', meters: 'Mètres', value: 'ml/kg/min',
    timing: 'Chronométrage', t: { electronic: 'Électronique (cellules)', hand: 'Chrono manuel (+0,24 s)', gps: 'GPS de la montre (non classé)' }, wind: 'Vent favorable (m/s)',
    method: 'Mesurée par', vm: { lab: 'Test en labo, tapis', cycle: 'Test en labo, vélo', watch: 'Estimation Apple Watch', cooper: 'Test de Cooper (12 min)' }, cooperM: 'Distance en 12 min (m)',
    note: { reps: 'Plus de 10 répétitions : enregistré comme record de répétitions, sans conversion en 1RM.', gps: 'Les temps GPS ne sont pas assez précis pour être classés.', hand: 'Chrono manuel : +0,24 s ajouté.', wind: 'Vent supérieur à 2 m/s : non homologable.', watch: 'Les estimations de la montre sont en moyenne ~6 ml/kg/min trop basses (petite étude) : fiabilité faible.', cycle: 'Comparé aux normes sur tapis : les tests sur vélo donnent moins.', cooper: 'Estimée depuis le test de Cooper.', est: '1RM estimé (moyenne Epley, Brzycki, Lombardi).', clampedBw: 'Poids de corps hors tableau : ligne la plus proche utilisée.', modelled: 'Modélisé entre les classements 100 m et 500 m.', vdot: 'Classé via la VO₂max que ce temps demande habituellement (VDOT) ; l’économie de course compte, l’écart avec un test en labo est possible.', reach: 'Mesure différente de la plateforme de référence : à comparer avec prudence.' },
    standards: 'Références pour toi', history: 'Historique', improve: 'Comment atteindre le palier suivant', ladder: 'L’échelle', variant: 'Noms des paliers',
    calc: 'Calculateur de 1RM', calcText: '{w} × {r} → environ {v} kg',
    tips: {
      lift: ['Travaille le mouvement 2 à 3 fois par semaine, 3 à 6 séries de 1 à 6 répétitions à RPE 7–9.', 'Augmente la charge dès que toutes les séries sont à RPE 8 ou moins ; décharge toutes les 4 à 8 semaines.', 'Débutant : progrès chaque semaine ; intermédiaire : chaque mois ; avancé : sur un cycle.'],
      sprint: ['Deux séances de vitesse par semaine : 4 à 8 sprints de 20 à 60 m à fond, récupération complète (2–5 min).', 'La force soutient la vitesse : vise un squat à 1,5–2 fois ton poids.', 'Pliométrie à faible volume (bonds, sauts de haies) et gammes techniques (montées de genoux, poussées au mur).'],
      row: ['La technique d’abord : jambes–buste–bras, attaque nette, cadence 34–40 en sprint.', 'Chaque semaine : 8 × 250 m intenses avec 2 min de repos, et 30 min en endurance.', 'Un réglage de 5 à 7 convient à la plupart ; vérifie le facteur de traînée (115–135).'],
      vo2: ['Environ 80 % de l’entraînement facile, 20 % intense.', 'Une séance VO₂max par semaine : 4 à 6 × 3–4 min à 90–95 % de la FC max.', 'Une séance au seuil par semaine ; augmente le volume d’environ 10 % par semaine au maximum.'],
      jump: ['Pliométrie deux fois par semaine : 3 à 5 séries de 3 à 5 sauts maximaux (box jumps, sauts en contrebas), repos complet.', 'Squats lourds et charnières de hanche donnent la force du saut : vise un squat à 1,5–2 fois ton poids.', 'Saute frais, en début de séance. Perdre du gras améliore la détente à lui seul.'],
      reps: ['Travaille le mouvement 2 à 3 fois par semaine, séries arrêtées 1 à 2 répétitions avant l’échec.', 'Au-delà de 10 à 15 répétitions propres, ajoute de la charge (ceinture ou gilet) en séries de 3 à 6.', 'Répartis plusieurs séries faciles dans la journée (« greasing the groove »).'],
      erg: ['La technique d’abord, puis des intervalles : 8 × 30 s fort / 90 s facile.', 'Allure : pars juste sous l’allure cible et sprinte le dernier quart.', 'Une séance longue et régulière par semaine construit la base dont ces efforts dépendent.'],
      lean: ['Perdre 0,5 à 1 % du poids par semaine préserve le mieux le muscle.', 'Protéines : 2,3 à 3,1 g par kg de masse maigre en sèche.', 'Continue à soulever lourd et prévois des pauses toutes les 6 à 12 semaines.']
    }
  },
  tier: {
    hobbit: ['Hobbit', 'Le second petit-déjeuner compte comme échauffement'], gaul: ['Villageois gaulois', 'Courageux, bruyant, attend toujours la potion magique'], legionary: ['Légionnaire romain', 'Discipliné, entraîné, présent chaque jour'],
    viking: ['Viking', 'Rame, pille, soulève des choses lourdes'], shieldmaiden: ['Skjaldmö', 'Rame, pille, soulève des choses lourdes'], spartan: ['Spartiate', 'Forgé dans l’agogé'], amazon: ['Amazone', 'Forgée sur les rives du Thermodon'],
    saiyan: ['Saiyan', 'Revient plus fort après chaque raclée'], viltrumite: ['Viltrumite', 'Presque indestructible'], olympian: ['Dieu de l’Olympe', 'Au-delà des tables des mortels'],
    band: ['5 % les plus bas', '5–20 %', '20–50 %', '50–80 %', '80–95 %', '95–99 %', 'Top 1 %', 'Top 0,1 %, niveau mondial']
  },
  set: {
    profile: 'Profil', language: 'Langue', units: 'Unités', variant: { classic: 'Noms classiques', f: 'Variantes féminines (Skjaldmö, Amazone)' },
    sync: 'Synchronisation', syncLead: 'Tes données se synchronisent sur ton propre compte via le Supabase du hub d’apps. Les photos ne quittent jamais l’appareil. Chacun a son propre identifiant : personne ne voit les données des autres.',
    signIn: 'Se connecter', signUp: 'Créer un compte', signOut: 'Se déconnecter', email: 'E-mail', password: 'Mot de passe (8 caractères ou plus)', syncOff: 'Non connecté', checkInbox: 'Compte créé. Si Supabase demande une confirmation, ouvre l’e-mail, puis connecte-toi ici.', signupsOff: 'Les inscriptions sont désactivées dans Supabase. Ajoute l’utilisateur dans Authentication → Users, puis connecte-toi.',
    rp: 'Balance Renpho', rpLead: 'Importe l’export CSV de l’app Renpho Health, par exemple une fois par semaine. Forge prend alors le poids et la composition corporelle de Renpho, et tout le reste d’Apple Santé.', rpHow: 'Comment exporter',
    rpSteps: ['Dans l’app Renpho Health, ouvre les réglages du profil et utilise l’export des données (CSV). Les noms de menus varient selon les versions : c’est le même export que celui que tu as déjà fait.', 'Enregistre le fichier dans Fichiers (ou envoie-le-toi par e-mail), puis choisis-le ici.', 'Réimporter le fichier complet chaque semaine ne pose aucun problème : les mesures sont remplacées, jamais dupliquées, et une mesure supprimée dans Renpho disparaît aussi ici.'],
    rpChoose: 'Choisir le CSV Renpho', rpStatus: '{n} jours de mesures, {a} – {b} · importé le {d}', rpNone: 'Aucun fichier Renpho importé',
    rpHeight: 'Renpho est réglé sur {r} cm, Forge sur {f} cm. Garde ce réglage Renpho tel quel : le changer décalerait toutes les mesures à partir de ce jour, et la calibration DEXA l’absorbe. Vérifie que la taille dans Forge (Profil) est ta vraie taille.',
    rpSource: 'Poids et composition corporelle viennent de', rpSrc: { auto: 'Automatique (Renpho dès qu’un fichier est importé)', renpho: 'Fichier Renpho', health: 'Apple Santé' }, rpNow: 'Actuellement : {s}.',
    rpFromR: 'De Renpho', rpFromRList: 'Poids, graisse sous-cutanée et masse grasse totale, masse non grasse, muscle et muscle squelettique, os, protéines, eau corporelle, métabolisme de base Renpho, âge métabolique.',
    rpFromH: 'D’Apple Santé', rpFromHList: 'Pas, séances, calories et macros (MyFitnessPal), fréquence cardiaque au repos, VFC, VO₂max. Le poids et la masse grasse d’Apple Santé sont ignorés à partir de ton premier jour Renpho.',
    rpFromM: 'Saisi dans Forge', rpFromMList: 'Complète un jour sans mesure Renpho. Pour les calories et les pas, l’emporte sur Apple Santé.',
    rpClear: 'Supprimer les données Renpho', rpClearConfirm: 'Supprimer toutes les mesures Renpho de Forge ? L’app Renpho les conserve.', rpDone: 'Renpho : {n} jours importés ({r} mesures).', rpDupes: '{d} mesure(s) en double le même jour fusionnée(s) (la plus tôt est gardée).',
    rpErr: { empty: 'Ce fichier est vide.', columns: 'Colonnes non reconnues : exporte le CSV depuis l’app Renpho.', dates: 'Dates non reconnues.', stone: 'Les poids en stones ne sont pas pris en charge : passe Renpho en kg ou lb avant l’export.', norows: 'Aucune mesure dans ce fichier.', other: 'Impossible de lire ce fichier.' },
    guideRenpho: 'Tu utilises le fichier Renpho : Poids et Masse grasse peuvent être retirés du Raccourci, Forge les ignore de toute façon.',
    mfp: 'MyFitnessPal', mfpLead: 'Forge lit tes calories et macros MyFitnessPal via Apple Santé. Pas besoin d’identifiant MyFitnessPal séparé.',
    mfpSteps: ['App Santé → ta photo (en haut à droite) → Apps → MyFitnessPal → autorise l’écriture de Énergie alimentaire, Protéines, Glucides et Lipides totaux. Si MyFitnessPal n’apparaît pas : MyFitnessPal → Plus → Réglages → Partage et confidentialité → Partage HealthKit.', 'Continue à saisir dans MyFitnessPal comme d’habitude.', 'Importe les données dans Forge avec le Raccourci ci-dessous (chaque jour, un geste) ou l’export Santé complet (historique).', 'Les calories apparaissent alors dans Énergie → Journal et alimentent « Apprendre ta vraie maintenance ».'],
    mfpStatus: 'Calories trouvées sur {n} des 28 derniers jours (dernière : {d})', mfpNone: 'Aucune calorie importée pour l’instant',
    health: 'Apple Santé', healthLead: 'Importe pas, poids, masse grasse, calories de MyFitnessPal, séances, fréquence cardiaque au repos et la VO₂max de la montre. Tout reste sur ton téléphone.',
    hQuick: 'Synchro rapide (Raccourci)', hQuickLead: 'Cinq minutes de réglage une fois, puis un geste importe les 35 derniers jours.', hFull: 'Historique complet (export Santé)', hFullLead: 'Sans réglage. App Santé → ta photo (en haut à droite) → Exporter toutes les données de santé → Exporter → Enregistrer dans Fichiers. Puis choisis le fichier ici.',
    hChoose: 'Choisir export.zip', hPaste: 'Coller depuis le Raccourci', hReading: 'Lecture {p} %…', hDone: '{d} jours et {w} séances importés.', hNone: 'Rien de nouveau.', hErr: 'Impossible de lire ce fichier : {e}', hNoExport: 'Ce zip ne contient pas export.xml. Choisis le fichier créé par l’app Santé.',
    hApplySteps: 'Utiliser ta moyenne de pas sur 4 semaines ({v}) ?', hApplyWorkouts: 'Remplacer tes séances par les 4 dernières semaines d’Apple Santé ?', hApplyVo2: 'Enregistrer la VO₂max de la montre ({v}) dans l’Arène ?', hLast: 'Dernier import : {d}',
    guide: 'Créer le Raccourci', guideSteps: [
      'Ouvre Raccourcis, touche +, et nomme le raccourci « Forge sync ».',
      'Ajoute « Rechercher des échantillons Santé ». Type : Nombre de pas. Date de début : dans les 35 derniers jours. Grouper par : Jour. Trier par : Date de début, du plus ancien au plus récent.',
      'Ajoute la même action pour Énergie alimentaire, Protéines, Glucides et Lipides totaux, chacune avec Grouper par : Jour.',
      'Ajoute-la encore pour Poids (Unité : kg) et Pourcentage de graisse corporelle, sans regroupement, et pour Fréquence cardiaque au repos avec Grouper par : Jour.',
      'Ajoute une action « Texte ». Écris FORGE1 sur la première ligne. Puis, pour chaque recherche, ajoute deux lignes : une étiquette, puis la variable. Étiquettes : @steps @kcal @protein @carbs @fat @weight @bf @rhr. Sous chaque étiquette, insère deux fois la variable de la recherche : d’abord touche-la et choisis Date de début (Format de date : ISO 8601), puis à la ligne suivante la même variable avec Valeur. Exemple :\n@steps\n[Échantillons Santé · Date de début]\n[Échantillons Santé · Valeur]',
      'Ajoute « Copier dans le presse-papiers » (entrée : Texte).',
      'Lance-le une fois et autorise l’accès à Santé. Puis ouvre Forge et touche « Coller depuis le Raccourci » dans Aujourd’hui.',
      'Facultatif : Partager → Sur l’écran d’accueil, ou ajoute le widget Raccourcis, pour une synchro en un geste.'
    ],
    guideNote: 'Je n’ai pas pu tester ces étapes sur un iPhone. Si un menu porte un autre nom sur ta version d’iOS, l’export Santé complet fonctionne toujours.',
    data: 'Tes données', export: 'Télécharger une sauvegarde', import: 'Restaurer une sauvegarde', wipe: 'Tout supprimer sur cet appareil', wipeConfirm: 'Supprimer toutes les données Forge de cet appareil ? Les données synchronisées restent sur ton compte jusqu’à ce que tu les y supprimes.', imported: 'Sauvegarde restaurée.',
    safety: 'Sécurité', helpTitle: 'Aide pour les troubles alimentaires', sources: 'Sources et méthode', dataVer: 'Version des données de référence {v}', about: 'À propos',
    disclaimer: 'Forge donne des estimations pour adultes en bonne santé. Ce n’est pas un avis médical. Parle à un médecin avant tout changement important, surtout en cas de maladie.'
  }
};

/* ---------- 2026.11: review additions and corrected strings (merged over the dictionaries above) ---------- */
const EN2 = {
  common: { gotIt: 'Got it' },
  shell: { update: 'A new version of Forge is ready.', reload: 'Reload', saveFail: 'This device refused to save. Free some storage, then download a backup under Settings.' },
  today: {
    installT: 'Put Forge on your Home Screen', install: 'Share button → Add to Home Screen. The Home Screen app keeps its data apart from Safari, so set it up there: sign in under Settings to bring your data across, or restore a backup.',
    calm: 'Calm mode is on: calorie numbers are hidden here. Your trend and habits carry the plan.', trendAlt: 'Trend weight over the last {n} weigh-ins: from {a} to {b} {u}.', trendNote: 'Dots are weigh-ins, the line is your trend: it filters out water and sits on your real weight.', openArena: 'Open the Arena'
  },
  quest: {
    title: 'This week', lead: '{d} days left. Three habits that make every number in Forge more accurate.', lead1: 'Last day of the week.',
    weigh: 'Weigh in on 4 mornings', fuel: 'Log your calories on 6 days', move: 'Reach {n} steps on 5 days', done: 'Done', prog: '{n} of {g}', side: 'Side quest',
    boss: '{ev}: {v} takes you to {to}', retest: 'Re-test your {ev}: the record dates from {d}', tape: 'Take this week’s tape measurements', vitals: 'Do a healthspan check: grip and balance, three minutes', photo: 'Photo check-in: a month since the last'
  },
  review: {
    title: 'Your week', trend: 'Trend weight', plan: 'plan {v}', noPlan: 'no plan set', intake: 'Average intake', target: 'target {v}, {n} days logged', days: '{n} days logged', steps: 'Steps a day', assumed: 'Forge assumes {v}',
    winL: 'Win', adjL: 'Next week', useSteps: 'Use {s} steps',
    win: { onPace: 'Your weight moved {d} against a plan of {e}: right on pace.', logging: 'Calories logged on nearly every day. That is what lets Forge measure your maintenance instead of guessing it.', steps: '{s} steps a day, above the {a} your plan counts on.', weighins: 'Five or more weigh-ins: your trend line is solid.', protein: 'Protein on target.', showedUp: 'You logged. Consistency beats precision.' },
    adj: {
      steady: 'Nothing to change. Keep the same rhythm.', start: 'Log a weigh-in to start the week.',
      weighMore: 'Fewer than three weigh-ins. Aim for four mornings so the trend can tell water from real change.',
      logMore: 'Calories on fewer than five days. The measured maintenance pauses until logging is back on most days.',
      tooFast: 'You lost {d} against a plan of {e}. If that holds for a second week, add 100–150 kcal: losing faster costs muscle.',
      overTarget: 'Intake averaged {i} against a target of {tg}. Tighten up, or raise the target and accept a slower pace: both are fine.',
      underTarget: 'Intake averaged {i}, well under your {tg} target. Eat up to the target: a bigger deficit does not speed up fat loss for long.',
      stepsLow: '{s} steps a day against the {a} Forge assumes. That overstates your maintenance by about {k} kcal.',
      stepsHigh: '{s} steps a day against the {a} Forge assumes. Your maintenance is about {k} kcal higher than shown.',
      patience: 'Weight moved {d} against a plan of {e}. One week proves little, since water alone shifts by a kilo or two. Change nothing unless next week says the same.'
    }
  },
  season: {
    label: 'Season {n}, week {w} of {m}', title: 'Season {n}', lead: 'Forge runs in 12-week seasons. A fresh start every quarter keeps a long project alive: across 16 trials, game-like features worked about three times better while a programme was running than months after it ended (Mazeas 2022).',
    pips: 'One bar per week, filled by the weekly habits you completed.', this: 'This season', prev: 'Season {n}', live: 'week {w} of {m}',
    quests: 'Weekly habits completed', days: 'Days with a log', weigh: 'Weigh-ins', weight: 'Trend weight', records: 'Records logged', recordsV: '{n} in {e} events', best: 'Highest tier reached:'
  },
  fuel: {
    slow: 'slow', appliedToast: 'Plan set', fine: 'Fine-tune: stairs, step length, walking speed',
    stride: 'Step length', strideHint: 'Leave empty to use your height. Your iPhone measures it (Health → Mobility → Walking Step Length), or walk 20 steps, measure the distance and divide by 20.',
    src: { predicted: 'Predicted from your profile', blended: 'Measured from your logs, starting from the formula', blendedShort: 'measured from your logs' },
    stepsDetail: '{steps} steps → {km} km at {c} kcal per kg per km ({v} km/h)',
    walkSpeed: 'Walking speed', walkSpeedHint: 'Leave empty for 4.5 km/h. Your iPhone measures it (Health → Browse → Mobility → Walking Speed) and the Health import fills it in.',
    eaRange: 'kcal per kg of lean mass after training (likely {lo}–{hi}).',
    eaL: { ok: 'Enough to train, recover and keep hormones steady.', amber_m: 'Reduced. Fine for a planned cut of a few weeks. In men problems usually start lower, and symptoms matter more than the number.', amber_f: 'Low. Under 30, a woman’s cycle, bones and recovery are at risk when it lasts: keep the cut short and watch for symptoms.', amber_null: 'Reduced: keep the cut short and watch for symptoms.', red: 'Too low. Forge does not apply plans under 25.' },
    checkin: 'Recovery check-in (30 seconds)', checkinFlag: 'Your check-in of {d} flagged {n} sign(s).',
    flags: { eaAmber: 'Energy availability under 30. Pick a slower rate or plan a maintenance break every 6–12 weeks, and do the recovery check-in every two weeks.' },
    projAlt: 'Projected weight over 16 weeks: from {a} to about {b} {u} (likely {lo}–{hi}).',
    whatif: 'What if…', goal: 'Goal weight', eta: '{g}: around {d} on this plan (between {lo} and {hi}).', etaOpen: 'much later', etaNo: 'This plan does not move toward that weight.',
    wiSteps: 'Walk more or less each day', wiHint: 'Move the slider to see what a change in daily steps is worth.',
    wiMore: '{s} more steps a day ≈ {k} kcal more maintenance: about {w} {u} more fat loss a week at the same intake, or {k} kcal more food at the same pace.',
    wiLess: '{s} fewer steps a day ≈ {k} kcal less maintenance: about {w} {u} less fat loss a week at the same intake.',
    learnLead: 'Formulas miss by ±10 % for a third of people. Your weight trend and your logged calories measure your maintenance directly.',
    lMeasured: 'Measured', lFormula: 'Formula', lRatio: 'Logging ratio', lRatioS: 'measured ÷ formula',
    learnOk: '{a} – {b}: you logged {i} kcal a day on {k} days while your trend moved {slope} a week.',
    ratioOk: 'Your logs and the formula agree within {p} %. A good sign for both.',
    ratioLow: 'Measured is {p} % under the formula. The usual cause is logging, not a slow metabolism: food diaries run 0–20 % under real intake even in careful, lean adults. It does not hurt your plan, because targets are set in the same “logged calories” you will keep logging.',
    ratioHigh: 'Measured is {p} % above the formula: you burn more than predicted, or log generously. Targets follow the measured figure.',
    partial: '{n} day(s) with under half your usual intake were treated as not fully logged and left out.',
    water: { trimmed: 'Your plan changed on {d}. The first 10 days after a change are mostly water and glycogen, so they are left out.', recent: 'Your plan changed on {d}. Early weight change is mostly water, so the range is wider for now.' },
    learnWeight: 'The measured figure carries {pct} % of the estimate, the formula the rest.',
    nSpan: 'Days covered', nWeigh: 'Weigh-ins', nKcal: 'Days with calories', learnHow: 'How it’s measured',
    learnHowText: 'Energy balance over the last 28 days: maintenance = average logged intake − change in trend weight × the energy in a kilo of that change (fat and lean, after Forbes and Hall). The trend comes from a Kalman filter, which does not run behind during a cut the way a moving average does. The result is in your own logging units, so the formula only serves as a starting point and fades as your logs build up.',
    howText: 'Resting metabolism: an ensemble of published equations. Mifflin-St Jeor always; when your body fat is known and you lift 3+ times a week, 75 % comes from lean-mass equations built on athletes (Tinsley 2019, ten Haaf 2014, Cunningham 1980). Daily life: awake hours at your job’s MET level. Steps: walking cost from your height and speed (Ludlow & Weyand 2016, about 0.6 kcal per kg per km above rest), minus the steps of your workouts. Workouts: (MET − 1) × your own resting rate × hours, METs from the 2024 Adult Compendium; runs with a pace use 1 kcal per kg per km. After-burn: 5 % of moderate and hard sessions. Digestion: 10 % of intake. The band combines ±10 % on resting metabolism and ±25 % on activity. Once you log, your weight trend and intake measure maintenance directly (see “Learning your real maintenance”).'
  },
  phys: {
    leanShort: 'lean', measured: 'From photos: waist {w} {u}, neck {n} {u}{h}',
    m: { biaRenpho: 'Renpho scale (median of {n} readings)', biaRenphoCal: 'Renpho scale, corrected by your DEXA ({o} points; median of {n} readings)' },
    rp: { subqLead: 'The fat under the skin: the part that shows in the mirror. A manufacturer estimate; no independent validation exists.',
      caveat: 'Bioimpedance estimates. In a 12-week validation against DEXA, a foot-to-foot scale repeated itself within 2 % yet did not track the real change in body fat. Read its trend as a weight trend, and judge fat loss by tape, photos and DEXA. Forge uses the weight, and the body-fat figure as a rough estimate: ±6 points, ±3.5 for three months after a DEXA calibration, then widening again over a year.' }
  },
  hs: {
    title: 'Healthspan', lead: 'Five markers that say more about the next thirty years than your weight does. Each stands alone: Forge never blends them into a “biological age”.',
    vo2: 'Aerobic fitness', vo2B: { low: 'Low for your age: the group with the highest risk', below: 'Below average for your age', above: 'Above average for your age', high: 'High for your age', elite: 'Elite for your age (top 2.3 %)' }, addArena: 'Log a VO₂max or a 5 km',
    grip: 'Grip strength', gripB: { ok: 'Strong enough (T-score {t})', low: 'On the low side (T-score {t})', weak: 'Weak grip (T-score {t})' }, add: 'Add a check',
    stance: 'One-leg stance', stanceB: { ok: 'Held 10 seconds', low: 'Under 10 seconds: train your balance' }, stanceIn: 'One-leg stance: seconds held, 10 at most',
    whtr: 'Waist ÷ height', whtrB: { ok: 'Under 0.5: healthy', mid: '0.5–0.6: raised risk', high: 'Over 0.6: high risk' }, addTape: 'Add tape measurements',
    rhr: 'Resting heart rate', rhrB: 'bpm, mean of {n} days', rhrNone: 'Comes with the Apple Health import',
    last: 'Grip and balance checked on {d}.', check: 'Healthspan check', why: 'Why these five',
    evidence: [
      'Aerobic fitness: among 122,007 adults followed for 1.1 million person-years, the least fit had five times the mortality hazard of the fittest (5.04). In the same cohort coronary artery disease made a much smaller difference (1.29). Mandsager 2018.',
      'Grip strength peaks around age 30 at a median of 51 kg in men and 31 kg in women (best of all tries, 12 British studies). Forge shows your T-score against that peak; below −2.5 (27 kg for men, 16 kg for women) counts as weak grip. Dodds 2014.',
      'One-leg stance: of 1,702 adults aged 51 to 75, those who could not hold 10 seconds had 1.84 times the mortality hazard over a median of 7 years (17.5 % died, against 4.6 %). It was studied in that age group only; before 50 treat it as a balance check, not a forecast. Araujo 2022.',
      'Waist ÷ height under 0.5 is the simplest screen for the abdominal fat that matters to health.',
      'Resting heart rate is shown as a trend. A drop over months usually means better aerobic fitness; a jump of 5–10 beats over a few days often means illness or short recovery.'
    ],
    gripHow: 'Hand dynamometer, elbow bent at 90°, best of three tries with each hand. Many gyms and physiotherapists have one.',
    stanceHow: 'Barefoot, on one leg, the free foot resting against the back of the standing calf, arms at your sides, eyes ahead. Up to three tries per leg; enter the best.'
  },
  arena: {
    howScores: 'How the scores work', peakShort: 'Your ceiling: the two best domains.', balanceShort: 'Every domain counts; a weak one drags it down.',
    badEntry: 'Enter a result first.',
    tips: {
      ljump: ['Horizontal jumps twice a week: 3–5 sets of 3 broad jumps or bounds, full rest, stick every landing.', 'Hip power drives distance: hip thrusts, Romanian deadlifts and kettlebell swings alongside your squat.', 'Technique is worth 10–20 cm: big arm swing, take off at about 30–40°, reach the heels forward on landing.'],
      wb6: ['Sprint fresh: 4–6 all-out efforts of 6 s with 3 min of rest, once or twice a week.', 'Keep the same air and magnet settings every test, or results do not compare.', 'Heavy leg strength (squat, deadlift) raises the ceiling; the short sprints teach you to use it.'],
      mbthrow: ['Explosive pressing once or twice a week: 4–5 sets of 3–5 medicine-ball chest passes or clap push-ups, full rest.', 'A stronger bench press raises the ceiling; throws with a lighter ball train the speed.', 'Always test with the same ball weight and the same wall.'],
      wattbike: ['Same air and magnet settings every time, written down, so efforts compare.', 'Pacing: settle at target watts after a hard first 10 s, hold, then empty the tank over the last 20 s.', 'Intervals: 6 × 40 s hard / 2 min easy; one longer steady ride a week builds the base.']
    },
    avgW: 'Average power (W)', dur: 'Effort length (m:ss)', wbFor: 'for {t}', wbDid: '{w} W for {t}',
    wbHow: 'Ride all-out for about 1:30–2:00 and enter the average watts and the time from the Wattbike screen. Ignore its distance.',
    wbEq: 'Ranked as {w} W held for {t} ({wkg} W/kg).',
    wbFar: 'Ranked as {w} W held for {t}. Your effort was much shorter or longer than that, so this is a rough estimate. Next time, ride for about {t}.',
    wbStd: 'Each level is the power to hold for the time shown. Wattbike publishes no ranking of its users, so Forge compares your watts with Concept2 BikeErg 1,000 m results, the closest machine with a public ranking. Watts mean the same on both: a Wattbike reads within about 2 % of a calibration rig.',
    ev: { bike1000: 'Wattbike max effort', sljump: 'Standing long jump', wb6: 'Wattbike 6-second peak power', mbthrow: 'Seated medicine-ball throw' },
    dist: 'Distance jumped', distM: 'Distance thrown (m)', peakW: 'Peak power (W)', ball: 'Ball', ballN: '{kg} kg ball', best: 'best',
    tracked: 'Tracked, not ranked', trackNone: 'No result yet · tracked, not ranked', trackUp: '{d} on your previous best',
    trackWhy: 'Nobody has measured this test in the general adult population, so Forge shows your progress and gives no tier. It does not count in the scores.',
    protocol: 'How to test', improveTrack: 'How to improve it',
    vsLow: 'Top {p} % of {sex} your age (thin reference: one Spanish study, counts half)',
    lowStd: 'These levels rest on one study of 410 Spanish adults that reports averages only, so the percentiles are modelled. This event counts half as much as the vertical jump in your Explosive power score.',
    sayers: 'About {w} W peak leg power ({wkg} W/kg) by the Sayers formula, give or take {se} W.',
    how: {
      sljump: 'Toes behind a line, feet shoulder-width. Swing the arms, jump forward off both feet and land on both. Measure from the line to the back of the nearest heel. Two practice jumps, then the best of three. A fall backwards does not count.',
      wb6: 'Warm up 10 minutes with two or three short sprints. Use the Wattbike 6-second peak power test, seated, following the instructions on its screen, with the air and magnet settings the bike suggests for your weight. Enter the peak watts. Best of two, three minutes apart.',
      mbthrow: 'Sit on the floor with your back, shoulders and head against a wall, legs straight. Hold the ball at your chest and push it away as far as you can with both hands, back staying on the wall. Measure from the wall to where the ball first lands. Best of three. Usual balls: 4 kg for men, 3 kg for women.'
    },
    note: { thin: 'Thin reference data: counts half in the domain score.', wattbike: 'counted as {w} over {t}', wattbikeFar: 'effort length far from the ranked duration: rough estimate' }, implausible: 'That would beat the world record. Check the entry: minutes and seconds, kg and lb.',
    radarAlt: 'Domain scores: {s}.', bosses: 'Closest level-ups', bossesLead: 'The next tier or level that takes the smallest improvement.', bossGap: 'now {now}, {p} % to go',
    ffa: '{l} on the French federation’s grid. {pts} combined-events points.', ffaAge: '{l} on the French federation’s grid: worth {o} at open age (age factor × {k}). {pts} combined-events points.', ffaBelow: 'Below D7', retest: 'over a year old',
    glTitle: 'Powerlifting score', glTotal: 'Total {tot} at {bw}: {pts} IPF GL points', glBench: 'Bench alone: {pts} GL points',
    glText: 'The federation’s formula removes the bodyweight advantage, so lifters of any size and either sex compare on one scale (around 100 is world class). From your estimated maxes; age class {c}.',
    ageClass: { subjunior: 'Sub-junior', junior: 'Junior', open: 'Open', m1: 'Masters 1 (40–49)', m2: 'Masters 2 (50–59)', m3: 'Masters 3 (60–69)', m4: 'Masters 4 (70+)' },
    ladderNote: 'The percent bands are among people who do the event. Sprints use the French federation’s levels instead, because no population data exist for sprint times.', ageN: 'age {a}', ffaStd: 'Times shown for your age (WMA factor × {k})',
    peakText: 'Your two best domains, averaged: your ceiling.',
    overallNote: 'Overall levels use the same ladder as single records, applied to the score. Scores are averaged on the bell-curve scale, where going from 95 to 99 counts for more than going from 50 to 54.'
  },
  tier: { ffa: ['Slower than D7', 'D7 to D5 (département)', 'D4 to D1 (département)', 'R6 to R1 (regional)', 'IR4 to IR1 (inter-regional)', 'N4 to N1 (national)', 'IB (international B)', 'IA (international A)'] },
  duel: {
    title: 'Duels', lead: 'Compare with a partner or a friend. Every score is already relative to each person’s own sex and age group, so a duel between any two people is fair.',
    you: 'You', score: 'You {a} – {b}', noCommon: 'No domain in common yet', gl: 'Powerlifting (GL points)', asOf: 'Their scores as of {d}.', fair: 'A domain counts when both of you have a score; within one point is a draw.',
    remove: 'Remove this rival', share: 'Share my duel code', add: 'Add a rival’s code',
    shareLead: 'This code holds your first name and your scores from 0 to 100. No weight, no body fat, no raw results. Send it however you like; Forge sends nothing itself.',
    code: 'Duel code', copy: 'Copy', send: 'Send', copied: 'Code copied', msg: '{n} challenges you in Forge. Paste this under Arena → Duels:', addLead: 'Paste the code your rival sent you.', bad: 'This is not a Forge duel code.', added: '{n} added'
  },
  ck: {
    title: 'Recovery check-in', lead: 'Over the last four weeks, which of these have been true? Signs like these matter more than any calorie figure.',
    q: { tired: 'Tired most days, even after a normal night', ill: 'Ill or injured more often than usual', libido_m: 'Clearly lower sex drive, or fewer morning erections', libido_f: 'Clearly lower sex drive', mood: 'Irritable, low or unusually cold', perf: 'Training performance falling for more than two weeks', cycle: 'Periods lighter, irregular or missing' },
    save: 'Check', none: 'No warning signs. Check again in two weeks while you are in a deficit.', one: 'One sign. Sleep and stress can explain it: check again in a week, and do not lower your calories in the meantime.',
    two: 'Two or more signs during a deficit point to too little energy for your training. Move to maintenance for at least two weeks. If they persist, or your periods have stopped, see a doctor, ideally in sports medicine.', src: 'Signs taken from the'
  },
  lvl: { kicker: 'New tier in {ev}', from: 'Up from {a}.', first: 'Your first ranked record here.', ok: 'Onwards' },
  new: {
    title: 'What changed in this version', lead: 'Explosive power is no longer judged on the vertical jump alone.',
    items: [
      ['Standing long jump (ranked)', 'Horizontal power, which the vertical jump misses. The adult reference is thin (one Spanish study), so it counts half as much as the vertical jump and says so.'],
      ['Wattbike 6-second peak power (tracked)', 'Your raw power in watts and watts per kg. No population data exist, so you get a progress line and no tier.'],
      ['Seated medicine-ball throw (tracked)', 'Upper-body power, which no jump can show. Tracked against yourself for the same reason.'],
      ['Leg power in watts', 'Your vertical jump now also shows the peak power it implies for your bodyweight (Sayers formula).']
    ]
  },
  set: {
    calm: 'Calm mode: hide calorie numbers on Today', calmHint: 'Keeps the trend, protein and habits, and drops the calorie quest. Worth switching on whenever tracking starts to feel heavy.',
    syncYes: 'Synced', syncYesList: 'Profile, daily entries (weight, body composition, calories, steps), Renpho readings, plan, records, tape and scan values, healthspan checks, rival scores.', syncNo: 'Never synced', syncNoList: 'Photos. They stay on this device.',
    syncConsent: 'I agree to store this health data in my own account. European data-protection law treats health data as sensitive, so it needs a clear yes.',
    syncDelete: 'To erase the synced copy as well, use “Delete everything” below and choose “everywhere”.', syncOn: 'Signed in as {e}',
    wipeConfirm: 'Delete all Forge data on this device? If you sign in again later, your synced data comes back.',
    wipeT: 'Delete everything', wipeLead: 'You are signed in, so choose how far this goes.', wipeDevice: 'This device only', wipeDeviceH: 'Signs you out and clears this device. Your account keeps its copy.', wipeAll: 'Everywhere', wipeAllH: 'Clears this device and your account. Your other devices empty at their next sync. Download a backup first if in doubt.',
    hPasteBox: 'Paste the text by hand', hPasteBoxLead: 'Run the Shortcut, then press and hold in the box and choose Paste.', hImport: 'Import', hClipBlocked: 'The clipboard could not be read. Paste the text here instead.', hNotForge: 'That is not the text the Forge Shortcut produces. Run the Shortcut again, then paste.',
    hOffer: 'Update your profile from Apple Health?', hUse: 'Use the ticked values',
    hApplySteps: 'Step average: {v} a day over 4 weeks (now {o})', hApplyWorkouts: 'Training sessions: the {n} activities of the last 4 weeks', hApplyVo2: 'Arena: the Watch’s VO₂max ({v})', hApplySpeed: 'Walking speed: {v} km/h, measured by your iPhone', hApplyStride: 'Step length: {v} cm, measured by your iPhone (height formula: {o} cm)',
    guideSteps: [
      'Open Shortcuts, tap +, and name the shortcut “Forge sync”.',
      'Add “Find Health Samples”. Set Type: Step Count. Start Date: is in the last 35 days. Group by: Day. Fill Missing: off. Sort by: Start Date, Oldest First.',
      'Add the same action for Dietary Energy, Protein, Carbohydrates and Total Fat, each with Group by: Day and Fill Missing off.',
      'Add it again for Weight (Unit: kg) and Body Fat Percentage, with no grouping, and for Resting Heart Rate with Group by: Day.',
      'Add a “Text” action. Type FORGE1 on the first line. Then, for each search, add two lines: a label, then the variable. Labels: @steps @kcal @protein @carbs @fat @weight @bf @rhr. Under each label insert the search’s variable twice: first tap it and choose Start Date (Date Format: ISO 8601), then on the next line the same variable with Value. Example:\n@steps\n[Health Samples · Start Date]\n[Health Samples · Value]',
      'Add “Copy to Clipboard” (input: Text).',
      'Run it once with the iPhone unlocked (Health data is encrypted while it is locked) and allow Health access. Then open Forge from its Home Screen icon and tap “Paste from Shortcut” on Today.',
      'Optional: add the Shortcuts widget, so the sync is one tap.'
    ],
    guideNote: 'I could not test these steps on an iPhone. If the paste button reports a problem, use “Paste the text by hand”; if a menu is named differently on your iOS version, the full Health export always works.'
  }
};
const FR2 = {
  common: { gotIt: 'Compris' },
  shell: { update: 'Une nouvelle version de Forge est prête.', reload: 'Recharger', saveFail: 'Cet appareil a refusé d’enregistrer. Libère de l’espace, puis télécharge une sauvegarde dans Réglages.' },
  today: {
    installT: 'Mets Forge sur ton écran d’accueil', install: 'Bouton Partager → Sur l’écran d’accueil. L’app de l’écran d’accueil garde ses données à part de Safari : configure-la là, en te connectant dans Réglages pour récupérer tes données, ou en restaurant une sauvegarde.',
    calm: 'Mode serein activé : les calories sont masquées ici. Ta tendance et tes habitudes portent le plan.', trendAlt: 'Poids tendance sur les {n} dernières pesées : de {a} à {b} {u}.', trendNote: 'Les points sont tes pesées, la ligne ta tendance : elle filtre l’eau et colle à ton poids réel.', openArena: 'Ouvrir l’Arène'
  },
  quest: {
    title: 'Cette semaine', lead: 'Encore {d} jours. Trois habitudes qui rendent chaque chiffre de Forge plus juste.', lead1: 'Dernier jour de la semaine.',
    weigh: 'Te peser 4 matins', fuel: 'Saisir tes calories 6 jours', move: 'Atteindre {n} pas 5 jours', done: 'Fait', prog: '{n} sur {g}', side: 'Quête annexe',
    boss: '{ev} : {v} te fait passer {to}', retest: 'Refais ton test {ev} : le record date de {d}', tape: 'Prends tes mesures au mètre ruban de la semaine', vitals: 'Fais un bilan longévité : poigne et équilibre, trois minutes', photo: 'Bilan photo : un mois depuis le dernier'
  },
  review: {
    title: 'Ta semaine', trend: 'Poids tendance', plan: 'plan {v}', noPlan: 'pas de plan', intake: 'Apport moyen', target: 'objectif {v}, {n} jours saisis', days: '{n} jours saisis', steps: 'Pas par jour', assumed: 'Forge suppose {v}',
    winL: 'Réussite', adjL: 'La semaine prochaine', useSteps: 'Utiliser {s} pas',
    win: { onPace: 'Ton poids a bougé de {d} pour un plan de {e} : pile dans le rythme.', logging: 'Calories saisies presque tous les jours. C’est ce qui permet à Forge de mesurer ta maintenance au lieu de la deviner.', steps: '{s} pas par jour, au-dessus des {a} sur lesquels ton plan compte.', weighins: 'Cinq pesées ou plus : ta courbe de tendance est solide.', protein: 'Protéines dans l’objectif.', showedUp: 'Tu as saisi. La régularité bat la précision.' },
    adj: {
      steady: 'Rien à changer. Garde le même rythme.', start: 'Enregistre une pesée pour lancer la semaine.',
      weighMore: 'Moins de trois pesées. Vise quatre matins pour que la tendance distingue l’eau du vrai changement.',
      logMore: 'Calories sur moins de cinq jours. La maintenance mesurée se met en pause jusqu’à ce que tu saisisses la plupart des jours.',
      tooFast: 'Tu as perdu {d} pour un plan de {e}. Si ça se confirme une deuxième semaine, ajoute 100 à 150 kcal : perdre plus vite coûte du muscle.',
      overTarget: 'Apport moyen de {i} pour un objectif de {tg}. Resserre, ou relève l’objectif et accepte un rythme plus lent : les deux se défendent.',
      underTarget: 'Apport moyen de {i}, nettement sous ton objectif de {tg}. Mange jusqu’à l’objectif : un déficit plus gros n’accélère pas longtemps la perte de gras.',
      stepsLow: '{s} pas par jour contre les {a} que Forge suppose. Ta maintenance est surestimée d’environ {k} kcal.',
      stepsHigh: '{s} pas par jour contre les {a} que Forge suppose. Ta maintenance est environ {k} kcal plus haute qu’affiché.',
      patience: 'Ton poids a bougé de {d} pour un plan de {e}. Une semaine prouve peu, l’eau seule fait varier d’un kilo ou deux. Ne change rien tant que la semaine prochaine ne dit pas la même chose.'
    }
  },
  season: {
    label: 'Saison {n}, semaine {w} sur {m}', title: 'Saison {n}', lead: 'Forge avance par saisons de 12 semaines. Un nouveau départ chaque trimestre garde un long projet vivant : sur 16 essais, les mécaniques de jeu ont agi environ trois fois plus pendant un programme que des mois après sa fin (Mazeas 2022).',
    pips: 'Une barre par semaine, remplie par les habitudes tenues.', this: 'Cette saison', prev: 'Saison {n}', live: 'semaine {w} sur {m}',
    quests: 'Habitudes hebdo tenues', days: 'Jours avec une saisie', weigh: 'Pesées', weight: 'Poids tendance', records: 'Records enregistrés', recordsV: '{n} sur {e} épreuves', best: 'Plus haut palier atteint :'
  },
  fuel: {
    slow: 'lente', appliedToast: 'Plan appliqué', fine: 'Affiner : escaliers, longueur de pas, vitesse de marche',
    stride: 'Longueur de pas', strideHint: 'Laisse vide pour utiliser ta taille. Ton iPhone la mesure (Santé → Mobilité → Longueur de pas), ou fais 20 pas, mesure la distance et divise par 20.',
    src: { predicted: 'Estimé d’après ton profil', blended: 'Mesuré d’après tes saisies, en partant de la formule', blendedShort: 'mesuré d’après tes saisies' },
    stepsDetail: '{steps} pas → {km} km à {c} kcal par kg et par km ({v} km/h)',
    walkSpeed: 'Vitesse de marche', walkSpeedHint: 'Laisse vide pour 4,5 km/h. Ton iPhone la mesure (Santé → Parcourir → Mobilité → Vitesse de marche) et l’import Santé la remplit.',
    eaRange: 'kcal par kg de masse maigre après l’entraînement (probablement {lo}–{hi}).',
    eaL: { ok: 'Assez pour t’entraîner, récupérer et garder tes hormones stables.', amber_m: 'Réduite. Acceptable pour une sèche planifiée de quelques semaines. Chez l’homme les problèmes commencent en général plus bas, et les symptômes comptent plus que le chiffre.', amber_f: 'Basse. Sous 30, le cycle, les os et la récupération d’une femme sont exposés si ça dure : garde la sèche courte et surveille les symptômes.', amber_null: 'Réduite : garde la sèche courte et surveille les symptômes.', red: 'Trop basse. Forge n’applique pas de plan sous 25.' },
    checkin: 'Bilan récupération (30 secondes)', checkinFlag: 'Ton bilan du {d} a relevé {n} signe(s).',
    flags: { eaAmber: 'Disponibilité énergétique sous 30. Choisis un rythme plus lent ou prévois une pause à la maintenance toutes les 6 à 12 semaines, et fais le bilan récupération toutes les deux semaines.' },
    projAlt: 'Poids projeté sur 16 semaines : de {a} à environ {b} {u} (probablement {lo}–{hi}).',
    whatif: 'Et si…', goal: 'Poids visé', eta: '{g} : vers le {d} avec ce plan (entre le {lo} et le {hi}).', etaOpen: 'bien plus tard', etaNo: 'Ce plan ne va pas vers ce poids.',
    wiSteps: 'Marcher plus ou moins chaque jour', wiHint: 'Bouge le curseur pour voir ce que vaut un changement de pas quotidiens.',
    wiMore: '{s} pas de plus par jour ≈ {k} kcal de maintenance en plus : environ {w} {u} de gras perdu en plus par semaine à apport égal, ou {k} kcal de nourriture en plus au même rythme.',
    wiLess: '{s} pas de moins par jour ≈ {k} kcal de maintenance en moins : environ {w} {u} de gras perdu en moins par semaine à apport égal.',
    learnLead: 'Les formules se trompent de ±10 % pour un tiers des gens. Ta tendance de poids et tes calories saisies mesurent ta maintenance directement.',
    lMeasured: 'Mesuré', lFormula: 'Formule', lRatio: 'Ratio de saisie', lRatioS: 'mesuré ÷ formule',
    learnOk: '{a} – {b} : tu as saisi {i} kcal par jour sur {k} jours pendant que ta tendance bougeait de {slope} par semaine.',
    ratioOk: 'Tes saisies et la formule s’accordent à {p} % près. Bon signe pour les deux.',
    ratioLow: 'Le mesuré est {p} % sous la formule. La cause habituelle est la saisie, pas un métabolisme lent : les journaux alimentaires sont 0 à 20 % sous l’apport réel, même chez des adultes minces et soigneux. Ça ne fausse pas ton plan, car les objectifs sont fixés dans les mêmes « calories saisies » que tu continueras à saisir.',
    ratioHigh: 'Le mesuré est {p} % au-dessus de la formule : tu dépenses plus que prévu, ou tu saisis large. Les objectifs suivent le chiffre mesuré.',
    partial: '{n} jour(s) à moins de la moitié de ton apport habituel ont été considérés comme incomplets et écartés.',
    water: { trimmed: 'Ton plan a changé le {d}. Les 10 premiers jours après un changement sont surtout de l’eau et du glycogène : ils sont écartés.', recent: 'Ton plan a changé le {d}. Les premières variations sont surtout de l’eau : la fourchette est plus large pour l’instant.' },
    learnWeight: 'Le chiffre mesuré porte {pct} % de l’estimation, la formule le reste.',
    nSpan: 'Jours couverts', nWeigh: 'Pesées', nKcal: 'Jours avec calories', learnHow: 'Comment c’est mesuré',
    learnHowText: 'Bilan d’énergie sur les 28 derniers jours : maintenance = apport moyen saisi − variation du poids tendance × l’énergie d’un kilo de cette variation (gras et maigre, d’après Forbes et Hall). La tendance vient d’un filtre de Kalman, qui ne prend pas de retard pendant une sèche comme le fait une moyenne mobile. Le résultat est dans tes propres unités de saisie : la formule ne sert que de point de départ et s’efface à mesure que tes saisies s’accumulent.',
    howText: 'Métabolisme de repos : un ensemble d’équations publiées. Mifflin-St Jeor toujours ; quand ta masse grasse est connue et que tu fais de la musculation 3 fois par semaine ou plus, 75 % vient d’équations de masse maigre construites sur des sportifs (Tinsley 2019, ten Haaf 2014, Cunningham 1980). Vie quotidienne : heures d’éveil au niveau MET de ton travail. Pas : coût de la marche selon ta taille et ta vitesse (Ludlow et Weyand 2016, environ 0,6 kcal par kg et par km au-dessus du repos), moins les pas de tes séances. Séances : (MET − 1) × ton propre métabolisme de repos × heures, MET du Compendium 2024 ; les courses avec allure utilisent 1 kcal par kg et par km. Post-combustion : 5 % des séances modérées et intenses. Digestion : 10 % des apports. La fourchette combine ±10 % sur le métabolisme de repos et ±25 % sur l’activité. Dès que tu saisis, ta tendance de poids et tes apports mesurent la maintenance directement (voir « Apprendre ta vraie maintenance »).'
  },
  phys: {
    leanShort: 'maigre', measured: 'D’après les photos : taille {w} {u}, cou {n} {u}{h}',
    m: { biaRenpho: 'Balance Renpho (médiane de {n} mesures)', biaRenphoCal: 'Balance Renpho, corrigée par ton DEXA ({o} points ; médiane de {n} mesures)' },
    rp: { subqLead: 'La graisse sous la peau : celle qui se voit dans le miroir. Une estimation du fabricant ; aucune validation indépendante n’existe.',
      caveat: 'Estimations par impédance. Dans une validation de 12 semaines face au DEXA, une balance pieds-pieds se répétait à 2 % près sans suivre pour autant la vraie variation de masse grasse. Lis sa tendance comme une tendance de poids, et juge la perte de gras au mètre ruban, aux photos et au DEXA. Forge utilise le poids, et la masse grasse comme estimation grossière : ±6 points, ±3,5 pendant trois mois après un calage sur DEXA, puis de nouveau plus large sur un an.' }
  },
  hs: {
    title: 'Longévité', lead: 'Cinq repères qui en disent plus sur tes trente prochaines années que ton poids. Chacun se lit seul : Forge ne les fond jamais en un « âge biologique ».',
    vo2: 'Forme aérobie', vo2B: { low: 'Basse pour ton âge : le groupe le plus à risque', below: 'Sous la moyenne de ton âge', above: 'Au-dessus de la moyenne de ton âge', high: 'Élevée pour ton âge', elite: 'Élite pour ton âge (top 2,3 %)' }, addArena: 'Enregistre une VO₂max ou un 5 km',
    grip: 'Force de poigne', gripB: { ok: 'Assez forte (T-score {t})', low: 'Plutôt basse (T-score {t})', weak: 'Poigne faible (T-score {t})' }, add: 'Ajouter un bilan',
    stance: 'Équilibre sur un pied', stanceB: { ok: '10 secondes tenues', low: 'Moins de 10 secondes : travaille ton équilibre' }, stanceIn: 'Équilibre sur un pied : secondes tenues, 10 au plus',
    whtr: 'Tour de taille ÷ taille', whtrB: { ok: 'Sous 0,5 : sain', mid: '0,5–0,6 : risque accru', high: 'Au-dessus de 0,6 : risque élevé' }, addTape: 'Ajoute tes mesures au mètre ruban',
    rhr: 'Fréquence cardiaque au repos', rhrB: 'bpm, moyenne de {n} jours', rhrNone: 'Arrive avec l’import Apple Santé',
    last: 'Poigne et équilibre mesurés le {d}.', check: 'Bilan longévité', why: 'Pourquoi ces cinq-là',
    evidence: [
      'Forme aérobie : chez 122 007 adultes suivis pendant 1,1 million d’années-personnes, les moins en forme avaient un risque de décès cinq fois plus élevé que les plus en forme (5,04). Dans la même cohorte, la maladie coronarienne pesait bien moins (1,29). Mandsager 2018.',
      'La force de poigne culmine vers 30 ans, à une médiane de 51 kg chez l’homme et 31 kg chez la femme (meilleur de tous les essais, 12 études britanniques). Forge affiche ton T-score par rapport à ce pic ; sous −2,5 (27 kg pour un homme, 16 kg pour une femme), on parle de poigne faible. Dodds 2014.',
      'Équilibre sur un pied : sur 1 702 adultes de 51 à 75 ans, ceux qui ne tenaient pas 10 secondes avaient un risque de décès 1,84 fois plus élevé sur un suivi médian de 7 ans (17,5 % de décès contre 4,6 %). Étudié dans cette tranche d’âge seulement ; avant 50 ans, c’est un test d’équilibre, pas une prévision. Araujo 2022.',
      'Un tour de taille ÷ taille sous 0,5 est le repère le plus simple pour la graisse abdominale qui compte pour la santé.',
      'La fréquence cardiaque au repos se lit en tendance. Une baisse sur des mois signale en général une meilleure forme aérobie ; un saut de 5 à 10 battements sur quelques jours, souvent une maladie ou une récupération trop courte.'
    ],
    gripHow: 'Dynamomètre à main, coude plié à 90°, meilleur de trois essais par main. Beaucoup de salles et de kinés en ont un.',
    stanceHow: 'Pieds nus, sur une jambe, le pied libre posé contre l’arrière du mollet d’appui, bras le long du corps, regard droit devant. Jusqu’à trois essais par jambe ; saisis le meilleur.'
  },
  arena: {
    howScores: 'Comment marchent les scores', peakShort: 'Ton plafond : tes deux meilleurs domaines.', balanceShort: 'Chaque domaine compte ; un point faible le tire vers le bas.',
    badEntry: 'Saisis d’abord un résultat.',
    tips: {
      ljump: ['Sauts horizontaux deux fois par semaine : 3 à 5 séries de 3 sauts en longueur ou foulées bondissantes, repos complet, réception stable à chaque fois.', 'La puissance des hanches fait la distance : hip thrusts, soulevés de terre roumains et swings de kettlebell en plus du squat.', 'La technique vaut 10 à 20 cm : grand balancier des bras, décollage à environ 30–40°, talons projetés vers l’avant à la réception.'],
      wb6: ['Sprinte frais : 4 à 6 efforts maximaux de 6 s avec 3 min de repos, une ou deux fois par semaine.', 'Garde les mêmes réglages d’air et d’aimant à chaque test, sinon les résultats ne se comparent pas.', 'La force des jambes (squat, soulevé de terre) relève le plafond ; les sprints courts apprennent à s’en servir.'],
      mbthrow: ['Poussées explosives une ou deux fois par semaine : 4 à 5 séries de 3 à 5 passes de médecine-ball ou pompes claquées, repos complet.', 'Un développé couché plus fort relève le plafond ; les lancers avec un ballon plus léger entraînent la vitesse.', 'Teste toujours avec le même ballon et le même mur.'],
      wattbike: ['Mêmes réglages air et aimant à chaque fois, notés, pour comparer les efforts.', 'Allure : cale-toi sur tes watts cibles après 10 s fortes, tiens, puis vide-toi sur les 20 dernières secondes.', 'Intervalles : 6 × 40 s fort / 2 min facile ; une sortie longue et régulière par semaine construit la base.']
    },
    avgW: 'Puissance moyenne (W)', dur: 'Durée de l’effort (m:ss)', wbFor: 'pendant {t}', wbDid: '{w} W pendant {t}',
    wbHow: 'Roule à fond environ 1:30–2:00 et saisis les watts moyens et la durée affichés par le Wattbike. Ignore sa distance.',
    wbEq: 'Classé comme {w} W tenus {t} ({wkg} W/kg).',
    wbFar: 'Classé comme {w} W tenus {t}. Ton effort était bien plus court ou plus long que ça, donc c’est une estimation grossière. La prochaine fois, roule environ {t}.',
    wbStd: 'Chaque niveau est la puissance à tenir pendant la durée indiquée. Wattbike ne publie aucun classement de ses utilisateurs : Forge compare tes watts aux résultats Concept2 BikeErg sur 1 000 m, la machine la plus proche avec un classement public. Les watts ont le même sens sur les deux : un Wattbike mesure à environ 2 % près d’un banc d’étalonnage.',
    ev: { bike1000: 'Wattbike effort max', sljump: 'Saut en longueur sans élan', wb6: 'Wattbike pic de puissance 6 s', mbthrow: 'Lancer de médecine-ball assis' },
    dist: 'Distance sautée', distM: 'Distance lancée (m)', peakW: 'Puissance maximale (W)', ball: 'Ballon', ballN: 'ballon de {kg} kg', best: 'record',
    tracked: 'Suivi, non classé', trackNone: 'Aucun résultat · suivi, non classé', trackUp: '{d} sur ton record précédent',
    trackWhy: 'Personne n’a mesuré ce test dans la population adulte générale : Forge montre ta progression, sans palier. Il ne compte pas dans les scores.',
    protocol: 'Comment tester', improveTrack: 'Comment progresser',
    vsLow: 'Top {p} % des {sex} de ton âge (référence mince : une étude espagnole, compte pour moitié)',
    lowStd: 'Ces niveaux reposent sur une seule étude de 410 adultes espagnols qui ne donne que des moyennes : les centiles sont modélisés. Cette épreuve compte moitié moins que la détente verticale dans ton score d’Explosivité.',
    sayers: 'Environ {w} W de puissance maximale des jambes ({wkg} W/kg) selon la formule de Sayers, à {se} W près.',
    how: {
      sljump: 'Orteils derrière une ligne, pieds à largeur d’épaules. Balance les bras, saute vers l’avant à deux pieds et réceptionne-toi à deux pieds. Mesure de la ligne à l’arrière du talon le plus proche. Deux sauts d’essai, puis le meilleur de trois. Une chute en arrière ne compte pas.',
      wb6: 'Échauffe-toi 10 minutes avec deux ou trois sprints courts. Utilise le test de pic de puissance 6 secondes du Wattbike, assis, en suivant les consignes à l’écran, avec les réglages d’air et d’aimant que le vélo propose pour ton poids. Saisis les watts maximaux. Meilleur de deux essais, à trois minutes d’intervalle.',
      mbthrow: 'Assieds-toi au sol, dos, épaules et tête contre un mur, jambes tendues. Tiens le ballon contre la poitrine et pousse-le le plus loin possible à deux mains, le dos restant au mur. Mesure du mur au premier point de chute. Meilleur de trois. Ballons usuels : 4 kg pour les hommes, 3 kg pour les femmes.'
    },
    note: { thin: 'Référence mince : compte pour moitié dans le score du domaine.', wattbike: 'compté comme {w} sur {t}', wattbikeFar: 'durée loin de celle du classement : estimation grossière' }, implausible: 'Ça battrait le record du monde. Vérifie la saisie : minutes et secondes, kg et lb.',
    radarAlt: 'Scores par domaine : {s}.', bosses: 'Paliers les plus proches', bossesLead: 'Le prochain palier ou niveau qui demande le plus petit progrès.', bossGap: 'aujourd’hui {now}, encore {p} %',
    ffa: '{l} sur la grille de la fédération française. {pts} points d’épreuves combinées.', ffaAge: '{l} sur la grille de la fédération française : vaut {o} toutes catégories (coefficient d’âge × {k}). {pts} points d’épreuves combinées.', ffaBelow: 'Sous D7', retest: 'plus d’un an',
    glTitle: 'Score de force athlétique', glTotal: 'Total {tot} à {bw} : {pts} points IPF GL', glBench: 'Développé couché seul : {pts} points GL',
    glText: 'La formule de la fédération efface l’avantage du poids de corps : tous les gabarits et les deux sexes se comparent sur une seule échelle (autour de 100, c’est le niveau mondial). D’après tes max estimés ; catégorie d’âge {c}.',
    ageClass: { subjunior: 'Subjunior', junior: 'Junior', open: 'Open', m1: 'Master 1 (40–49)', m2: 'Master 2 (50–59)', m3: 'Master 3 (60–69)', m4: 'Master 4 (70+)' },
    ladderNote: 'Les tranches en pourcentage valent parmi les pratiquants de l’épreuve. Les sprints utilisent à la place les niveaux de la fédération française, faute de données de population sur les temps de sprint.', ageN: '{a} ans', ffaStd: 'Temps affichés pour ton âge (coefficient WMA × {k})',
    peakText: 'Tes deux meilleurs domaines, en moyenne : ton plafond.',
    overallNote: 'Les niveaux globaux utilisent la même échelle que les records, appliquée au score. Les scores sont moyennés sur l’échelle de la courbe en cloche, où passer de 95 à 99 pèse plus que passer de 50 à 54.'
  },
  tier: { ffa: ['Plus lent que D7', 'D7 à D5 (départemental)', 'D4 à D1 (départemental)', 'R6 à R1 (régional)', 'IR4 à IR1 (interrégional)', 'N4 à N1 (national)', 'IB (international B)', 'IA (international A)'] },
  duel: {
    title: 'Duels', lead: 'Compare-toi à ta moitié ou à un ami. Chaque score est déjà relatif au sexe et à la tranche d’âge de chacun : un duel entre deux personnes, quelles qu’elles soient, est équitable.',
    you: 'Toi', score: 'Toi {a} – {b}', noCommon: 'Pas encore de domaine en commun', gl: 'Force athlétique (points GL)', asOf: 'Ses scores au {d}.', fair: 'Un domaine compte quand vous avez tous les deux un score ; à moins d’un point d’écart, égalité.',
    remove: 'Retirer ce rival', share: 'Partager mon code de duel', add: 'Ajouter le code d’un rival',
    shareLead: 'Ce code contient ton prénom et tes scores de 0 à 100. Ni poids, ni masse grasse, ni résultats bruts. Envoie-le comme tu veux ; Forge n’envoie rien de lui-même.',
    code: 'Code de duel', copy: 'Copier', send: 'Envoyer', copied: 'Code copié', msg: '{n} te défie dans Forge. Colle ceci dans Arène → Duels :', addLead: 'Colle le code que ton rival t’a envoyé.', bad: 'Ce n’est pas un code de duel Forge.', added: '{n} ajouté'
  },
  ck: {
    title: 'Bilan récupération', lead: 'Sur les quatre dernières semaines, lesquels de ces points sont vrais ? Ces signes comptent plus que n’importe quel chiffre de calories.',
    q: { tired: 'Fatigué la plupart des jours, même après une nuit normale', ill: 'Malade ou blessé plus souvent que d’habitude', libido_m: 'Libido nettement en baisse, ou moins d’érections matinales', libido_f: 'Libido nettement en baisse', mood: 'Irritable, moral bas ou froid inhabituel', perf: 'Performances en baisse depuis plus de deux semaines', cycle: 'Règles plus légères, irrégulières ou absentes' },
    save: 'Vérifier', none: 'Aucun signe d’alerte. Refais le point dans deux semaines tant que tu es en déficit.', one: 'Un signe. Le sommeil et le stress peuvent l’expliquer : refais le point dans une semaine, et ne baisse pas tes calories d’ici là.',
    two: 'Deux signes ou plus pendant un déficit indiquent trop peu d’énergie pour ton entraînement. Passe à la maintenance au moins deux semaines. S’ils persistent, ou si tes règles se sont arrêtées, consulte un médecin, idéalement du sport.', src: 'Signes tirés du'
  },
  lvl: { kicker: 'Nouveau palier en {ev}', from: 'Tu viens de {a}.', first: 'Ton premier record classé ici.', ok: 'En avant' },
  new: {
    title: 'Ce qui a changé dans cette version', lead: 'L’explosivité n’est plus jugée sur la seule détente verticale.',
    items: [
      ['Saut en longueur sans élan (classé)', 'La puissance horizontale, que la détente verticale ne voit pas. La référence adulte est mince (une étude espagnole) : l’épreuve compte moitié moins que la détente verticale, et c’est indiqué.'],
      ['Wattbike pic de puissance 6 s (suivi)', 'Ta puissance brute en watts et en watts par kg. Aucune donnée de population n’existe : tu as une courbe de progression, pas de palier.'],
      ['Lancer de médecine-ball assis (suivi)', 'La puissance du haut du corps, qu’aucun saut ne montre. Suivi face à toi-même pour la même raison.'],
      ['Puissance des jambes en watts', 'Ta détente verticale affiche aussi la puissance maximale qu’elle implique pour ton poids (formule de Sayers).']
    ]
  },
  set: {
    calm: 'Mode serein : masquer les calories dans Aujourd’hui', calmHint: 'Garde la tendance, les protéines et les habitudes, et retire la quête calories. À activer dès que le suivi devient pesant.',
    syncYes: 'Synchronisé', syncYesList: 'Profil, saisies quotidiennes (poids, composition corporelle, calories, pas), mesures Renpho, plan, records, mesures au mètre ruban et scans, bilans longévité, scores des rivaux.', syncNo: 'Jamais synchronisé', syncNoList: 'Les photos. Elles restent sur cet appareil.',
    syncConsent: 'J’accepte de stocker ces données de santé sur mon propre compte. Le droit européen les considère comme sensibles : il faut donc un oui clair.',
    syncDelete: 'Pour effacer aussi la copie synchronisée, utilise « Tout supprimer » ci-dessous et choisis « partout ».', syncOn: 'Connecté : {e}',
    wipeConfirm: 'Supprimer toutes les données Forge de cet appareil ? Si tu te reconnectes plus tard, tes données synchronisées reviennent.',
    wipeT: 'Tout supprimer', wipeLead: 'Tu es connecté : choisis jusqu’où ça va.', wipeDevice: 'Cet appareil seulement', wipeDeviceH: 'Te déconnecte et vide cet appareil. Ton compte garde sa copie.', wipeAll: 'Partout', wipeAllH: 'Vide cet appareil et ton compte. Tes autres appareils se vident à leur prochaine synchro. Dans le doute, télécharge d’abord une sauvegarde.',
    hPasteBox: 'Coller le texte à la main', hPasteBoxLead: 'Lance le Raccourci, puis fais un appui long dans la zone et choisis Coller.', hImport: 'Importer', hClipBlocked: 'Le presse-papiers n’a pas pu être lu. Colle le texte ici.', hNotForge: 'Ce n’est pas le texte produit par le Raccourci Forge. Relance le Raccourci, puis colle.',
    hOffer: 'Mettre ton profil à jour d’après Apple Santé ?', hUse: 'Utiliser les valeurs cochées',
    hApplySteps: 'Moyenne de pas : {v} par jour sur 4 semaines (actuellement {o})', hApplyWorkouts: 'Séances : les {n} activités des 4 dernières semaines', hApplyVo2: 'Arène : la VO₂max de la montre ({v})', hApplySpeed: 'Vitesse de marche : {v} km/h, mesurée par ton iPhone', hApplyStride: 'Longueur de pas : {v} cm, mesurée par ton iPhone (formule selon la taille : {o} cm)',
    guideSteps: [
      'Ouvre Raccourcis, touche +, et nomme le raccourci « Forge sync ».',
      'Ajoute « Rechercher des échantillons Santé ». Type : Nombre de pas. Date de début : dans les 35 derniers jours. Grouper par : Jour. Remplir les valeurs manquantes : désactivé. Trier par : Date de début, du plus ancien au plus récent.',
      'Ajoute la même action pour Énergie alimentaire, Protéines, Glucides et Lipides totaux, chacune avec Grouper par : Jour et sans remplissage des valeurs manquantes.',
      'Ajoute-la encore pour Poids (Unité : kg) et Pourcentage de graisse corporelle, sans regroupement, et pour Fréquence cardiaque au repos avec Grouper par : Jour.',
      'Ajoute une action « Texte ». Écris FORGE1 sur la première ligne. Puis, pour chaque recherche, ajoute deux lignes : une étiquette, puis la variable. Étiquettes : @steps @kcal @protein @carbs @fat @weight @bf @rhr. Sous chaque étiquette, insère deux fois la variable de la recherche : d’abord touche-la et choisis Date de début (Format de date : ISO 8601), puis à la ligne suivante la même variable avec Valeur. Exemple :\n@steps\n[Échantillons Santé · Date de début]\n[Échantillons Santé · Valeur]',
      'Ajoute « Copier dans le presse-papiers » (entrée : Texte).',
      'Lance-le une fois, iPhone déverrouillé (les données Santé sont chiffrées quand il est verrouillé), et autorise l’accès à Santé. Puis ouvre Forge depuis son icône de l’écran d’accueil et touche « Coller depuis le Raccourci » dans Aujourd’hui.',
      'Facultatif : ajoute le widget Raccourcis, pour une synchro en un geste.'
    ],
    guideNote: 'Je n’ai pas pu tester ces étapes sur un iPhone. Si le bouton Coller signale un problème, utilise « Coller le texte à la main » ; si un menu porte un autre nom sur ta version d’iOS, l’export Santé complet fonctionne toujours.'
  }
};
const deep = (a, b) => { for (const [k, v] of Object.entries(b)) { if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deep(a[k], v); else a[k] = v; } return a; };
deep(EN, EN2); deep(FR, FR2);

const DICT = { en: EN, fr: FR };
let lang = 'en';
export const setLang = l => { lang = DICT[l] ? l : 'en'; document.documentElement.lang = lang; };
export const getLang = () => lang;
export function t(key, vars) {
  let v = key.split('.').reduce((o, k) => o?.[k], DICT[lang]);
  if (v == null) v = key.split('.').reduce((o, k) => o?.[k], EN);
  if (v == null) return key;
  if (typeof v === 'string' && vars) v = v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return v;
}
export const nf = (x, d = 0) => x == null || isNaN(x) ? '–' : new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);
export const df = (s, opt = { day: 'numeric', month: 'short', year: 'numeric' }) => s ? new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', opt).format(new Date(s + 'T12:00:00')) : '';
