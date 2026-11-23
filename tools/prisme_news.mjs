/* Prisme's news: fetches the headlines of a few reputable tech sites (RSS or Atom) on GitHub's machines and writes
   prisme/data/news.json, which the app reads. Runs every morning from .github/workflows/prisme-news.yml, and by hand:
     node tools/prisme_news.mjs
   A feed that does not answer is skipped; the file keeps the newest 150 headlines of the last 21 days.
   Only titles, links, dates and a short summary are kept, never whole articles. */
import fs from 'node:fs';

export const FEEDS = [
  { src: 'ComputerBase', lang: 'de', url: 'https://www.computerbase.de/rss/news.xml' },
  { src: 'PCGH', lang: 'de', url: 'https://www.pcgameshardware.de/feed.cfm' },
  { src: 'heise', lang: 'de', url: 'https://www.heise.de/rss/heise-top-atom.xml' },
  { src: "Tom's Hardware", lang: 'en', url: 'https://www.tomshardware.com/feeds/all' },
  { src: 'VideoCardz', lang: 'en', url: 'https://videocardz.com/feed' },
  { src: 'FlatpanelsHD', lang: 'en', url: 'https://www.flatpanelshd.com/rss.php' },
  { src: 'The Verge', lang: 'en', url: 'https://www.theverge.com/rss/index.xml' },
  { src: 'Les Numériques', lang: 'fr', url: 'https://www.lesnumeriques.com/rss.xml' },
  { src: 'Frandroid', lang: 'fr', url: 'https://www.frandroid.com/feed' }
];

/* topics, so the app can filter: the first that matches wins */
export const TOPICS = [
  ['pc', /\b(rtx|radeon|geforce|gpu|grafikkarte|carte graphique|ryzen|core ultra|intel arc|cpu|prozessor|processeur|ddr5|ram|arbeitsspeicher|ssd|nvme|mainboard|motherboard|carte mère|netzteil|psu|gaming[- ]pc|pc gamer|dlss|fsr)\b/i],
  ['display', /\b(oled|qd-oled|mini-?led|monitor|moniteur|écran|fernseher|tv|téléviseur|bravia|hdmi|displayport|hdr|dolby vision)\b/i],
  ['phone', /\b(iphone|galaxy|pixel|smartphone|handy|android|ios|oneplus|xiaomi|nothing phone)\b/i],
  ['audio', /\b(soundbar|kopfhörer|casque|headphones?|earbuds|airpods|sonos|bose|sennheiser|lautsprecher|enceinte)\b/i],
  ['laptop', /\b(laptop|notebook|macbook|ordinateur portable|ipad|tablet|tablette)\b/i],
  ['deal', /\b(deal|angebot|bon plan|black friday|cyber monday|prime day|soldes|rabatt|discount|price cut|preissenkung|baisse de prix)\b/i]
];

const decode = s => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();
const tag = (block, name) => { const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i')); return m ? m[1] : ''; };

/* RSS <item> or Atom <entry> → { title, url, date, sum } */
export function parseFeed(xml, src, lang) {
  const out = [], blocks = String(xml).match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const title = decode(tag(b, 'title'));
    let url = decode(tag(b, 'link'));
    if (!url) { const m = b.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i); if (m) url = m[1]; }
    const when = decode(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'));
    const d = new Date(when);
    if (!title || !/^https?:\/\//.test(url) || isNaN(d)) continue;
    const sum = decode(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')).slice(0, 220);
    const text = title + ' ' + sum, t = (TOPICS.find(([, rx]) => rx.test(text)) || ['other'])[0];
    out.push({ title: title.slice(0, 200), url, date: d.toISOString(), sum, src, lang, t });
  }
  return out;
}
export function merge(lists, now = new Date(), keep = 150, days = 21) {
  const seen = new Set(), all = [];
  for (const n of lists.flat()) { const k = n.url.replace(/[?#].*$/, ''); if (seen.has(k)) continue; seen.add(k); if ((now - new Date(n.date)) / 864e5 <= days && new Date(n.date) <= new Date(now.getTime() + 36e5)) all.push(n); }
  return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, keep);
}

async function main() {
  const lists = [], status = [];
  for (const f of FEEDS) {
    try {
      const r = await fetch(f.url, { headers: { 'user-agent': 'Prisme news reader (personal app; GitHub Actions)' }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const items = parseFeed(await r.text(), f.src, f.lang); lists.push(items); status.push({ src: f.src, n: items.length });
    } catch (e) { status.push({ src: f.src, n: 0, err: String(e.message || e).slice(0, 80) }); }
  }
  const items = merge(lists);
  const file = new URL('../prisme/data/news.json', import.meta.url);
  let old = null; try { old = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { }
  /* every feed failed: keep yesterday's file rather than an empty one */
  if (!items.length && old && old.items && old.items.length) { console.log('no feed answered; keeping the old file'); console.table(status); return; }
  fs.writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), feeds: status, items }, null, 0).replace(/\},\{"title"/g, '},\n{"title"') + '\n');
  console.table(status); console.log(items.length, 'headlines');
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) main();
