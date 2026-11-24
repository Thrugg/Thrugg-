/* Prisme — all the arithmetic, pure functions (no DOM, no storage), so node --test can check it.
   Catalogue and market data come from data/ through setData(). Reasons are returned as codes with values;
   ui.js turns them into English or French. */

let ITEMS = [], BY = {}, MKT = null, PRE = [];
export function setData(cat, market, prebuilts) {
  ITEMS = (cat && cat.items) || [];
  BY = Object.fromEntries(ITEMS.map(i => [i.id, i]));
  MKT = market || null;
  PRE = (prebuilts && prebuilts.items) || [];
}
export const items = cat => cat ? ITEMS.filter(i => i.cat === cat) : ITEMS;
export const byId = id => BY[id] || (typeof id === 'string' && id.includes('@') ? tvAsMonitor(BY[id.split('@')[0]], Number(id.split('@')[1])) : null);
export const market = () => MKT;
export const prebuilts = () => PRE;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = v => Number(v) || 0;
const rnd = (v, s = 1) => Math.round(v / s) * s;

/* ---------- prices ---------- */
/* Guide price for a market. Germany is the base; France uses its own figure when the catalogue has one, else the
   German one adjusted for VAT (marked derived). A TV gives one price per size. */
export function priceOf(it, mk = 'DE', size) {
  if (!it || !it.p) return null;
  const f = (MKT && MKT.frFactor) || 1.03;
  const pick = v => (v && typeof v === 'object') ? (size != null ? v[String(size)] : null) : v;
  let v = mk === 'FR' ? pick(it.p.fr) : pick(it.p.de), derived = false;
  if (mk === 'FR' && (v == null || v === 0)) { const d = pick(it.p.de); if (d) { v = rnd(d * f, 10) - 1; derived = true; } }
  if (!(v > 0)) return null;
  return { v, derived, conf: it.conf || 'L', date: it.pd || '' };
}
export const price = (it, mk, size) => { const p = priceOf(it, mk, size); return p ? p.v : 0; };
export function sizesOf(it, mk = 'DE') {
  const src = it && it.p && (it.p.de && typeof it.p.de === 'object' ? it.p.de : null);
  return src ? Object.keys(src).map(Number).sort((a, b) => a - b).filter(s => price(it, mk, s) > 0) : [];
}

/* ---------- performance model ---------- */
/* Typical frames per second for an RTX 5080 at high or ultra settings, from the averages of recent reviews
   (ComputerBase, TechPowerUp, PCGH). Every other card scales with its index (5080 = 100). */
export const REF = { '4k': { aaa: 72, rt: 44, pt: 27, esports: 320 }, '1440': { aaa: 125, rt: 78, pt: 48, esports: 470 }, '1080': { aaa: 165, rt: 105, pt: 66, esports: 560 } };
/* What a Ryzen 7 9800X3D can feed in the same games (index 100); slower processors scale down. */
export const CAP = { aaa: 185, rt: 160, pt: 150, esports: 620 };
export const UP = { off: 1, quality: 1.45, balanced: 1.65, performance: 1.9 };
export const FG = { off: 1, x2: 1.75, x4: 3.1 };
export const resOf = (w) => w >= 3800 ? '4k' : w >= 2500 ? '1440' : '1080';
const gIdx = (g, res, kind) => kind === 'rt' || kind === 'pt' ? num(g.s.rt) : res === '4k' ? num(g.s.perf4k) : num(g.s.perf1440) * (res === '1080' ? 1 : 1);
const PIX = { '4k': 3840 * 2160, '1440': 2560 * 1440, '1080': 1920 * 1080 };
/* Frame rates for any mode (an ultrawide, 5K2K, the 57-inch's 7680×2160): from the nearest reference resolution,
   scaled by pixel count (power 0.85: twice the pixels costs a little less than half the frames). */
export function fpsAt(gpu, cpu, w, h, kind = 'aaa', up = 'off', fg = 'off') {
  const px = w * h, res = px >= 6e6 ? '4k' : px >= 3e6 ? '1440' : '1080';
  const f = fps(gpu, cpu, res, kind, up, fg); if (!f) return null;
  const k = Math.pow(PIX[res] / px, 0.85), cap = cpu ? CAP[kind] * num(cpu.s.game) / 100 : Infinity;
  const native = f.native * k, gpuSide = native * (f.upUsed ? UP[up] : 1), base = Math.min(gpuSide, cap), mult = f.base > 0 ? f.shown / f.base : 1;
  return { ...f, native: Math.round(native), base: Math.round(base), shown: Math.round(base * mult), cpuBound: cap < gpuSide, fgLowBase: f.fgUsed && base < 55 };
}
/* The cheapest graphics card in the catalogue that reaches a frame rate in big games at a monitor's native
   resolution with Quality upscaling, or null when none does. */
export function gpuNeed(mon, cpu, target = 90, mk = 'DE') {
  const ok = items('gpu').filter(g => price(g, mk) > 0 && fpsAt(g, cpu, mon.s.w, mon.s.h, 'aaa', 'quality').base >= target).sort((a, b) => price(a, mk) - price(b, mk));
  return ok[0] || null;
}
export function fps(gpu, cpu, res = '4k', kind = 'aaa', up = 'off', fg = 'off') {
  if (!gpu) return null;
  const gNative = REF[res][kind] * gIdx(gpu, res, kind) / 100;
  const upOk = up !== 'off' && gpu.s.up, upF = upOk ? UP[up] : 1;
  const cap = cpu ? CAP[kind] * num(cpu.s.game) / 100 : Infinity;
  const gpuSide = gNative * upF, base = Math.min(gpuSide, cap);
  const fgOk = fg === 'x4' ? !!gpu.s.mfg : fg === 'x2' ? !!gpu.s.up : true, fgF = fgOk ? FG[fg] : 1;
  return { native: Math.round(gNative), base: Math.round(base), shown: Math.round(base * fgF), cpuBound: cap < gpuSide, fgUsed: fgOk && fg !== 'off', fgLowBase: fgOk && fg !== 'off' && base < 55, upUsed: upOk };
}
/* Which part limits: at 4K the card should; a processor that holds the card back wastes money, and so does a
   processor far beyond what the card can use. */
export function balance(gpu, cpu, res = '4k', kind = 'aaa') {
  if (!gpu || !cpu) return null;
  const g = REF[res][kind] * gIdx(gpu, res, kind) / 100, c = CAP[kind] * num(cpu.s.game) / 100;
  const held = g > c ? 1 - c / g : 0;
  const state = held > 0.15 ? 'cpuLimits' : held > 0.03 ? 'cpuSlight' : c > 2.6 * g && num(cpu.s.game) >= 99 && num(cpu.s.multi) < 90 ? 'cpuOverkill' : 'good';
  return { gpuFps: Math.round(g), cpuFps: Math.round(c), held: Math.round(held * 100), state };
}

