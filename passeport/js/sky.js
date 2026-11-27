/* Passeport — sun and sky, computed on the phone so it works offline.
   Sun times use the standard NOAA/SunCalc formulas (within a minute or two at Paris latitudes).
   The Eiffel Tower sparkles for five minutes on the hour from nightfall until 23:00; its lights go off at 23:45. */
const RAD = Math.PI / 180, DAY = 864e5, J1970 = 2440588, J2000 = 2451545, OBLIQ = RAD * 23.4397, J0 = 0.0009;
const toDays = d => d.valueOf() / DAY - 0.5 + J1970 - J2000;
const fromJulian = j => new Date((j + 0.5 - J1970) * DAY);
const meanAnomaly = d => RAD * (357.5291 + 0.98560028 * d);
const eclipticLon = M => M + RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + RAD * 102.9372 + Math.PI;
const declination = L => Math.asin(Math.sin(OBLIQ) * Math.sin(L));
const transitJ = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

/* Paris wall-clock parts of a Date ({y, m (1-12), d, h, min, dow (0 = Sunday)}), whatever the phone's own time zone. */
const PARIS = (() => { try { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' }); } catch (e) { return null; } })();
const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export function paris(date) {
  if (!PARIS) { const d = new Date(date.valueOf() + 36e5); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), dow: d.getUTCDay() }; }
  const p = {}; for (const x of PARIS.formatToParts(date)) p[x.type] = x.value;
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute, dow: DOW[p.weekday] };
}
/* "YYYY-MM-DD" of a Date in Paris */
export const parisDay = date => { const p = paris(date); return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; };

/* Sunrise, sunset, civil dawn and dusk for a calendar day ("YYYY-MM-DD" or a Date) at lat/lon. Returns Dates (or null near the poles). */
export function sunTimes(day, lat, lon) {
  const ds0 = typeof day === 'string' ? day : parisDay(day);
  const noon = new Date(ds0 + 'T12:00:00Z');
  const lw = RAD * -lon, phi = RAD * lat, d = toDays(noon);
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = J0 + lw / (2 * Math.PI) + n, M = meanAnomaly(ds), L = eclipticLon(M), dec = declination(L), Jnoon = transitJ(ds, M, L);
  const out = { noon: fromJulian(Jnoon) };
  for (const [deg, rise, set] of [[-0.833, 'sunrise', 'sunset'], [-6, 'dawn', 'dusk']]) {
    const cosW = (Math.sin(deg * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
    if (cosW < -1 || cosW > 1) { out[rise] = out[set] = null; continue; }
    const w = Math.acos(cosW), Jset = transitJ(J0 + (w + lw) / (2 * Math.PI) + n, M, L);
    out[set] = fromJulian(Jset); out[rise] = fromJulian(Jnoon - (Jset - Jnoon));
  }
  return out;
}

export function isNight(now, lat, lon) {
  const t = sunTimes(now, lat, lon);
  return !(t.sunrise && t.sunset && now >= t.sunrise && now < t.sunset);
}

const EIFFEL = [48.8584, 2.2945];
/* The next Eiffel Tower sparkle at or after `now`: on the hour, once it is dark (after civil dusk), last one at 23:00. */
export function nextSparkle(now) {
  for (let k = 0; k < 40; k++) {
    const t = new Date(Math.ceil(now.valueOf() / 36e5) * 36e5 + k * 36e5);
    const p = paris(t);
    if (p.h > 23 || p.h < 12) continue;
    const dusk = sunTimes(t, EIFFEL[0], EIFFEL[1]).dusk;
    if (dusk && t >= dusk && p.h <= 23) return t;
  }
  return null;
}
/* A sparkle is running now (the first five minutes of a sparkle hour, after dark). */
export function sparklingNow(now) {
  const p = paris(now); if (p.min >= 5 || p.h > 23 || p.h < 12) return false;
  const top = new Date(now.valueOf() - p.min * 6e4 - now.getUTCSeconds() * 1000 - now.getUTCMilliseconds());
  const dusk = sunTimes(now, EIFFEL[0], EIFFEL[1]).dusk;
  return !!dusk && top >= dusk;
}
