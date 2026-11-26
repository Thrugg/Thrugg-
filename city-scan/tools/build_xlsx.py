"""Build the shared City Scan workbook (Paris) from the spot, event and reference data."""
import datetime as dt, json, os, sys
from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

sys.path.insert(0, os.path.dirname(__file__))
from common import CATEGORIES, CAT, ZONES, VER
from spots_a import SPOTS_A
from spots_b import SPOTS_B
from spots_c import SPOTS_C
from events import EVENTS
from reference import IMPORTANCE, SEASONS, PRACTICAL

OUT = sys.argv[1] if len(sys.argv) > 1 else 'city-scan-paris.xlsx'
geo = json.load(open('geocoded.json'))
geo_ev = json.load(open('geocoded_events.json'))
wd_links = json.load(open('wikidata.json')) if os.path.exists('wikidata.json') else {}
wd_fix = json.load(open('wd_fix.json')) if os.path.exists('wd_fix.json') else {}
sun = json.load(open('sun.json'))

FONT = 'Arial'
F = lambda **k: Font(name=FONT, **k)
HEAD_FILL = PatternFill('solid', fgColor='1F2A44')
INPUT_FILL = PatternFill('solid', fgColor='FFF2CC')   # yellow: cells for you to fill
SETTING_FILL = PatternFill('solid', fgColor='FFE699')
THIN = Side(style='thin', color='D9D9D9')
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP_TOP = Alignment(wrap_text=True, vertical='top')
CENTER = Alignment(horizontal='center', vertical='top', wrap_text=True)


def text_on(hex_):
    h = hex_.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return '000000' if (0.299 * r + 0.587 * g + 0.114 * b) > 150 else 'FFFFFF'


def header(ws, row, titles, widths):
    for c, (t, w) in enumerate(zip(titles, widths), 1):
        cell = ws.cell(row=row, column=c, value=t)
        cell.font = F(bold=True, color='FFFFFF')
        cell.fill = HEAD_FILL
        cell.alignment = Alignment(wrap_text=True, vertical='center')
        cell.border = BORDER
        ws.column_dimensions[get_column_letter(c)].width = w
    ws.row_dimensions[row].height = 32


wb = Workbook()

# ------------------------------------------------------------------ Start here
st = wb.active
st.title = 'Start here'
st.sheet_view.showGridLines = False
st.column_dimensions['A'].width = 3
st.column_dimensions['B'].width = 44
st.column_dimensions['C'].width = 34
st.column_dimensions['D'].width = 70
st['B2'] = 'City Scan · Paris (shared list)'
st['B2'].font = F(bold=True, size=18, color='1F2A44')
st['B3'] = 'Version 1 · built 26 Nov 2026 · Paris first; any city can be added later with the same columns.'
st['B3'].font = F(italic=True, color='666666')

intro = [
    ('What this is', 'The shared list behind the City Scan app idea: every spot worth visiting, with a category (map colour), an importance grade from 1 to 5, the photo to take to validate a visit, and what is special in December 2026. "Spots" holds the permanent places; "Christmas 2026" is the time-limited layer the app would switch on by date.'),
    ('How to add a spot', 'Add a row at the bottom of "Spots". The Name and City are enough (add the category and your own grade if you like). Put "You" in "Added by". At the next pass Claude fills in the rest (coordinates, transport, prices, sources) and flags anything that needs a decision.'),
    ('Your columns (yellow)', '"For us" (Must / Want / Maybe / Skip), "Visited on", "Photo validated" and "Our notes" are yours. The trip dates and base below (yellow) drive the "During our trip?" and "Distance from base" columns.'),
    ('How sure is each line?', 'The "Info checked" column says whether the facts were checked on the web on 26 Nov 2026 (with a link in "Source") or come from general knowledge and should be checked before going. In "Christmas 2026", "Confidence" says the same for each event.'),
]
r = 5
for k, v in intro:
    st.cell(row=r, column=2, value=k).font = F(bold=True)
    c = st.cell(row=r, column=3, value=v)
    c.font = F()
    c.alignment = WRAP_TOP
    st.merge_cells(start_row=r, start_column=3, end_row=r, end_column=4)
    st.row_dimensions[r].height = 62
    st.cell(row=r, column=2).alignment = WRAP_TOP
    r += 1