/* ---------- PC builder ---------- */
export const USES = {
  aaa4k: { res: '4k', kind: 'aaa', share: 0.5, metric: 'perf4k', cpuNeed: g => num(g.s.perf4k) >= 95 ? 90 : 74, ram: 32 },
  hfr1440: { res: '1440', kind: 'aaa', share: 0.42, metric: 'perf1440', cpuNeed: () => 86, ram: 32 },
  esports: { res: '1440', kind: 'esports', share: 0.32, metric: 'perf1440', cpuNeed: () => 95, ram: 32 },
  creator: { res: '4k', kind: 'aaa', share: 0.36, metric: 'perf4k', cpuNeed: () => 74, multiNeed: 80, ram: 64 },
  allround: { res: '1440', kind: 'aaa', share: 0.42, metric: 'perf1440', cpuNeed: () => 75, ram: 32 }
};
export const PARTS = ['gpu', 'cpu', 'board', 'ram', 'ssd', 'psu', 'cooler', 'case'];
export function psuNeed(gpu, cpu) {
  const need = num(gpu && gpu.s.watts) + num(cpu && cpu.s.peak) + 75;
  /* 20 % headroom for power spikes, and never below what the card's maker recommends (850 W for an RTX 5080) */
  return { need, rec: Math.max(Math.ceil(need * 1.2 / 50) * 50, num(gpu && gpu.s.psu)) };
}
const byPrice = (list, mk) => list.filter(i => price(i, mk) > 0).sort((a, b) => price(a, mk) - price(b, mk));
const cheapest = (list, mk, ok) => byPrice(list, mk).find(ok) || null;

/* Hard rules (it would not work or fit) and soft ones (what this person asked for). */
function cpuOk(c, gpu, o, relax) {
  const u = USES[o.use] || USES.allround;
  if (o.platform && o.platform !== 'any' && (o.platform === 'amd') !== (c.s.socket === 'AM5')) return false;
  const need = u.cpuNeed(gpu) * (relax ? 0.85 : 1);
  if (num(c.s.game) < need) return false;
  if (u.multiNeed && num(c.s.multi) < u.multiNeed * (relax ? 0.75 : 1)) return false;
  return true;
}
function caseOk(k, gpu, cool, psu, o, relax) {
  const sz = o.size || 'any';
  if (sz === 'sff' ? k.s.size !== 'sff' : sz === 'small' ? !['small', 'sff'].includes(k.s.size) : !['mid', 'full'].includes(k.s.size)) return false;
  if (gpu && num(gpu.s.len) + 10 > num(k.s.gpuMax)) return false;
  if (cool && cool.s.type === 'air' && num(cool.s.h) > num(k.s.coolerMax)) return false;
  if (cool && cool.s.type === 'aio' && num(cool.s.rad) > num(k.s.rad)) return false;
  if (psu && k.s.size === 'sff' && psu.s.form !== 'sfx') return false;
  if (o._board && (k.s.size === 'sff' ? o._board.s.form !== 'itx' : k.s.form === 'matx' && o._board.s.form === 'atx')) return false;
  if (relax) return true;
  if (o.look === 'white' && !k.s.white) return false;
  if (o.noise === 'quiet' && num(k.s.quiet) < 7) return false;
  const heat = num(gpu && gpu.s.watts) + 160;
  if (heat > 450 && num(k.s.airflow) < 8) return false;
  return true;
}
function assemble(gpu, o, relax, lock = {}) {
  const mk = o.market || 'DE', u = USES[o.use] || USES.allround, P = { gpu };
  const pickL = (cat, ok) => lock[cat] && byId(lock[cat]) && byId(lock[cat]).cat === cat ? byId(lock[cat]) : cheapest(items(cat), mk, ok);
  const cool = c => o.size !== 'sff' || num(c.s.peak) <= 200;          // a small case cools up to about 200 W
  P.cpu = pickL('cpu', c => cpuOk(c, gpu, o, relax) && cool(c)) || pickL('cpu', c => cpuOk(c, gpu, o, true) && cool(c)) || pickL('cpu', cool) || byPrice(items('cpu'), mk)[0];
  const tierNeed = o.use === 'creator' && !relax ? 3 : Math.max(1, num(P.cpu.s.tier) - 1);
  /* board size follows the case size: mini-ITX for very small cases, micro-ATX or smaller for small ones */
  const formOk = b => o.size === 'sff' ? b.s.form === 'itx' : o.size === 'small' ? b.s.form !== 'atx' : b.s.form !== 'itx';
  P.board = pickL('board', b => b.s.socket === P.cpu.s.socket && num(b.s.tier) >= tierNeed && (!o.wifi || b.s.wifi) && formOk(b)) || pickL('board', b => b.s.socket === P.cpu.s.socket && formOk(b)) || pickL('board', b => b.s.socket === P.cpu.s.socket);
  const ramGb = o.ram || u.ram;
  P.ram = pickL('ram', r => num(r.s.gb) >= ramGb && (relax || num(r.s.mts) >= 6000)) || pickL('ram', r => num(r.s.gb) >= Math.min(32, ramGb));
  const tb = o.storage || 2;
  P.ssd = pickL('ssd', d => num(d.s.tb) >= tb && (relax || d.s.dram)) || pickL('ssd', d => num(d.s.tb) >= Math.min(tb, 1));
  const sff = o.size === 'sff', { rec } = psuNeed(gpu, P.cpu), hiGpu = num(gpu.s.watts) >= 300;
  P.psu = pickL('psu', p => (sff ? p.s.form === 'sfx' : p.s.form !== 'sfx') && num(p.s.w) >= rec && (gpu.s.conn !== '12v2x6' || p.s.native) && (relax || !hiGpu || p.s.tier === 'A'))
    || pickL('psu', p => (sff ? p.s.form === 'sfx' : true) && num(p.s.w) >= rec) || byPrice(items('psu'), mk).slice(-1)[0];
  const heat = num(P.cpu.s.peak);
  /* small cases: an air cooler up to 155 mm or a radiator up to 280 mm (the case pick then checks it really fits) */
  const coolOk = c => num(c.s.cap) >= heat && (relax || o.noise !== 'quiet' || num(c.s.quiet) >= 8) && (sff ? (c.s.type === 'air' ? num(c.s.h) <= 155 : num(c.s.rad) <= 280) : num(c.s.h || 0) > 100 || c.s.type === 'aio');
  P.cooler = pickL('cooler', coolOk) || pickL('cooler', c => num(c.s.cap) >= heat * 0.85) || byPrice(items('cooler'), mk)[0];
  const sameSize = k => o.size === 'sff' ? k.s.size === 'sff' : o.size === 'small' ? k.s.size !== 'full' : ['mid', 'full'].includes(k.s.size);
  o = { ...o, _board: P.board };
  P.case = pickL('case', k => caseOk(k, gpu, P.cooler, P.psu, o, relax)) || pickL('case', k => caseOk(k, gpu, P.cooler, P.psu, o, true)) || byPrice(items('case').filter(sameSize), mk).slice(-1)[0] || byPrice(items('case'), mk).slice(-1)[0];
  return P;
}
/* "Maximum performance": spend what is left, slot by slot in order of what it does for the use, on the strongest part
   that still fits the budget and the rest of the build (the parts that depend on it are re-picked). */
