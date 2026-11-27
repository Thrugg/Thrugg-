/* Passeport — the stamps and the badges.
   Every validated visit becomes an ink stamp: its shape says the kind of place (round for monuments, octagonal for museums,
   perforated like a postage stamp for restaurants…), its ink is the category colour, the place's name runs round the rim
   and the date sits in the middle. Each spot always leans at the same angle, so a page of stamps looks hand-pressed. */

export const ICONS = {
  LM: 'M3 20.5h18V22H3zM5 19V9h14v10h-3.5v-5a3.5 3.5 0 0 0-7 0v5zM3.5 8.2 12 4l8.5 4.2v.3h-17z',
  CH: 'M3 18h18l-1.6-9.5-4.4 4-3-6.5-3 6.5-4.4-4zM3 19.5h18V21H3z',
  MU: 'M2.5 20h19v1.6h-19zM4 9.5h16v-1L12 4 4 8.5zM5.5 10.5h2.2v8H5.5zm5.4 0h2.2v8h-2.2zm5.4 0h2.2v8h-2.2z',
  SA: 'M11.2 1h1.6v2.4h2v1.5h-2v2l6.2 4.6V22h-5.2v-5a1.8 1.8 0 0 0-3.6 0v5H5V11.5l6.2-4.6v-2h-2V3.4h2z',
  VP: 'M2 18.5h20V20H2zM12 9a6 6 0 0 1 6 6H6a6 6 0 0 1 6-6zM11.25 3h1.5v3.5h-1.5zM4 6.6l1-1.1 2.6 2.5-1 1.1zM20 6.6 17.4 9l-1-1.1L19 5.5z',
  PK: 'M12 2a6 6 0 0 0-4.9 9.5A5 5 0 0 0 9 21h2.2v-3.4h1.6V21H15a5 5 0 0 0 1.9-9.5A6 6 0 0 0 12 2z',
  NB: 'M11.2 22h1.6V10.5h-1.6zM7.5 10.5h9L15.3 6H8.7zM10.2 6h3.6L12 2.6zM9 22.2h6v-1.5H9z',
  RS: 'M6.5 2v8a2.3 2.3 0 0 0 2 2.3V22h1.7v-9.7a2.3 2.3 0 0 0 2-2.3V2h-1.4v6.5h-1V2H8.4v6.5h-1V2zM16.8 2C14.7 2 13.7 5 13.7 9.2v4h1.8V22h1.8V2z',
  CF: 'M3.5 8h13v6a5.5 5.5 0 0 1-5.5 5.5H9A5.5 5.5 0 0 1 3.5 14zM16.5 9.2h1.8a3.3 3.3 0 0 1 0 6.6h-1.9v-1.6h1.9a1.7 1.7 0 0 0 0-3.4h-1.8zM2.5 21h15v1.5h-15zM8 2.5c1 1.2 1 2.4 0 3.6M11.5 2.5c1 1.2 1 2.4 0 3.6',
  NO: 'M15.5 3a9 9 0 1 0 5.8 14.9A7.6 7.6 0 0 1 15.5 3zM19 2.5l.7 1.6 1.7.2-1.3 1.1.4 1.7-1.5-.9-1.5.9.4-1.7-1.3-1.1 1.7-.2z',
  SH: 'M5.5 8h13l1.2 13.5H4.3zM8.8 8V6.3a3.2 3.2 0 0 1 6.4 0V8h-1.6V6.3a1.6 1.6 0 0 0-3.2 0V8z',
  EX: 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z',
  ST: 'M2.5 18.5V6h2v7.5h7V9h7.5a3.5 3.5 0 0 1 3.5 3.5v6h-2v-2h-16v2zM7.8 12.4a2.1 2.1 0 1 0 0-.01z'
};

const SHAPE = { LM: 'ticks', CH: 'shield', MU: 'octagon', SA: 'arch', VP: 'rays', PK: 'oval', NB: 'hexagon', RS: 'perf', CF: 'rounded', NO: 'rosette', SH: 'diamond', EX: 'wavy', ST: 'frame' };

