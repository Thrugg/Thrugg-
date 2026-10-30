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
    quick: 'Log today', weight: 'Weight', intake: 'Calories eaten', logged: 'Logged', trend: 'Trend weight', week: 'per week', noWeight: 'Log your weight in the morning, after the bathroom, before eating.',
    maintenance: 'Your maintenance', arena: 'Arena', peak: 'Peak', balance: 'Balance', todo: 'Next steps',
    t_weigh: 'Weigh in today', t_health: 'Bring in your Apple Health data', t_photo: 'Photo check-in due ({d} days since the last)', t_photoFirst: 'Take your first photo check-in', t_tape: 'Tape measurements this week', t_bf: 'Add a body-fat estimate to unlock the lean-mass equations', t_pr: 'Log a personal record in the Arena',
    paste: 'Paste from Shortcut'
  },
  fuel: {
    maint: 'Maintenance', band68: 'Likely range', band95: '95 % range', src: { predicted: 'Predicted from your profile', blended: 'Predicted + learned from your logs' },
    breakdown: 'What makes up your day', c_rmr: 'Resting metabolism', c_neat: 'Daily life (job, sleep)', c_steps: 'Steps', c_flights: 'Stairs', c_ex: 'Workouts', c_epoc: 'After-burn', c_tef: 'Digesting food',
    stepsDetail: '{steps} steps → {km} km', rmrMethod: 'Method: {m}',
    activity: 'Your activity', stepsAvg: 'Average daily steps', stepsInc: 'My step count includes the steps of my workouts', flights: 'Floors climbed a day', stride: 'Stride length', strideHint: 'Leave empty to use your height. To measure: walk 20 steps, measure the distance, divide by 20.',
    sessions: 'Training sessions', type: 'Activity', minutes: 'Minutes', per: 'Per week', intensity: 'Intensity', pace: 'Pace (km/h)', watts: 'Average watts', fromHealth: 'Fill from Apple Health workouts',
    int: { light: 'Light — can sing', moderate: 'Moderate — can talk', vigorous: 'Hard — a few words', very: 'Very hard — no talking' },
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
    m: { dxa: 'DXA scan', bodpod: 'BodPod', bia_pro: 'Pro bioimpedance (InBody)', bia: 'Smart scale', navy: 'Tape: US Navy', rfm: 'Tape: Relative Fat Mass', navy_photo: 'Photo: US Navy', rfm_photo: 'Photo: Relative Fat Mass', deurenberg: 'BMI formula (Deurenberg)', visual: 'Your own estimate' },
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
    compareWith: 'Compare with', reference: 'Reference', history: 'Weight history'
  },
  arena: {
    title: 'Arena', lead: 'Your records ranked against people who do the same thing.', peak: 'Peak', balance: 'Balance',
    peakText: 'Average of your two best domains: your ceiling.', balanceText: 'Geometric mean of every domain: it drops hard when one is weak.', gapText: 'The gap between them shows how specialised you are.',
    needMore: 'Log records in at least three domains to get a Balance score.', limiter: '{d} is holding your Balance back. Reaching the next tier there lifts Balance from {a} to {b}.',
    dom: { strength: 'Strength', speed: 'Speed', power: 'Power endurance', aerobic: 'Aerobic', lean: 'Leanness' },
    add: 'Log a record', event: 'Event', none: 'No record yet', vsPart: 'Top {p} % of people who do this', vsAll: 'Top {p} % of all {sex} (estimate, {lo}–{hi} %)', vsAge: 'Top {p} % of {sex} your age (measured population data)', next: '{gap} to {tier}', top: 'Top tier reached',
    ev: { bench: 'Bench press', squat: 'Back squat', deadlift: 'Deadlift', ohp: 'Overhead press', sprint60: '60 m sprint', sprint100: '100 m sprint', sprint200: '200 m sprint', sprint400: '400 m sprint', row100: 'Row 100 m', row200: 'Row 200 m', row250: 'Row 250 m', row500: 'Row 500 m', row1min: 'Row 1 minute', vo2: 'VO₂max' },
    weightKg: 'Weight lifted', reps: 'Reps', rir: 'Reps left in the tank', bwThen: 'Bodyweight that day', time: 'Time (s or m:ss.t)', meters: 'Metres', value: 'ml/kg/min',
    timing: 'Timing', t: { electronic: 'Electronic (gates, photocell)', hand: 'Hand stopwatch (+0.24 s)', gps: 'Watch GPS (not ranked)' }, wind: 'Tailwind (m/s)',
    method: 'Measured by', vm: { lab: 'Lab test, treadmill', cycle: 'Lab test, bike', watch: 'Apple Watch estimate', cooper: 'Cooper 12-minute run' }, cooperM: 'Distance in 12 min (m)',
    note: { reps: 'More than 10 reps: stored as a rep record, not converted to a 1RM.', gps: 'GPS times are not accurate enough to rank.', hand: 'Hand timing: +0.24 s added.', wind: 'Wind over 2 m/s: not record-legal.', watch: 'Watch estimates run about 6 ml/kg/min low on average (small study): low confidence.', cycle: 'Compared with treadmill norms: bike tests read lower.', cooper: 'Estimated from the Cooper test.', est: 'Estimated 1RM (mean of Epley, Brzycki, Lombardi).', clampedBw: 'Bodyweight outside the table: nearest row used.', modelled: 'Modelled between the 100 m and 500 m rankings.' },
    standards: 'Standards for you', history: 'History', improve: 'How to reach the next tier', ladder: 'The ladder', variant: 'Tier names',
    calc: '1RM calculator', calcText: '{w} × {r} → about {v} kg',
    tips: {
      lift: ['Train the lift 2–3 times a week, 3–6 sets of 1–6 reps at RPE 7–9.', 'Add load whenever all sets feel RPE 8 or less; deload every 4–8 weeks.', 'Beginners progress weekly, intermediates monthly, advanced lifters over a block.'],
      sprint: ['Two speed sessions a week: 4–8 sprints of 20–60 m at full effort, full recovery (2–5 min).', 'Strength underpins speed: work toward a squat of 1.5–2× bodyweight.', 'Low-volume plyometrics (bounds, hurdle hops) and technique drills (A-skips, wall drives).'],
      row: ['Technique first: legs–body–arms, sharp catch, stroke rate 34–40 for sprints.', 'Weekly: 8 × 250 m hard with 2 min rest, and one 30-minute steady row.', 'Damper around 5–7 suits most people; check the drag factor (115–135).'],
      vo2: ['About 80 % of training easy, 20 % hard.', 'One VO₂max session a week: 4–6 × 3–4 min at 90–95 % of max heart rate.', 'One threshold session a week; raise volume by about 10 % a week at most.'],
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
    quick: 'Saisie du jour', weight: 'Poids', intake: 'Calories mangées', logged: 'Enregistré', trend: 'Poids tendance', week: 'par semaine', noWeight: 'Pèse-toi le matin, après les toilettes, avant de manger.',
    maintenance: 'Ta maintenance', arena: 'Arène', peak: 'Pic', balance: 'Équilibre', todo: 'Prochaines étapes',
    t_weigh: 'Pèse-toi aujourd’hui', t_health: 'Importer tes données Apple Santé', t_photo: 'Photos de suivi à refaire ({d} jours depuis les dernières)', t_photoFirst: 'Faire tes premières photos de suivi', t_tape: 'Mensurations cette semaine', t_bf: 'Ajoute une estimation de masse grasse pour activer les équations de masse maigre', t_pr: 'Enregistre un record dans l’Arène',
    paste: 'Coller depuis le Raccourci'
  },
  fuel: {
    maint: 'Maintenance', band68: 'Fourchette probable', band95: 'Fourchette à 95 %', src: { predicted: 'Calculée depuis ton profil', blended: 'Calculée + apprise de tes saisies' },
    breakdown: 'De quoi est faite ta journée', c_rmr: 'Métabolisme de repos', c_neat: 'Vie quotidienne (travail, sommeil)', c_steps: 'Pas', c_flights: 'Escaliers', c_ex: 'Entraînements', c_epoc: 'Post-combustion', c_tef: 'Digestion',
    stepsDetail: '{steps} pas → {km} km', rmrMethod: 'Méthode : {m}',
    activity: 'Ton activité', stepsAvg: 'Pas moyens par jour', stepsInc: 'Mon nombre de pas inclut ceux de mes séances', flights: 'Étages montés par jour', stride: 'Longueur de foulée', strideHint: 'Laisse vide pour utiliser ta taille. Pour mesurer : fais 20 pas, mesure la distance, divise par 20.',
    sessions: 'Séances d’entraînement', type: 'Activité', minutes: 'Minutes', per: 'Par semaine', intensity: 'Intensité', pace: 'Allure (km/h)', watts: 'Watts moyens', fromHealth: 'Remplir depuis les séances Apple Santé',
    int: { light: 'Légère — tu peux chanter', moderate: 'Modérée — tu peux parler', vigorous: 'Intense — quelques mots', very: 'Très intense — impossible de parler' },
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
    m: { dxa: 'Examen DXA', bodpod: 'BodPod', bia_pro: 'Impédancemètre pro (InBody)', bia: 'Balance connectée', navy: 'Mètre ruban : US Navy', rfm: 'Mètre ruban : Relative Fat Mass', navy_photo: 'Photo : US Navy', rfm_photo: 'Photo : Relative Fat Mass', deurenberg: 'Formule IMC (Deurenberg)', visual: 'Ta propre estimation' },
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
    compareWith: 'Comparer avec', reference: 'Référence', history: 'Historique du poids'
  },
  arena: {
    title: 'Arène', lead: 'Tes records comparés aux personnes qui pratiquent la même chose.', peak: 'Pic', balance: 'Équilibre',
    peakText: 'Moyenne de tes deux meilleurs domaines : ton plafond.', balanceText: 'Moyenne géométrique de tous les domaines : elle chute dès qu’un domaine est faible.', gapText: 'L’écart entre les deux montre à quel point tu es spécialisé.',
    needMore: 'Enregistre des records dans au moins trois domaines pour obtenir un score d’Équilibre.', limiter: '{d} freine ton Équilibre. Atteindre le palier suivant le ferait passer de {a} à {b}.',
    dom: { strength: 'Force', speed: 'Vitesse', power: 'Puissance-endurance', aerobic: 'Aérobie', lean: 'Sécheresse' },
    add: 'Enregistrer un record', event: 'Épreuve', none: 'Pas encore de record', vsPart: 'Top {p} % des pratiquants', vsAll: 'Top {p} % de tous les {sex} (estimation, {lo}–{hi} %)', vsAge: 'Top {p} % des {sex} de ton âge (données mesurées en population)', next: '{gap} pour {tier}', top: 'Palier maximal atteint',
    ev: { bench: 'Développé couché', squat: 'Squat', deadlift: 'Soulevé de terre', ohp: 'Développé militaire', sprint60: 'Sprint 60 m', sprint100: 'Sprint 100 m', sprint200: 'Sprint 200 m', sprint400: 'Sprint 400 m', row100: 'Rameur 100 m', row200: 'Rameur 200 m', row250: 'Rameur 250 m', row500: 'Rameur 500 m', row1min: 'Rameur 1 minute', vo2: 'VO₂max' },
    weightKg: 'Charge', reps: 'Répétitions', rir: 'Répétitions en réserve', bwThen: 'Poids de corps ce jour-là', time: 'Temps (s ou m:ss.d)', meters: 'Mètres', value: 'ml/kg/min',
    timing: 'Chronométrage', t: { electronic: 'Électronique (cellules)', hand: 'Chrono manuel (+0,24 s)', gps: 'GPS de la montre (non classé)' }, wind: 'Vent favorable (m/s)',
    method: 'Mesurée par', vm: { lab: 'Test en labo, tapis', cycle: 'Test en labo, vélo', watch: 'Estimation Apple Watch', cooper: 'Test de Cooper (12 min)' }, cooperM: 'Distance en 12 min (m)',
    note: { reps: 'Plus de 10 répétitions : enregistré comme record de répétitions, sans conversion en 1RM.', gps: 'Les temps GPS ne sont pas assez précis pour être classés.', hand: 'Chrono manuel : +0,24 s ajouté.', wind: 'Vent supérieur à 2 m/s : non homologable.', watch: 'Les estimations de la montre sont en moyenne ~6 ml/kg/min trop basses (petite étude) : fiabilité faible.', cycle: 'Comparé aux normes sur tapis : les tests sur vélo donnent moins.', cooper: 'Estimée depuis le test de Cooper.', est: '1RM estimé (moyenne Epley, Brzycki, Lombardi).', clampedBw: 'Poids de corps hors tableau : ligne la plus proche utilisée.', modelled: 'Modélisé entre les classements 100 m et 500 m.' },
    standards: 'Références pour toi', history: 'Historique', improve: 'Comment atteindre le palier suivant', ladder: 'L’échelle', variant: 'Noms des paliers',
    calc: 'Calculateur de 1RM', calcText: '{w} × {r} → environ {v} kg',
    tips: {
      lift: ['Travaille le mouvement 2 à 3 fois par semaine, 3 à 6 séries de 1 à 6 répétitions à RPE 7–9.', 'Augmente la charge dès que toutes les séries sont à RPE 8 ou moins ; décharge toutes les 4 à 8 semaines.', 'Débutant : progrès chaque semaine ; intermédiaire : chaque mois ; avancé : sur un cycle.'],
      sprint: ['Deux séances de vitesse par semaine : 4 à 8 sprints de 20 à 60 m à fond, récupération complète (2–5 min).', 'La force soutient la vitesse : vise un squat à 1,5–2 fois ton poids.', 'Pliométrie à faible volume (bonds, sauts de haies) et gammes techniques (montées de genoux, poussées au mur).'],
      row: ['La technique d’abord : jambes–buste–bras, attaque nette, cadence 34–40 en sprint.', 'Chaque semaine : 8 × 250 m intenses avec 2 min de repos, et 30 min en endurance.', 'Un réglage de 5 à 7 convient à la plupart ; vérifie le facteur de traînée (115–135).'],
      vo2: ['Environ 80 % de l’entraînement facile, 20 % intense.', 'Une séance VO₂max par semaine : 4 à 6 × 3–4 min à 90–95 % de la FC max.', 'Une séance au seuil par semaine ; augmente le volume d’environ 10 % par semaine au maximum.'],
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
