"""Write the app's data file (data/paris.json) from the researched spots and events, the Wikimedia photos and the car parks.

Spot ids are slugs of the names ("eiffel-tower"), so they stay the same when spots are added or the list is re-sorted:
visits and lists saved on phones are keyed by them. If a spot is ever renamed, add the old slug to ALIASES.
Nothing personal goes in this file: it is public, and every person's lists, visits and trips stay on their own devices.
"""
import datetime as dt, json, math, os, re, sys, unicodedata

sys.path.insert(0, os.path.dirname(__file__))
from common import CATEGORIES, CAT, VER
from spots_a import SPOTS_A
from spots_b import SPOTS_B
from spots_c import SPOTS_C
from spots_d import SPOTS_D
from events import EVENTS

OUT = sys.argv[1] if len(sys.argv) > 1 else 'paris.json'
geo = json.load(open('geocoded.json'))
geo_ev = json.load(open('geocoded_events.json'))
photos = json.load(open('photos.json')) if os.path.exists('photos.json') else {}
parking = json.load(open('parking.json')) if os.path.exists('parking.json') else []
names_fr = json.load(open('names_fr.json')) if os.path.exists('names_fr.json') else {}   # French display names where the name is in English
ALIASES = {}  # old slug -> new slug, if a spot is renamed


def slug(name):
    s = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\(.*?\)', '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:48].rstrip('-')


def hav(a, b):
    R = 6371000
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = p2 - p1, math.radians(b[1] - a[1])
    x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(x))


spots = SPOTS_A + SPOTS_B + SPOTS_C + SPOTS_D
ids, by_name = {}, {}
for s in spots:
    i = slug(s['name'])
    assert i not in ids.values(), ('duplicate slug', i, s['name'])
    ids[s['name']] = i

# car parks: give each a short id and keep the useful fields
pks = []
KEEP = {'surface', 'underground', 'multi-storey', 'rooftop'}   # laybys, carports, sheds and lanes are not places to leave a car for a visit
# names that say the car park is not for visitors: disabled bays, buses, staff, residents, a nursery, a hospital, private
NOT_FOR_VISITORS = re.compile(r'handicap|\bpmr\b|\bbus\b|des bus|personnel|staff|crèche|creche|résidentiel|residentiel|résidents|privé|prive\b|private|livraison|deux[ -]roues|\bmoto|taxi|hôpital|hopital|police|réservé|reserve', re.I)
for p in parking:
    if p['kind'] not in KEEP or NOT_FOR_VISITORS.search(p['name'] or ''):
        continue
    pks.append(dict(id=p['id'], n=p['name'] or ('Underground car park' if p['kind'] == 'underground' else 'Car park'), lat=p['lat'], lon=p['lon'],
                    k=p['kind'], op=p['operator'], cap=p['capacity'], a=p['area']))


def nearest_parks(lat, lon, paris):
    lim = 900 if paris else 1600
    cand = []
    for p in pks:
        if paris and p['a'] != 'paris':
            continue
        d = hav((lat, lon), (p['lat'], p['lon']))
        if d <= lim:
            # in Paris prefer named underground/multi-storey car parks; a few metres of walking is worth a reliable car park
            pen = 0 if (p['k'] in ('underground', 'multi-storey')) else 150
            pen += 0 if p['n'] and p['n'] not in ('Car park', 'Underground car park') else 80
            cand.append((d + pen, d, p['id']))
    cand.sort()
    return [[pid, round(d)] for _, d, pid in cand[:3]]


def thumb(url, w0, width):
    """A standard-width thumbnail of a Commons original, when the original is wider than that (lists and map markers
    should not load a full-size file). Narrower originals are used as they are: Commons does not scale up."""
    m = re.match(r'(https://upload\.wikimedia\.org/wikipedia/commons/)([0-9a-f]/[0-9a-f]{2}/)([^/]+\.(?:jpe?g|png))$', url, re.I)
    if m and w0 and w0 > width:
        return f'{m.group(1)}thumb/{m.group(2)}{m.group(3)}/{width}px-{m.group(3)}'
    return url


def tags(s):
    return [t.strip() for t in (s['tags'] or '').split(',') if t.strip()]


out_spots = []
for s in spots:
    g = geo[s['name']]
    ph = photos.get(s['name'])
    o = dict(id=ids[s['name']], n=s['name'], nf=names_fr.get(s['name'], ''), c=s['cat'], i=s['imp'], z=s['zone'], a=s['area'], lat=g['lat'], lon=g['lon'],
             why=s['why'], shot=s['shot'] if s['shot'] not in ('—', '') else '', tips=s['tips'], dec=s['dec'], dur=s['dur'], io=s['io'], price=s['price'],
             book=s['book'], closed=s['closed'], free=s['free'], go=s['metro'], tags=tags(s), rom=bool(s['rom']), st=s['status'], r=s['radius'],
             src=s['src'], ver=s['ver'], pk=nearest_parks(g['lat'], g['lon'], s['zone'] == 'P'))
    if ph:
        o['ph'] = dict(s=thumb(ph['t250'], ph['w'], 250), m=thumb(ph['t500'], ph['w'], 500), l=thumb(ph['t960'], ph['w'], 960),
                       by=ph['author'], lic=ph['license'], url=ph['page'], w=ph['w'], h=ph['h'])
    out_spots.append({k: v for k, v in o.items() if v not in ('', None, [], False) or k in ('i',)})

