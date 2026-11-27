/* Passeport — a postcard from a validated visit: your photo, the stamp, the place and the date, ready to share. */
/* a Commons photo is fetched with CORS (Wikimedia allows it) so the canvas can still be saved as a picture */
const loadImg = src => new Promise((res, rej) => { const i = new Image(); if (/^https?:/.test(src)) i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('image')); i.src = src; });

function cover(g, img, x, y, w, h) {
  const k = Math.max(w / img.width, h / img.height), sw = w / k, sh = h / k;
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
function wrap(g, text, x, y, maxW, lh, maxLines) {
  const words = String(text).split(/\s+/); let line = '', n = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y + n * lh); line = w; if (++n >= maxLines - 1) break; }
    else line = test;
  }
  if (line && n < maxLines) g.fillText(n === maxLines - 1 && words.length ? line : line, x, y + n * lh);
}

/* o: { photo: Blob | null, photoUrl (fallback, e.g. the Commons image), stampSvg, title, place, date, greeting, footer } → Blob (JPEG) */
export async function makePostcard(o) {
  const W = 1800, H = 1200, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  try { await Promise.all(['italic 90px "Bodoni Moda"', '600 30px "IBM Plex Mono"', '500 34px "DM Sans"'].map(f => document.fonts.load(f))); } catch (e) { }
  // paper with a soft grain
  g.fillStyle = '#f5efe3'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(120,96,60,${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  // photo on the left with a white border and a slight tilt
  const PW = 1060, PH = 1000, PX = 70, PY = 100;
  g.save(); g.translate(PX + PW / 2, PY + PH / 2); g.rotate(-0.012);
  g.shadowColor = 'rgba(30,20,10,.28)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
  g.fillStyle = '#fff'; g.fillRect(-PW / 2 - 18, -PH / 2 - 18, PW + 36, PH + 36);
  g.shadowColor = 'transparent';
  try {
    const src = o.photo ? URL.createObjectURL(o.photo) : o.photoUrl;
    if (src) { const img = await loadImg(src); cover(g, img, -PW / 2, -PH / 2, PW, PH); if (o.photo) URL.revokeObjectURL(src); }
    else throw new Error('none');
  } catch (e) { g.fillStyle = '#1c2e55'; g.fillRect(-PW / 2, -PH / 2, PW, PH); }
  g.restore();
  // dividing line and address lines, like the back of a card
  g.strokeStyle = 'rgba(28,46,85,.35)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(1205, 120); g.lineTo(1205, 1080); g.stroke();
  for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(1260, 820 + k * 62); g.lineTo(1730, 820 + k * 62); g.stroke(); }
  // greeting and place
  g.fillStyle = '#1c2e55';
  g.font = '500 30px "DM Sans", system-ui, sans-serif'; g.fillText(o.greeting.toUpperCase(), 1260, 330);
  g.font = 'italic 112px "Bodoni Moda", Georgia, serif'; g.fillText('Paris', 1252, 450);
  g.fillStyle = '#9a7a3c'; g.fillRect(1262, 482, 120, 4);
  g.fillStyle = '#1b1f2a'; g.font = '600 42px "DM Sans", system-ui, sans-serif'; wrap(g, o.title, 1260, 560, 470, 52, 3);
  g.font = '500 28px "IBM Plex Mono", ui-monospace, monospace'; g.fillStyle = '#5b6170'; g.fillText(o.date, 1260, 740);
  g.font = '500 24px "IBM Plex Mono", ui-monospace, monospace'; g.fillText(o.place || '', 1260, 778);
  // the stamp, top right, with a postmark over it
  if (o.stampSvg) {
    try {
      const img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(o.stampSvg));
      g.drawImage(img, 1470, 70, 260, 260);
    } catch (e) { }
  }
  g.strokeStyle = 'rgba(28,46,85,.5)'; g.lineWidth = 3;
  for (let k = 0; k < 5; k++) { g.beginPath(); for (let x = 1380; x <= 1600; x += 6) { const y = 150 + k * 22 + Math.sin(x / 18) * 6; x === 1380 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
  g.font = '500 20px "IBM Plex Mono", ui-monospace, monospace'; g.fillStyle = 'rgba(28,46,85,.55)'; g.fillText(o.footer || 'PASSEPORT · PARIS', 1260, 1110);
  return await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('canvas')), 'image/jpeg', 0.9));
}
