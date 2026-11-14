/* Sillage — the two drawings: a bottle silhouette whose level is what is left, and the notes pyramid. */
import { JUICE } from './engine.js';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let seq = 0;
/* body outline, cap and neck for each shape, in a 60 × 90 box; the body's top and bottom say where the juice sits */
const SH = {
  tall: { body: 'M14 28a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v54a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z', top: 24, bot: 86, cap: [22, 4, 16, 12], neck: [25, 16, 10, 8] },
  square: { body: 'M8 30a3 3 0 0 1 3-3h38a3 3 0 0 1 3 3v52a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z', top: 27, bot: 85, cap: [20, 8, 20, 12], neck: [26, 20, 8, 7] },
  flask: { body: 'M12 42q0-16 18-16t18 16v36q0 8-8 8H20q-8 0-8-8z', top: 26, bot: 86, cap: [22, 6, 16, 11], neck: [26, 17, 8, 9] },
  round: { body: 'M30 30a28 28 0 1 1 0 56a28 28 0 1 1 0-56z', top: 30, bot: 86, cap: [23, 8, 14, 12], neck: [26, 20, 8, 11] }
};
export function bottle(shape, level, family, px = 60) {
  const s = SH[shape] || SH.tall, id = 'j' + (++seq), lv = Math.max(0, Math.min(1, level ?? 1)), y = s.bot - (s.bot - s.top - 6) * lv - (lv > 0 ? 3 : 0);
  return `<svg class="bottle" viewBox="0 0 60 90" width="${px}" height="${px * 1.5}" aria-hidden="true"><defs><clipPath id="${id}"><path d="${s.body}"/></clipPath></defs>
<rect class="cap" x="${s.cap[0]}" y="${s.cap[1]}" width="${s.cap[2]}" height="${s.cap[3]}" rx="2"/><rect class="neck" x="${s.neck[0]}" y="${s.neck[1]}" width="${s.neck[2]}" height="${s.neck[3]}"/>
<path class="glass" d="${s.body}"/>${lv > 0 ? `<rect clip-path="url(#${id})" x="0" y="${y.toFixed(1)}" width="60" height="${(90 - y).toFixed(1)}" fill="${JUICE[family] || '#d99a2b'}" opacity=".92"/>` : ''}
<path class="edge" d="${s.body}"/><path class="shine" clip-path="url(#${id})" d="M${shape === 'round' ? 14 : 18} ${s.top + 8}v${s.bot - s.top - 20}"/></svg>`;
}
/* tiers: [{ label, notes: [..] }] top first */
export function pyramid(tiers) {
  if (!tiers.some(t => t.notes.length)) return '';
  return `<div class="pyr"><svg viewBox="0 0 90 120" width="90" height="120" aria-hidden="true"><path class="p1" d="M45 2L60 40H30z"/><path class="p2" d="M30 42h30l15 38H15z"/><path class="p3" d="M15 82h60l14 36H1z"/></svg><div class="tiers">${tiers.map(t => `<div class="tier"><small>${esc(t.label)}</small><span>${t.notes.length ? esc(t.notes.join(' · ')) : '—'}</span></div>`).join('')}</div></div>`;
}
