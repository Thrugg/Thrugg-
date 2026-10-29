#!/usr/bin/env python3
"""Check data/hikes.json and bundle the app into index.html.

    python3 tools/build.py          check the catalogue, then build
    python3 tools/build.py --check  check only

Stops with a list of problems if the catalogue is invalid, so a broken
hike never reaches the published app. Needs only the Python standard
library (Pillow is used for the icons only if they are missing).
"""
import json, math, pathlib, re, sys
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, DATA = ROOT / 'src', ROOT / 'data'

COUNTRIES = {'DE', 'AT', 'CH', 'IT'}
GRADES = {'easy', 'moderate', 'hard', 'expert'}
SCALES = {'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T', 'E', 'EE', 'EEA'}
TAGS = {'lake', 'swim', 'summit', 'hut', 'waterfall', 'gorge', 'ridge', 'views', 'glacier', 'larch', 'family', 'history', 'cablecar', 'boat',
        'train', 'castle', 'meadow', 'viaferrata'}  # the last four are searchable but not shown as filters
KINDS = {'peak', 'hut', 'lake', 'pass', 'view', 'ridge', 'fall', 'gorge'}
TYPES = {'loop', 'out', 'trav'}
KEYS = ['id', 'n', 'ar', 'rg', 'c', 'p', 'pq', 'hi', 'tn', 'tk', 'ty', 'km', 'up', 'dn', 'mx', 'lo', 'g', 'sc', 'tg', 'ss', 'd', 'lf', 'b', 'ref', 'ad']
DOG_KEYS = {'r', 't', 'cow', 'h2o', 'n', 'src'}


