/* Checks for Tandem on invented reviews. Run with: node --test tandem/test/*.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DECKS, DECK } from '../js/decks.js';
import { iso, addDays, cardsOf, findCard, glossesFor, noteFor, buildQueue, nextCard, minutesLeft, previews, rate, undo, dayTotals, streak, week, deckStats, prune, pairPayload, flagGloss, tidyAnswers, partnerColor, sharedStreak, COLORS, CAP_MS } from '../js/engine.js';
import { newCode, cleanCode, validCode, showCode, classify, ALPHABET } from '../js/pair.js';
import { t, setLang, keys } from '../js/i18n.js';

const blank = (o = {}) => ({ v: 1, me: { name: 'A', color: 'ember', gloss: ['en', 'fr'] }, decks: { 'pl-weekend': true, 'de-work': true }, newPerDay: 10, goal: 10, cards: {}, days: {}, own: [], flags: {}, answers: {}, pair: null, ...o });
const at = (s) => new Date(s);

test('starter decks: about 200 cards, stable unique ids, every card complete for its readers', () => {
  const all = DECKS.flatMap(d => d.cards);
  assert.ok(all.length >= 190 && all.length <= 230, `${all.length} cards`);
  assert.equal(new Set(all.map(c => c.id)).size, all.length, 'ids are unique');
  for (const c of all) {
    assert.ok(c.f && c.f.trim() && c.en && c.en.trim(), c.id);
    assert.match(c.id, /^[a-z-]+:\d{3}$/);
    if (c.deck !== 'de-daily') assert.ok(c.fr && c.fr.trim(), 'French gloss for ' + c.id);
    else assert.ok(c.pl && c.pl.trim(), 'Polish gloss for ' + c.id);
    if (c.n) assert.ok(c.n.en, 'a note always has English: ' + c.id);
  }
  assert.equal(DECK['pl-weekend'].cards[0].id, 'pl-weekend:001');
  assert.ok(DECK['pl-weekend'].cards.some(c => /ł|ą|ę|ż|ś/.test(c.f)), 'Polish letters kept');
  assert.ok(DECK['de-work'].cards.some(c => /Rückstellung/.test(c.f)) && DECK['de-work'].cards.some(c => /Kostenstelle/.test(c.f)) && DECK['de-work'].cards.some(c => /Mengen- und Mixeffekt/.test(c.f)), 'the controlling terms named in the brief');
});

test('glosses follow the reader’s languages, with English as the fallback', () => {
  const c = DECK['de-daily'].cards[0];
  assert.deepEqual(glossesFor(c, ['pl', 'en']).map(x => x.lang), ['pl', 'en']);
  assert.deepEqual(glossesFor(DECK['de-work'].cards[0], ['pl']).map(x => x.lang), ['en'], 'no Polish gloss → English');
  assert.deepEqual(glossesFor({ deck: 'own', back: 'hello' }, ['fr']), [{ lang: null, text: 'hello' }]);
  const withNote = DECK['de-daily'].cards.find(x => x.n);
  assert.ok(noteFor(withNote, ['pl']).length > 0 && noteFor(withNote, ['fr']) !== noteFor(withNote, ['en']));
});

test('a first day: ten new cards, taken in turn from the two decks', () => {
  const S = blank(), q = buildQueue(S, at('2026-11-16T07:00:00'));
  assert.equal(q.due.length, 0); assert.equal(q.fresh.length, 10);
  assert.deepEqual(q.fresh.slice(0, 4).map(c => c.deck), ['pl-weekend', 'de-work', 'pl-weekend', 'de-work']);
  assert.equal(nextCard(q).id, 'pl-weekend:001');
  assert.equal(minutesLeft(q), Math.ceil(10 * 20 / 60));
  assert.equal(q.unseen, DECK['pl-weekend'].cards.length + DECK['de-work'].cards.length);
});

test('answering moves a card through its learning steps and counts the practice once', () => {
  const S = blank(), t0 = at('2026-11-16T07:00:00'), id = 'pl-weekend:001';
  const p = previews(S, id, t0);
  assert.equal(p[1], 60000); assert.equal(p[3], 600000, 'Good on a new card: back in 10 minutes');
  assert.ok(p[4] > 86400000, 'Easy jumps to days');
  const u = rate(S, id, 3, t0, 4200, 'phone');
  assert.equal(S.cards[id].state, 1); assert.equal(S.cards[id].intro, '2026-11-16');
  assert.equal(Date.parse(S.cards[id].due) - t0.getTime(), 600000);
  assert.deepEqual(dayTotals(S, '2026-11-16'), { n: 1, nw: 1, ag: 0, ms: 4200 });
  /* five minutes later the card is not due yet, but can be pulled forward at the end */
  let q = buildQueue(S, at('2026-11-16T07:05:00'));
  assert.ok(!q.due.some(c => c.id === id) && q.ahead.some(c => c.id === id));
  assert.equal(nextCard(q, true).id, q.due[0] ? q.due[0].id : q.fresh[0].id);
  /* eleven minutes later it is due, and comes before new cards */
  q = buildQueue(S, at('2026-11-16T07:11:00'));
  assert.equal(nextCard(q).id, id);
  rate(S, id, 3, at('2026-11-16T07:11:00'), 3000, 'phone');
  assert.equal(S.cards[id].state, 2, 'graduated to review');
  assert.ok(Date.parse(S.cards[id].due) - at('2026-11-16T07:11:00').getTime() >= 86400000);
  /* a packed card goes through JSON and back without losing anything the scheduler needs */
  const round = JSON.parse(JSON.stringify(S));
  assert.deepEqual(previews(round, id, at('2026-11-20T08:00:00')), previews(S, id, at('2026-11-20T08:00:00')));
  /* undo puts both the card and the day back */
  const before = JSON.stringify(S);
  const u2 = rate(S, id, 1, at('2026-11-20T08:00:00'), 999999, 'phone');
  assert.equal(S.days['2026-11-20'].phone.ms, CAP_MS, 'a card counts for a minute at most');
  undo(S, u2); assert.equal(JSON.stringify({ ...S, days: { ...S.days, '2026-11-20': undefined } }), JSON.stringify({ ...JSON.parse(before), days: { ...JSON.parse(before).days, '2026-11-20': undefined } }));
  assert.equal(dayTotals(S, '2026-11-20').n, 0);
  undo(S, u); assert.equal(S.cards[id], undefined, 'undoing a first answer makes the card new again');
});

