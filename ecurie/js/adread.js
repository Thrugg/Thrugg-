/* Écurie — reading a screenshot of a car advert on the phone itself: no Claude, no server, nothing sent anywhere.
   Text recognition is Tesseract (vendor/tesseract, Apache 2.0, German model, loaded only when an ad is read and kept
   by the service worker), then parseAd() picks the facts out of the text. Made for mobile.de and AutoScout24 in German
   or English, and works on most dealer pages. The person checks the filled form before analysing. */

/* makes as they appear in adverts, longest first so "Land Rover" wins over "Rover" */
export const MAKE_NAMES = ['Mercedes-Benz', 'Mercedes-AMG', 'Mercedes', 'Land Rover', 'Range Rover', 'Alfa Romeo', 'Aston Martin', 'Rolls-Royce', 'Lynk & Co', 'Abarth', 'Alpine', 'Audi', 'Bentley', 'BMW', 'BYD', 'Cadillac', 'Chevrolet', 'Citroën', 'Citroen', 'Cupra', 'Dacia', 'DS', 'Ferrari', 'Fiat', 'Ford', 'Genesis', 'Honda', 'Hyundai', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Lancia', 'Lexus', 'Lotus', 'Maserati', 'Mazda', 'McLaren', 'MG', 'MINI', 'Mini', 'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Polestar', 'Porsche', 'Renault', 'Saab', 'Seat', 'SEAT', 'Skoda', 'Škoda', 'Smart', 'smart', 'SsangYong', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'VW', 'Volvo'];
const RX_MAKE = new RegExp('(^|[^A-Za-zÀ-ž])(' + MAKE_NAMES.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?=$|[^A-Za-zÀ-ž])', 'i');

/* equipment and condition words in German and English → Écurie's option ids */
const OPTION_WORDS = [
  ['exhaust', /sportabgas|klappenauspuff|sport ?exhaust|abgasanlage mit klappe|akrapovi/i],
  ['ceramic', /keramik|ceramic|pccb/i],
  ['carbon', /carbon|kohlefaser/i],
  ['seats', /sportsitz|schalensitz|sport seats?|bucket seats?|m sportsitz|rs-sportsitz/i],
  ['diff', /sperrdifferenz|differenzialsperre|differentialsperre|limited[- ]slip|m differenzial|quattro mit sportdifferenzial/i],
  ['rearsteer', /hinterachslenkung|rear[- ]axle steering|integral ?aktiv|allradlenkung/i],
  ['air', /luftfederung|air suspension|airmatic|adaptive air/i],
  ['acc', /abstandstempomat|abstandsregel|abstandsregeltempomat|adaptive cruise|\bacc\b|distronic|stau-?assistent|driving assistant/i],
  ['hud', /head[- ]?up/i],
  ['lights', /matrix|laserlicht|laser ?light|pixel ?led/i],
  ['pano', /panorama/i],
  ['sound', /harman|bang ?& ?olufsen|b&o|burmester|bose|bowers|meridian|focal|soundsystem premium/i],
  ['wheels', /\b(19|20|21|22)\s?(zoll|"|”|inch)/i],
  ['towbar', /anhängerkupplung|anhaengerkupplung|\bahk\b|tow ?bar|towing hitch/i],
  ['winter', /winterräder|winterkompletträder|winterreifen auf felge|winter wheels/i],
  ['warranty', /garantie|warranty|premium selection|approved|junge sterne|das weltauto|gw plus/i],
  ['history', /scheckheft|service ?book|full service history|lückenlos.*wartung/i],
  ['owner', /fahrzeughalter\s*:?\s*1\b|1\.?\s*hand\b|erste hand|one owner|1 previous owner/i]
];
const num = s => { const v = Number(String(s).replace(/[.\s,'’](?=\d{3}\b)/g, '').replace(/[^\d]/g, '')); return isFinite(v) ? v : null; };

/* the facts from the recognised text of an advert */
export function parseAd(text) {
  const raw = String(text || ''), t = raw.replace(/[|]/g, 'I').replace(/ /g, ' ');
  const lines = t.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const out = { name: '', year: null, ps: null, km: null, price: null, fuel: '', gearbox: '', options: [], found: [] };
  /* the title: the first line that names a make */
  for (const l of lines) {
    const m = l.match(RX_MAKE);
    if (!m) continue;
    let make = m[2]; if (/^vw$/i.test(make)) make = 'VW'; else if (/^mini$/i.test(make)) make = 'MINI';
    const rest = l.slice(m.index + m[0].length).replace(/[•·|,;:]+.*$/, '').replace(/\s{2,}/g, ' ').trim();
    const words = rest.split(' ').filter(w => w && !/^\d{1,3}([.,]\d{3})+$/.test(w) && !/€|eur|km$/i.test(w)).slice(0, 5);
    out.name = [make.replace(/^mercedes$/i, 'Mercedes-Benz'), ...words].join(' ').replace(/\s+/g, ' ').trim();
    if (words.length) break;
  }
  /* power: "100 kW (136 PS)", "136 PS", "136 hp" */
  let m = t.match(/(\d{2,4})\s*kW\s*\(?\s*(\d{2,4})\s*(?:PS|hp|ch|cv)\b/i);
  if (m) out.ps = Number(m[2]); else if ((m = t.match(/(\d{2,4})\s*(?:PS|hp|ch)\b/i))) out.ps = Number(m[1]); else if ((m = t.match(/(\d{2,3})\s*kW\b/i))) out.ps = Math.round(Number(m[1]) * 1.36);
  if (out.ps && (out.ps < 40 || out.ps > 2000)) out.ps = null;
  /* first registration: "EZ 03/2019", "Erstzulassung 03/2019", "First registration 03/2019", or any MM/YYYY */
  m = t.match(/(?:EZ|Erstzulassung|Erstzul\.?|First registration|Registration)\D{0,14}(\d{1,2})\s*\/\s*((?:19|20)\d{2})/i) || t.match(/\b(0?[1-9]|1[0-2])\s*\/\s*((?:19|20)\d{2})\b/);
  if (m) out.year = Number(m[2]); else if ((m = t.match(/(?:Baujahr|Modelljahr|Model year|Year)\D{0,6}((?:19|20)\d{2})/i))) out.year = Number(m[1]);
  /* mileage: the number before "km" that is not a speed, a range or a consumption */
  const kms = [...t.matchAll(/(\d{1,3}(?:[.\s,’']\d{3})+|\d{1,7})\s*km\b(?!\s*\/\s*h)(?!\/h)/gi)].filter(x => !/\/\s*$/.test(t.slice(Math.max(0, x.index - 4), x.index)) && !/(l|kwh|g)\s*\/\s*100\s*$/i.test(t.slice(Math.max(0, x.index - 12), x.index)) && !/reichweite|range|100\s*$/i.test(t.slice(Math.max(0, x.index - 14), x.index)));
  const labelled = kms.find(x => /kilometer|mileage|laufleistung|km-?stand|odometer/i.test(t.slice(Math.max(0, x.index - 30), x.index)));
  const kmPick = labelled || kms.find(x => num(x[1]) >= 10) || kms[0];
  if (kmPick) { const v = num(kmPick[1]); if (v != null && v < 1500000) out.km = v; }
  /* price: the first euro amount that is not a monthly rate */
  const prices = [...t.matchAll(/(?:€\s*(\d{1,3}(?:[.,\s’']\d{3})+|\d{4,7})(?:[.,]-|[.,]00)?|(\d{1,3}(?:[.,\s’']\d{3})+|\d{4,7})(?:[.,]-|[.,]00)?\s*(?:€|EUR\b))/g)]
    .filter(x => !/^\s*(?:mtl|\/\s*m|monat|p\.?\s*m|per month|im monat|monatl)/i.test(t.slice(x.index + x[0].length, x.index + x[0].length + 14)) && !/(ab|rate|finanzierung|leasing)\s*$/i.test(t.slice(Math.max(0, x.index - 16), x.index)))
    .map(x => num(x[1] || x[2])).filter(v => v >= 500 && v <= 5000000);
  if (prices.length) out.price = prices[0];
  /* fuel and gearbox */
  if (/plug-?in|phev|e-hybrid|hybrid \(benzin\/elektro\).*plug|\bgte\b/i.test(t)) out.fuel = 'phev';
  else if (/\belektro\b|\belectric\b|batterie-?kapazität|battery capacity/i.test(t) && !/benzin|diesel|petrol/i.test(t)) out.fuel = 'ev';
  else if (/\bhybrid\b/i.test(t)) out.fuel = 'hybrid';
  else if (/\bdiesel\b/i.test(t)) out.fuel = 'diesel';
  else if (/\bbenzin\b|\bpetrol\b|\bgasoline\b|super\b/i.test(t)) out.fuel = 'petrol';
  if (/schaltgetriebe|\bmanual\b|handschalt|6-?gang-?schalt/i.test(t)) out.gearbox = 'manual'; else if (/automatik|automatic|dsg|steptronic|tiptronic|pdk/i.test(t)) out.gearbox = 'auto';
  /* equipment and condition */
  for (const [id, rx] of OPTION_WORDS) if (rx.test(t)) out.options.push(id);
  if (out.gearbox === 'manual') out.options.push('manual');
  if (/(reparierte?r?\s*)?unfallschaden|unfallfahrzeug|accident damage|repaired damage/i.test(t) && !/kein(en)?\s+unfall|unfallfrei|accident[- ]free|no accident/i.test(t)) out.options.push('accident');
  for (const k of ['name', 'year', 'ps', 'km', 'price']) if (out[k]) out.found.push(k);
  return out;
}

/* text recognition, loaded the first time an ad is read */
let tess = null;
const base = () => new URL('vendor/tesseract/', document.baseURI).href;
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('The text reader could not be loaded. Check the connection and try again.')); document.head.appendChild(s); }); }
async function worker() {
  if (tess) return tess;
  if (!window.Tesseract) await loadScript(base() + 'tesseract.min.js');
  tess = window.Tesseract.createWorker('deu', 1, { workerPath: base() + 'worker.min.js', corePath: base() + 'tesseract-core-simd-lstm.js', langPath: base().replace(/\/$/, ''), gzip: true, workerBlobURL: false })
    .catch(e => { tess = null; throw e; });
  return tess;
}
/* a phone screenshot is tall: upscale small ones so small print reads well, cap huge ones to keep it quick */
function prep(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const w = img.naturalWidth, s = w < 1000 ? 1.6 : w > 2200 ? 2200 / w : 1, c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(img.naturalHeight * s); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That picture could not be opened. Take a screenshot (PNG or JPEG) of the ad and try again.')); };
    img.src = url;
  });
}
export async function readAdImage(file, onStep) {
  onStep && onStep('Preparing the reader (the first time it downloads about 4 MB, then it works offline)…');
  const w = await worker(), canvas = await prep(file);
  onStep && onStep('Reading the ad…');
  const { data } = await w.recognize(canvas);
  return { ...parseAd(data.text), text: data.text };
}
