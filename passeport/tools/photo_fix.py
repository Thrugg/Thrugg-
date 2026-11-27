"""Apply hand-checked photo choices (photo_overrides.json) on top of photos.json: replace wrong matches, drop bad ones."""
import json, re, time, urllib.error, urllib.parse, urllib.request
UA = 'passeport-build/0.1 (one-off photo lookup for a travel guide)'
ov = json.load(open('photo_overrides.json'))
photos = json.load(open('photos.json'))
titles = sorted(set(ov['set'].values()))
url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(dict(action='query', format='json', titles='|'.join(titles), prop='imageinfo', iiprop='url|size|extmetadata', iiurlwidth='960', iiextmetadatafilter='Artist|LicenseShortName|LicenseUrl|Credit'))
for attempt in range(12):
    try:
        data = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60)); break
    except urllib.error.HTTPError as e:
        if e.code not in (429, 503): raise
        time.sleep(int(e.headers.get('Retry-After') or 0) or 30 * (attempt + 1))
norm = {n['to']: n['from'] for n in data['query'].get('normalized', [])}
info = {}
for p in data['query']['pages'].values():
    if 'imageinfo' in p: info[norm.get(p['title'], p['title'])] = p['imageinfo'][0]; info[p['title']] = p['imageinfo'][0]
strip = lambda h: re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', h or '')).strip().replace('&amp;', '&')
sized = lambda u, w: re.sub(r'/\d+px-', f'/{w}px-', u) if u and re.search(r'/\d+px-', u) else u
for spot, title in ov['set'].items():
    ii = info.get(title)
    if not ii: print('NOT FOUND', title); continue
    md = ii.get('extmetadata') or {}
    a = strip((md.get('Artist') or {}).get('value')) or strip((md.get('Credit') or {}).get('value')) or 'Unknown author'
    w = ii.get('width') or 0; t960 = ii.get('thumburl') or ii['url']
    photos[spot] = dict(file=title[5:], how='Chosen by hand', w=w, h=ii.get('height') or 0, t250=sized(t960, 250) if w > 250 else ii['url'], t500=sized(t960, 500) if w > 500 else ii['url'],
                        t960=t960 if w > 960 else ii['url'], page=ii.get('descriptionurl'), author=a[:77] + ('…' if len(a) > 77 else ''), license=strip((md.get('LicenseShortName') or {}).get('value')) or 'see file page', licenseUrl=(md.get('LicenseUrl') or {}).get('value', ''))
for spot in ov['drop']:
    photos.pop(spot, None)
json.dump(photos, open('photos.json', 'w'), ensure_ascii=False, indent=1)
print(len(photos), 'spots with a photo')