# Settings (inputs)
r += 1
st.cell(row=r, column=2, value='Settings (change the yellow cells)').font = F(bold=True, size=12, color='1F2A44')
r += 1
SETTINGS_ROW = r
settings = [
    ('Trip start', dt.date(2026, 12, 1), 'Placeholder: replace with your arrival date.'),
    ('Trip end', dt.date(2026, 12, 31), 'Placeholder: replace with your departure date.'),
    ('Base (hotel) name', 'Point zéro, parvis de Notre-Dame', 'Default is the official centre of Paris; put your hotel instead.'),
    ('Base latitude', 48.85341, 'Decimal degrees. Point zéro des routes de France.'),
    ('Base longitude', 2.34880, 'Decimal degrees.'),
]
cells = {}
for i, (k, v, note) in enumerate(settings):
    rr = r + i
    st.cell(row=rr, column=2, value=k).font = F()
    c = st.cell(row=rr, column=3, value=v)
    c.font = F(color='0000FF')
    c.fill = SETTING_FILL
    c.border = BORDER
    if isinstance(v, dt.date):
        c.number_format = 'ddd d mmm yyyy'
    elif isinstance(v, float):
        c.number_format = '0.00000'
    st.cell(row=rr, column=4, value=note).font = F(italic=True, color='666666')
    cells[k] = f"'Start here'!$C${rr}"
TRIP_START, TRIP_END = cells['Trip start'], cells['Trip end']
BASE_LAT, BASE_LON = cells['Base latitude'], cells['Base longitude']
r += len(settings) + 1
SUMMARY_ROW = r  # filled after the Spots sheet exists

# ------------------------------------------------------------------ Spots
ws = wb.create_sheet('Spots')
cat_order = {c[0]: i for i, c in enumerate(CATEGORIES)}
spots = sorted(SPOTS_A + SPOTS_B + SPOTS_C, key=lambda s: (cat_order[s['cat']], -s['imp'], s['name']))
cols = [
    ('ID', 10), ('Name', 30), ('City', 8), ('Category', 16), ('Importance (1–5)', 11), ('Stars', 9), ('First-visit core?', 9), ('Zone', 13), ('Area', 12),
    ('Why it matters', 55), ('The shot (photo to validate the visit)', 34), ('Tips', 45), ('December / Christmas 2026', 50), ('Visit time (min)', 8),
    ('Indoor / outdoor', 9), ('Price (adult)', 26), ('Booking', 14), ('Closed', 20), ('Free for', 24), ('Getting there', 30), ('Tags', 24), ('Romantic', 8),
    ('Status', 13), ('Latitude', 10), ('Longitude', 10), ('Check-in radius (m)', 9), ('Distance from base (km)', 10), ('Map', 9), ('Wikidata', 11),
    ('Wikipedia editions', 9), ('Location source', 30), ('Info checked', 16), ('Source', 30), ('Added by', 9),
    ('For us', 9), ('Visited on', 11), ('Photo validated', 9), ('Our notes', 30),
]
C = {name: i + 1 for i, (name, _) in enumerate(cols)}
L = {name: get_column_letter(i) for name, i in C.items()}
header(ws, 1, [c[0] for c in cols], [c[1] for c in cols])
ws.freeze_panes = 'C2'

def wd_for(name):
    if name in wd_fix:
        v = wd_fix[name]
        if isinstance(v, list):  # several candidate items: keep the best-known one
            return max(v, key=lambda q: wd_links.get(q, {}).get('links', -1))
        return v
    return geo[name]['wikidata']

