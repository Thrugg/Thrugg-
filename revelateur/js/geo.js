/* Révélateur — crop, straighten and rotate. Pure functions.
   geo = { q: quarter turns clockwise (0–3), a: straighten angle in degrees (−45…45), crop: { x, y, w, h } } with the
   crop in the turned frame, 0…1. Straightening zooms in just enough (k) that no empty corner shows.
   The shader maps every output pixel back to the photo: src = 0.5 + M · (p − 0.5), with p the point in the crop. */
export const blankGeo = () => ({ q: 0, a: 0, crop: { x: 0, y: 0, w: 1, h: 1 } });
export const isPlain = g => !g || (!g.q && !g.a && (!g.crop || (g.crop.x === 0 && g.crop.y === 0 && g.crop.w === 1 && g.crop.h === 1)));
export const ASPECTS = [['orig', null], ['1:1', 1], ['4:5', 4 / 5], ['3:2', 3 / 2], ['16:9', 16 / 9], ['9:16', 9 / 16]];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export function norm(g) {
  const o = blankGeo(); if (!g) return o;
  o.q = ((Math.round(Number(g.q) || 0) % 4) + 4) % 4;
  o.a = clamp(Number(g.a) || 0, -45, 45);
  const c = g.crop || {};
  o.crop.w = clamp(Number(c.w) || 1, 0.05, 1); o.crop.h = clamp(Number(c.h) || 1, 0.05, 1);
  o.crop.x = clamp(Number(c.x) || 0, 0, 1 - o.crop.w); o.crop.y = clamp(Number(c.y) || 0, 0, 1 - o.crop.h);
  return o;
}
/* turned frame size and the zoom that hides the corners of a straightened photo */
export function frame(W, H, g) {
  const odd = g.q % 2 === 1, Wr = odd ? H : W, Hr = odd ? W : H, a = Math.abs(g.a) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const k = Math.min(Wr / (Wr * c + Hr * s), Hr / (Wr * s + Hr * c));
  return { Wr, Hr, k };
}
/* output size in pixels: the crop of the turned frame, at the photo's own resolution */
export function outDims(W, H, geo) {
  const g = norm(geo), f = frame(W, H, g);
  return { w: Math.max(1, Math.round(g.crop.w * f.Wr * f.k)), h: Math.max(1, Math.round(g.crop.h * f.Hr * f.k)) };
}
/* the 2 × 2 matrix from crop-frame coordinates (centred, 0…1) to photo coordinates (centred, 0…1) */
export function matrix(W, H, geo) {
  const g = norm(geo), f = frame(W, H, g), a = -g.a * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  /* frame pixels (centred) → straightened back → turned back → photo pixels → photo 0…1 */
  const Dr = [[f.Wr * f.k, 0], [0, f.Hr * f.k]];
  const Rm = [[c, -s], [s, c]];
  const Q = [[[1, 0], [0, 1]], [[0, 1], [-1, 0]], [[-1, 0], [0, -1]], [[0, -1], [1, 0]]][g.q];   // rotated (X, Y) → source (x, y)
  const Ds = [[1 / W, 0], [0, 1 / H]];
  const mul = (A, B) => [[A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]], [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]];
  const M = mul(Ds, mul(Q, mul(Rm, Dr)));
  return { M: [M[0][0], M[0][1], M[1][0], M[1][1]], crop: g.crop, g };
}
/* where an output point (0…1) lands in the photo (0…1) — the same mapping as the shader */
export function mapPoint(W, H, geo, u, v) {
  const { M, crop } = matrix(W, H, geo), px = crop.x + u * crop.w - 0.5, py = crop.y + v * crop.h - 0.5;
  return [0.5 + M[0] * px + M[1] * py, 0.5 + M[2] * px + M[3] * py];
}
/* the largest centred crop of an aspect ratio (w / h of the output) in the turned frame */
export function cropAspect(W, H, geo, ratio) {
  const g = norm(geo), f = frame(W, H, g);
  if (!ratio) return { ...g, crop: { x: 0, y: 0, w: 1, h: 1 } };
  const fr = f.Wr / f.Hr; let w = 1, h = 1;
  if (ratio > fr) h = fr / ratio; else w = ratio / fr;
  return norm({ ...g, crop: { x: (1 - w) / 2, y: (1 - h) / 2, w, h } });
}
/* scale the crop around its centre (size 0.3…1 of the largest crop of its aspect) and move it */
export function cropMove(geo, dx, dy) { const g = norm(geo); return norm({ ...g, crop: { ...g.crop, x: g.crop.x + dx, y: g.crop.y + dy } }); }
export function cropScale(W, H, geo, ratio, size) {
  const base = cropAspect(W, H, geo, ratio).crop, g = norm(geo), cx = g.crop.x + g.crop.w / 2, cy = g.crop.y + g.crop.h / 2;
  const w = base.w * clamp(size, 0.3, 1), h = base.h * clamp(size, 0.3, 1);
  return norm({ ...g, crop: { x: cx - w / 2, y: cy - h / 2, w, h } });
}
