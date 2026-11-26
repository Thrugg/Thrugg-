"""Number of Wikipedia language editions for each spot's Wikidata item (a rough global-fame signal), via the Wikidata API."""
import json, re, time, urllib.error, urllib.parse, urllib.request
g = json.load(open('geocoded.json'))
import os
fix = json.load(open('wd_fix.json')) if os.path.exists('wd_fix.json') else {}
have = json.load(open('wikidata.json')) if os.path.exists('wikidata.json') else {}
want = {v['wikidata'] for v in g.values() if v['wikidata'].startswith('Q')}
for v in fix.values():
    want.update(v if isinstance(v, list) else ([v] if v else []))
qids = sorted(q for q in want if q not in have)
print('to fetch:', len(qids), flush=True)
NOT_WP = {'commonswiki', 'specieswiki', 'metawiki', 'wikidatawiki', 'mediawikiwiki', 'sourceswiki', 'wikimaniawiki', 'outreachwiki'}
out = dict(have)
for i in range(0, len(qids), 50):
    url = 'https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode(dict(action='wbgetentities', ids='|'.join(qids[i:i+50]), props='sitelinks|labels', languages='en|fr', format='json'))
    req = urllib.request.Request(url, headers={'User-Agent': 'city-spots-research/0.1 (tourist-sight fame check)'})
    for attempt in range(8):
        try:
            ents = json.load(urllib.request.urlopen(req, timeout=60))['entities']
            break
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            wait = int(e.headers.get('Retry-After') or 0) or 60 * (attempt + 1)
            print('429, waiting', wait, flush=True)
            time.sleep(wait)
    else:
        raise SystemExit('gave up')
    for q, e in ents.items():
        links = [k for k in (e.get('sitelinks') or {}) if re.fullmatch(r'[a-z_]+wiki', k) and k not in NOT_WP]
        lab = (e.get('labels') or {})
        out[q] = dict(label=(lab.get('en') or lab.get('fr') or {}).get('value', ''), links=len(links))
    time.sleep(1)
json.dump(out, open('wikidata.json', 'w'), ensure_ascii=False, indent=1)
for k, v in g.items():
    w = out.get(v['wikidata'])
    print(f"{(w or {}).get('links', -1):4} {k[:45]:45} <- {(w or {}).get('label', '')}")