for i, s in enumerate(spots):
    row = i + 2
    g = geo[s['name']]
    qid = wd_for(s['name'])
    links = wd_links.get(qid, {}).get('links') if qid else None
    vals = {
        'ID': f'PAR-{i + 1:03d}', 'Name': s['name'], 'City': 'Paris', 'Category': CAT[s['cat']][1], 'Importance (1–5)': s['imp'],
        'Stars': f'=REPT("★",{L["Importance (1–5)"]}{row})&REPT("☆",5-{L["Importance (1–5)"]}{row})',
        'First-visit core?': f'=IF({L["Importance (1–5)"]}{row}>=4,"Core","")',
        'Zone': ZONES[s['zone']].split(' (')[0], 'Area': s['area'], 'Why it matters': s['why'], 'The shot (photo to validate the visit)': s['shot'], 'Tips': s['tips'],
        'December / Christmas 2026': s['dec'], 'Visit time (min)': s['dur'], 'Indoor / outdoor': s['io'], 'Price (adult)': s['price'], 'Booking': s['book'],
        'Closed': s['closed'], 'Free for': s['free'], 'Getting there': s['metro'], 'Tags': s['tags'], 'Romantic': 'Yes' if s['rom'] else '', 'Status': s['status'],
        'Latitude': g['lat'], 'Longitude': g['lon'], 'Check-in radius (m)': s['radius'],
        'Distance from base (km)': (f'=IF(OR({L["Latitude"]}{row}="",{L["Longitude"]}{row}=""),"",ROUND(6371*ACOS(MIN(1,SIN(RADIANS({L["Latitude"]}{row}))*SIN(RADIANS({BASE_LAT}))'
                                    f'+COS(RADIANS({L["Latitude"]}{row}))*COS(RADIANS({BASE_LAT}))*COS(RADIANS({L["Longitude"]}{row}-{BASE_LON})))),1))'),
        'Map': (f'=IF({L["Latitude"]}{row}="","",HYPERLINK("https://www.google.com/maps/search/?api=1&query="&SUBSTITUTE({L["Latitude"]}{row}&"",",",".")'
                f'&"%2C"&SUBSTITUTE({L["Longitude"]}{row}&"",",","."),"Open map"))'),
        'Wikidata': qid or '', 'Wikipedia editions': links, 'Location source': g['how'], 'Info checked': VER[s['ver']], 'Source': s['src'], 'Added by': 'Claude',
    }
    for name, v in vals.items():
        c = ws.cell(row=row, column=C[name], value=v if v != '' else None)
        c.font = F(size=9)
        c.alignment = WRAP_TOP
        c.border = BORDER
    cat_hex = CAT[s['cat']][2]
    cc = ws.cell(row=row, column=C['Category'])
    cc.fill = PatternFill('solid', fgColor=cat_hex.lstrip('#'))
    cc.font = F(size=9, bold=True, color=text_on(cat_hex))
    for name in ('Importance (1–5)', 'Visit time (min)', 'Check-in radius (m)', 'Distance from base (km)', 'Wikipedia editions', 'Romantic'):
        ws.cell(row=row, column=C[name]).alignment = CENTER
    ws.cell(row=row, column=C['Stars']).font = F(size=9, color='B8860B')
    ws.cell(row=row, column=C['Latitude']).number_format = '0.00000'
    ws.cell(row=row, column=C['Longitude']).number_format = '0.00000'
    ws.cell(row=row, column=C['Map']).font = F(size=9, color='0563C1', underline='single')
    if s['src']:
        ws.cell(row=row, column=C['Source']).hyperlink = s['src']
        ws.cell(row=row, column=C['Source']).font = F(size=9, color='0563C1', underline='single')
    if qid:
        ws.cell(row=row, column=C['Wikidata']).hyperlink = f'https://www.wikidata.org/wiki/{qid}'
        ws.cell(row=row, column=C['Wikidata']).font = F(size=9, color='0563C1', underline='single')
    for name in ('For us', 'Visited on', 'Photo validated', 'Our notes'):
        c = ws.cell(row=row, column=C[name])
        c.fill = INPUT_FILL
    ws.cell(row=row, column=C['Visited on']).number_format = 'd mmm yyyy'
    ws.row_dimensions[row].height = 60