def hav(a, b):
    r = math.pi / 180
    s = math.sin((b[0] - a[0]) * r / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin((b[1] - a[1]) * r / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(s))


def num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def check(hikes):
    errors, warnings, seen = [], [], {}
    if not isinstance(hikes, list) or not hikes:
        return ['hikes.json must be a non-empty list'], []
    for i, h in enumerate(hikes):
        where = f"#{i + 1} {h.get('id', '?') if isinstance(h, dict) else '?'}"
        E = lambda msg: errors.append(f'{where}: {msg}')
        W = lambda msg: warnings.append(f'{where}: {msg}')
        if not isinstance(h, dict):
            E('not an object'); continue
        for k in h:
            if k not in KEYS: E(f'unknown field "{k}"')
        hid = h.get('id')
        if not isinstance(hid, str) or not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', hid): E('id must be lowercase-with-dashes')
        elif hid in seen: E(f'duplicate id (also #{seen[hid] + 1})')
        else: seen[hid] = i
        for k in ('n', 'ar', 'rg', 'b'):
            if not isinstance(h.get(k), str) or not h[k].strip(): E(f'"{k}" must be a non-empty text')
        if h.get('c') not in COUNTRIES: E(f'"c" must be one of {sorted(COUNTRIES)}')
        p = h.get('p')
        if not isinstance(p, list) or len(p) < 2 or not all(isinstance(q, list) and len(q) == 2 and all(num(x) for x in q) for q in p):
            E('"p" must be a list of at least two [lat, lon] pairs'); p = None
        else:
            for q in p:
                if not (45.3 <= q[0] <= 48.9 and 5.8 <= q[1] <= 16.5): E(f'waypoint {q} is outside the Alps area (is it [lat, lon]?)')
            for a, b in zip(p, p[1:]):
                if hav(a, b) > 15: W(f'waypoints {a} and {b} are {hav(a, b):.1f} km apart')
        if 'pq' in h:
            pq = h['pq']
            if not isinstance(pq, list) or (p and len(pq) != len(p)) or not all(x is None or (isinstance(x, str) and x.strip()) for x in pq):
                E('"pq" must have one place name (or null) per waypoint')
        if p and 'hi' in h and not (isinstance(h['hi'], int) and 0 <= h['hi'] < len(p)): E('"hi" must point at one of the waypoints')
        if h.get('ty') not in TYPES: E(f'"ty" must be one of {sorted(TYPES)}')
        if 'dn' in h and h.get('ty') != 'trav': E('"dn" is only for one-way (trav) hikes')
        if h.get('ty') == 'trav' and not num(h.get('dn')): E('one-way hikes need "dn" (metres of descent)')
        if h.get('ty') == 'loop' and p and hav(p[0], p[-1]) < 0.05: W('loop waypoints should not repeat the start at the end (the app closes the loop)')
        for k, lo, hi in (('km', 0.5, 45), ('up', 0, 2600), ('mx', 150, 4300), ('lo', 60, 3500)):
            if not num(h.get(k)) or not lo <= h[k] <= hi: E(f'"{k}" must be a number between {lo} and {hi}')
        if num(h.get('mx')) and num(h.get('lo')) and h['mx'] < h['lo']: E('"mx" (highest) is below "lo" (start)')
        if num(h.get('up')) and num(h.get('mx')) and num(h.get('lo')) and h.get('ty') != 'trav' and h['up'] < (h['mx'] - h['lo']) * 0.8:
            W(f'ascent {h["up"]} m looks low for {h["lo"]}→{h["mx"]} m')
        if num(h.get('km')) and num(h.get('up')) and h['km'] > 0 and h['up'] / h['km'] > 450: W(f'{h["up"] / h["km"]:.0f} m of ascent per km is very steep, check km/up')
        if h.get('g') not in GRADES: E(f'"g" must be one of {sorted(GRADES)}')
        if 'sc' in h and h['sc'] not in SCALES: E(f'"sc" must be one of {sorted(SCALES)}')
        if 'tk' in h and h['tk'] not in KINDS: E(f'"tk" must be one of {sorted(KINDS)}')
        if not isinstance(h.get('tg'), list) or any(t not in TAGS for t in h['tg']): E(f'"tg" tags must come from {sorted(TAGS)}')
        ss = h.get('ss')
        if not (isinstance(ss, list) and len(ss) == 2 and all(isinstance(m, int) and 1 <= m <= 12 for m in ss)): E('"ss" must be [first month, last month]')
        d = h.get('d')
        if not isinstance(d, dict): E('"d" (dog) is required')
        else:
            for k in d:
                if k not in DOG_KEYS: E(f'unknown dog field "{k}"')
            if d.get('r') not in ('free', 'leash', 'banned'): E('dog "r" must be free, leash or banned')
            if d.get('t', 'ok') not in ('ok', 'care', 'no'): E('dog "t" must be ok, care or no')
            if d.get('src', 'gen') not in ('rule', 'gen'): E('dog "src" must be rule or gen')
        if 'ref' in h and (not isinstance(h['ref'], list) or not all(isinstance(u, str) and u.startswith('https://') for u in h['ref'])):
            E('"ref" must be a list of https:// links')
        if 'ad' in h:
            try: date.fromisoformat(h['ad'])
            except Exception: E('"ad" must be a date like 2026-11-02')
    # near-duplicates: same start and same top
    ok = [h for h in hikes if isinstance(h, dict) and isinstance(h.get('p'), list) and len(h['p']) >= 2 and all(isinstance(q, list) and len(q) == 2 for q in h['p'])]
    for a_i, a in enumerate(ok):
        ta = a['p'][a.get('hi', len(a['p']) - 1)] if isinstance(a.get('hi'), int) and a['hi'] < len(a['p']) else a['p'][-1]
        for b in ok[a_i + 1:]:
            tb = b['p'][b.get('hi', len(b['p']) - 1)] if isinstance(b.get('hi'), int) and b['hi'] < len(b['p']) else b['p'][-1]
            if hav(a['p'][0], b['p'][0]) < 0.4 and hav(ta, tb) < 0.4:
                warnings.append(f'{a["id"]} and {b["id"]} share start and top: same hike twice?')
    return errors, warnings


def serialise(hikes):
    def ordered(h):
        o = {k: h[k] for k in KEYS if k in h}
        o.update({k: v for k, v in h.items() if k not in o})
        return o
    return '[\n' + ',\n'.join(json.dumps(ordered(h), ensure_ascii=False, separators=(',', ':')) for h in hikes) + '\n]\n'


def build(hikes):
    tpl = (SRC / 'index.template.html').read_text()
    css = (SRC / 'styles.css').read_text()
    body = (SRC / 'body.html').read_text()
    js = '\n'.join((SRC / 'js' / f).read_text() for f in ['core.js', 'map.js', 'ui.js', 'extras.js'])
    data = 'let HIKES = ' + serialise(hikes).rstrip() + ';'
    html = tpl.replace('{{CSS}}', css).replace('{{BODY}}', body).replace('{{DATA}}', data).replace('{{JS}}', js)
    (ROOT / 'index.html').write_text(html)
    manifest = {
        "name": "Cordée", "short_name": "Cordée", "description": "Our hikes in Bavaria, Austria, Switzerland and the Dolomites.",
        "start_url": "./", "scope": "./", "display": "standalone", "background_color": "#1B2A32", "theme_color": "#1B2A32",
        "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]
    }
    (ROOT / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (ROOT / '.nojekyll').touch()
    if not all((ROOT / f'icon-{n}.png').exists() for n in (180, 192, 512)):
        make_icons()
    print(f'built index.html ({(ROOT / "index.html").stat().st_size // 1024} KB, {len(hikes)} hikes)')


def make_icons():
    from PIL import Image, ImageDraw
    for size in (180, 192, 512):
        W = size * 4
        im = Image.new('RGB', (W, W), (27, 42, 50))
        d = ImageDraw.Draw(im)
        d.polygon([(0, W * .78), (W * .28, W * .46), (W * .42, W * .58), (W * .62, W * .32), (W, W * .72), (W, W), (0, W)], fill=(36, 56, 66))
        pts = [(W * (.16 + .68 * t), W * (.70 - .44 * t) + math.sin(t * math.pi * 2) * W * .07) for t in (i / 100 for i in range(101))]
        d.line(pts, fill=(184, 134, 42), width=int(W * .035), joint='curve')
        for t, r, col in ((0, .075, (92, 178, 213)), (50, .075, (222, 107, 140)), (100, .055, (227, 234, 232))):
            x, y = pts[t]; d.ellipse([x - W * r, y - W * r, x + W * r, y + W * r], fill=col)
        im.resize((size, size), Image.LANCZOS).save(ROOT / f'icon-{size}.png')


if __name__ == '__main__':
    path = DATA / 'hikes.json'
    try:
        hikes = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        sys.exit(f'data/hikes.json is not valid JSON: {e}')
    errors, warnings = check(hikes)
    for w in warnings: print('warning:', w)
    if errors:
        print('\n'.join('error: ' + e for e in errors))
        sys.exit(f'{len(errors)} problem(s) in data/hikes.json, nothing was built.')
    counts = {c: sum(h['c'] == c for h in hikes) for c in ('DE', 'AT', 'CH', 'IT')}
    print(f'catalogue ok: {len(hikes)} hikes', counts)
    if '--check' in sys.argv: sys.exit(0)
    path.write_text(serialise(hikes))  # keep one hike per line, fields in the standard order
    build(hikes)
