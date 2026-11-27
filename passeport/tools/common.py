"""Shared spot constructor and reference tables."""

CATEGORIES = [
    # code, name, hex colour, icon idea, what goes in it
    ('LM', 'Landmark', '#D62728', 'monument', 'Monuments, squares, bridges and famous buildings seen mostly from outside'),
    ('CH', 'Château & palace', '#8C564B', 'crown', 'Royal and noble residences, mostly outside Paris'),
    ('MU', 'Museum & gallery', '#9467BD', 'frame', 'Museums, foundations, exhibition venues'),
    ('SA', 'Church & sacred place', '#7F7F7F', 'church', 'Cathedrals, churches, mosques, cemeteries'),
    ('VP', 'Viewpoint & rooftop', '#1F77B4', 'binoculars', 'Places you go to for the view'),
    ('PK', 'Park, garden & river', '#2CA02C', 'tree', 'Gardens, parks, woods, riverbanks'),
    ('NB', 'Neighbourhood, street & town', '#17BECF', 'walk', 'Areas to wander, streets, covered passages, day-trip towns'),
    ('RS', 'Restaurant & bistro', '#FF7F0E', 'fork', 'Meals: bistros, brasseries, bouillons, fine dining'),
    ('CF', 'Café, bakery & sweets', '#E377C2', 'croissant', 'Cafés, tea rooms, bakeries, pâtisseries, chocolate, ice cream'),
    ('NO', 'Night out & show', '#393B79', 'moon', 'Bars, jazz, cabaret, opera, circus, concerts'),
    ('SH', 'Shopping & market', '#BCBD22', 'bag', 'Department stores, luxury streets, shops, markets, outlets'),
    ('EX', 'Experience & activity', '#FFB000', 'star', 'Cruises, theme parks, rides, classes, sport'),
    ('ST', 'Stay & wellness', '#2F4F4F', 'bed', 'Hotels worth a night, spas'),
]
CAT = {c[0]: c for c in CATEGORIES}

ZONES = {
    'P': 'Paris (inside the ring road)',
    'GP': 'Greater Paris (under ~45 min)',
    'DT': 'Day trip (45 min–2h30 each way)',
    'LT': 'Long trip (2h30+ each way, or overnight)',
}

VER = {
    'W': 'Web-checked 26 Nov 2026',
    'K': 'From general knowledge: check before going',
}


def S(name, cat, imp, zone, area, q, metro, why, shot, tips='', dec='', dur=None, io='', price='', book='',
      closed='', free='', tags='', rom=False, src='', ver='K', radius=None, pc=None, status='Open'):
    assert cat in CAT, cat
    assert 1 <= imp <= 5
    assert zone in ZONES, zone
    assert ver in VER
    return dict(name=name, cat=cat, imp=imp, zone=zone, area=area, q=q, metro=metro, why=why, shot=shot, tips=tips,
                dec=dec, dur=dur, io=io, price=price, book=book, closed=closed, free=free, tags=tags, rom=rom, src=src,
                ver=ver, radius=radius or 150, pc=pc, status=status)
