/* Nocturne — what other apps and services add (Nov 2026).
   - Forge: the training load for the guide's sleep range, from the sessions logged there (same browser storage).
   - If-then plans for the costliest cause of short nights.
   - "Open the window tonight?" from tonight's outside temperature (Open-Meteo, no key). */
const FACT = { light: 0.7, moderate: 1, vigorous: 1.4, very: 1.7 };
/* Forge state → 'light' | 'regular' | 'heavy', from moderate-equivalent training minutes a week, or null */
export function forgeLoad(forge) {
  const ws = forge && forge.activity && Array.isArray(forge.activity.workouts) ? forge.activity.workouts : null;
  if (!ws || !forge.profile || !forge.profile.onboarded) return null;
  const raw = ws.reduce((s, w) => s + (Number(w.minutes) || 0) * (Number(w.perWeek) || 0), 0);
  const min = ws.reduce((s, w) => s + (Number(w.minutes) || 0) * (Number(w.perWeek) || 0) * (FACT[w.intensity] || 1), 0);
  return { load: min < 180 ? 'light' : min < 420 ? 'regular' : 'heavy', hours: Math.round(raw / 6) / 10 };
}
/* the if-then plan for a cause: implementation intentions, one concrete trigger and one action */
export const IFTHEN = { winddown: 'winddown', screen: 'screen', training: 'training', social: 'social', travel: 'travel', dog: 'dog', other: 'other' };
/* nights in a row (ending today or yesterday) with the plan ticked */
export function ifThenStreak(done, today, addDays) {
  let n = 0, d = done && done[today] ? today : addDays(today, -1);
  while (done && done[d]) { n++; d = addDays(d, -1); }
  return n;
}
/* tonight's outside temperatures, 21:00 to 07:00 → advice key */
export function windowAdvice(hourly, tonight) {
  if (!hourly || !Array.isArray(hourly.time)) return null;
  const vals = hourly.time.map((t, i) => [t, hourly.temperature_2m[i]]).filter(([t]) => t >= tonight + 'T21:00' && t <= nextDay(tonight) + 'T07:00').map(([, v]) => v).filter(v => typeof v === 'number');
  if (vals.length < 4) return null;
  const min = Math.min(...vals), eve = vals[0];
  const k = min > 20 ? 'hot' : min >= 12 ? 'open' : min >= 5 ? 'tilt' : 'air';
  return { k, min: Math.round(min), eve: Math.round(eve) };
}
const nextDay = d => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
/* where to ask the forecast for: Sillage's town, else Cordée's home, else Munich */
export function placeGuess() {
  try { const s = JSON.parse(localStorage.getItem('sillage.v1')); if (s && s.place && isFinite(s.place.lat)) return { lat: s.place.lat, lon: s.place.lon, name: s.place.name }; } catch (e) { }
  try { const c = JSON.parse(localStorage.getItem('cordee.settings')); if (c && c.home && isFinite(c.home.lat)) return { lat: c.home.lat, lon: c.home.lon, name: c.home.name }; } catch (e) { }
  return { lat: 48.14, lon: 11.58, name: 'Munich' };
}