const DEPENDS = { gpu: ['psu', 'case'], cpu: ['board', 'cooler', 'psu', 'case'], ram: [], ssd: [], cooler: ['case'], board: [], psu: [], case: [] };
function maximise(P, o, budget, relaxed, anchor, lock) {
  const mk = o.market || 'DE', u = USES[o.use] || USES.allround, creator = o.use === 'creator', tb = o.storage || 2;
  const M = {
    gpu: it => num(it.s[u.metric]), cpu: it => creator ? num(it.s.multi) : num(it.s.game),
    ram: it => Math.min(num(it.s.gb), creator ? 96 : Math.max(32, o.ram || 32)) * 1000 + num(it.s.mts) / 10 - num(it.s.cl),
    ssd: it => Math.min(num(it.s.tb), tb) * 100 + num(it.s.gen) * 10 + (it.s.dram ? 1 : 0),
    cooler: it => num(it.s.cap) + num(it.s.quiet) * 10, board: it => num(it.s.tier) * 10 + (it.s.usb4 ? 1 : 0),
    psu: it => (it.s.tier === 'A' ? 1000 : 0) + ({ Titanium: 3, Platinum: 2 }[it.s.eff] || 1) * 100 + num(it.s.w) / 100, case: it => num(it.s.airflow) * 10 + num(it.s.quiet)
  };
  const fits = Q => total(Q, mk) <= budget && !compat(Q, o).some(c => c.st === 'fail');
  for (let pass = 0; pass < 2; pass++) for (const k of ['gpu', 'cpu', 'ram', 'ssd', 'cooler', 'board', 'psu', 'case']) {
    if (lock[k] || (k === 'gpu' && anchor)) continue;
    const better = items(k).filter(c => price(c, mk) > 0 && M[k](c) > M[k](P[k])).sort((a, b) => M[k](b) - M[k](a) || price(a, mk) - price(b, mk));
    for (const c of better) {
      const keep = Object.fromEntries(PARTS.filter(x => x !== k && !DEPENDS[k].includes(x)).map(x => [x, P[x].id]));
      const Q = assemble(k === 'gpu' ? c : P.gpu, o, relaxed, { ...lock, ...keep, [k]: c.id });
      if (fits(Q)) { P = Q; break; }
    }
  }
  return P;
}
export const total = (P, mk = 'DE') => PARTS.reduce((a, k) => a + (P[k] ? price(P[k], mk) : 0), 0);

/* Build from the person's goal. The graphics card takes the use's share of the budget (or the one they chose),
   the rest is the cheapest that meets the needs, then leftover money upgrades the processor and the cooling. */
export function build(o) {
  const mk = o.market || 'DE', u = USES[o.use] || USES.allround, budget = num(o.budget) || 2500, lock = o.lock || {};
  const anchor = o.gpu ? byId(o.gpu) : null;
  let gpus = anchor ? [anchor] : items('gpu').filter(g => price(g, mk) > 0 && (!o.brand || o.brand === 'any' || g.brand.toLowerCase() === o.brand)).sort((a, b) => num(b.s[u.metric]) - num(a.s[u.metric]));
  if (!gpus.length) gpus = items('gpu');
  let start = anchor ? 0 : gpus.findIndex(g => price(g, mk) <= budget * u.share);
  if (start < 0) start = gpus.length - 1;
  let P = null, relaxed = false;
  for (let i = start; i < gpus.length && !P; i++) {
    const a = assemble(gpus[i], o, false, lock);
    if (total(a, mk) <= budget) { P = a; break; }
    const b = assemble(gpus[i], o, true, lock);
    if (total(b, mk) <= budget) { P = b; relaxed = true; }
  }
  /* a card above the share can still fit when the rest is cheap: try one step up */
  if (P && !anchor && start > 0) { const up = assemble(gpus[start - 1], o, false, lock); if (total(up, mk) <= budget) P = up; }
  if (!P) { P = assemble(anchor || gpus[gpus.length - 1], o, true, lock); relaxed = true; }
  /* leftover: a faster processor where it shows (high frame rates, creators, a top card), then quieter cooling.
     At 4K a mid-range card is the limit, so the money stays with the person instead. */
  let left = budget - total(P, mk);
  const cpuMatters = o.use !== 'aaa4k' || num(P.gpu.s.perf4k) >= 95 || (balance(P.gpu, P.cpu, u.res, u.kind) || {}).held > 0;
  if (!lock.cpu && cpuMatters) {
    const better = byPrice(items('cpu'), mk).filter(c => c.s.socket === P.cpu.s.socket && (o.use === 'creator' ? num(c.s.multi) > num(P.cpu.s.multi) + 8 : num(c.s.game) > num(P.cpu.s.game) + 4) && price(c, mk) - price(P.cpu, mk) <= left);
    if (better.length) {
      const pick = better.sort((a, b) => (o.use === 'creator' ? num(b.s.multi) - num(a.s.multi) : num(b.s.game) - num(a.s.game)) || price(a, mk) - price(b, mk))[0];
      const trial = assemble(P.gpu, o, relaxed, { ...lock, cpu: pick.id });
      if (total(trial, mk) <= budget) P = trial;
    }
  }
  left = budget - total(P, mk);
  if (!lock.cooler && left > (o.noise === 'quiet' ? 40 : 150)) {
    const q = byPrice(items('cooler'), mk).filter(c => num(c.s.quiet) > num(P.cooler.s.quiet) && num(c.s.cap) >= num(P.cpu.s.peak) && price(c, mk) - price(P.cooler, mk) <= Math.min(left, 110) && caseOk(P.case, P.gpu, c, P.psu, o, true));
    if (q.length) P.cooler = q[q.length - 1];
  }
  if (o.aim === 'max') P = maximise(P, o, budget, relaxed, anchor, lock);
  const t = total(P, mk);
  return { parts: P, total: t, budget, over: t > budget, relaxed, left: budget - t, checks: compat(P, o), balance: balance(P.gpu, P.cpu, u.res, u.kind), fps: fps(P.gpu, P.cpu, u.res, u.kind, 'quality', 'off'), use: o.use || 'allround' };
}