test('the daily cap on new cards holds, and cards already seen today are not new again', () => {
  const S = blank({ newPerDay: 3 }), t0 = at('2026-11-16T09:00:00');
  for (const c of buildQueue(S, t0).fresh) rate(S, c.id, 4, t0, 1000, 'mac');
  const q = buildQueue(S, at('2026-11-16T09:30:00'));
  assert.equal(q.fresh.length, 0); assert.equal(q.newLeft, 0);
  const tomorrow = buildQueue(S, at('2026-11-17T09:00:00'));
  assert.deepEqual(tomorrow.fresh.map(c => c.id), ['pl-weekend:003', 'de-work:002', 'pl-weekend:004']);
});

test('two devices on the same day add up; streaks count calendar days', () => {
  const S = blank();
  S.days['2026-11-16'] = { phone: { n: 12, nw: 4, ag: 2, ms: 300000 }, mac: { n: 5, nw: 0, ag: 1, ms: 120000 } };
  S.days['2026-11-15'] = { phone: { n: 3, nw: 0, ag: 0, ms: 60000 } };
  S.days['2026-11-14'] = { mac: { n: 1, nw: 0, ag: 0, ms: 10000 } };
  S.days['2026-11-12'] = { mac: { n: 9, nw: 0, ag: 0, ms: 10000 } };
  assert.deepEqual(dayTotals(S, '2026-11-16'), { n: 17, nw: 4, ag: 3, ms: 420000 });
  assert.equal(streak(S, '2026-11-16'), 3);
  assert.equal(streak(S, '2026-11-17'), 3, 'an open today does not break it');
  assert.equal(streak(S, '2026-11-18'), 0);
  const w = week(S, '2026-11-16'); assert.equal(w.length, 7); assert.equal(w[6].d, '2026-11-16'); assert.equal(w[6].min, 7);
  S.days['2025-01-01'] = { mac: { n: 1, nw: 0, ag: 0, ms: 1 } }; prune(S, '2026-11-16'); assert.ok(!S.days['2025-01-01'] && S.days['2026-11-12']);
  assert.equal(addDays('2026-03-28', 2), '2026-03-30', 'across the clock change');
});

