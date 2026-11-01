/* node forge/test/health.test.mjs <path-to-fflate-umd> — checks both Apple Health import routes on synthetic data. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { File } from 'node:buffer';
import { parseShortcut, readHealthFile, summarise, looseDate, num } from '../js/health.js';
const fflate = createRequire(import.meta.url)(process.argv[2]);

// 1. number and date parsing
assert.equal(num('8,123', true), 8123); assert.equal(num('82,4 kg'), 82.4); assert.equal(num('1.234,5'), 1234.5); assert.equal(num('18 %'), 18);
assert.equal(looseDate('2026-10-30T07:12:00+01:00').date, '2026-10-30');
assert.equal(looseDate('30.10.2026, 07:12').date, '2026-10-30');
assert.equal(looseDate('30 oct. 2026 à 07:12').date, '2026-10-30');
assert.equal(looseDate('Oct 30, 2026 at 7:12 AM', false).date, '2026-10-30');

// 2. Shortcut payload with parallel blocks, German decimal commas, two weigh-ins on one day
const payload = `FORGE1
@steps
2026-10-28T00:00:00+01:00
2026-10-29T00:00:00+01:00
9.512
11.204
@kcal
2026-10-28T00:00:00+01:00
2026-10-29T00:00:00+01:00
2.810
3.050
@weight
2026-10-29T07:05:00+01:00
2026-10-29T19:40:00+01:00
92,6
93,4
@bf
2026-10-29T07:05:00+01:00
0,183`;
const s = parseShortcut(payload);
assert.equal(s.days['2026-10-28'].steps, 9512); assert.equal(s.days['2026-10-29'].kcal, 3050, 'German thousands separator in calories');
assert.equal(s.days['2026-10-29'].w, 92.6, 'earliest weigh-in of the day'); assert.equal(s.days['2026-10-29'].bf, 18.3);

// 3. export.xml in a zip, watch + phone overlapping steps, kJ energy, lb weight, workout with statistics
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="fr_DE">
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Montre Apple" unit="count" startDate="2026-10-29 08:00:00 +0100" endDate="2026-10-29 08:10:00 +0100" value="6000"/>
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Montre Apple" unit="count" startDate="2026-10-29 18:00:00 +0100" endDate="2026-10-29 18:10:00 +0100" value="5000"/>
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="2026-10-29 08:00:00 +0100" endDate="2026-10-29 08:10:00 +0100" value="7000"/>
 <Record type="HKQuantityTypeIdentifierDietaryEnergyConsumed" sourceName="MyFitnessPal" unit="kJ" startDate="2026-10-29 12:00:00 +0100" endDate="2026-10-29 12:00:00 +0100" value="4184"/>
 <Record type="HKQuantityTypeIdentifierDietaryEnergyConsumed" sourceName="MyFitnessPal" unit="kJ" startDate="2026-10-29 19:00:00 +0100" endDate="2026-10-29 19:00:00 +0100" value="8368"/>
 <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Renpho" unit="lb" startDate="2026-10-29 07:01:00 +0100" endDate="2026-10-29 07:01:00 +0100" value="204.15"/>
 <Record type="HKQuantityTypeIdentifierBodyFatPercentage" sourceName="Renpho" unit="%" startDate="2026-10-29 07:01:00 +0100" endDate="2026-10-29 07:01:00 +0100" value="0.191"/>
 <Record type="HKQuantityTypeIdentifierVO2Max" sourceName="Montre Apple" unit="mL/min·kg" startDate="2026-10-28 18:00:00 +0100" endDate="2026-10-28 18:00:00 +0100" value="47.3"/>
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Montre Apple" unit="count" startDate="2019-01-01 08:00:00 +0100" endDate="2019-01-01 08:10:00 +0100" value="99999"/>
 <Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining" duration="62.5" durationUnit="min" sourceName="Montre Apple" startDate="2026-10-29 17:00:00 +0100" endDate="2026-10-29 18:02:30 +0100">
  <WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" startDate="2026-10-29 17:00:00 +0100" endDate="2026-10-29 18:02:30 +0100" average="128" minimum="80" maximum="170" unit="count/min"/>
  <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" startDate="2026-10-29 17:00:00 +0100" endDate="2026-10-29 18:02:30 +0100" sum="410" unit="kcal"/>
 </Workout>
 <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30" durationUnit="min" totalDistance="6" totalDistanceUnit="km" totalEnergyBurned="400" totalEnergyBurnedUnit="kcal" sourceName="Montre Apple" startDate="2026-10-27 07:00:00 +0100" endDate="2026-10-27 07:30:00 +0100"/>
</HealthData>
`;
const zipped = fflate.zipSync({ 'apple_health_export/export.xml': fflate.strToU8(xml), 'apple_health_export/export_cda.xml': fflate.strToU8('<cda/>') });
const file = new File([zipped], 'export.zip');
const r = await readHealthFile(file, { days: 3650, fflate, now: new Date('2026-10-31T12:00:00Z') });
const d = r.days['2026-10-29'];
assert.equal(d.steps, 11000, 'watch total kept over the phone total'); assert.equal(d.kcal, 3000, 'kJ converted');
assert.ok(Math.abs(d.w - 92.6) < 0.05, 'lb converted'); assert.equal(d.bf, 19.1); assert.equal(r.days['2026-10-28'].vo2, 47.3);
assert.equal(r.workouts.length, 2); assert.equal(r.workouts[0].type, 'strength'); assert.equal(r.workouts[0].hr, 128); assert.equal(r.workouts[0].kcal, 410);
assert.equal(r.workouts[1].type, 'run'); assert.equal(r.workouts[1].km, 6);
assert.equal(r.workouts[0].steps, 1250, 'steps inside the strength workout (2.5 of 10 min of a 5,000-step watch sample)');
assert.equal(r.workouts[1].steps, 0, 'no step samples during the run');
const sum = summarise(r, 32);
const st = sum.workouts.find(w => w.type === 'strength');
assert.equal(st.intensity, 'light', 'lifting at 69 % HRmax = typical session'); assert.equal(st.watchKcal, 410); assert.equal(st.spm, 20); assert.equal(st.src, 'health'); assert.equal(sum.vo2.value, 47.3); assert.ok(sum.workouts.find(w => w.type === 'run').paceKmh === 12);
const r2 = await readHealthFile(new File([zipped], 'export.zip'), { days: 180, fflate });
assert.ok(!Object.keys(r2.days).some(k => k < '2026-01-01'), 'old records skipped');
const xmlFile = new File([xml], 'export.xml'); const r3 = await readHealthFile(xmlFile, { days: 3650 }); assert.equal(r3.days['2026-10-29'].steps, 11000, 'plain export.xml also works');
// a whole export written on one line (some tools strip line breaks) parses the same way
const oneLine = xml.replace(/\n\s*/g, '');
const r4 = await readHealthFile(new File([oneLine], 'export.xml'), { days: 3650, now: new Date('2026-10-31T12:00:00Z') });
assert.equal(r4.workouts.length, 2); assert.equal(r4.workouts[0].hr, 128); assert.equal(r4.days['2026-10-29'].steps, 11000); assert.equal(r4.workouts[0].steps, 1250);
console.log('health import tests passed');