/* Every check on a parts list, including one the person changed by hand. */
export function compat(P, o = {}) {
  const C = [], add = (k, st, v) => C.push({ k, st, v: v || {} });
  const { gpu, cpu, board, psu, cooler } = P, cs = P.case, u = USES[o.use] || USES.allround;
  if (cpu && board) add('socket', cpu.s.socket === board.s.socket ? 'pass' : 'fail', { cpu: cpu.s.socket, board: board.s.socket });
  if (gpu && cs) { const room = num(cs.s.gpuMax) - num(gpu.s.len); add('gpuLen', room >= 10 ? 'pass' : room >= 0 ? 'warn' : 'fail', { len: gpu.s.len, max: cs.s.gpuMax }); }
  if (cooler && cs) {
    if (cooler.s.type === 'air') add('coolerFit', num(cooler.s.h) <= num(cs.s.coolerMax) ? 'pass' : 'fail', { h: cooler.s.h, max: cs.s.coolerMax });
    else add('radFit', num(cooler.s.rad) <= num(cs.s.rad) ? 'pass' : 'fail', { rad: cooler.s.rad, max: cs.s.rad });
  }
  if (cooler && cpu) { const r = num(cooler.s.cap) / num(cpu.s.peak); add('coolerCap', r >= 1 ? 'pass' : r >= 0.85 ? 'warn' : 'fail', { cap: cooler.s.cap, peak: cpu.s.peak }); }
  if (psu && gpu) {
    const { need, rec } = psuNeed(gpu, cpu); add('psuW', num(psu.s.w) >= rec ? 'pass' : num(psu.s.w) >= need ? 'warn' : 'fail', { w: psu.s.w, need, rec });
    if (gpu.s.conn === '12v2x6') add('psuConn', psu.s.native ? 'pass' : 'warn', {});
    if (num(gpu.s.watts) >= 300) add('psuTier', psu.s.tier === 'A' ? 'pass' : 'warn', {});
  }
  if (psu && cs && cs.s.size === 'sff') add('psuForm', psu.s.form === 'sfx' ? 'pass' : 'fail', {});
  if (gpu && cs) { const heat = num(gpu.s.watts) + num(cpu && cpu.s.peak); if (heat > 450) add('airflow', num(cs.s.airflow) >= 8 ? 'pass' : 'warn', { heat }); }
  if (gpu && u.res === '4k') add('vram', num(gpu.s.vram) >= 16 ? 'pass' : 'warn', { vram: gpu.s.vram });
  if (cpu && board) add('vrm', num(cpu.s.tier) >= 3 && num(board.s.tier) < 2 ? 'warn' : 'pass', {});
  if (cs && P.board) { const bf = P.board.s.form || 'atx', ok = cs.s.size === 'sff' ? bf === 'itx' : cs.s.form === 'matx' ? bf !== 'atx' : true; add('boardForm', ok ? 'pass' : 'fail', { board: bf, case: cs.s.size === 'sff' ? 'itx' : cs.s.form || 'atx' }); }
  if (cs && cs.s.size === 'sff') add('itx', 'warn', {});
  return C;
}
/* Alternatives for one slot, cheapest first, each with whether it fits the rest of the build. */
export function alternatives(cat, P, o = {}) {
  const mk = o.market || 'DE';
  return byPrice(items(cat), mk).map(it => { const Q = { ...P, [cat]: it }; const c = compat(Q, o); return { it, price: price(it, mk), fails: c.filter(x => x.st === 'fail').length, warns: c.filter(x => x.st === 'warn').length }; });
}

/* ---------- ready-made PCs ---------- */
/* What a fair price looks like: the same parts bought one by one, plus assembly and testing (6-15 %), plus Windows. */
export function fairPrice(partsTotal, withOs = true) {
  const a = (MKT && MKT.assembly) || { lo: 0.06, hi: 0.15 }, win = withOs ? num(MKT && MKT.windows) || 120 : 0;
  return { lo: rnd(partsTotal * (1 + a.lo) + win, 10), hi: rnd(partsTotal * (1 + a.hi) + win, 10), parts: partsTotal, win };
}
const norm = s => String(s || '').toLowerCase().replace(/geforce|radeon|amd|intel|nvidia|core|ryzen|®|™/g, '').replace(/[^a-z0-9]/g, '');
/* Find a catalogue part in free text ("ASUS TUF RTX 5070 Ti OC 16GB" → gpu-rtx5070ti). Longest names first, so a
   5070 Ti is never read as a 5070. */
export function matchPart(text, cat) {
  const t = norm(text);
  const keys = items(cat).map(i => ({ i, k: norm(i.name.replace(/\(.*?\)/g, '').replace(/16 GB/, '')) })).sort((a, b) => b.k.length - a.k.length);
  for (const { i, k } of keys) if (k && t.includes(k)) return i;
  return null;
}
const PSU_BRANDS = /be ?quiet|corsair|seasonic|msi|thermaltake|cooler ?master|gigabyte|asus|lian ?li|nzxt|fractal|super ?flower|fsp|xpg|phanteks|montech|endorfy|silverstone|enermax/i;
/* Read an offer's spec text (pasted or recognised from a screenshot): processor, card, memory, drive, power supply,
   board chipset, Windows and the price. */
