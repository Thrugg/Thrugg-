/* node forge/test/links.test.mjs — Cordée hikes as a workout, Nocturne sleep for the weekly review. */
import assert from 'node:assert/strict';
import { cordeeWorkout, applyCordee, sleepBetween, hikeIntensity } from '../js/links.js';
const items = { a: { k: 'log', d: { hike: 'h1', date: '2026-11-10', dur: 240 } }, b: { k: 'log', d: { hike: 'h1', date: '2026-11-01', dur: 180, up: 900 } }, c: { k: 'log', d: { hike: 'h1', date: '2026-09-01', dur: 100 } }, d: { k: 'log', x: 1, d: { hike: 'h1', date: '2026-11-12', dur: 60 } }, e: { k: 'route', d: {} } };
const w = cordeeWorkout(items, { h1: { up: 800 } }, '2026-11-16');
assert.equal(w.n, 2, 'only the last 4 weeks, deleted entries left out'); assert.equal(w.perWeek, 0.5); assert.equal(w.minutes, 210); assert.equal(w.type, 'hike');
assert.deepEqual(['light', 'moderate', 'vigorous', 'very'], [200, 300, 500, 700].map(hikeIntensity));
assert.equal(cordeeWorkout({}, {}, '2026-11-16'), null); assert.equal(cordeeWorkout(null, {}, '2026-11-16'), null);
const list = [{ type: 'strength', perWeek: 3 }];
assert.equal(applyCordee(list, w), true); assert.equal(list.length, 2); assert.equal(applyCordee(list, { ...w }), false, 'unchanged: no save');
assert.equal(applyCordee(list, null), true); assert.equal(list.length, 1); assert.equal(list[0].type, 'strength');
/* a hiking workout from Apple Health (the watch) already counts the hikes: Cordée's is not added on top */
const wh = [{ type: 'strength', minutes: 60, perWeek: 3 }, { type: 'hike', minutes: 200, perWeek: 1 }];
assert.equal(applyCordee(wh, w), false); assert.equal(wh.filter(x => x.type === 'hike').length, 1);
const wh2 = [{ type: 'hike', minutes: 200, perWeek: 1 }, { ...w }];
assert.equal(applyCordee(wh2, w), true, 'an earlier Cordée copy is taken out'); assert.equal(wh2.length, 1);
assert.deepEqual(sleepBetween({ nights: { '2026-11-10': { a: 300 }, '2026-11-11': { a: 420 }, '2026-11-12': { a: 340 } } }, '2026-11-10', '2026-11-16'), { nights: 3, avg: 353, short: 2 });
assert.equal(sleepBetween({ demo: true, nights: { '2026-11-10': { a: 300 }, '2026-11-11': { a: 300 }, '2026-11-12': { a: 300 } } }, '2026-11-10', '2026-11-16'), null, 'example nights never count');
console.log('links tests passed');
