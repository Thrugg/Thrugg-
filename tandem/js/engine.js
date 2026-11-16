/* Tandem — the review engine. Scheduling is FSRS through the open-source ts-fsrs library; everything here is a pure
   function of the saved state and the time, so it is tested without a browser. */
import { fsrs, createEmptyCard } from '../vendor/ts-fsrs.mjs';
import { DECKS, DECK } from './decks.js';

/* 90 % chance of remembering a card when it comes back; short learning steps of 1 and 10 minutes for a new card,
   10 minutes after a lapse; at most ten years between two reviews. */
export const sched = fsrs({ request_retention: 0.9, maximum_interval: 3650, enable_fuzz: true, enable_short_term: true, learning_steps: ['1m', '10m'], relearning_steps: ['10m'] });
export const LEARN_AHEAD = 20 * 60 * 1000;    // cards in their learning steps can be pulled forward this much at the end
export const CAP_MS = 60 * 1000;              // one card never counts for more than a minute of practice
export const COLORS = { ember: '#d4532c', ocean: '#2b6cd0', moss: '#3b8650', plum: '#8a4dbd', saffron: '#c08310', teal: '#178a8a' };
export const COLOR_KEYS = Object.keys(COLORS);

const pad = n => String(n).padStart(2, '0');
export const iso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;   // local calendar day
export function addDays(day, n) { const d = new Date(day + 'T12:00'); d.setDate(d.getDate() + n); return iso(d); }

/* ---------- cards ---------- */
export function cardsOf(S) {
  const out = [];
  for (const d of DECKS) if (S.decks && S.decks[d.id]) out.push(...d.cards);
  for (const c of S.own || []) out.push({ ...c, deck: 'own' });
  return out;
}
export function findCard(S, id) {
  const [deck] = String(id).split(':');
  if (deck === 'own') return (S.own || []).map(c => ({ ...c, deck: 'own' })).find(c => c.id === id) || null;
  const d = DECK[deck]; return d ? d.cards.find(c => c.id === id) || null : null;
}
/* The meaning in the learner's own languages, in the order chosen; English is the fallback every card has. */
export function glossesFor(card, gloss = ['en']) {
  if (card.deck === 'own') return card.back ? [{ lang: null, text: card.back }] : [];
  const out = [];
  for (const l of gloss) if (l && card[l] && !out.some(x => x.lang === l)) out.push({ lang: l, text: card[l] });
  if (!out.length && card.en) out.push({ lang: 'en', text: card.en });
  return out;
}
export function noteFor(card, gloss = ['en']) {
  if (card.deck === 'own') return card.n || '';
  const n = card.n; if (!n) return '';
  for (const l of gloss) if (l && n[l]) return n[l];
  return n.en || '';
}

/* ---------- the day's queue ---------- */
export const introducedOn = (S, day) => Object.values(S.cards || {}).filter(c => c.intro === day).length;
export function buildQueue(S, now = new Date()) {
  const t = now.getTime(), day = iso(now), all = cardsOf(S);
  const due = [], ahead = [], unseenByDeck = new Map();
  for (const c of all) {
    const st = S.cards[c.id];
    if (!st) { if (!unseenByDeck.has(c.deck)) unseenByDeck.set(c.deck, []); unseenByDeck.get(c.deck).push(c); continue; }
    const d = Date.parse(st.due);
    if (d <= t) due.push({ c, d, learning: st.state === 1 || st.state === 3 });
    else if ((st.state === 1 || st.state === 3) && d - t <= LEARN_AHEAD) ahead.push({ c, d });
  }
  /* cards in their learning steps first (they are short-lived), then the oldest reviews */
  due.sort((a, b) => (b.learning - a.learning) || a.d - b.d);
  ahead.sort((a, b) => a.d - b.d);
  const newLeft = Math.max(0, (S.newPerDay ?? 10) - introducedOn(S, day));
  /* new cards taken in turn from each active deck, so two languages move forward together */
  const lists = [...unseenByDeck.values()], fresh = [];
  for (let i = 0; fresh.length < newLeft && lists.some(l => i < l.length); i++) for (const l of lists) if (i < l.length && fresh.length < newLeft) fresh.push(l[i]);
  const unseen = lists.reduce((a, l) => a + l.length, 0);
  return { due: due.map(x => x.c), fresh, ahead: ahead.map(x => x.c), newLeft, unseen, aheadAt: ahead.length ? ahead[0].d : null };
}
export const nextCard = (q, allowAhead = false) => q.due[0] || q.fresh[0] || (allowAhead ? q.ahead[0] : null) || null;
/* rough time left today: a known card takes about 8 seconds, a new one about 20 */
export const minutesLeft = q => Math.ceil((q.due.length * 8 + q.fresh.length * 20) / 60);

/* ---------- reviewing ---------- */
const r4 = x => Math.round(x * 10000) / 10000;
export function pack(card) {
  return { due: new Date(card.due).toISOString(), stability: r4(card.stability), difficulty: r4(card.difficulty), elapsed_days: card.elapsed_days, scheduled_days: card.scheduled_days, learning_steps: card.learning_steps, reps: card.reps, lapses: card.lapses, state: card.state, last_review: card.last_review ? new Date(card.last_review).toISOString() : undefined };
}
/* What each of the four answers would do, as milliseconds until the card comes back. */
export function previews(S, id, now = new Date()) {
  const p = sched.repeat(S.cards[id] || createEmptyCard(now), now), out = {};
  for (const r of [1, 2, 3, 4]) out[r] = new Date(p[r].card.due).getTime() - now.getTime();
  return out;
}
/* Record one answer. Returns what is needed to undo it. Practice time is kept per device and per day, so two
   devices used on the same day add up instead of overwriting each other when they sync. */
