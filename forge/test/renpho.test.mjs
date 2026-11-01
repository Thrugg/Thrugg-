/* node forge/test/renpho.test.mjs — Renpho CSV import and the Renpho / Apple Health / typed source rules (synthetic data). */
import assert from 'node:assert/strict';
import { parseRenphoCsv, mergeRenpho, mergeLogs, bodySource, renphoStats } from '../js/renpho.js';
import * as C from '../js/calc.js';

const H = 'No.,Date,Time,Weight(kg),BMI,Body Fat Percentage(%),Body Fat Mass(kg),Muscle Percentage(%),Muscle Mass(kg),Skeletal Muscle Percentage(%),Skeletal Muscle Mass(kg),Bone Percentage(%),Bone Mass(kg),Protein Percentage(%),Protein Mass(kg),Body Water Percentage(%),Body Water Mass(kg),Fat-Free Mass(kg),Subcutaneous Fat(%),Visceral Fat,BMR(kcal),Metabolic Age,WHR (Waist-to-Hip Ratio),Optimal Weight(kg),Weight Level,Body Type,Target to optimal weight(kg),Target to optimal muscle mass(kg),Target to optimal fat mass(kg),Remarks';
const row = (n, d, t, w, bf) => { const fm = +(w * bf / 100).toFixed(2), ffm = +(w - fm).toFixed(2), bone = +(w * 0.041).toFixed(2); return [n, d, t, w.toFixed(2), (w / 1.8 ** 2).toFixed(1), bf, fm, 77, (ffm - bone).toFixed(2), 52.5, 40, 4.1, bone, 18.5, 14, 58.7, 46, ffm, 15.4, 9, Math.round(370 + 21.6 * ffm), 31, '--', '--', '--', '--', '--', '--', '--', '"note, with comma"'].join(','); };
// 30 days, body fat a fixed function of weight (like a typical scale), one duplicate day, one later reading that day
const lines = [H]; let n = 1;
for (let i = 29; i >= 0; i--) { const d = C.addDays('2026-10-01', i), w = 80 + Math.sin(i / 3) * 1.2 - i * 0.02, bf = +(15 + (w - 80) * 0.35).toFixed(1); lines.push(row(n++, d.replace(/-/g, '.'), '07:1' + (i % 10) + ':00', w, bf)); }
lines.push(row(n++, '2026.10.05', '06:30:00', 79.0, 14.6), row(n++, '2026.10.05', '19:45:00', 81.5, 15.5));
const p = parseRenphoCsv(lines.join('\n'));
assert.equal(p.first, '2026-10-01'); assert.equal(p.last, '2026-10-30'); assert.equal(p.days, 30); assert.equal(p.readings, 32); assert.equal(p.dupes, 2);
assert.equal(p.rows['2026-10-05'].w, 79.0, 'earliest reading of the day wins'); assert.equal(p.rows['2026-10-05'].n, 3);
assert.equal(p.rows['2026-10-05'].whr, undefined, '"--" is empty'); assert.ok(Math.abs(p.heightCm - 180) < 0.6, 'height from BMI');
assert.equal(p.unit, 'kg');

// semicolon + decimal comma export, dates day-first, pounds
const lb = 'Date;Time;Weight(lb);Body Fat Percentage(%);Fat-Free Mass(lb)\n31.10.2026;07:00;209,1;18,7;170,0\n01.11.2026;7:05 AM;208,0;18,6;169,3\n';
const q = parseRenphoCsv(lb);
assert.equal(q.first, '2026-10-31'); assert.ok(Math.abs(q.rows['2026-10-31'].w - 94.85) < 0.01, 'lb → kg'); assert.equal(q.rows['2026-11-01'].bf, 18.6); assert.equal(q.unit, 'lb');
assert.throws(() => parseRenphoCsv('a,b\n1,2'), e => e.code === 'columns');

// re-import: readings inside the new file's period are replaced (deleted ones disappear), outside kept
const stored = { rows: { '2026-09-20': { w: 81 }, '2026-10-02': { w: 99 }, '2026-10-03': { w: 98 } } };
const newer = parseRenphoCsv([H, row(1, '2026.10.02', '07:00:00', 80.4, 15.1), row(2, '2026.10.04', '07:00:00', 80.2, 15.0)].join('\n'));
const merged = mergeRenpho(stored, newer);
assert.deepEqual(Object.keys(merged).sort(), ['2026-09-20', '2026-10-02', '2026-10-04']); assert.equal(merged['2026-10-02'].w, 80.4);

// source rules
const logs = {
  '2026-09-25': { w: 82.0, bf: 21 },                       // Apple Health before the first Renpho day: kept as history
  '2026-10-01': { w: 80.9, bf: 22, steps: 12000 },         // Health on a Renpho day: Renpho weight and fat, Health steps
  '2026-10-07': { kcal: 2800, p: 180, m: ['kcal'] },       // typed calories
  '2026-10-31': { w: 80.1, steps: 9000, kcal: 2500 },      // Health weight on a day without Renpho reading: ignored
  '2026-11-02': { w: 79.8, m: ['w'] }                      // typed weight on a day without reading: kept
};
const R = { rows: p.rows };
const L = mergeLogs(logs, R, 'renpho');
assert.deepEqual(L['2026-09-25']._s, { w: 'health', bf: 'health' });
assert.equal(L['2026-10-01'].w, p.rows['2026-10-01'].w); assert.equal(L['2026-10-01']._s.w, 'renpho'); assert.equal(L['2026-10-01']._s.bf, 'renpho'); assert.equal(L['2026-10-01'].steps, 12000); assert.equal(L['2026-10-01']._s.steps, 'health');
assert.equal(L['2026-10-07'].w, p.rows['2026-10-07'].w, 'Renpho-only day appears'); assert.equal(L['2026-10-07']._s.kcal, 'manual');
assert.equal(L['2026-10-31'].w, undefined, 'Health weight inside the Renpho period is ignored'); assert.equal(L['2026-10-31'].steps, 9000);
assert.equal(L['2026-11-02'].w, 79.8); assert.equal(L['2026-11-02']._s.w, 'manual');
const LH = mergeLogs(logs, R, 'health');
assert.equal(LH['2026-10-31'].w, 80.1, 'Apple Health mode keeps Health weights'); assert.equal(LH['2026-10-07'].w, undefined, 'no Renpho values in Apple Health mode');
assert.equal(bodySource({ body: { source: 'auto' }, renpho: { rows: {} } }), 'health'); assert.equal(bodySource({ body: { source: 'auto' }, renpho: R }), 'renpho'); assert.equal(bodySource({ body: { source: 'health' }, renpho: R }), 'health');
// raw logs untouched (merge is read-only)
assert.equal(logs['2026-10-31'].w, 80.1);

// the engine runs on the merged view: one weight per day, all from one scale inside the Renpho period
const series = C.trendSeries(Object.entries(L).filter(([, v]) => v.w > 0).map(([date, v]) => ({ date, w: v.w })));
assert.equal(series.length, 32); // 30 Renpho days + 1 Health day before + 1 typed day after
const st = renphoStats(p.rows);
assert.equal(st.last, '2026-10-30'); assert.ok(st.rWeightFat > 0.95, 'lockstep detected'); assert.ok(Math.abs(st.fatPerKg + st.lostSplit - 1) < 0.02, 'fat + fat-free split sums to 1');
console.log('renpho tests passed');