export function parseOffer(text) {
  const T = String(text || '').replace(/ /g, ' ');
  const o = { cpu: null, gpu: null, ram: null, ramMts: null, ramSingle: false, ssd: null, psuW: null, psuBrand: null, chipset: null, os: /windows\s*1[01]/i.test(T), price: null, qlc: /\bqlc\b/i.test(T) };
  const c = matchPart(T, 'cpu'); if (c) o.cpu = c.id;
  const g = matchPart(T, 'gpu'); if (g) o.gpu = g.id;
  const ram = T.match(/(\d{2,3})\s?GB[^\n]{0,30}?DDR5(?:[-\s]?(\d{4}))?/i) || T.match(/DDR5[^\n]{0,20}?(\d{2,3})\s?GB/i);
  if (ram) { o.ram = Number(ram[1]); if (ram[2]) o.ramMts = Number(ram[2]); }
  const mts = T.match(/DDR5[-\s]?(\d{4})/i) || T.match(/(\d{4})\s?MT\/s/i); if (mts && !o.ramMts) o.ramMts = Number(mts[1]);
  if (/1\s?x\s?(16|32)\s?GB|single[- ]channel/i.test(T)) o.ramSingle = true;
  const tb = T.match(/(\d(?:[.,]\d)?)\s?TB[^\n]{0,25}?(?:SSD|NVMe|M\.2)/i) || T.match(/(?:SSD|NVMe|M\.2)[^\n]{0,25}?(\d(?:[.,]\d)?)\s?TB/i);
  const gb = T.match(/(\d{3,4})\s?GB[^\n]{0,25}?(?:SSD|NVMe|M\.2)/i);
  if (tb) o.ssd = Number(tb[1].replace(',', '.')); else if (gb) o.ssd = Number(gb[1]) / 1000;
  const psu = T.match(/(\d{3,4})\s?(?:W\b|Watt)/i); if (psu && Number(psu[1]) >= 300) o.psuW = Number(psu[1]);
  const pl = T.split(/\n/).find(l => /(\d{3,4})\s?(?:W\b|Watt)/i.test(l)); if (pl) { const b = pl.match(PSU_BRANDS); if (b) o.psuBrand = b[0]; }
  const cs = T.match(/\b(X870E|X870|B850|B650E?|A620|B860|Z890|H810|B760|Z790|H610)\b/i); if (cs) o.chipset = cs[1].toUpperCase();
  const prices = [...T.matchAll(/(?:€\s?(\d{1,2}[.\s]?\d{3}(?:,\d{2})?)|(\d{1,2}[.\s]?\d{3}(?:,\d{2})?)\s?€)/g)].map(m => Number((m[1] || m[2]).replace(/[.\s]/g, '').replace(',', '.'))).filter(v => v >= 400 && v <= 20000);
  if (prices.length) o.price = Math.min(...prices);
  return o;
}
/* Score an offer: the parts bought one by one against its price, how balanced it is, and the corners it cuts. */
export function checkOffer(o, mk = 'DE', use = 'aaa4k') {
  const gpu = byId(o.gpu) || matchPart(o.gpu, 'gpu'), cpu = byId(o.cpu) || matchPart(o.cpu, 'cpu'), u = USES[use] || USES.aaa4k, flags = [];
  if (!gpu || !cpu || !(o.price > 0)) return { ok: false, missing: [!gpu && 'gpu', !cpu && 'cpu', !(o.price > 0) && 'price'].filter(Boolean) };
  const board = cheapest(items('board'), mk, b => b.s.socket === cpu.s.socket && num(b.s.tier) >= (/X870|Z890/i.test(o.chipset || '') ? 3 : /B850|B860/i.test(o.chipset || '') ? 2 : 1));
  const ram = cheapest(items('ram'), mk, r => num(r.s.gb) >= Math.min(64, num(o.ram) || 32));
  const ssd = cheapest(items('ssd'), mk, d => num(d.s.tb) >= Math.min(4, num(o.ssd) || 1));
  const psu = cheapest(items('psu'), mk, p => num(p.s.w) >= (num(o.psuW) || psuNeed(gpu, cpu).rec));
  const extras = 90 + 45;                                            // case and cooler at their cheapest sensible price
  const parts = price(gpu, mk) + price(cpu, mk) + price(board, mk) + price(ram, mk) + price(ssd, mk) + price(psu, mk) + extras;
  const fair = fairPrice(parts, o.os !== false);
  const ratio = fair.lo / o.price;
  const { rec } = psuNeed(gpu, cpu);
  if (o.psuW && o.psuW < rec) flags.push({ k: 'psuLow', w: o.psuW, rec });
  if (!o.psuBrand) flags.push({ k: 'psuUnknown' });
  if (o.ram && o.ram < 32) flags.push({ k: 'ramSmall', gb: o.ram });
  if (o.ramSingle) flags.push({ k: 'ramSingle' });
  if (o.ramMts && o.ramMts < 5600) flags.push({ k: 'ramSlow', mts: o.ramMts });
  if (o.ssd && o.ssd < 1) flags.push({ k: 'ssdSmall', tb: o.ssd });
  if (o.qlc) flags.push({ k: 'qlc' });
  if (/A620|H610|H810/i.test(o.chipset || '') && num(cpu.s.tier) >= 2) flags.push({ k: 'boardLow', chip: o.chipset });
  const bal = balance(gpu, cpu, u.res, u.kind);
  if (bal && bal.state === 'cpuLimits') flags.push({ k: 'cpuLimits', held: bal.held });
  const value = clamp((ratio - 0.8) / 0.35, 0, 1), quality = clamp(1 - flags.reduce((a, f) => a + (['psuLow', 'ramSingle', 'cpuLimits', 'boardLow'].includes(f.k) ? 0.3 : 0.12), 0), 0, 1);
  const score = Math.round(100 * (0.6 * value + 0.4 * quality));
  return { ok: true, gpu, cpu, parts, fair, ratio, verdict: ratio >= 1.02 ? 'good' : ratio >= 0.92 ? 'fair' : 'high', flags, balance: bal, score };
}
/* Ready-made offers from the weekly list that meet the filters, best score first. */
export function matchPrebuilts(f, today = new Date()) {
  const mk = f.market || 'DE', minPerf = num(byId(f.gpuMin) && byId(f.gpuMin).s.perf4k);
  return PRE.filter(p => p.m === mk && (today - new Date(p.date)) / 864e5 <= 21 && (!f.budget || p.price <= f.budget) && (!f.ramMin || num(p.ram) >= f.ramMin) && (!f.ssdMin || num(p.ssd) >= f.ssdMin))
    .map(p => ({ p, c: checkOffer({ ...p, psuW: p.psuW || (String(p.psu || '').match(/(\d{3,4})\s?W/i) || [])[1] * 1 || null, psuBrand: PSU_BRANDS.test(p.psu || '') ? 'yes' : null, chipset: (String(p.board || '').match(/X870E?|B850|B650E?|A620|B860|Z890|H810/i) || [null])[0] }, mk, f.use) }))
    .filter(x => x.c.ok && num(x.c.gpu.s.perf4k) >= minPerf && (!f.x3d || x.c.cpu.s.x3d))
    .sort((a, b) => b.c.score - a.c.score);
}

/* ---------- displays ---------- */
/* Usable data rates in Gbit/s after encoding overhead. */
export const LINKS = { dp14: 25.92, uhbr10: 38.69, 'uhbr13.5': 52.22, uhbr20: 77.37, hdmi21: 42.67 };
export const ppi = (size, w, h) => Math.hypot(w, h) / size;
export const ppd = (pxPerInch, distCm) => pxPerInch * 2 * (distCm / 2.54) * Math.tan(Math.PI / 360);
export const fovH = (size, w, h, distCm) => { const wi = size * w / Math.hypot(w, h); return 2 * Math.atan(wi / 2 / (distCm / 2.54)) * 180 / Math.PI; };
/* Data rate a mode needs (CVT reduced blanking v2: 80 pixels per line, 460 µs per frame), 10-bit colour by default. */
export function needGbps(w, h, hz, bpc = 10) { const vTot = h / (1 - 460e-6 * hz); return (w + 80) * vTot * hz * bpc * 3 / 1e9; }
/* Whether a card can drive a monitor at full resolution and refresh: natively, with compression (DSC, visually
   lossless but it blocks some features), or not at all. HDMI 2.1 counts when both sides have it. */
