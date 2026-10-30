/* Cloud save for every app on this site.
   One Supabase project and one sign-in per device; data is kept per app in the table app_state
   (Cordée keeps its finer-grained items in cordee_items). The project URL and the publishable key
   below are meant to be public: row-level security only lets a signed-in owner read their own rows. */
(function () {
  'use strict';
  const CFG = {
    url: 'https://usgsrhwnnmumsbdgcgib.supabase.co',
    key: 'sb_publishable_J1dwK1TQB5ar7ebeplw1yA_f4a1HEt3'
  };
  const SUPA_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js';
  const rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem;
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { rawSet.call(localStorage, k, v); } catch (e) { } };
  const readMeta = app => { try { return JSON.parse(lsGet('cloud.meta.' + app)) || {}; } catch (e) { return {}; } };
  const writeMeta = (app, m) => lsSet('cloud.meta.' + app, JSON.stringify(m));
  let sb = null, loading = null;
  const listeners = new Set();

  const Cloud = {
    configured: () => !!(CFG.url && CFG.key),
    status: 'off', msg: 'Not set up',
    async client() {
      if (sb) return sb;
      if (!Cloud.configured()) return null;
      if (!window.supabase) {
        loading = loading || new Promise((res, rej) => { const s = document.createElement('script'); s.src = SUPA_JS; s.onload = res; s.onerror = () => rej(new Error('Could not load the sync library')); document.head.appendChild(s); });
        await loading;
      }
      sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'thrugg-auth' } });
      sb.auth.onAuthStateChange(() => Cloud.emit());
      return sb;
    },
    async session() { const c = await Cloud.client(); if (!c) return null; const { data } = await c.auth.getSession(); return data.session || null; },
    async signIn(email, password) {
      const c = await Cloud.client(); if (!c) throw new Error('Sync is not set up yet');
      const { error } = await c.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Wrong email or password' : error.message);
      Cloud.emit();
    },
    async signOut() { const c = await Cloud.client(); if (c) await c.auth.signOut(); Cloud.setStatus('off', 'Signed out'); },
    setStatus(s, msg) { Cloud.status = s; Cloud.msg = msg; Cloud.emit(); },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit() { listeners.forEach(fn => { try { fn(Cloud.status, Cloud.msg); } catch (e) { } }); },

    /* Keep one localStorage key of an app in the cloud. The newest edit wins; a device that has never
       synced takes the cloud copy first, so a fresh phone never overwrites the Mac with example data.
       When newer data arrives, the page reloads once so the app starts from it. */
    mirror(app, key, opts = {}) {
      const st = { app, key, timer: null, busy: false };
      const changed = () => { const m = readMeta(app); m.ts = new Date().toISOString(); writeMeta(app, m); clearTimeout(st.timer); st.timer = setTimeout(push, 2500); };
      Storage.prototype.setItem = function (k, v) { const was = this === localStorage && k === key ? lsGet(k) : null; rawSet.call(this, k, v); if (this === localStorage && k === key && String(v) !== was) changed(); };
      Storage.prototype.removeItem = function (k) { rawRemove.call(this, k); if (this === localStorage && k === key) changed(); };
      const parse = s => { if (s == null) return null; try { return JSON.parse(s); } catch (e) { return s; } };
      async function push() {
        if (st.busy) return;
        const m = readMeta(app); if (!m.synced) return pull();
        const s = await Cloud.session().catch(() => null); if (!s) return;
        st.busy = true;
        try {
          Cloud.setStatus('busy', 'Saving…');
          const { error } = await sb.from('app_state').upsert({ app, data: parse(lsGet(key)), client_ts: m.ts || new Date().toISOString() }, { onConflict: 'owner,app' });
          if (error) throw error;
          m.pushed = m.ts; writeMeta(app, m);
          Cloud.setStatus('ok', 'Saved to your account');
        } catch (e) { Cloud.setStatus('err', 'Sync failed: ' + (e.message || e)); }
        finally { st.busy = false; }
      }
      async function pull() {
        if (st.busy || !Cloud.configured()) return;
        const s = await Cloud.session().catch(() => null);
        if (!s) { Cloud.setStatus('off', 'Not signed in'); return; }
        st.busy = true;
        try {
          Cloud.setStatus('busy', 'Syncing…');
          const { data, error } = await sb.from('app_state').select('data,client_ts').eq('app', app).maybeSingle();
          if (error) throw error;
          const m = readMeta(app), localTs = m.ts ? Date.parse(m.ts) : 0;
          if (data && (!m.synced || Date.parse(data.client_ts) > localTs)) {
            const next = data.data == null ? null : typeof data.data === 'string' ? data.data : JSON.stringify(data.data);
            const cur = lsGet(key);
            Object.assign(m, { synced: true, ts: data.client_ts, pushed: data.client_ts }); writeMeta(app, m);
            if (next !== cur && JSON.stringify(parse(next)) !== JSON.stringify(parse(cur))) {
              if (next == null) rawRemove.call(localStorage, key); else lsSet(key, next);
              st.busy = false;
              if (opts.onRemote) opts.onRemote(); else if (sessionStorage.getItem('cloud.reloaded.' + app) !== data.client_ts) { sessionStorage.setItem('cloud.reloaded.' + app, data.client_ts); location.reload(); return; }
            }
          } else {
            m.synced = true; if (!m.ts && lsGet(key) != null) m.ts = new Date().toISOString(); writeMeta(app, m);
            if (lsGet(key) != null && (!data || localTs > Date.parse(data.client_ts) || !m.pushed)) { st.busy = false; return push(); }
          }
          Cloud.setStatus('ok', 'Synced');
        } catch (e) { Cloud.setStatus('err', 'Sync failed: ' + (e.message || e)); }
        finally { st.busy = false; }
      }
      st.pull = pull;
      const start = () => { if (!Cloud.configured()) return; pull(); Cloud.badge(pull); };
      document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(); else if (st.timer) { clearTimeout(st.timer); push(); } });
      Cloud.on(() => { });
      return st;
    },

    /* Small cloud button (bottom-left) for apps that have no settings screen of their own. */
    badge(afterSignIn) {
      if (document.getElementById('cloudBadge')) return;
      const css = document.createElement('style');
      css.textContent = `#cloudBadge{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));z-index:9999;display:flex;align-items:center;gap:6px;font:600 12px/1 system-ui,-apple-system,sans-serif;padding:8px 11px;border-radius:999px;border:1px solid rgba(127,127,127,.35);background:rgba(250,250,250,.92);color:#1d2a30;box-shadow:0 2px 10px rgba(0,0,0,.12);cursor:pointer;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
#cloudBadge i{width:8px;height:8px;border-radius:50%;background:#9aa4a8}#cloudBadge[data-s=ok] i{background:#2f9e5b}#cloudBadge[data-s=err] i{background:#d0453b}#cloudBadge[data-s=busy] i{background:#d99a1e}
#cloudBadge[data-s=ok] span{display:none}
@media (prefers-color-scheme:dark){#cloudBadge{background:rgba(28,34,38,.92);color:#e6eef0}}
#cloudDlg{border:0;border-radius:16px;padding:20px;max-width:340px;width:calc(100% - 32px);font:14px/1.45 system-ui,-apple-system,sans-serif;color:#1d2a30;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.3)}
#cloudDlg::backdrop{background:rgba(0,0,0,.4)}#cloudDlg h2{margin:0 0 6px;font-size:18px}#cloudDlg p{margin:0 0 12px;color:#55636a}
#cloudDlg input{display:block;width:100%;box-sizing:border-box;margin:0 0 10px;padding:10px 12px;border:1px solid #cfd8db;border-radius:10px;font:16px system-ui}
#cloudDlg .row{display:flex;gap:8px;justify-content:flex-end;margin-top:6px}#cloudDlg button{font:600 14px system-ui;padding:9px 14px;border-radius:10px;border:1px solid #cfd8db;background:#fff;color:#1d2a30;cursor:pointer}
#cloudDlg button.pri{background:#1d2a30;color:#fff;border-color:#1d2a30}#cloudDlg .err{color:#c0392b;min-height:18px;font-size:13px;margin:0 0 6px}
@media (prefers-color-scheme:dark){#cloudDlg{background:#1c2226;color:#e6eef0}#cloudDlg p{color:#a7b3b8}#cloudDlg input,#cloudDlg button{background:#262d32;color:#e6eef0;border-color:#3a444a}#cloudDlg button.pri{background:#e6eef0;color:#1c2226}}`;
      document.head.appendChild(css);
      const b = document.createElement('button');
      b.id = 'cloudBadge'; b.type = 'button'; b.innerHTML = '<i></i><span>Sign in to sync</span>';
      const paint = () => { b.dataset.s = Cloud.status; b.title = Cloud.msg; b.setAttribute('aria-label', 'Sync: ' + Cloud.msg); b.querySelector('span').textContent = Cloud.status === 'off' ? 'Sign in to sync' : Cloud.status === 'err' ? 'Sync problem' : Cloud.status === 'busy' ? 'Syncing…' : ''; };
      Cloud.on(paint); paint();
      b.onclick = () => Cloud.dialog(afterSignIn);
      document.body.appendChild(b);
    },
    async dialog(afterSignIn) {
      let d = document.getElementById('cloudDlg');
      if (!d) { d = document.createElement('dialog'); d.id = 'cloudDlg'; document.body.appendChild(d); }
      const s = await Cloud.session().catch(() => null);
      if (s) {
        d.innerHTML = `<h2>Synced</h2><p>Signed in as ${s.user.email.replace(/[<>&"]/g, '')}. Changes save automatically and appear on your other devices.</p><p class="err">${Cloud.status === 'err' ? Cloud.msg.replace(/[<>&"]/g, '') : ''}</p><div class="row"><button type="button" data-out>Sign out</button><button type="button" class="pri" data-close>Done</button></div>`;
        d.querySelector('[data-out]').onclick = async () => { await Cloud.signOut(); d.close(); };
      } else {
        d.innerHTML = `<form method="dialog"><h2>Sync your devices</h2><p>Sign in once on this device. Everything you enter is then saved to your account and kept the same on the Mac and the iPhone.</p><input name="e" type="email" autocomplete="username" placeholder="Email" required><input name="p" type="password" autocomplete="current-password" placeholder="Password" required><p class="err"></p><div class="row"><button type="button" data-close>Later</button><button class="pri">Sign in</button></div></form>`;
        const f = d.querySelector('form');
        f.onsubmit = async ev => { ev.preventDefault(); f.querySelector('.err').textContent = 'Signing in…'; try { await Cloud.signIn(f.e.value, f.p.value); d.close(); if (afterSignIn) afterSignIn(); } catch (e) { f.querySelector('.err').textContent = e.message; } };
      }
      d.querySelectorAll('[data-close]').forEach(x => x.onclick = () => d.close());
      d.showModal();
    }
  };
  window.Cloud = Cloud;
})();