test('deck counts: new, learning, young, known, due', () => {
  const S = blank(), now = at('2026-11-16T10:00:00'), d = DECK['pl-weekend'].cards;
  S.cards[d[0].id] = { due: '2026-11-16T09:00:00.000Z', state: 2, scheduled_days: 30 };
  S.cards[d[1].id] = { due: '2026-12-16T09:00:00.000Z', state: 2, scheduled_days: 5 };
  S.cards[d[2].id] = { due: '2026-11-16T12:00:00.000Z', state: 1, scheduled_days: 0 };
  const s = deckStats(S, d, now);
  assert.deepEqual([s.unseen, s.learning, s.young, s.mature, s.due], [d.length - 3, 1, 1, 1, 1]);
});

test('own cards are private, reviewable and found by id', () => {
  const S = blank({ decks: {}, own: [{ id: 'own:abc', lang: 'pl', f: 'Smacznej kawusi!', back: 'Enjoy your coffee!', n: 'said by an aunt' }] });
  assert.equal(cardsOf(S).length, 1); assert.equal(findCard(S, 'own:abc').deck, 'own');
  assert.equal(findCard(S, 'de-work:001').f, 'die Abweichungsanalyse'); assert.equal(findCard(S, 'nope:001'), null);
  assert.equal(buildQueue(S, at('2026-11-16T08:00:00')).fresh[0].id, 'own:abc');
});

test('what the partner sees: name, colour, flagged cards with their text, answers, totals — nothing else', () => {
  const S = blank({ me: { name: 'Sam', color: 'moss', gloss: ['en'] }, own: [{ id: 'own:x', lang: 'pl', f: 'Do zobaczenia!', back: 'See you!' }] });
  S.flags['pl-weekend:041'] = { id: 'f1', at: '2026-11-16', note: 'Your grandma says this?' };
  S.flags['own:x'] = { id: 'f2', at: '2026-11-16', note: '' };
  S.flags['gone:001'] = { id: 'f3', at: '2026-11-16', note: '' };
  S.answers = { p9: { ok: false, note: 'die Rückstellung', at: '2026-11-15' } };
  S.days['2026-11-16'] = { d: { n: 8, nw: 2, ag: 1, ms: 240000 } };
  S.cards['pl-weekend:001'] = { due: '2026-11-20T00:00:00.000Z', state: 2 };
  const p = pairPayload(S, '2026-11-16');
  assert.deepEqual(Object.keys(p).sort(), ['answers', 'color', 'flags', 'learns', 'name', 'stats', 'v']);
  assert.equal(p.flags.length, 2, 'a flag on a card that no longer exists is skipped');
  assert.equal(p.flags[0].f, 'Smacznego!'); assert.equal(p.flags[0].g.en, 'Enjoy your meal!'); assert.equal(p.flags[0].note, 'Your grandma says this?');
  assert.deepEqual(p.flags[1].g, { any: 'See you!' });
  assert.deepEqual(p.learns.sort(), ['de', 'pl']);
  assert.equal(p.stats.today, 8); assert.equal(p.stats.min7, 4); assert.deepEqual(p.stats.days, [0, 0, 0, 0, 0, 0, 1]);
  assert.ok(!JSON.stringify(p).includes('pl-weekend:001"'), 'review history is not shared');
  assert.equal(flagGloss(p.flags[0], ['pl', 'fr']), 'Bon appétit !');
  assert.equal(flagGloss(p.flags[1], ['pl']), 'See you!');
});