LAST = len(spots) + 1
# Extra empty yellow rows for new spots (formulas pre-filled so they work when a row is added)
EXTRA = 40
for row in range(LAST + 1, LAST + 1 + EXTRA):
    for name in ('Name', 'City', 'Category', 'Importance (1–5)', 'Added by'):
        ws.cell(row=row, column=C[name]).fill = INPUT_FILL
    for name in ('For us', 'Visited on', 'Photo validated', 'Our notes'):
        ws.cell(row=row, column=C[name]).fill = INPUT_FILL
    ws.cell(row=row, column=C['Stars']).value = f'=IF({L["Importance (1–5)"]}{row}="","",REPT("★",{L["Importance (1–5)"]}{row})&REPT("☆",5-{L["Importance (1–5)"]}{row}))'
    ws.cell(row=row, column=C['First-visit core?']).value = f'=IF({L["Importance (1–5)"]}{row}="","",IF({L["Importance (1–5)"]}{row}>=4,"Core",""))'
    ws.cell(row=row, column=C['Distance from base (km)']).value = (
        f'=IF(OR({L["Latitude"]}{row}="",{L["Longitude"]}{row}=""),"",ROUND(6371*ACOS(MIN(1,SIN(RADIANS({L["Latitude"]}{row}))*SIN(RADIANS({BASE_LAT}))'
        f'+COS(RADIANS({L["Latitude"]}{row}))*COS(RADIANS({BASE_LAT}))*COS(RADIANS({L["Longitude"]}{row}-{BASE_LON})))),1))')
    ws.cell(row=row, column=C['Map']).value = (f'=IF({L["Latitude"]}{row}="","",HYPERLINK("https://www.google.com/maps/search/?api=1&query="&SUBSTITUTE({L["Latitude"]}{row}&"",",",".")'
                                               f'&"%2C"&SUBSTITUTE({L["Longitude"]}{row}&"",",","."),"Open map"))')
    for name in ('Stars', 'First-visit core?', 'Distance from base (km)', 'Map'):
        ws.cell(row=row, column=C[name]).font = F(size=9)
GRID_END = LAST + EXTRA
ws.cell(row=LAST + 1, column=C['Name']).comment = Comment('Add new spots from here: Name and City are enough. Put "You" in Added by.', 'Claude')
ws.auto_filter.ref = f'A1:{get_column_letter(len(cols))}{GRID_END}'

# Validations
dv_cat = DataValidation(type='list', formula1=f"=Categories!$B$2:$B${len(CATEGORIES) + 1}", allow_blank=True)
dv_imp = DataValidation(type='whole', operator='between', formula1='1', formula2='5', allow_blank=True, error='Importance is a whole number from 1 to 5.')
dv_zone = DataValidation(type='list', formula1='"' + ','.join(z.split(' (')[0] for z in ZONES.values()) + '"', allow_blank=True)
dv_us = DataValidation(type='list', formula1='"Must,Want,Maybe,Skip"', allow_blank=True)
dv_yes = DataValidation(type='list', formula1='"Yes,No"', allow_blank=True)
dv_date = DataValidation(type='date', operator='greaterThan', formula1='45658', allow_blank=True, error='Enter a date.')
for dv in (dv_cat, dv_imp, dv_zone, dv_us, dv_yes, dv_date):
    ws.add_data_validation(dv)
dv_cat.add(f'{L["Category"]}2:{L["Category"]}{GRID_END}')
dv_imp.add(f'{L["Importance (1–5)"]}2:{L["Importance (1–5)"]}{GRID_END}')
dv_zone.add(f'{L["Zone"]}2:{L["Zone"]}{GRID_END}')
dv_us.add(f'{L["For us"]}2:{L["For us"]}{GRID_END}')
dv_yes.add(f'{L["Photo validated"]}2:{L["Photo validated"]}{GRID_END}')
dv_date.add(f'{L["Visited on"]}2:{L["Visited on"]}{GRID_END}')

# Conditional formatting: importance shading, closed status, "For us"
imp_rng = f'{L["Importance (1–5)"]}2:{L["Importance (1–5)"]}{GRID_END}'
for val, colr in ((5, 'F4B183'), (4, 'F8CBAD'), (3, 'FBE5D6')):
    ws.conditional_formatting.add(imp_rng, CellIsRule(operator='equal', formula=[str(val)], fill=PatternFill('solid', fgColor=colr), font=F(bold=True, size=9)))
