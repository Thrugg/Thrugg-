"""Car parks from OpenStreetMap, for people who visit by car (looked up with Nominatim, one request a second, cached).

For each spot, the OpenStreetMap car parks in a box of about 1.3 km around it are listed.
Inside Paris only underground and multi-storey car parks (or named car parks of the big operators) are kept: street
parking is metered and heavy cars pay the SUV rate. Outside Paris any public car park is kept.
Writes parking.json: [{id, name, lat, lon, kind, operator, capacity, fee, area}] (map data © OpenStreetMap contributors, ODbL).
(Overpass would be the usual tool, but it does not answer from this build environment.)
"""
import json, os, re, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from spots_a import SPOTS_A
from spots_b import SPOTS_B
from spots_c import SPOTS_C
from spots_d import SPOTS_D

UA = 'passeport-build/0.1 (one-off car park list for a travel guide)'
CACHE = 'parking_cache.json'
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
geo = json.load(open('geocoded.json'))
spots = SPOTS_A + SPOTS_B + SPOTS_C + SPOTS_D
BRANDS = re.compile(r'indigo|q-park|saemes|effia|interparking|onepark|zenpark|parking|parc de stationnement|parkopoly|yespark|vinci', re.I)
NOT_PUBLIC = {'private', 'no', 'permit', 'residents', 'delivery'}


def fetch(lat, lon, dlat, dlon):
    box = f'{lon - dlon:.5f},{lat + dlat:.5f},{lon + dlon:.5f},{lat - dlat:.5f}'
    key = box
    if key not in cache:
        url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(dict(q='parking', format='jsonv2', viewbox=box, bounded=1, limit=50, extratags=1, addressdetails=0))
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=40) as r:
            cache[key] = json.load(r)
        json.dump(cache, open(CACHE, 'w'))
        time.sleep(1.1)
    return cache[key]


out = {}
for n, s in enumerate(spots):
    g = geo[s['name']]
    paris = s['zone'] == 'P'
    for r in fetch(g['lat'], g['lon'], 0.006 if paris else 0.009, 0.009 if paris else 0.013):
        if r.get('category') != 'amenity' or r.get('type') != 'parking':
            continue
        et = r.get('extratags') or {}
        kind = et.get('parking') or ''
        name = (r.get('name') or '').strip()
        lat, lon = float(r['lat']), float(r['lon'])
        inside = 48.815 <= lat <= 48.902 and 2.224 <= lon <= 2.470
        if et.get('access') in NOT_PUBLIC and not BRANDS.search(name):
            continue
        if inside and not (kind in ('underground', 'multi-storey') or (name and BRANDS.search(name))):
            continue
        if not inside and kind in ('street_side', 'lane', 'on_kerb', 'half_on_kerb'):
            continue
        pid = f"{r['osm_type'][0]}{r['osm_id']}"
        cap = et.get('capacity', '')
        out[pid] = dict(id=pid, name=name, lat=round(lat, 6), lon=round(lon, 6), kind=kind or 'surface', operator=et.get('operator', ''),
                        capacity=int(cap) if str(cap).isdigit() else None, fee=et.get('fee', ''), area='paris' if inside else 'out')
    if n % 25 == 0:
        print(n, 'spots done,', len(out), 'car parks', flush=True)

lst = sorted(out.values(), key=lambda p: (p['area'], p['name']))
json.dump(lst, open('parking.json', 'w'), ensure_ascii=False, indent=0)
from collections import Counter
print(len(lst), 'car parks', Counter((p['area'], p['kind']) for p in lst))
print('named:', sum(1 for p in lst if p['name']))
