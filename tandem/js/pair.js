/* Tandem — the link between two learners, through the hub's Supabase project (table tandem_pair, see ../supabase.sql).
   Each learner signs in with their own account. A tandem code joins two accounts: each writes its own row and reads
   the other's. Errors come back as a short reason the screen can explain: nosync, signin, notable, full, net. */
const T = 'tandem_pair';
export const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I/L to misread
export function newCode(rand = n => crypto.getRandomValues(new Uint32Array(n))) {
  return Array.from(rand(16), x => ALPHABET[x % ALPHABET.length]).join('');
}
export const cleanCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const validCode = s => { const c = cleanCode(s); return c.length >= 16 && c.length <= 64 && [...c].every(ch => ALPHABET.includes(ch)); };
export const showCode = c => cleanCode(c).match(/.{1,4}/g)?.join('-') || '';

const fail = reason => Object.assign(new Error(reason), { reason });
export function classify(error) {
  const m = String(error && (error.message || error.details || '')), code = String(error && error.code || '');
  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST202' || (/tandem_(pair|member|others)/.test(m) && /does not exist|schema cache|could not find/i.test(m))) return fail('notable');
  if (code === '42501' || /row-level security/i.test(m)) return fail('full');
  return fail('net');
}
async function ctx() {
  const C = window.Cloud;
  if (!C || !C.configured()) throw fail('nosync');
  const s = await C.session().catch(() => null);
  if (!s) throw fail('signin');
  const c = await C.client();
  return { c, uid: s.user.id };
}
/* Write (or join with) this learner's row. Joining a code that already holds two other people is refused. */
export async function push(code, payload) {
  const { c, uid } = await ctx();
  const { error } = await c.from(T).upsert({ pair: cleanCode(code), owner: uid, data: payload, client_ts: new Date().toISOString() }, { onConflict: 'pair,owner' });
  if (error) throw classify(error);
}
/* Read both rows of the tandem. joined = this account still has its row; partner = the other row, or null. */
export async function pull(code) {
  const { c, uid } = await ctx();
  const { data, error } = await c.from(T).select('owner,data,updated_at').eq('pair', cleanCode(code));
  if (error) throw classify(error);
  const rows = data || [], other = rows.find(r => r.owner !== uid);
  return { joined: rows.some(r => r.owner === uid), partner: other ? { ...(other.data || {}), updated: other.updated_at } : null };
}
export async function leave(code) {
  const { c, uid } = await ctx();
  const { error } = await c.from(T).delete().eq('pair', cleanCode(code)).eq('owner', uid);
  if (error) throw classify(error);
}