st_rng = f'{L["Status"]}2:{L["Status"]}{GRID_END}'
ws.conditional_formatting.add(st_rng, FormulaRule(formula=[f'LEFT({L["Status"]}2,6)="Closed"'], fill=PatternFill('solid', fgColor='D9D9D9'), font=F(color='C00000', bold=True, size=9)))
us_rng = f'{L["For us"]}2:{L["For us"]}{GRID_END}'
ws.conditional_formatting.add(us_rng, CellIsRule(operator='equal', formula=['"Must"'], fill=PatternFill('solid', fgColor='C6EFCE'), font=F(bold=True, color='006100', size=9)))
ws.conditional_formatting.add(us_rng, CellIsRule(operator='equal', formula=['"Skip"'], fill=PatternFill('solid', fgColor='EDEDED'), font=F(color='7F7F7F', size=9)))

SP = "Spots!"
CAT_COL = f"{SP}${L['Category']}$2:${L['Category']}${GRID_END}"
IMP_COL = f"{SP}${L['Importance (1–5)']}$2:${L['Importance (1–5)']}${GRID_END}"
ZONE_COL = f"{SP}${L['Zone']}$2:${L['Zone']}${GRID_END}"
NAME_COL = f"{SP}${L['Name']}$2:${L['Name']}${GRID_END}"
US_COL = f"{SP}${L['For us']}$2:${L['For us']}${GRID_END}"
VIS_COL = f"{SP}${L['Visited on']}$2:${L['Visited on']}${GRID_END}"
PH_COL = f"{SP}${L['Photo validated']}$2:${L['Photo validated']}${GRID_END}"
XMAS_COL = f"{SP}${L['December / Christmas 2026']}$2:${L['December / Christmas 2026']}${GRID_END}"

# ------------------------------------------------------------------ Christmas 2026 (events)
ev = wb.create_sheet('Christmas 2026')
ecols = [('ID', 8), ('Event', 46), ('Type', 15), ('Starts', 12), ('Ends', 12), ('During our trip?', 11), ('Hours', 30), ('Price', 20), ('Season importance (1–5)', 9),
         ('Linked spot', 28), ('Spot ID', 9), ('Confidence', 12), ('Notes', 50), ('Latitude', 10), ('Longitude', 10), ('Map', 9), ('Source', 30), ('For us', 9), ('Our notes', 26)]
EC = {n: i + 1 for i, (n, _) in enumerate(ecols)}
EL = {n: get_column_letter(i) for n, i in EC.items()}
header(ev, 1, [c[0] for c in ecols], [c[1] for c in ecols])
ev.freeze_panes = 'C2'
type_order = ['Windows & tree', 'Lights', 'Christmas market', 'Ice rink', 'Light festival', 'Christmas at a château', 'Show', 'Concert', 'Mass', 'Fireworks', 'Theme park season',
              'Seasonal food', 'Free day', 'Exhibition', 'Closure', 'Practical']
