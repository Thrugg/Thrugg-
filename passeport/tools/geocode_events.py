"""Geocode the events that have no linked spot (Nominatim, cached in geocache.json, 1 request/second)."""
import json, os, time, urllib.parse, urllib.request
from events import EVENTS

UA = 'city-spots-research/0.1 (one-off geocoding of tourist sights)'
cache = json.load(open('geocache.json')) if os.path.exists('geocache.json') else {}


def get(params):
    key = json.dumps(params, sort_keys=True)
    if key not in cache:
        base = dict(format='jsonv2', addressdetails=1, extratags=1, limit=5, countrycodes='fr')
        base.update(params)
        url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(base)
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r:
            cache[key] = json.load(r)
        json.dump(cache, open('geocache.json', 'w'), ensure_ascii=False)
        time.sleep(1.1)
    return cache[key]


out = {}
for e in EVENTS:
    if e['q']:
        res = get(dict(q=e['q']))
        pick = next((r for r in res if (r.get('address') or {}).get('postcode', '').startswith(e['pc'] or '')), res[0] if res else None)
        out[e['q']] = dict(lat=round(float(pick['lat']), 6), lon=round(float(pick['lon']), 6), how=pick['display_name'][:100]) if pick else None
        print(e['q'], '->', out[e['q']])
json.dump(out, open('geocoded_events.json', 'w'), ensure_ascii=False, indent=1)
