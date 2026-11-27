"""Write plain-text copies of the Spots and Christmas 2026 sheets (values after recalculation) for readable git diffs."""
import csv, sys
from openpyxl import load_workbook
src, outdir = sys.argv[1], sys.argv[2]
wb = load_workbook(src, data_only=True)
for sheet, name, drop in (('Spots', 'paris-spots.csv', {'Map', 'Stars'}), ('Christmas 2026', 'paris-events.csv', {'Map'})):
    ws = wb[sheet]
    rows = list(ws.iter_rows(values_only=True))
    head = list(rows[0])
    keep = [i for i, h in enumerate(head) if h not in drop]
    with open(f'{outdir}/{name}', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow([head[i] for i in keep])
        n = 0
        for r in rows[1:]:
            if not r[1]:
                continue
            w.writerow(['' if r[i] is None else (r[i].date().isoformat() if hasattr(r[i], 'date') and hasattr(r[i], 'hour') else r[i]) for i in keep])
            n += 1
    print(name, n, 'rows')