events = sorted(EVENTS, key=lambda e: (type_order.index(e['type']), -e['imp'], e['start'] or '9999'))
spot_by_name = {s['name']: s for s in spots}
for i, e in enumerate(events):
    row = i + 2
    if e['spot']:
        assert e['spot'] in spot_by_name, e['spot']
        lat, lon = geo[e['spot']]['lat'], geo[e['spot']]['lon']
    else:
        g = geo_ev[e['q']]
        lat, lon = g['lat'], g['lon']
    vals = {
        'ID': f'EV-{i + 1:03d}', 'Event': e['name'], 'Type': e['type'],
        'Starts': dt.date.fromisoformat(e['start']) if e['start'] else None, 'Ends': dt.date.fromisoformat(e['end']) if e['end'] else None,
        'During our trip?': (f'=IF(AND({EL["Starts"]}{row}="",{EL["Ends"]}{row}=""),"Dates TBC",IF(AND(OR({EL["Starts"]}{row}="",{EL["Starts"]}{row}<={TRIP_END}),'
                             f'OR({EL["Ends"]}{row}="",{EL["Ends"]}{row}>={TRIP_START})),"Yes","No"))'),
        'Hours': e['hours'], 'Price': e['price'], 'Season importance (1–5)': e['imp'], 'Linked spot': e['spot'] or '',
        'Spot ID': f'=IF({EL["Linked spot"]}{row}="","",IFERROR(INDEX({SP}$A$2:$A${GRID_END},MATCH({EL["Linked spot"]}{row},{NAME_COL},0)),"not found"))',
        'Confidence': e['conf'], 'Notes': e['notes'], 'Latitude': lat, 'Longitude': lon,
        'Map': (f'=HYPERLINK("https://www.google.com/maps/search/?api=1&query="&SUBSTITUTE({EL["Latitude"]}{row}&"",",",".")&"%2C"&SUBSTITUTE({EL["Longitude"]}{row}&"",",","."),"Open map")'),
        'Source': e['src'],
    }
    for name, v in vals.items():
        c = ev.cell(row=row, column=EC[name], value=v if v != '' else None)
        c.font = F(size=9)
        c.alignment = WRAP_TOP
        c.border = BORDER
    for name in ('Starts', 'Ends'):
        ev.cell(row=row, column=EC[name]).number_format = 'ddd d mmm yyyy'
    for name in ('During our trip?', 'Season importance (1–5)', 'Spot ID'):
        ev.cell(row=row, column=EC[name]).alignment = CENTER
    ev.cell(row=row, column=EC['Latitude']).number_format = '0.00000'
    ev.cell(row=row, column=EC['Longitude']).number_format = '0.00000'
    ev.cell(row=row, column=EC['Map']).font = F(size=9, color='0563C1', underline='single')
    if e['src']:
        ev.cell(row=row, column=EC['Source']).hyperlink = e['src']
        ev.cell(row=row, column=EC['Source']).font = F(size=9, color='0563C1', underline='single')
    for name in ('For us', 'Our notes'):
        ev.cell(row=row, column=EC[name]).fill = INPUT_FILL
    ev.row_dimensions[row].height = 48
EV_LAST = len(events) + 1
ev.auto_filter.ref = f'A1:{get_column_letter(len(ecols))}{EV_LAST}'
dv_us2 = DataValidation(type='list', formula1='"Must,Want,Maybe,Skip"', allow_blank=True)
ev.add_data_validation(dv_us2)
dv_us2.add(f'{EL["For us"]}2:{EL["For us"]}{EV_LAST + 20}')
trip_rng = f'{EL["During our trip?"]}2:{EL["During our trip?"]}{EV_LAST}'
ev.conditional_formatting.add(trip_rng, CellIsRule(operator='equal', formula=['"Yes"'], fill=PatternFill('solid', fgColor='C6EFCE'), font=F(bold=True, color='006100', size=9)))
ev.conditional_formatting.add(trip_rng, CellIsRule(operator='equal', formula=['"No"'], fill=PatternFill('solid', fgColor='EDEDED'), font=F(color='7F7F7F', size=9)))
conf_rng = f'{EL["Confidence"]}2:{EL["Confidence"]}{EV_LAST}'
ev.conditional_formatting.add(conf_rng, CellIsRule(operator='equal', formula=['"Not confirmed"'], font=F(color='C00000', bold=True, size=9)))
ev.conditional_formatting.add(conf_rng, CellIsRule(operator='equal', formula=['"One source"'], font=F(color='C65911', size=9)))

# ------------------------------------------------------------------ Categories
ca = wb.create_sheet('Categories')
header(ca, 1, ['Code', 'Category', 'Map colour', 'Hex', 'Icon idea', 'What goes in it', 'Spots'], [7, 26, 12, 10, 12, 60, 8])
for i, (code, name, hx, icon, what) in enumerate(CATEGORIES):
    row = i + 2
    for col, v in enumerate([code, name, '', hx, icon, what, f'=COUNTIF({CAT_COL},B{row})'], 1):
        c = ca.cell(row=row, column=col, value=v)
        c.font = F(size=10)
        c.border = BORDER
        c.alignment = WRAP_TOP
    ca.cell(row=row, column=3).fill = PatternFill('solid', fgColor=hx.lstrip('#'))
    ca.cell(row=row, column=7).alignment = CENTER
    ca.row_dimensions[row].height = 30