test('answers to closed flags are tidied away; colours never clash; shared streak', () => {
  const S = blank({ answers: { a: { ok: true }, b: { ok: false } } });
  assert.equal(tidyAnswers(S, { flags: [{ id: 'b' }] }), true); assert.deepEqual(Object.keys(S.answers), ['b']);
  assert.equal(tidyAnswers(S, null), false, 'no news: keep everything');
  assert.equal(partnerColor('ember', 'ocean'), 'ocean');
  assert.notEqual(partnerColor('ember', 'ember'), 'ember'); assert.ok(COLORS[partnerColor('teal', undefined)]);
  assert.equal(sharedStreak([0, 1, 1, 1, 0, 1, 1], [1, 1, 1, 1, 1, 1, 1]), 2);
  assert.equal(sharedStreak([1, 1, 1, 1, 1, 1, 0], [1, 1, 1, 1, 1, 1, 0]), 6, 'today still open');
  assert.equal(sharedStreak([1], [1, 1]), 0);
});

test('tandem codes: readable alphabet, long enough, typed back with or without dashes', () => {
  let i = 0; const c = newCode(n => Uint32Array.from({ length: n }, () => i++ * 7));
  assert.equal(c.length, 16); assert.ok([...c].every(ch => ALPHABET.includes(ch)));
  assert.ok(!/[01OIL]/.test(ALPHABET));
  assert.equal(showCode(c).length, 19); assert.equal(cleanCode(showCode(c).toLowerCase()), c);
  assert.ok(validCode(showCode(c))); assert.ok(!validCode('ABCD-1234')); assert.ok(!validCode('OOOOOOOOOOOOOOOO'));
  assert.equal(classify({ code: 'PGRST205', message: 'Could not find the table public.tandem_pair in the schema cache' }).reason, 'notable');
  assert.equal(classify({ code: '42501', message: 'new row violates row-level security policy for table "tandem_pair"' }).reason, 'full');
  assert.equal(classify({ message: 'Failed to fetch' }).reason, 'net');
});

test('English and French carry the same keys, and every key the screens use exists', () => {
  const k = keys(); assert.deepEqual([...k.fr].sort(), [...k.en].sort());
  const src = fs.readFileSync(new URL('../js/ui.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  const used = new Set([...src.matchAll(/\bt\('([a-zA-Z0-9.]+)'/g)].map(m => m[1]).filter(k => !k.endsWith('.')));
  for (const key of used) assert.ok(k.en.includes(key), 'missing key ' + key);
  for (const p of ['tab.', 'r.', 'lang.', 'color.', 'ds.', 'err.']) assert.ok(k.en.some(x => x.startsWith(p)), p);
  for (const e of ['nosync', 'signin', 'notable', 'full', 'net', 'code']) assert.ok(k.en.includes('err.' + e));
  setLang('fr'); assert.equal(t('today.h', { n: 1, m: 1 }), '1 carte aujourd’hui, environ 1 min'); assert.equal(t('iv.y', { n: '2' }), '2 ans');
  setLang('en'); assert.equal(t('today.h', { n: 12, m: 4 }), '12 cards today, about 4 min'); assert.equal(t('duo.both', { n: 1 }), 'Both of you, 1 day in a row.');
});

test('the SQL keeps rows private to the two members of a tandem', () => {
  const sql = fs.readFileSync(new URL('../supabase.sql', import.meta.url), 'utf8');
  assert.match(sql, /enable row level security/);
  assert.match(sql, /tandem_others\(pair\) < 2/);
  assert.match(sql, /security definer/);
  assert.ok(!/using \(true\)/i.test(sql), 'no open read');
});