/* small stable hash of a string, for the stamp's tilt */
export const hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const tilt = id => (hash(id) % 25) - 12;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const poly = (n, r, rot = 0, cx = 100, cy = 100) => Array.from({ length: n }, (_, i) => { const a = rot + i * 2 * Math.PI / n; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
const star = (n, r1, r2, rot = -Math.PI / 2) => Array.from({ length: 2 * n }, (_, i) => { const r = i % 2 ? r2 : r1, a = rot + i * Math.PI / n; return `${(100 + r * Math.cos(a)).toFixed(1)},${(100 + r * Math.sin(a)).toFixed(1)}`; }).join(' ');

function outline(shape) {
  const W = 'stroke-width="5"', w = 'stroke-width="1.8"';
  switch (shape) {
    case 'octagon': return `<polygon points="${poly(8, 92, Math.PI / 8)}" ${W}/><polygon points="${poly(8, 82, Math.PI / 8)}" ${w}/>`;
    case 'hexagon': return `<polygon points="${poly(6, 93, 0)}" ${W}/><polygon points="${poly(6, 83, 0)}" ${w}/>`;
    case 'diamond': return `<polygon points="100,6 194,100 100,194 6,100" ${W}/><polygon points="100,20 180,100 100,180 20,100" ${w}/>`;
    case 'oval': return `<ellipse cx="100" cy="100" rx="94" ry="80" ${W}/><ellipse cx="100" cy="100" rx="85" ry="71" ${w}/>`;
    case 'rounded': return `<rect x="10" y="10" width="180" height="180" rx="34" ${W}/><rect x="20" y="20" width="160" height="160" rx="26" ${w}/>`;
    case 'frame': return `<rect x="8" y="16" width="184" height="168" rx="14" ${W}/><rect x="17" y="25" width="166" height="150" rx="9" ${w}/><rect x="22" y="30" width="156" height="140" rx="6" stroke-width="1"/>`;
    case 'perf': return `<rect x="10" y="10" width="180" height="180" stroke-width="7" stroke-dasharray="1 9.6" stroke-linecap="round"/><rect x="20" y="20" width="160" height="160" ${W}/>`;
    case 'arch': return `<path d="M14 192V92a86 86 0 0 1 172 0v100z" ${W}/><path d="M24 182V92a76 76 0 0 1 152 0v90z" ${w}/>`;
    case 'shield': return `<path d="M100 6l84 22v62c0 52-36 86-84 104C52 176 16 142 16 90V28z" ${W}/><path d="M100 17l73 19v54c0 45-31 75-73 91-42-16-73-46-73-91V36z" ${w}/>`;
    case 'rosette': return `<polygon points="${star(24, 94, 86)}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="100" cy="100" r="78" ${w}/>`;
    case 'wavy': return `<polygon points="${star(36, 94, 89)}" stroke-width="4" stroke-linejoin="round"/><circle cx="100" cy="100" r="80" ${w}/>`;
    case 'rays': return `<circle cx="100" cy="100" r="84" ${W}/><circle cx="100" cy="100" r="76" ${w}/>` + Array.from({ length: 36 }, (_, i) => { const a = i * Math.PI / 18; return `<line x1="${(100 + 88 * Math.cos(a)).toFixed(1)}" y1="${(100 + 88 * Math.sin(a)).toFixed(1)}" x2="${(100 + (i % 3 ? 93 : 97) * Math.cos(a)).toFixed(1)}" y2="${(100 + (i % 3 ? 93 : 97) * Math.sin(a)).toFixed(1)}" stroke-width="2"/>`; }).join('');
    default: return `<circle cx="100" cy="100" r="92" ${W}/><circle cx="100" cy="100" r="83" ${w}/>` + Array.from({ length: 60 }, (_, i) => { const a = i * Math.PI / 30; return `<line x1="${(100 + 83 * Math.cos(a)).toFixed(1)}" y1="${(100 + 83 * Math.sin(a)).toFixed(1)}" x2="${(100 + 79 * Math.cos(a)).toFixed(1)}" y2="${(100 + 79 * Math.sin(a)).toFixed(1)}" stroke-width="1.2"/>`; }).join('');
  }
}

/* a darker ink for light category colours, so every stamp reads on cream paper */
export function ink(hex) {
  const h = hex.replace('#', ''); let [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = 0.299 * r + 0.587 * g + 0.114 * b, f = lum > 150 ? 0.62 : lum > 110 ? 0.82 : 1;
  [r, g, b] = [r, g, b].map(v => Math.round(v * f));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export const INK_FILTER = `<filter id="pp-ink" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.5" result="d"/><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="b"/><feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2 1.95" result="m"/><feComposite in="d" in2="m" operator="in"/></filter>`;

/* The stamp of a spot. visit: { at: ISO date, how: 'geo'|'exif'|'self' } or null for an empty slot.
   o: { color, lang ('fr'|'en'), defs (include the ink filter, for a standalone file), size, months (12 short month names) } */
export function stampSVG(spot, visit, o = {}) {
  const shape = SHAPE[spot.c] || 'ticks';
  const months = o.months || ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
  const self = visit && visit.how === 'self';
  const color = visit ? (self ? '#6f7480' : ink(o.color || '#333')) : 'currentColor';
  const id = 'p' + hash(spot.id).toString(36);
  const r = shape === 'diamond' ? 52 : shape === 'oval' ? 62 : 66;
  let name = String(spot.n).replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  const maxChars = shape === 'diamond' ? 20 : 26;
  if (name.length > maxChars) name = name.slice(0, maxChars - 1).replace(/[\s–-]+$/, '') + '…';
  const fs = name.length > 20 ? 12 : name.length > 14 ? 14 : 16;
  let date = '', line2 = '';
  if (visit) {
    const d = new Date(visit.at);
    date = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    line2 = o.lang === 'en' ? (self ? 'NOTED' : 'VISITED') : (self ? 'DÉCLARÉ' : 'VISITÉ');
  }
  const top = `M ${100 - r},100 a ${r},${r} 0 1,1 ${2 * r},0`, bottom = `M ${100 - r + 4},100 a ${r - 4},${r - 4} 0 0,0 ${2 * (r - 4)},0`;
  const empty = !visit;
  return `<svg class="stamp${empty ? ' empty' : ''}${self ? ' self' : ''}" viewBox="0 0 200 200" ${o.size ? `width="${o.size}" height="${o.size}"` : ''} role="img" aria-label="${esc(spot.n)}${date ? ', ' + esc(date) : ''}" xmlns="http://www.w3.org/2000/svg">`
    + (o.defs ? `<defs>${INK_FILTER}</defs>` : '')
    + `<g transform="rotate(${empty ? 0 : tilt(spot.id)} 100 100)" fill="none" stroke="${color}" ${empty ? 'stroke-dasharray="3 5" opacity=".38"' : 'filter="url(#pp-ink)"'}>`
    + outline(shape)
    + `<path id="${id}t" d="${top}" stroke="none"/><path id="${id}b" d="${bottom}" stroke="none"/>`
    + `<text fill="${color}" stroke="none" font-family="'IBM Plex Mono',ui-monospace,monospace" font-weight="600" font-size="${fs}" letter-spacing="1.5"><textPath href="#${id}t" startOffset="50%" text-anchor="middle">${esc(name)}</textPath></text>`
    + `<text fill="${color}" stroke="none" font-family="'IBM Plex Mono',ui-monospace,monospace" font-weight="600" font-size="11.5" letter-spacing="4"><textPath href="#${id}b" startOffset="50%" text-anchor="middle" dominant-baseline="hanging">★ PARIS ★</textPath></text>`
    + `<path d="${ICONS[spot.c] || ICONS.EX}" transform="translate(${empty ? 76 : 82} ${empty ? 70 : 54}) scale(${empty ? 2 : 1.5})" fill="${color}" stroke="none"/>`
    + (visit ? `<text x="100" y="114" text-anchor="middle" fill="${color}" stroke="none" font-family="'IBM Plex Mono',ui-monospace,monospace" font-weight="600" font-size="15" letter-spacing="1">${esc(date)}</text>`
      + `<line x1="58" y1="122" x2="142" y2="122" stroke-width="1.4"/><text x="100" y="138" text-anchor="middle" fill="${color}" stroke="none" font-family="'IBM Plex Mono',ui-monospace,monospace" font-size="10" letter-spacing="3">${line2}</text>` : '')
    + `</g></svg>`;
}

/* ---- Points, ranks and badges ---- */
export const points = (spot, visit) => Math.round(spot.i * 10 * (visit.how === 'self' ? 0.6 : 1) * (visit.duo ? 1.2 : 1));
export const RANKS = [[0, 'tourist'], [60, 'stroller'], [180, 'walker'], [380, 'connoisseur'], [700, 'adopted'], [1100, 'ambassador']];
export function rank(total) { let r = RANKS[0], next = null; for (let k = 0; k < RANKS.length; k++) if (total >= RANKS[k][0]) { r = RANKS[k]; next = RANKS[k + 1] || null; } return { key: r[1], at: r[0], next: next && { key: next[1], at: next[0] } }; }

const ARR = /(\d{1,2})(?:er|e)\b/;
const LEFT = new Set([5, 6, 7, 13, 14, 15]);
const BRIDGES = ['pont-alexandre-iii', 'pont-neuf-square-du-vert-galant', 'pont-des-arts', 'pont-de-bir-hakeim'];
/* badges: [{ id, n (done), of (needed) }]; lists: { christmas: Set, chic: Set } of spot ids */
export function badges(spots, visits, lists = {}) {
  const S = new Map(spots.map(s => [s.id, s]));
  const V = Object.entries(visits || {}).map(([id, v]) => ({ s: S.get(id), v })).filter(x => x.s);
  const cnt = f => V.filter(f).length;
  const hour = v => new Date(v.at).getHours();
  const arrs = new Set(V.filter(x => x.s.z === 'P').map(x => { const m = String(x.s.a).match(ARR); return m ? +m[1] : null; }).filter(Boolean));
  const inSeason = v => { const d = new Date(v.at), m = d.getMonth() + 1, day = d.getDate(); return (m === 11 && day >= 14) || m === 12 || (m === 1 && day <= 6); };
  const icons = spots.filter(s => s.i === 5);
  return [
    { id: 'icons', n: cnt(x => x.s.i === 5), of: icons.length },
    { id: 'firsts', n: Math.min(10, cnt(x => x.s.i >= 4)), of: 10 },
    { id: 'lights', n: Math.min(5, cnt(x => lists.christmas && lists.christmas.has(x.s.id) && inSeason(x.v))), of: 5 },
    { id: 'bridges', n: cnt(x => BRIDGES.includes(x.s.id)), of: BRIDGES.length },
    { id: 'arrondissements', n: Math.min(10, arrs.size), of: 10 },
    { id: 'leftbank', n: Math.min(8, cnt(x => x.s.z === 'P' && (() => { const m = String(x.s.a).match(ARR); return m && LEFT.has(+m[1]); })())), of: 8 },
    { id: 'museums', n: Math.min(5, cnt(x => x.s.c === 'MU')), of: 5 },
    { id: 'gourmet', n: Math.min(6, cnt(x => x.s.c === 'RS' || x.s.c === 'CF')), of: 6 },
    { id: 'chic', n: Math.min(5, cnt(x => lists.chic && lists.chic.has(x.s.id))), of: 5 },
    { id: 'beyond', n: Math.min(3, cnt(x => x.s.z !== 'P')), of: 3 },
    { id: 'night', n: Math.min(3, cnt(x => { const h = hour(x.v); return h >= 21 || h < 5; })), of: 3 },
    { id: 'early', n: Math.min(3, cnt(x => { const h = hour(x.v); return h >= 5 && h < 9; })), of: 3 },
    { id: 'duo', n: Math.min(5, cnt(x => x.v.duo)), of: 5 },
    { id: 'onsite', n: Math.min(10, cnt(x => x.v.how === 'geo' || x.v.how === 'exif')), of: 10 }
  ];
}