n = len(CATEGORIES) + 2
ca.cell(row=n, column=2, value='Total').font = F(bold=True)
ca.cell(row=n, column=7, value=f'=SUM(G2:G{n - 1})').font = F(bold=True)
ca.cell(row=n, column=7).alignment = CENTER
ca.cell(row=n + 2, column=2, value='Time-limited events (Christmas, festivals) are a separate layer in "Christmas 2026"; the app would draw them with a glowing marker on top of these colours.').font = F(italic=True, color='666666', size=9)

# ------------------------------------------------------------------ Importance
im = wb.create_sheet('Importance scale')
header(im, 1, ['Grade', 'Label', 'Meaning', 'Examples in this list', 'Spots'], [7, 18, 60, 70, 8])
for i, (g, lab, mean, ex) in enumerate(IMPORTANCE):
    row = i + 2
    for col, v in enumerate([g, lab, mean, ex, f'=COUNTIF({IMP_COL},A{row})'], 1):
        c = im.cell(row=row, column=col, value=v)
        c.font = F(size=10)
        c.border = BORDER
        c.alignment = WRAP_TOP
    im.cell(row=row, column=1).alignment = CENTER
    im.cell(row=row, column=5).alignment = CENTER
    im.row_dimensions[row].height = 36
row = len(IMPORTANCE) + 3
notes = [
    'How the grades were set: global fame (visitor numbers, and the Wikipedia-editions column as a cross-check), how unique the place is, and how often it appears on first-timer itineraries. It is the same idea as the Michelin Green Guide\'s 3 stars ("worth a journey / a detour / interesting"), stretched to 5 levels.',
    'Visitor numbers for the top sites (2025): Notre-Dame ~11 million in the 12 months after it reopened (Dec 2024), Louvre ~9.0 M, Versailles 8.4 M, Eiffel Tower 6.75 M.',
    'Restaurants, cafés and bars are graded on how iconic they are for a visitor, not on food quality alone. The app could later blend this grade with your personal interests and a seasonal boost (e.g. +1 for Christmas sights in December).',
    'Feel free to override any grade: change the number and add a note in "Our notes".',
]
srcs = ['', 'https://www.lechotouristique.com/article/le-louvre-atteint-9-millions-de-visiteurs-en-2025', '', '']
for t, s in zip(notes, srcs):
    c = im.cell(row=row, column=2, value=t)
    c.font = F(size=10)
    c.alignment = WRAP_TOP
    im.merge_cells(start_row=row, start_column=2, end_row=row, end_column=4)
    im.row_dimensions[row].height = 44
    if s:
        im.cell(row=row, column=5, value='Source').hyperlink = s
        im.cell(row=row, column=5).font = F(size=9, color='0563C1', underline='single')
    row += 1

# ------------------------------------------------------------------ Seasons (yearly)
se = wb.create_sheet('Yearly seasons')
header(se, 1, ['Month', 'Event or season', 'Typical timing', 'Where', 'Layer type', 'Notes'], [11, 48, 30, 42, 15, 40])
for i, rowv in enumerate(SEASONS):
    for col, v in enumerate(rowv, 1):
        c = se.cell(row=i + 2, column=col, value=v)
        c.font = F(size=10)
        c.border = BORDER
        c.alignment = WRAP_TOP
    se.row_dimensions[i + 2].height = 30
se.cell(row=len(SEASONS) + 3, column=2, value='Typical timing from general knowledge: verify each year before relying on a date. These are candidate "seasonal layers" for the app beyond Christmas.').font = F(italic=True, color='666666', size=9)

# ------------------------------------------------------------------ Practical
pr = wb.create_sheet('Practical')
header(pr, 1, ['Topic', 'What to know', 'Source'], [26, 100, 34])
for i, (t, v, s) in enumerate(PRACTICAL):
    row = i + 2
    for col, val in enumerate([t, v, s], 1):
        c = pr.cell(row=row, column=col, value=val)
        c.font = F(size=10, bold=(col == 1))
        c.border = BORDER
        c.alignment = WRAP_TOP
    if s.startswith('http'):
        pr.cell(row=row, column=3).hyperlink = s
        pr.cell(row=row, column=3).font = F(size=9, color='0563C1', underline='single')
    pr.row_dimensions[row].height = 58