export function rate(S, id, rating, now = new Date(), ms = 0, dev = 'dev') {
  const prev = S.cards[id], day = iso(now);
  const { card } = sched.next(prev || createEmptyCard(now), now, rating);
  S.cards[id] = { ...pack(card), intro: prev ? prev.intro : day };
  S.days[day] = S.days[day] || {};
  const b = S.days[day][dev] = { n: 0, nw: 0, ag: 0, ms: 0, ...(S.days[day][dev] || {}) };
  const add = { n: 1, nw: prev ? 0 : 1, ag: rating === 1 ? 1 : 0, ms: Math.min(Math.max(0, ms), CAP_MS) };
  for (const k in add) b[k] += add[k];
  return { id, prev: prev ? { ...prev } : null, day, dev, add };
}
export function undo(S, u) {
  if (!u) return;
  if (u.prev) S.cards[u.id] = u.prev; else delete S.cards[u.id];
  const b = S.days[u.day] && S.days[u.day][u.dev];
  if (b) for (const k in u.add) b[k] = Math.max(0, b[k] - u.add[k]);
}

/* ---------- progress ---------- */
export function dayTotals(S, day) {
  const o = { n: 0, nw: 0, ag: 0, ms: 0 };
  for (const b of Object.values((S.days || {})[day] || {})) for (const k in o) o[k] += Number(b[k]) || 0;
  return o;
}
/* Days in a row with at least one review; today counts once done, and an unfinished today does not break it. */
export function streak(S, today = iso()) {
  let d = dayTotals(S, today).n ? today : addDays(today, -1), n = 0;
  while (dayTotals(S, d).n > 0) { n++; d = addDays(d, -1); }
  return n;
}
export function week(S, today = iso()) {
  const out = [];
  for (let i = 6; i >= 0; i--) { const d = addDays(today, -i), x = dayTotals(S, d); out.push({ d, n: x.n, min: x.ms / 60000 }); }
  return out;
}
export function deckStats(S, cards, now = new Date()) {
  const t = now.getTime(), o = { total: cards.length, unseen: 0, learning: 0, young: 0, mature: 0, due: 0 };
  for (const c of cards) {
    const st = S.cards[c.id];
    if (!st) { o.unseen++; continue; }
    if (Date.parse(st.due) <= t) o.due++;
    if (st.state === 1 || st.state === 3) o.learning++; else if (st.scheduled_days >= 21) o.mature++; else o.young++;
  }
  return o;
}
/* Fold away days older than about thirteen months so the saved state stays small. */
export function prune(S, today = iso()) { const keep = addDays(today, -400); for (const d of Object.keys(S.days || {})) if (d < keep) delete S.days[d]; }

/* ---------- the tandem ---------- */
/* What one learner shares with the other: name, colour, the cards flagged for checking (with their text, since the
   other person may not have that deck), the answers given to the other's flags, and a few totals. Nothing else. */
export function pairPayload(S, today = iso()) {
  const flags = [];
  for (const [cid, fl] of Object.entries(S.flags || {})) {
    const c = findCard(S, cid); if (!c) continue;
    flags.push({ id: fl.id, card: cid, lang: c.lang, f: c.f, g: c.deck === 'own' ? { any: c.back || '' } : { en: c.en || '', fr: c.fr || '', pl: c.pl || '' }, note: fl.note || '', at: fl.at });
  }
  const w = week(S, today);
  const learns = [...new Set(cardsOf(S).map(c => c.lang).filter(l => l && l !== 'other'))];
  return { v: 1, name: (S.me && S.me.name) || '', color: (S.me && S.me.color) || 'ember', learns, flags, answers: S.answers || {}, stats: { streak: streak(S, today), today: dayTotals(S, today).n, n7: w.reduce((a, x) => a + x.n, 0), min7: Math.round(w.reduce((a, x) => a + x.min, 0)), days: w.map(x => x.n > 0 ? 1 : 0) } };
}
/* The partner's gloss for a flagged card, in the reader's languages. */
export function flagGloss(fl, gloss = ['en']) {
  if (!fl || !fl.g) return '';
  if (fl.g.any !== undefined) return fl.g.any;
  for (const l of gloss) if (fl.g[l]) return fl.g[l];
  return fl.g.en || '';
}
/* Answers kept for flags the partner has since closed are dropped. */
export function tidyAnswers(S, partner) {
  if (!partner || !Array.isArray(partner.flags)) return false;
  const live = new Set(partner.flags.map(f => f.id)); let changed = false;
  for (const k of Object.keys(S.answers || {})) if (!live.has(k)) { delete S.answers[k]; changed = true; }
  return changed;
}
/* The partner's colour, moved to the next one in the list if both chose the same. */
export function partnerColor(mine, theirs) {
  if (theirs && COLORS[theirs] && theirs !== mine) return theirs;
  const i = COLOR_KEYS.indexOf(mine); return COLOR_KEYS[(i + 1) % COLOR_KEYS.length];
}
/* Both learners practised on each of the last N days, counting back from today (or yesterday if today is open). */
export function sharedStreak(mineDays, theirDays) {
  if (!Array.isArray(mineDays) || !Array.isArray(theirDays) || mineDays.length !== theirDays.length) return 0;
  const both = mineDays.map((m, i) => m && theirDays[i]);
  let i = both.length - 1; if (!both[i]) i--;
  let n = 0; while (i >= 0 && both[i]) { n++; i--; }
  return n;
}