# events
ev_out = []
for n, e in enumerate(EVENTS):
    if e['spot']:
        sid = ids[e['spot']]
        lat, lon = geo[e['spot']]['lat'], geo[e['spot']]['lon']
    else:
        sid = None
        gg = geo_ev[e['q']]
        lat, lon = gg['lat'], gg['lon']
    o = dict(id=f'ev{n + 1:02d}', n=e['name'], t=e['type'], s=e['start'], e=e['end'], h=e['hours'], p=e['price'], i=e['imp'], spot=sid, lat=lat, lon=lon,
             conf=e['conf'], notes=e['notes'], src=e['src'])
    ev_out.append({k: v for k, v in o.items() if v not in ('', None)})

# curated lists (ids), computed from categories and tags so they stay in step with the data
S = {o['id']: o for o in out_spots}
by_imp = lambda xs: sorted(xs, key=lambda o: (-o['i'], o['n']))
xmas_types = {'Windows & tree', 'Lights', 'Christmas market', 'Ice rink', 'Light festival', 'Christmas at a château', 'Mass', 'Theme park season'}
xmas_spots = {e['spot'] for e in ev_out if e.get('spot') and e['t'] in xmas_types}
has_tag = lambda o, *ws: any(w.lower() in t.lower() for t in o.get('tags', []) for w in ws)
open_ = lambda o: not o.get('st', 'Open').startswith('Closed')
LISTS = [
    ('first', 'First time in Paris', 'Premier séjour à Paris', 'The grade 4 and 5 places: the ones a first visit is built around.',
     'Les lieux notés 4 et 5 : ceux autour desquels se construit un premier séjour.', [o for o in by_imp(out_spots) if o['i'] >= 4 and open_(o)]),
    ('christmas', 'Christmas 2026', 'Noël 2026', 'Windows, lights, markets, rinks and Christmas programmes, with their dates.',
     'Vitrines, illuminations, marchés, patinoires et programmes de Noël, avec leurs dates.', [o for o in by_imp(out_spots) if o['id'] in xmas_spots or ('Christmas' in o.get('dec', '') and open_(o))]),
    ('chic', 'Palaces & haute cuisine', 'Palaces & haute cuisine', 'Palace hotels, starred tables, the great bars, spas and couture houses.',
     'Palaces, tables étoilées, grands bars, spas et maisons de couture.', [o for o in by_imp(out_spots) if o['c'] == 'ST' or has_tag(o, 'luxury', 'palace', 'Michelin', 'chic', 'special occasion', 'Dior', 'fashion')]),
    ('romantic', 'For two', 'À deux', 'Places that are better as a couple.', 'Les lieux qui se vivent mieux à deux.', [o for o in by_imp(out_spots) if o.get('rom') and open_(o)]),
    ('views', 'Views & photo spots', 'Points de vue & photos', 'The best views of Paris and the classic photo spots.', 'Les plus belles vues de Paris et les photos classiques.',
     [o for o in by_imp(out_spots) if (o['c'] == 'VP' or has_tag(o, 'view', 'photo spot')) and open_(o)]),
    ('rain', 'Rainy day', 'Jour de pluie', 'Indoors and worth it: museums, covered passages, department stores, warm cafés.',
     'À l’abri et ça vaut le coup : musées, passages couverts, grands magasins, cafés.', [o for o in by_imp(out_spots) if o.get('io') == 'Indoor' and open_(o) and o['c'] in ('MU', 'SH', 'SA', 'CF', 'NO', 'EX', 'LM')]),
    ('free', 'Free', 'Gratuit', 'No ticket needed.', 'Sans billet.', [o for o in by_imp(out_spots) if re.match(r'\s*free', o.get('price', ''), re.I) and open_(o)]),
    ('night', 'After dark', 'À la nuit tombée', 'Bars, jazz, cabarets, shows and places at their best after dark.', 'Bars, jazz, cabarets, spectacles et lieux à voir de nuit.',
     [o for o in by_imp(out_spots) if (o['c'] == 'NO' or has_tag(o, 'night', 'late', 'lights')) and open_(o)]),
    ('food', 'Eat & drink', 'Manger & boire', 'Bistros, brasseries, bakeries, pâtisseries and chocolate.', 'Bistrots, brasseries, boulangeries, pâtisseries et chocolat.',
     [o for o in by_imp(out_spots) if o['c'] in ('RS', 'CF')]),
    ('beyond', 'Beyond Paris', 'Hors de Paris', 'Châteaux, towns and coasts for a day by car or train.', 'Châteaux, villes et côtes pour une journée en voiture ou en train.',
     [o for o in by_imp(out_spots) if o['z'] in ('GP', 'DT', 'LT') and open_(o)]),
]
lists = [dict(id=i, en=en, fr=fr, sub_en=se, sub_fr=sf, ids=[o['id'] for o in xs]) for i, en, fr, se, sf, xs in LISTS]

data = dict(
    v=1, city='paris', name='Paris', built=dt.date.today().isoformat(), checked='2026-11-26',
    center=[2.3290, 48.8590], zoom=12.75,   # the Eiffel Tower to the Marais
    cats=[dict(c=c[0], en=c[1], color=c[2], icon=c[3]) for c in CATEGORIES],
    spots=out_spots, events=ev_out, parking=pks, lists=lists, aliases=ALIASES,
    credits=dict(map='© OpenStreetMap contributors · OpenFreeMap', photos='Wikimedia Commons (each photo credited)', weather='Open-Meteo'),
)
json.dump(data, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print(OUT, os.path.getsize(OUT) // 1024, 'KB ·', len(out_spots), 'spots ·', sum(1 for o in out_spots if 'ph' in o), 'with photos ·', len(ev_out), 'events ·', len(pks), 'car parks ·',
      sum(1 for o in out_spots if o.get('pk')), 'spots with a car park')
for l in lists:
    print(' ', l['id'], len(l['ids']))