row = len(PRACTICAL) + 3
pr.cell(row=row, column=1, value='Daylight in Paris, December 2026').font = F(bold=True, size=12, color='1F2A44')
row += 1
for col, t in enumerate(['Date', 'First light', 'Sunrise', 'Sunset', 'Dark (civil dusk)', 'Daylight (h)'], 1):
    c = pr.cell(row=row, column=col if col <= 3 else col, value=t)
DAY_HEAD = row
# lay the daylight table across columns A–C plus extra columns D–F
pr.column_dimensions['D'].width = 14
pr.column_dimensions['E'].width = 16
pr.column_dimensions['F'].width = 12
for col in range(1, 7):
    c = pr.cell(row=row, column=col)
    c.font = F(bold=True, color='FFFFFF')
    c.fill = HEAD_FILL
    c.border = BORDER
for j, (d, dawn, rise, set_, dusk, hours) in enumerate(sun):
    rr = row + 1 + j
    vals = [dt.date.fromisoformat(d), dawn, rise, set_, dusk, hours]
    for col, v in enumerate(vals, 1):
        c = pr.cell(row=rr, column=col, value=v)
        c.font = F(size=10)
        c.border = BORDER
        c.alignment = Alignment(horizontal='left')
    pr.cell(row=rr, column=1).number_format = 'ddd d mmm'
    pr.cell(row=rr, column=6).number_format = '0.0'
rr += 2
pr.cell(row=rr, column=1, value='Computed for Paris (48.853 N, 2.349 E) with the NOAA solar algorithm. The lights look best from about 17:00, so plan outdoor sights in daylight and illuminations after dark.').font = F(italic=True, color='666666', size=9)

# ------------------------------------------------------------------ Summary on Start here (formulas)
r = SUMMARY_ROW
st.cell(row=r, column=2, value='At a glance (updates as you edit)').font = F(bold=True, size=12, color='1F2A44')
r += 1
summary = [
    ('Spots in the list', f'=COUNTA({NAME_COL})'),
    ('Grade 5 (world icons)', f'=COUNTIF({IMP_COL},5)'),
    ('Grade 4 (major highlights)', f'=COUNTIF({IMP_COL},4)'),
    ('Spots with something special in December', f'=COUNTIF({XMAS_COL},"?*")'),
    ('Spots outside Paris (day or long trips)', f'=COUNTIF({ZONE_COL},"Day trip")+COUNTIF({ZONE_COL},"Long trip")'),
    ('Marked "Must" by you', f'=COUNTIF({US_COL},"Must")'),
    ('Visited so far', f'=COUNT({VIS_COL})'),
    ('Visits validated with a photo', f'=COUNTIF({PH_COL},"Yes")'),
    ('Christmas events during your trip dates', f"=COUNTIF('Christmas 2026'!${EL['During our trip?']}$2:${EL['During our trip?']}${EV_LAST},\"Yes\")"),
    ('Christmas events with dates still TBC', f"=COUNTIF('Christmas 2026'!${EL['During our trip?']}$2:${EL['During our trip?']}${EV_LAST},\"Dates TBC\")"),
]
for k, f in summary:
    st.cell(row=r, column=2, value=k).font = F()
    c = st.cell(row=r, column=3, value=f)
    c.font = F(bold=True)
    c.alignment = Alignment(horizontal='left')
    r += 1
r += 1
st.cell(row=r, column=2, value='Sheets').font = F(bold=True, size=12, color='1F2A44')
r += 1
for k, v in [('Spots', 'Every place, one row each (the main list).'), ('Christmas 2026', 'Dated events: windows, lights, markets, rinks, shows, masses, closures.'),
             ('Categories', 'The 12 categories and their map colours.'), ('Importance scale', 'What grades 1–5 mean.'),
             ('Yearly seasons', 'Seasonal layers for the rest of the year (for the app).'), ('Practical', 'Tickets, passes, closures, scams, daylight.')]:
    st.cell(row=r, column=2, value=k).font = F(bold=True)
    st.cell(row=r, column=3, value=v).font = F()
    st.merge_cells(start_row=r, start_column=3, end_row=r, end_column=4)
    r += 1

wb.save(OUT)
print('saved', OUT, len(spots), 'spots,', len(events), 'events')