export function signal(mon, gpu) {
  if (!mon) return null;
  const need = needGbps(mon.s.w, mon.s.h, mon.s.hz);
  const dp = mon.s.dp === 'none' ? 0 : Math.min(LINKS[mon.s.dp] || LINKS.dp14, LINKS[gpu ? gpu.s.dp : 'dp14'] || LINKS.dp14), hd = mon.s.hdmi21 ? LINKS.hdmi21 : 0;
  /* DisplayPort first (what a PC uses); HDMI only when it carries the mode where DisplayPort cannot */
  const via = need <= dp ? 'DP' : need <= hd ? 'HDMI' : need <= dp * 3 ? 'DP' : 'HDMI', link = via === 'DP' ? dp : hd;
  return { need: Math.round(need * 10) / 10, link, via, mode: need <= link ? 'native' : need <= link * 3 ? 'dsc' : 'no' };
}
export function burnRisk(panel, staticH, bw = 0) {
  if (!/oled/.test(panel)) return { level: 'none' };
  const level = staticH < 2 ? 'low' : staticH < 5 ? 'medium' : 'high';
  return { level, covered: bw >= 3 };
}
const MON_W = { aaa: { motion: 2, hdr: 2, text: 0.5 }, comp: { motion: 3 }, work: { text: 3, bright: 1 }, movies: { hdr: 3 }, creative: { text: 2, hdr: 1.5 } };
export const CRIT = {
  monitor: ['motion', 'hdr', 'text', 'bright', 'value'], tv: ['picture', 'bright', 'gaming', 'motion', 'value'],
  soundbar: ['movies', 'music', 'dialog', 'ease', 'value'], phone: ['camera', 'battery', 'perf', 'display', 'longevity', 'value'],
  headphones: ['anc', 'sound', 'comfort', 'calls', 'battery', 'value'], laptop: ['perf', 'gaming', 'battery', 'display', 'build', 'value'], tablet: ['perf', 'display', 'battery', 'pen', 'value'],
  projector: ['picture', 'bright', 'gaming', 'ease', 'value'], watch: ['health', 'sport', 'battery', 'smart', 'value'], console: ['library', 'perf', 'portable', 'value']
};
/* ---------- screen filters ---------- */
/* Resolution classes for filtering: 16:9 ladders, ultrawides by height, super-ultrawide and dual 4K. */
export const RES_CLASSES = ['1080p', '1440p', 'uw1440', 'uw1600', '4k', '5k2k', '5k6k', 'suw1440', 'duhd'];
export function resClass(w, h) {
  const r = w / h;
  if (w >= 7000) return 'duhd';
  if (r > 3) return 'suw1440';
  if (h === 1600) return 'uw1600';
  if (r > 2.1) return w >= 5000 ? '5k2k' : 'uw1440';
  if (w >= 5000) return '5k6k';
  if (w >= 3800) return '4k';
  if (w >= 2500) return '1440p';
  return '1080p';
}
export const panelGroup = p => /oled/.test(p) ? 'oled' : p;
/* f: { sizes [], res [], hzMin, panels [] (oled, miniled, ips, va, tn, led), brands [], shape any|flat|curved } */
export function screenFilter(it, f = {}) {
  const s = it.s || {};
  if (f.sizes && f.sizes.length && s.size && !f.sizes.map(Number).includes(Number(s.size))) return false;
  if (f.res && f.res.length && s.w && !f.res.includes(resClass(s.w, s.h))) return false;
  if (f.hzMin && s.hz && s.hz < f.hzMin) return false;
  if (f.panels && f.panels.length && s.panel && !f.panels.includes(panelGroup(s.panel))) return false;
  if (f.brands && f.brands.length && !f.brands.includes(it.brand)) return false;
  if (f.shape === 'flat' && s.curved) return false;
  if (f.shape === 'curved' && !s.curved) return false;
  return true;
}
/* A TV that works as a monitor (120 Hz or more over HDMI 2.1) at one of its sizes from 42 to 65 inches, scored as a
   monitor: no DisplayPort, text a little softer than a monitor's at the same size. */
export function tvAsMonitor(tv, size) {
  if (!tv || tv.cat !== 'tv' || !(num(tv.s.hz) >= 120 && num(tv.s.hdmi21) >= 1)) return null;
  const v = tv.p && tv.p.de && tv.p.de[String(size)]; if (!v || size < 42 || size > 65) return null;
  return { id: tv.id + '@' + size, cat: 'monitor', brand: tv.brand, name: `${tv.name.replace(new RegExp('^' + tv.brand + ' '), '')} ${size}" (TV)`, yr: tv.yr, p: { de: v, ...(tv.p.fr && tv.p.fr[String(size)] ? { fr: tv.p.fr[String(size)] } : {}) }, pd: tv.pd, conf: tv.conf, src: tv.src,
    s: { size, w: 3840, h: 2160, hz: tv.s.hz, panel: tv.s.panel, dp: 'none', hdmi21: true, dv: tv.s.dv, bw: 0, curved: false, tv: true },
    r: { motion: tv.r.motion, hdr: tv.r.picture, text: 6, bright: tv.r.bright, value: tv.r.value }, note: 'A TV used as a monitor: HDMI 2.1 only, auto-dimming on static content, needs a deep desk.' };
}
export const tvMonitors = () => ITEMS.filter(i => i.cat === 'tv').flatMap(tv => Object.keys((tv.p && tv.p.de) || {}).map(sz => tvAsMonitor(tv, Number(sz))).filter(Boolean));
const wAvg = (r, W) => { let s = 0, n = 0; for (const [k, w] of Object.entries(W)) if (w > 0 && r[k] != null) { s += w * r[k]; n += w; } return n ? s / n : 5; };
/* Monitor score 0-100 for this person: the reviews weighted by their uses, then what fits their desk, room, card
   and budget. ctx: { uses: {aaa, comp, work, movies, creative} 0-3, staticH, room, dist, gpu, budget, market } */
export function monitorScore(m, ctx = {}) {
  const W = { value: 1 }, mk = ctx.market || 'DE', why = [];
  for (const [u, lvl] of Object.entries(ctx.uses || { aaa: 2 })) for (const [k, w] of Object.entries(MON_W[u] || {})) W[k] = (W[k] || 0) + w * num(lvl);
  if (ctx.room === 'bright') W.bright = (W.bright || 0) + 3; if (ctx.room === 'dark') W.hdr = (W.hdr || 0) + 1;
  let score = wAvg(m.r, W) * 10;
  const br = burnRisk(m.s.panel, num(ctx.staticH), num(m.s.bw));
  if (br.level === 'high') { score -= br.covered ? 6 : 12; why.push({ k: 'burnHigh', covered: br.covered }); } else if (br.level === 'medium') { score -= 3; why.push({ k: 'burnMed', covered: br.covered }); }
  const sig = signal(m, ctx.gpu); if (sig.mode === 'no') { score -= 20; why.push({ k: 'sigNo' }); } else if (sig.mode === 'dsc') why.push({ k: 'sigDsc', via: sig.via }); else why.push({ k: 'sigNative', via: sig.via });
  if (ctx.gpu) {
    const res = resOf(m.s.w), f = fpsAt(ctx.gpu, ctx.cpu || null, m.s.w, m.s.h, (ctx.uses && ctx.uses.comp > (ctx.uses.aaa || 0)) ? 'esports' : 'aaa', 'quality', 'off');
    if (f.base < 60) { score -= 8; why.push({ k: 'gpuShort', fps: f.base, res }); } else why.push({ k: 'gpuFps', fps: f.base, hz: m.s.hz, res });
  }
  if (ctx.dist) {
    const d = ppd(ppi(m.s.size, m.s.w, m.s.h), ctx.dist), fv = fovH(m.s.size, m.s.w, m.s.h, ctx.dist);
    if (d < 45) { score -= 6; why.push({ k: 'soft', ppd: Math.round(d) }); } else why.push({ k: d >= 60 ? 'retina' : 'sharp', ppd: Math.round(d) });
    if (fv > 55 && ctx.uses && ctx.uses.comp >= 2) { score -= 4; why.push({ k: 'wide', fov: Math.round(fv) }); }
  }
  const p = price(m, mk); if (ctx.budget && p > ctx.budget) { score -= 15; why.push({ k: 'over', by: p - ctx.budget }); }
  return { score: Math.round(clamp(score, 0, 100)), price: p, why, signal: sig, burn: br };
}
/* TV size for a seat distance: about 32° of view, between SMPTE's 30° for mixed viewing and THX's 40° for films. */
export function tvSizeFor(distCm, fov = 32) { const wIn = 2 * (distCm / 2.54) * Math.tan(fov / 2 * Math.PI / 180); return Math.round(wIn / 0.8716); }
/* Monitor sizes that sit comfortably at a desk distance: 30° to 55° of view (wider means turning your head). */
export const monSizesFor = distCm => [tvSizeFor(distCm, 30), tvSizeFor(distCm, 55)];
/* Every size the catalogue offers in a category (monitors by their size, TVs by the sizes they are sold in). */
export function sizeOptions(cat, mk = 'DE') {
  const s = new Set();
  for (const it of items(cat)) { if (cat === 'tv') sizesOf(it, mk).forEach(x => s.add(x)); else if (it.s && it.s.size) s.add(Number(it.s.size)); }
  return [...s].sort((a, b) => a - b);
}
const TV_W = { movies: { picture: 3, bright: 0.5 }, sport: { motion: 3, bright: 1 }, gaming: { gaming: 3 }, tv: { bright: 1, value: 1 } };
export function tvScore(tv, ctx = {}) {
  const W = { value: 1 }, mk = ctx.market || 'DE', why = [];
  for (const [u, lvl] of Object.entries(ctx.uses || { movies: 2 })) for (const [k, w] of Object.entries(TV_W[u] || {})) W[k] = (W[k] || 0) + w * num(lvl);
  if (ctx.room === 'bright') W.bright = (W.bright || 0) + 3;
  let score = wAvg(tv.r, W) * 10;
  /* the sizes the person allows (none chosen = every size); a TV sold in none of them drops out of the list */
  const pick = Array.isArray(ctx.sizes) && ctx.sizes.length ? ctx.sizes.map(Number) : null;
  const want = ctx.dist ? tvSizeFor(ctx.dist) : 65, sizes = sizesOf(tv, mk).filter(s => !pick || pick.includes(s));
  if (!sizes.length) return { score: null, excluded: true, size: null, want, price: 0, why: [] };
  let size = sizes.filter(s => s <= want + 6 && (!ctx.budget || price(tv, mk, s) <= ctx.budget)).pop();
  if (size == null) { size = sizes[0]; if (ctx.budget && price(tv, mk, size) > ctx.budget) { score -= 15; why.push({ k: 'over', by: price(tv, mk, size) - ctx.budget }); } }
  if (size != null && size < want - 12 && !pick) { score -= 5; why.push({ k: 'small', want }); }
  if (tv.s.panel !== 'miniled' && num(ctx.staticH) >= 5) { score -= 5; why.push({ k: 'burnMed' }); }
  if (ctx.uses && ctx.uses.gaming >= 2 && num(tv.s.hdmi21) < 3) why.push({ k: 'hdmiFew', n: tv.s.hdmi21 });
  return { score: Math.round(clamp(score, 0, 100)), size, want, price: size != null ? price(tv, mk, size) : 0, why };
}

