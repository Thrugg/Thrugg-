"""Geocode every spot with Nominatim (1 request/second, cached), with fallbacks, and check the result."""
import json, os, sys, time, urllib.parse, urllib.request, unicodedata

sys.path.insert(0, os.path.dirname(__file__))
from spots_a import SPOTS_A
from spots_b import SPOTS_B
from spots_c import SPOTS_C
from spots_d import SPOTS_D

HERE = os.path.dirname(__file__)
CACHE = os.path.join(HERE, 'geocache.json')
OUT = os.path.join(HERE, 'geocoded.json')
UA = 'city-spots-research/0.1 (one-off geocoding of tourist sights)'
PARIS = (2.224, 48.815, 2.470, 48.902)  # lon_min, lat_min, lon_max, lat_max
OVR = json.load(open(os.path.join(HERE, 'overrides.json'))) if os.path.exists(os.path.join(HERE, 'overrides.json')) else {}
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}


def norm(t):
    return unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()


def get(params):
    key = json.dumps(params, sort_keys=True)
    if key not in cache:
        base = dict(format='jsonv2', addressdetails=1, extratags=1, limit=5, countrycodes='fr')
        base.update(params)
        url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(base)
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'fr,en'})
        with urllib.request.urlopen(req, timeout=30) as r:
            cache[key] = json.load(r)
        json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
        time.sleep(1.1)
    return cache[key]


def same_pc(a, b):
    if not a or not b:
        return False
    if a.startswith(b) or b.startswith(a):
        return True
    # 75116 is the 16th like 75016
    return a in ('75016', '75116') and b in ('75016', '75116')


def ok(r, s):
    post = (r.get('address') or {}).get('postcode', '')
    lat, lon = float(r['lat']), float(r['lon'])
    if same_pc(post, s['pc']):
        return True
    if s['zone'] == 'P':
        inside = PARIS[0] <= lon <= PARIS[2] and PARIS[1] <= lat <= PARIS[3]
        return inside and not post  # areas (parks, islands) often carry no postcode
    return norm(s['area'].split('–')[0]) in norm(r.get('display_name', ''))


def attempts(s):
    o = OVR.get(s['name'], {})
    if 'latlon' in o:
        return
    qs = o.get('q_list') or [s['q']]
    for q in qs:
        yield dict(q=q)
        parts = [p.strip() for p in q.split(',')]
        if len(parts) >= 3:
            yield dict(q=parts[0] + ', ' + parts[-1])  # name only
            yield dict(street=parts[1], city=parts[-1], postalcode=s['pc'] if s['pc'] and len(s['pc']) == 5 else '')  # address only


out, problems = {}, []
for s in SPOTS_A + SPOTS_B + SPOTS_C + SPOTS_D:
    o = OVR.get(s['name'], {})
    if 'latlon' in o:
        out[s['name']] = dict(lat=o['latlon'][0], lon=o['latlon'][1], how='manual: ' + o.get('why', ''), osm='', wikidata=o.get('wikidata', ''))
        continue
    found = None
    for params in attempts(s):
        params = {k: v for k, v in params.items() if v}
        for r in get(params):
            if ok(r, s):
                found = (r, params)
                break
        if found:
            break
    if not found:
        problems.append(s['name'])
        continue
    r, params = found
    out[s['name']] = dict(lat=round(float(r['lat']), 6), lon=round(float(r['lon']), 6),
                          how='OSM: ' + r.get('display_name', '')[:110], osm=f"{r.get('osm_type')}/{r.get('osm_id')}",
                          wikidata=(r.get('extratags') or {}).get('wikidata', '') or o.get('wikidata', ''))
json.dump(out, open(OUT, 'w'), ensure_ascii=False, indent=1)
print(len(out), 'geocoded;', len(problems), 'unresolved:')
for p in problems:
    print(' -', p)
