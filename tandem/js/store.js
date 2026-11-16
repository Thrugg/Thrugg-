/* Tandem — state and persistence. One localStorage key, mirrored to the learner's own account by the hub's cloud.js
   (app key "tandem"). Nothing is written until the learner changes something, so a new device never uploads a blank
   state over a real one. The learner's own cards and review history never go into the repository. */
import { prune } from './engine.js';

export const KEY = 'tandem.v1';
export const INBOX_KEY = 'hub.inbox';
export const DEV_KEY = 'tandem.dev';           // which device this is, for the practice-time buckets (never synced)
export const PARTNER_KEY = 'tandem.partner';   // last copy of the partner's shared row, for offline (never synced)
export const uid = () => Math.random().toString(36).slice(2, 9);

const nav = () => (typeof navigator !== 'undefined' && navigator.language || 'en').toLowerCase();
const DEF = () => {
  const l = nav(), pl = l.startsWith('pl'), fr = l.startsWith('fr');
  return {
    v: 1,
    lang: fr ? 'fr' : 'en',
    me: { name: '', color: pl ? 'ocean' : 'ember', gloss: pl ? ['pl', 'en'] : fr ? ['fr', 'en'] : ['en', 'fr'] },
    decks: pl ? { 'de-daily': true } : { 'pl-weekend': true, 'de-work': true },
    newPerDay: 10,            // new cards a day
    goal: 10,                 // minutes a day
    setup: false,             // the first-day choices have been made
    cards: {},                // card id → FSRS state (+ intro: the day it was first seen)
    days: {},                 // day → device → { n reviews, nw new, ag again, ms practice }
    own: [],                  // the learner's own cards (private)
    flags: {},                // card id → { id, at, note }: cards the learner wants the partner to check
    answers: {},              // partner's flag id → { ok, note, at }
    pair: null,               // { code, since } once linked with a partner
    inbox: '',
    ui: { tab: 'today' }      // stays on the device
  };
};

export let S = DEF();
export let fresh = true;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const x = JSON.parse(raw);
      if (x && x.v === 1 && x.cards && typeof x.cards === 'object') {
        const d = DEF();
        S = { ...d, ...x, me: { ...d.me, ...(x.me || {}) }, decks: x.decks || d.decks, days: x.days || {}, own: x.own || [], flags: x.flags || {}, answers: x.answers || {}, ui: { ...d.ui, ...(x.ui || {}) } };
        if (!Array.isArray(S.me.gloss) || !S.me.gloss.length) S.me.gloss = d.me.gloss;
        fresh = false;
      }
    } else { S = DEF(); fresh = true; }
  } catch (e) { S = DEF(); }
  try { const shared = localStorage.getItem(INBOX_KEY); if (S.inbox && !shared) localStorage.setItem(INBOX_KEY, S.inbox); else if (!S.inbox && shared) S.inbox = shared; } catch (e) { }
  return S;
}
export function device() {
  try { let d = localStorage.getItem(DEV_KEY); if (!d) { d = 'd' + uid(); localStorage.setItem(DEV_KEY, d); } return d; } catch (e) { return 'd0'; }
}
let timer = null;
const write = () => { timer = null; try { prune(S); localStorage.setItem(KEY, JSON.stringify(S)); fresh = false; } catch (e) { window.dispatchEvent(new CustomEvent('app:savefail')); } };
export function save(now) { clearTimeout(timer); if (now) write(); else timer = setTimeout(write, 300); window.dispatchEvent(new CustomEvent('app:changed')); }
export function saveUi() { if (!fresh) { clearTimeout(timer); timer = setTimeout(write, 300); } }
export function flush() { if (timer) { clearTimeout(timer); write(); } }
export function reset() { try { localStorage.removeItem(KEY); localStorage.removeItem(PARTNER_KEY); } catch (e) { } S = DEF(); fresh = true; }
export function setInbox(url) { S.inbox = url; try { if (url) localStorage.setItem(INBOX_KEY, url); else localStorage.removeItem(INBOX_KEY); } catch (e) { } save(); }
export function cachedPartner() { try { return JSON.parse(localStorage.getItem(PARTNER_KEY)) || null; } catch (e) { return null; } }
export function cachePartner(p) { try { if (p) localStorage.setItem(PARTNER_KEY, JSON.stringify(p)); else localStorage.removeItem(PARTNER_KEY); } catch (e) { } }

export function exportBackup() { return new Blob([JSON.stringify({ tandem: 1, exported: new Date().toISOString(), state: { ...S, ui: undefined } }, null, 1)], { type: 'application/json' }); }
export function importBackup(text) {
  const x = JSON.parse(text);
  if (!x || !x.tandem || !x.state || typeof x.state.cards !== 'object') throw new Error('Not a Tandem file');
  S = { ...DEF(), ...x.state, ui: S.ui }; save(true); load();
}
