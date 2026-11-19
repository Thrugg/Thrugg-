/* Forge — what other apps on this site already know (read-only, same browser storage, nothing sent anywhere).
   - Cordée: hikes logged in the last 4 weeks become one "Hiking" workout (sessions a week, usual length, intensity
     from the climbing rate), kept up to date each time Forge opens, unless Apple Health already brought a hiking workout.
   - Nocturne: the week's sleep for the weekly review. */
const DAY = 864e5;
const iso = d => new Date(d).toISOString().slice(0, 10);
/* Climbing rate (m per hour) to intensity: an easy lake walk is light, a steady mountain hike moderate,
   a fast or steep one vigorous. Compendium codes 17080–17082 cover this range. */
export const hikeIntensity = mph => mph < 250 ? 'light' : mph < 450 ? 'moderate' : mph < 650 ? 'vigorous' : 'very';

/* items: Cordée's 'cordee.items' object; hikes: id → { up, km } from data/hikes.json; today: 'YYYY-MM-DD'. */
export function cordeeWorkout(items, hikes, today) {
  if (!items || typeof items !== 'object') return null;
  const from = iso(new Date(today + 'T12:00:00Z').getTime() - 27 * DAY);
  const logs = Object.values(items).filter(i => i && !i.x && i.k === 'log' && i.d && i.d.date >= from && i.d.date <= today).map(i => i.d);
  if (!logs.length) return null;
  const rows = logs.map(l => {
    const h = (hikes || {})[l.hike] || {}, min = Number(l.dur) > 0 ? Number(l.dur) : null, up = l.up != null ? Number(l.up) : Number(h.up) || null;
    return { min, up, mph: min && up ? up / (min / 60) : null };
  });
  const mins = rows.map(r => r.min).filter(Boolean), rates = rows.map(r => r.mph).filter(x => x != null);
  const minutes = mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length / 5) * 5 : 180;
  const rate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 350;
  return { type: 'hike', minutes, perWeek: Math.round(logs.length / 4 * 10) / 10, intensity: hikeIntensity(rate), src: 'cordee', n: logs.length };
}
/* Put the Cordée workout into the list (replacing the previous one), or take it out when no hike was logged. Returns true when something changed. */
export function applyCordee(workouts, w) {
  /* hikes the watch already recorded (an Apple Health "Hiking" workout) are not counted a second time from Cordée */
  if (workouts.some(x => x.src !== 'cordee' && x.type === 'hike')) w = null;
  const i = workouts.findIndex(x => x.src === 'cordee');
  if (!w) { if (i < 0) return false; workouts.splice(i, 1); return true; }
  if (i >= 0) { const o = workouts[i]; if (o.minutes === w.minutes && o.perWeek === w.perWeek && o.intensity === w.intensity && o.n === w.n) return false; workouts[i] = w; return true; }
  workouts.push(w); return true;
}
/* Nocturne's nights between two dates: average asleep, nights under 6 h. noc: 'nocturne.v1' state. */
export function sleepBetween(noc, from, to) {
  if (!noc || !noc.nights || noc.demo) return null;
  const ns = Object.entries(noc.nights).filter(([d, n]) => d >= from && d <= to && n && n.a > 0).map(([, n]) => n.a);
  if (ns.length < 3) return null;
  return { nights: ns.length, avg: Math.round(ns.reduce((a, b) => a + b, 0) / ns.length), short: ns.filter(a => a < 360).length };
}