/* ---------- any other product ---------- */
/* prefs: criterion → 0-3 importance. Owning gear from the same maker adds a little (AirPods with an iPhone,
   a Samsung soundbar with a Samsung TV). */
export function scoreProduct(it, prefs = {}, ctx = {}) {
  const W = { value: 1 }, mk = ctx.market || 'DE', why = [];
  for (const k of CRIT[it.cat] || []) if (prefs[k] != null) W[k] = num(prefs[k]) + (k === 'value' ? 1 : 0);
  let score = wAvg(it.r || {}, W) * 10;
  const eco = it.s && it.s.eco;
  if (eco && eco !== 'none' && (ctx.eco || []).includes(eco)) { score += 5; why.push({ k: 'eco', eco }); }
  if (ctx.type && it.s && it.s.type && it.s.type !== ctx.type) score -= 45;          // the other style sinks to the bottom
  if (ctx.os && it.s && it.s.os && ctx.os !== 'any' && it.s.os !== ctx.os) score -= 45;
  /* an Apple Watch needs an iPhone; Wear OS watches need Android */
  const own = ctx.eco || [], hasApple = own.includes('apple'), hasAndroid = own.some(e => ['samsung', 'google'].includes(e));
  if (it.s && it.s.needs === 'iphone' && hasAndroid && !hasApple) { score -= 40; why.push({ k: 'needsIphone' }); }
  if (it.s && it.s.needs === 'android' && hasApple && !hasAndroid) { score -= 40; why.push({ k: 'needsAndroid' }); }
  const p = price(it, mk); if (ctx.budget && p > ctx.budget) { score -= 15; why.push({ k: 'over', by: p - ctx.budget }); }
  return { score: Math.round(clamp(score, 0, 100)), price: p, why };
}
/* The ecosystems the person already owns, from their gear (an iPhone makes them an Apple household). */
export function ecosystems(gear) {
  const s = new Set();
  for (const g of gear || []) { const it = byId(g.catId); const e = it && it.s && it.s.eco; if (e && e !== 'none') s.add(e); const b = String(g.name || '').toLowerCase(); if (/iphone|ipad|macbook|airpods|apple/.test(b)) s.add('apple'); if (/galaxy|samsung/.test(b)) s.add('samsung'); if (/sonos/.test(b)) s.add('sonos'); if (/pixel/.test(b)) s.add('google'); if (/\blg\b/.test(b)) s.add('lg'); if (/sony|bravia/.test(b)) s.add('sony'); }
  return [...s];
}

/* ---------- my gear ---------- */
const MS = 864e5;
export const addMonths = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };
export function valueNow(g, today = new Date()) {
  const dep = (MKT && MKT.depreciation && (MKT.depreciation[g.cat] || MKT.depreciation.other)) || [0.3, 0.2];
  const y = Math.max(0, (today - new Date(g.bought)) / (365.25 * MS));
  const f = y <= 1 ? 1 - dep[0] * y : (1 - dep[0]) * Math.pow(1 - dep[1], y - 1);
  return Math.round(num(g.price) * Math.max(0.05, f));
}
/* German Gewährleistung / French garantie légale: two years from delivery; in the first months the seller has to prove the
   fault was not there (12 in Germany, 24 in France for new goods). A maker's warranty can run longer. */
export function warranty(g, today = new Date()) {
  const R = (MKT && MKT.warranty && MKT.warranty[g.market || 'DE']) || { legal: 24, presume: 12 };
  const b = new Date(g.bought), legalEnd = addMonths(b, R.legal), presEnd = addMonths(b, g.used && R.presumeUsed ? R.presumeUsed : R.presume), makerEnd = g.makerM ? addMonths(b, num(g.makerM)) : null;
  const stage = today < presEnd ? 'presume' : today < legalEnd ? 'legal' : makerEnd && today < makerEnd ? 'maker' : 'none';
  const ends = [presEnd, legalEnd, makerEnd].filter(d => d && d > today).sort((a, c) => a - c);
  return { stage, legalEnd, presEnd, makerEnd, next: ends[0] || null, daysLeft: ends.length ? Math.ceil((ends[ends.length - 1] - today) / MS) : 0 };
}
const metric = it => it.cat === 'gpu' ? num(it.s.perf4k) : it.cat === 'cpu' ? num(it.s.game) : it.r ? Object.values(it.r).reduce((a, v) => a + v, 0) / Object.values(it.r).length * 10 : 0;
/* Is there something clearly better now? Graphics cards and processors by performance, the rest by review score. */
export function upgradeCheck(g, mk = 'DE') {
  const own = byId(g.catId); if (!own) return null;
  /* only what costs at most about half again what this cost: a €8,000 card is not an upgrade path for a €950 one */
  const cap = Math.max(price(own, mk), num(g.price)) * 1.5;
  const pool = items(own.cat).filter(i => i.id !== own.id && price(i, mk) > 0 && price(i, mk) <= cap && metric(i) > metric(own));
  if (!pool.length) return { best: null, gain: 0, worth: false };
  const m0 = metric(own), best = pool.sort((a, b) => metric(b) - metric(a))[0];
  const gain = m0 > 0 ? (metric(best) - m0) / m0 : 0;
  const worth = (own.cat === 'gpu' || own.cat === 'cpu') ? gain >= 0.4 : gain >= 0.2;
  return { best, gain: Math.round(gain * 100), worth, price: price(best, mk) };
}

