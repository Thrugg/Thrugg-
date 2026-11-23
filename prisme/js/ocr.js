/* Prisme — reading a screenshot on the phone itself (an offer's spec list, a shop page's price): no server, nothing
   sent anywhere. Text recognition is Tesseract, shared with Écurie (../ecurie/vendor/tesseract, Apache 2.0): about
   4 MB the first time, then kept by the service worker. engine.js picks the facts out of the text. */
const base = () => new URL('../../ecurie/vendor/tesseract/', import.meta.url).href;
let tess = null;
const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('The text reader could not be loaded. Check the connection and try again.')); document.head.append(s); });
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
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad-image')); };
    img.src = url;
  });
}
export async function readImage(file, onStep) {
  onStep && onStep('prep');
  const w = await worker(), canvas = await prep(file);
  onStep && onStep('read');
  const { data } = await w.recognize(canvas);
  return data.text || '';
}
