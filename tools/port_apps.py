#!/usr/bin/env python3
"""Copy claude.ai artifacts into the site as home-screen apps with cloud sync.
   python3 tools/port_apps.py <slug> <artifact.html>   (slug: safety-net | gains-greeks)"""
import sys, pathlib, json
from PIL import Image, ImageDraw, ImageFont
ROOT = pathlib.Path(__file__).resolve().parent.parent
APPS = {
  'safety-net': dict(name='Safety Net Score', short='Safety Net', key='safetyNetScore.v1', bg=(37, 106, 191), fg=(255, 255, 255), mark='SN', theme='#eef1f2'),
  'gains-greeks': dict(name='Gains & Greeks', short='Gains & Greeks', key='gg.v1', bg=(13, 84, 101), fg=(215, 165, 71), mark='G&G', theme='#fafcfb'),
}
def icon(a, size, out):
    W = size * 4; im = Image.new('RGB', (W, W), a['bg']); d = ImageDraw.Draw(im)
    try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(W * (.36 if len(a['mark']) < 3 else .27)))
    except Exception: f = ImageFont.load_default()
    d.text((W / 2, W / 2), a['mark'], fill=a['fg'], font=f, anchor='mm')
    im.resize((size, size), Image.LANCZOS).save(out)
slug, src = sys.argv[1], pathlib.Path(sys.argv[2]); a = APPS[slug]
html = src.read_text()
head = f'''<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="{a['short']}"><meta name="theme-color" content="{a['theme']}">
<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon-180.png"><link rel="icon" href="icon-192.png">
<script src="../cloud.js"></script><script>Cloud.mirror({json.dumps(slug)}, {json.dumps(a['key'])});</script>
'''
assert html.count('</head>') == 1
html = html.replace('</head>', head + '</head>', 1)
out = ROOT / slug; out.mkdir(exist_ok=True)
(out / 'index.html').write_text(html)
for n in (180, 192, 512): icon(a, n, out / f'icon-{n}.png')
(out / 'manifest.webmanifest').write_text(json.dumps({"name": a['name'], "short_name": a['short'], "start_url": "./", "scope": "./", "display": "standalone",
  "background_color": a['theme'], "theme_color": a['theme'], "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"}]}, ensure_ascii=False, indent=2) + '\n')
print('ported', slug, len(html) // 1024, 'KB')