/* ---------- when to buy ---------- */
const day = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
function nthWeekday(y, m, wd, n) { const first = day(y, m, 1); const off = (wd - first.getUTCDay() + 7) % 7; return day(y, m, 1 + off + 7 * (n - 1)); }
function lastWeekday(y, m, wd) { const last = day(y, m + 1, 0); const off = (last.getUTCDay() - wd + 7) % 7; return day(y, m, last.getUTCDate() - off); }
export function saleDates(y, mk = 'DE') {
  const out = [];
  for (const s of (MKT && MKT.sales) || []) {
    if (s.markets && !s.markets.includes(mk)) continue;
    let start = null;
    if (s.rule === 'blackfriday') { const th = nthWeekday(y, 11, 4, 4); start = new Date(th.getTime() + MS); }
    else if (s.rule === 'month' || s.rule === 'fixed') start = day(y, s.month, s.day || 1);
    else if (s.rule === 'nthwed') start = nthWeekday(y, s.month, 3, s.n);
    else if (s.rule === 'lastwed') start = lastWeekday(y, s.month, 3);
    if (start) out.push({ id: s.id, start, end: new Date(start.getTime() + (num(s.days) || 1) * MS - 1), approx: s.rule === 'month' });
  }
  return out.sort((a, b) => a.start - b.start);
}
export function nextSale(today = new Date(), mk = 'DE') {
  const t = day(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate());
  const all = [...saleDates(t.getUTCFullYear(), mk), ...saleDates(t.getUTCFullYear() + 1, mk)];
  const s = all.find(x => x.end >= t); if (!s) return null;
  return { ...s, ongoing: s.start <= t, days: Math.max(0, Math.round((s.start - t) / MS)) };
}
const monthsTo = (today, month) => { const m = today.getUTCMonth() + 1; return (month - m + 12) % 12; };
/* Buy now, wait, or watch: a target price reached, a sale soon, a new model soon, or a shortage. */
export function timing(it, today = new Date(), mk = 'DE', watch = null) {
  const cat = it ? it.cat : null, reasons = [], P = MKT && MKT.pressure && MKT.pressure[cat], cyc = MKT && MKT.cycles && MKT.cycles[cat];
  const cur = it ? price(it, mk) : num(watch && watch.last);
  if (watch && watch.target && cur && cur <= watch.target) return { verdict: 'buy', reasons: [{ k: 'target', target: watch.target, cur }] };
  const s = nextSale(today, mk);
  let verdict = 'buy';
  if (s && s.ongoing) reasons.push({ k: 'saleNow', id: s.id });
  else if (s && s.days <= 14) { reasons.push({ k: 'saleSoon', id: s.id, days: s.days }); verdict = 'wait'; }
  if (cyc && cyc.launch && it && cyc.launch[it.brand]) {
    const mt = monthsTo(today, cyc.launch[it.brand]), age = today.getUTCFullYear() - num(it.yr);
    if (mt > 0 && mt <= 2 && age >= 0) { reasons.push({ k: 'launchSoon', months: mt }); verdict = 'wait'; }
  }
  if (P && P.level >= 3) { reasons.push({ k: 'shortage', cat }); if (verdict === 'buy') verdict = 'watch'; }
  else if (P && P.level === 2) reasons.push({ k: 'pricey', cat });
  if (!reasons.length) reasons.push({ k: 'calm' });
  return { verdict, reasons, sale: s };
}

/* ---------- can I afford it ---------- */
const LEVELS = ['basic', 'good', 'vgood', 'excellent'];
const levelOf = (v, t) => { let i = -1; (t || []).forEach((x, k) => { if (x > 0 && v >= x) i = k; }); return i; };
/* A one-off purchase against the person's finances (Safety Net Score or the profile): how many months of free cash
   it takes, whether it eats the savings plan, and whether the safety net drops a level. */
export function afford(cost, fin) {
  if (!fin || !(num(fin.net) > 0) || !(cost > 0)) return null;
  const room = num(fin.net) + num(fin.other) - num(fin.essential), plan = num(fin.plan), savings = num(fin.savings);
  const after = savings - cost, lv = Array.isArray(fin.levels) ? fin.levels : null;
  const before = lv ? levelOf(savings, lv) : null, afterLv = lv ? levelOf(after, lv) : null;
  const months = room > 0 ? cost / room : 99, planMonths = plan > 0 ? cost / plan : null;
  let verdict = after < 0 ? 'no' : planMonths != null && planMonths <= 1 ? 'easy' : months <= 1 ? 'ok' : months <= 3 ? 'stretch' : 'heavy';
  if (lv && afterLv < before && verdict !== 'no') verdict = afterLv < 1 ? 'heavy' : verdict === 'easy' ? 'ok' : verdict;
  return { verdict, months: Math.round(months * 10) / 10, planMonths: planMonths != null ? Math.round(planMonths * 10) / 10 : null, after, before: before != null && before >= 0 ? LEVELS[before] : before === -1 ? 'below' : null, afterLv: afterLv != null && afterLv >= 0 ? LEVELS[afterLv] : afterLv === -1 ? 'below' : null };
}

/* ---------- news ---------- */
/* Headlines that concern the person's gear, watch list or build first. */
export function newsFor(list, keys = []) {
  const K = keys.map(k => String(k).toLowerCase()).filter(k => k.length >= 3);
  return (list || []).map(n => { const t = (n.title + ' ' + (n.sum || '')).toLowerCase(); const hit = K.filter(k => t.includes(k)); return { ...n, hit, mine: hit.length > 0 }; })
    .sort((a, b) => (b.mine - a.mine) || String(b.date).localeCompare(String(a.date)));
}
/* The words a headline must contain to count as "yours": model names stripped of filler. */
export function watchWords(names) {
  const out = new Set();
  for (const n of names || []) {
    const s = String(n).replace(/\(.*?\)/g, '').replace(/\b(GeForce|Radeon|Ryzen|Core|Galaxy|OLED|ROG|Swift|Strix|Odyssey|UltraGear|MPG|AORUS|Alienware)\b/gi, '').trim();
    const m = s.match(/(RTX|RX|Arc)\s?\w+(\s?(Ti|XT))?|\d{4}X3D|iPhone\s?\d+(\s?Pro)?|Pixel\s?\d+|S\d{2}(\s?Ultra)?|[A-Z]{1,3}\d{2,}[A-Z0-9-]*/i);
    if (m) out.add(m[0].replace(/\s+/g, ' ').trim());
  }
  return [...out];
}
