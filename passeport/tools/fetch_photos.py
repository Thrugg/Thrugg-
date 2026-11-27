"""One photo per spot from Wikimedia Commons, with author and licence for the credit line.

Order of preference for each spot:
  1. the Wikidata item's image (P18), picked by Wikidata editors as the place's main picture;
  2. the first photo in the item's Commons category (P373);
  3. a geotagged Commons photo within 60 m whose file name shares a distinctive word with the spot's name.
Spots with none of these get no photo (the app draws a designed placeholder instead).
Thumbnail URLs use Wikimedia's standard widths (250, 500, 960) so they are served from cache.
"""
import json, os, re, sys, time, unicodedata, urllib.error, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from spots_a import SPOTS_A
from spots_b import SPOTS_B
from spots_c import SPOTS_C
from spots_d import SPOTS_D

UA = 'passeport-build/0.1 (one-off photo lookup for a travel guide)'
OUT = 'photos.json'
CACHE = 'photo_cache.json'
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
geo = json.load(open('geocoded.json'))
fix = json.load(open('wd_fix.json'))
links = json.load(open('wikidata.json'))


def get(url, key=None):
    key = key or url
    if key in cache:
        return cache[key]
    for attempt in range(8):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.load(r)
            cache[key] = data
            json.dump(cache, open(CACHE, 'w'))
            time.sleep(0.6)
            return data
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503):
                raise
            wait = int(e.headers.get('Retry-After') or 0) or 20 * (attempt + 1)
            print('  busy, waiting', wait, flush=True)
            time.sleep(wait)
    raise SystemExit('gave up on ' + url)


def qid_for(name):
    if name in fix:
        v = fix[name]
        if isinstance(v, list):
            return max(v, key=lambda q: links.get(q, {}).get('links', -1))
        return v
    return geo[name].get('wikidata', '')


spots = SPOTS_A + SPOTS_B + SPOTS_C + SPOTS_D
qids = sorted({q for q in (qid_for(s['name']) for s in spots) if q})
print(len(spots), 'spots,', len(qids), 'with a Wikidata item', flush=True)

# 1-2. P18 image and P373 Commons category from Wikidata
claims = {}
for i in range(0, len(qids), 50):
    url = 'https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode(dict(action='wbgetentities', ids='|'.join(qids[i:i + 50]), props='claims', format='json'))
    for q, e in get(url)['entities'].items():
        c = e.get('claims') or {}
        val = lambda p: next((s['mainsnak']['datavalue']['value'] for s in c.get(p, []) if s['mainsnak'].get('datavalue') and s.get('rank') != 'deprecated'), None)
        claims[q] = dict(p18=val('P18'), p373=val('P373'))

files = {}  # spot name -> (file title, how)
for s in spots:
    q = qid_for(s['name'])
    c = claims.get(q) or {}
    if c.get('p18'):
        files[s['name']] = ('File:' + c['p18'], 'Wikidata image')

# 2. first photo of the Commons category for items without P18
for s in spots:
    if s['name'] in files:
        continue
    q = qid_for(s['name'])
    cat = (claims.get(q) or {}).get('p373')
    if not cat:
        continue
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(dict(action='query', format='json', list='categorymembers', cmtitle='Category:' + cat, cmtype='file', cmlimit='20'))
    mem = [m['title'] for m in get(url).get('query', {}).get('categorymembers', []) if re.search(r'\.(jpe?g|png|webp)$', m['title'], re.I)]
    if mem:
        files[s['name']] = (mem[0], 'Commons category')


def words(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    stop = {'the', 'and', 'de', 'du', 'des', 'la', 'le', 'les', 'paris', 'rue', 'avenue', 'place', 'cafe', 'restaurant', 'bar', 'hotel', 'maison', 'musee', 'museum',
            'jpg', 'jpeg', 'file', 'with', 'for', 'from', 'view', 'boulevard', 'quai', 'grand', 'petit', 'saint', 'sainte', 'church', 'eglise'}
    return {w for w in re.split(r'[^a-z0-9]+', t) if len(w) > 2 and w not in stop}


# 3. a geotagged photo right next to the spot that names it
for s in spots:
    if s['name'] in files:
        continue
    g = geo[s['name']]
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(dict(action='query', format='json', list='geosearch', gscoord=f"{g['lat']}|{g['lon']}", gsradius='60', gslimit='50', gsnamespace='6'))
    hits = get(url).get('query', {}).get('geosearch', [])
    want = words(s['name'].split('(')[0])
    best = None
    for h in sorted(hits, key=lambda h: h['dist']):
        if not re.search(r'\.(jpe?g|png|webp)$', h['title'], re.I):
            continue
        if want & words(h['title']):
            best = h['title']
            break
    if best:
        files[s['name']] = (best, 'Geotagged nearby')

# imageinfo for every chosen file
titles = sorted({f for f, _ in files.values()})
info = {}
for i in range(0, len(titles), 40):
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(dict(
        action='query', format='json', titles='|'.join(titles[i:i + 40]), prop='imageinfo', iiprop='url|size|extmetadata|mime',
        iiurlwidth='960', iiextmetadatafilter='Artist|LicenseShortName|LicenseUrl|Credit|AttributionRequired|Restrictions'))
    data = get(url)
    norm = {n['to']: n['from'] for n in data.get('query', {}).get('normalized', [])}
    for p in data.get('query', {}).get('pages', {}).values():
        if 'imageinfo' not in p:
            continue
        info[norm.get(p['title'], p['title'])] = p['imageinfo'][0]
        info[p['title']] = p['imageinfo'][0]


def strip_html(h):
    t = re.sub(r'<[^>]+>', '', h or '')
    t = re.sub(r'\s+', ' ', t).strip()
    return t.replace('&amp;', '&').replace('&quot;', '"').replace('&#039;', "'")


def sized(url, w):
    return re.sub(r'/\d+px-', f'/{w}px-', url) if url and re.search(r'/\d+px-', url) else url


out, missing = {}, []
for s in spots:
    f = files.get(s['name'])
    ii = info.get(f[0]) if f else None
    if not ii:
        missing.append(s['name'])
        continue
    md = ii.get('extmetadata') or {}
    lic = strip_html((md.get('LicenseShortName') or {}).get('value')) or 'see file page'
    artist = strip_html((md.get('Artist') or {}).get('value')) or strip_html((md.get('Credit') or {}).get('value')) or 'Unknown author'
    if len(artist) > 80:
        artist = artist[:77] + '…'
    width = ii.get('width') or 0
    t960 = ii.get('thumburl') or ii['url']
    out[s['name']] = dict(
        file=f[0].replace('File:', ''), how=f[1], w=width, h=ii.get('height') or 0,
        t250=sized(t960, 250) if width > 250 else ii['url'],
        t500=sized(t960, 500) if width > 500 else ii['url'],
        t960=t960 if width > 960 else ii['url'],
        page=ii.get('descriptionurl'), author=artist, license=lic, licenseUrl=(md.get('LicenseUrl') or {}).get('value', ''))
json.dump(out, open(OUT, 'w'), ensure_ascii=False, indent=1)
from collections import Counter
print('photos:', len(out), 'of', len(spots), dict(Counter(v['how'] for v in out.values())))
print('no photo:', len(missing))
for m in missing:
    print('  -', m)
