/* Ask Claude, for every app on this site: a thin client for the "ask" function in your own Supabase project
   (supabase/functions/ask). Needs cloud.js and a signed-in account. Usage:
     if (await Ask.ready()) { const data = await Ask.run('fragrance_similar', { fragrance, wardrobe }); }
   Errors are thrown with err.code (sign_in, not_set_up, no_key, limit, busy, refused, offline, failed) and a
   message that can be shown as it is. */
(function () {
  'use strict';
  const MSG = {
    sign_in: 'Sign in to sync first: Claude answers through your own account.',
    not_set_up: 'The "ask" function is not set up yet in your Supabase project (see the README, "Ask Claude").',
    no_key: 'The "ask" function has no Anthropic API key yet (Supabase → Edge Functions → Secrets → ANTHROPIC_API_KEY).',
    not_allowed: 'This account is not allowed to use Ask Claude.',
    limit: 'Today\'s limit of questions is reached. It resets at midnight (UTC).',
    busy: 'Claude is busy right now. Try again in a minute.',
    refused: 'Claude declined this question.',
    offline: 'No connection. Try again when you are online.',
    failed: 'Claude did not answer this time. Try again.'
  };
  const fail = (code, detail) => { const e = new Error(MSG[code] || MSG.failed); e.code = code; e.detail = detail; return e; };
  let missing = false;
  try { missing = sessionStorage.getItem('ask.missing') === '1'; } catch (e) { }
  const Ask = {
    messages: MSG,
    /* true when signed in and the function has not been found missing in this tab */
    async ready() {
      if (missing || !window.Cloud || !window.Cloud.configured()) return false;
      try { return !!(await window.Cloud.session()); } catch (e) { return false; }
    },
    async run(task, input) {
      if (!window.Cloud || !window.Cloud.configured()) throw fail('not_set_up');
      if (!navigator.onLine) throw fail('offline');
      const s = await window.Cloud.session().catch(() => null);
      if (!s) throw fail('sign_in');
      const c = await window.Cloud.client();
      const { data, error } = await c.functions.invoke('ask', { body: { task, input } });
      if (error) {
        let code = 'failed', detail = '';
        try {
          const res = error.context;
          if (res && res.status === 404) { code = 'not_set_up'; missing = true; try { sessionStorage.setItem('ask.missing', '1'); } catch (e) { } }
          else if (res && typeof res.json === 'function') { const b = await res.json(); detail = b.detail || ''; code = { sign_in: 'sign_in', no_key: 'no_key', not_allowed: 'not_allowed', limit: 'limit', busy: 'busy', refused: 'refused' }[b.error] || 'failed'; }
        } catch (e) { }
        throw fail(code, detail);
      }
      if (!data || !data.data) throw fail('failed');
      return data.data;
    }
  };
  window.Ask = Ask;
})();
