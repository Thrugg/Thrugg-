/* Révélateur — writing the exported JPEG without a canvas.
   Why: on the iPhone a canvas is limited to about 16.7 million pixels, and a 24 or 48 MP photo is bigger. The
   edited photo is rendered by WebGL in strips; each strip is handed here and encoded straight away, so the full
   picture never has to sit in one canvas or one buffer.
   - JpegWriter: a baseline JPEG encoder (4:2:0), fed rows of RGBA pixels.
   - exifOf / fixExif: copy the camera's Exif block (date, camera, lens, place) into the export, with the rotation
     reset (the pixels are already upright) and the old thumbnail dropped; the place can be removed.
   - iccProfile: a small ICC profile so Display P3 colours (the iPhone's wide colour) are read correctly elsewhere. */

const ZZ = [0, 1, 5, 6, 14, 15, 27, 28, 2, 4, 7, 13, 16, 26, 29, 42, 3, 8, 12, 17, 25, 30, 41, 43, 9, 11, 18, 24, 31, 40, 44, 53, 10, 19, 23, 32, 39, 45, 52, 54, 20, 22, 33, 38, 46, 51, 55, 60, 21, 34, 37, 47, 50, 56, 59, 61, 35, 36, 48, 49, 57, 58, 62, 63];
const YQ = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];
const CQ = [17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99, ...new Array(32).fill(99)];
export const DC_L_N = [0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], DC_L_V = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const AC_L_N = [0, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d];
export const AC_L_V = [0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa];
export const DC_C_N = [0, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], DC_C_V = DC_L_V;
export const AC_C_N = [0, 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77];
export const AC_C_V = [0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71, 0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0, 0x15, 0x62, 0x72, 0xd1, 0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa];
const AASF = [1.0, 1.387039845, 1.306562965, 1.175875602, 1.0, 0.785694958, 0.5411961, 0.275899379];

function huff(nr, vals) {
  const t = []; let code = 0, p = 0;
  for (let k = 1; k <= 16; k++) { for (let j = 0; j < nr[k]; j++) t[vals[p++]] = [code++, k]; code <<= 1; }
  return t;
}
const HT = { dcl: huff(DC_L_N, DC_L_V), acl: huff(AC_L_N, AC_L_V), dcc: huff(DC_C_N, DC_C_V), acc: huff(AC_C_N, AC_C_V) };

class Bytes {
  constructor() { this.chunks = []; this.buf = new Uint8Array(1 << 16); this.n = 0; this.size = 0; }
  byte(b) { if (this.n === this.buf.length) this.flush(); this.buf[this.n++] = b; }
  word(w) { this.byte((w >> 8) & 255); this.byte(w & 255); }
  bytes(a) { for (let i = 0; i < a.length; i++) this.byte(a[i]); }
  flush() { if (this.n) { this.chunks.push(this.buf.slice(0, this.n)); this.size += this.n; this.n = 0; } }
  out() { this.flush(); const o = new Uint8Array(this.size); let p = 0; for (const c of this.chunks) { o.set(c, p); p += c.length; } return o; }
}

export class JpegWriter {
  /* w, h: size. quality 1..100. opts: { exif: Uint8Array TIFF block (after "Exif\0\0"), icc: Uint8Array } */
  constructor(w, h, quality = 92, opts = {}) {
    this.w = w; this.h = h; this.o = new Bytes(); this.row = 0;
    const q = Math.min(100, Math.max(1, quality)), sc = q < 50 ? 5000 / q : 200 - 2 * q;
    this.yt = new Array(64); this.ct = new Array(64);
    for (let i = 0; i < 64; i++) { this.yt[ZZ[i]] = Math.min(255, Math.max(1, Math.floor((YQ[i] * sc + 50) / 100))); this.ct[ZZ[i]] = Math.min(255, Math.max(1, Math.floor((CQ[i] * sc + 50) / 100))); }
    this.fy = new Float64Array(64); this.fc = new Float64Array(64);
    for (let r = 0, k = 0; r < 8; r++) for (let c = 0; c < 8; c++, k++) { this.fy[k] = 1 / (this.yt[ZZ[k]] * AASF[r] * AASF[c] * 8); this.fc[k] = 1 / (this.ct[ZZ[k]] * AASF[r] * AASF[c] * 8); }
    this.bytenew = 0; this.bytepos = 7; this.dc = [0, 0, 0];
    this.strip = new Uint8Array(w * 16 * 4); this.have = 0;
    this.Y = new Float64Array(64); this.U = new Float64Array(64); this.V = new Float64Array(64); this.du = new Int32Array(64); this.q = new Int32Array(64);
    this.header(opts);
  }
  header(opts) {
    const o = this.o;
    o.word(0xffd8);
    if (opts.exif && opts.exif.length + 8 < 65535) { o.word(0xffe1); o.word(opts.exif.length + 8); o.bytes([0x45, 0x78, 0x69, 0x66, 0, 0]); o.bytes(opts.exif); }
    else { o.word(0xffe0); o.word(16); o.bytes([0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]); }
    if (opts.icc && opts.icc.length + 16 < 65535) { o.word(0xffe2); o.word(opts.icc.length + 16); o.bytes([73, 67, 67, 95, 80, 82, 79, 70, 73, 76, 69, 0, 1, 1]); o.bytes(opts.icc); }
    o.word(0xffdb); o.word(132); o.byte(0); o.bytes(this.yt); o.byte(1); o.bytes(this.ct);
    o.word(0xffc0); o.word(17); o.byte(8); o.word(this.h); o.word(this.w); o.byte(3); o.bytes([1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
    o.word(0xffc4); o.word(2 + 4 * 17 + DC_L_V.length + AC_L_V.length + DC_C_V.length + AC_C_V.length);
    for (const [id, n, v] of [[0x00, DC_L_N, DC_L_V], [0x10, AC_L_N, AC_L_V], [0x01, DC_C_N, DC_C_V], [0x11, AC_C_N, AC_C_V]]) { o.byte(id); o.bytes(n.slice(1)); o.bytes(v); }
    o.word(0xffda); o.word(12); o.byte(3); o.bytes([1, 0, 2, 0x11, 3, 0x11]); o.bytes([0, 0x3f, 0]);
  }
  bits([code, len]) {
    let p = len - 1;
    while (p >= 0) {
      if (code & (1 << p)) this.bytenew |= 1 << this.bytepos;
      p--; this.bytepos--;
      if (this.bytepos < 0) { this.o.byte(this.bytenew); if (this.bytenew === 0xff) this.o.byte(0); this.bytepos = 7; this.bytenew = 0; }
    }
  }
  num(v) { const a = v < 0 ? -v : v; let n = 0; while ((a >> n) > 0) n++; return [v < 0 ? v + (1 << n) - 1 : v, n]; }
  dct(d, f) {
    for (let i = 0; i < 64; i += 8) {
      const t0 = d[i] + d[i + 7], t7 = d[i] - d[i + 7], t1 = d[i + 1] + d[i + 6], t6 = d[i + 1] - d[i + 6], t2 = d[i + 2] + d[i + 5], t5 = d[i + 2] - d[i + 5], t3 = d[i + 3] + d[i + 4], t4 = d[i + 3] - d[i + 4];
      let a = t0 + t3, b = t0 - t3, c = t1 + t2, e = t1 - t2;
      d[i] = a + c; d[i + 4] = a - c; const z1 = (e + b) * 0.707106781; d[i + 2] = b + z1; d[i + 6] = b - z1;
      a = t4 + t5; c = t5 + t6; e = t6 + t7;
      const z5 = (a - e) * 0.382683433, z2 = 0.5411961 * a + z5, z4 = 1.306562965 * e + z5, z3 = c * 0.707106781, z11 = t7 + z3, z13 = t7 - z3;
      d[i + 5] = z13 + z2; d[i + 3] = z13 - z2; d[i + 1] = z11 + z4; d[i + 7] = z11 - z4;
    }
    for (let i = 0; i < 8; i++) {
      const t0 = d[i] + d[i + 56], t7 = d[i] - d[i + 56], t1 = d[i + 8] + d[i + 48], t6 = d[i + 8] - d[i + 48], t2 = d[i + 16] + d[i + 40], t5 = d[i + 16] - d[i + 40], t3 = d[i + 24] + d[i + 32], t4 = d[i + 24] - d[i + 32];
      let a = t0 + t3, b = t0 - t3, c = t1 + t2, e = t1 - t2;
      d[i] = a + c; d[i + 32] = a - c; const z1 = (e + b) * 0.707106781; d[i + 16] = b + z1; d[i + 48] = b - z1;
      a = t4 + t5; c = t5 + t6; e = t6 + t7;
      const z5 = (a - e) * 0.382683433, z2 = 0.5411961 * a + z5, z4 = 1.306562965 * e + z5, z3 = c * 0.707106781, z11 = t7 + z3, z13 = t7 - z3;
      d[i + 40] = z13 + z2; d[i + 24] = z13 - z2; d[i + 8] = z11 + z4; d[i + 56] = z11 - z4;
    }
    const q = this.q;
    for (let i = 0; i < 64; i++) { const v = d[i] * f[i]; q[i] = v > 0 ? (v + 0.5) | 0 : (v - 0.5) | 0; }
    return q;
  }
  block(d, f, c, dcT, acT) {
    const q = this.dct(d, f), du = this.du;
    for (let j = 0; j < 64; j++) du[ZZ[j]] = q[j];
    const diff = du[0] - this.dc[c]; this.dc[c] = du[0];
    if (diff === 0) this.bits(dcT[0]); else { const [b, n] = this.num(diff); this.bits(dcT[n]); this.bits([b, n]); }
    let end = 63; while (end > 0 && du[end] === 0) end--;
    if (end === 0) { this.bits(acT[0x00]); return; }
    let i = 1;
    while (i <= end) {
      const start = i; while (du[i] === 0 && i <= end) i++;
      let run = i - start;
      if (run >= 16) { for (let k = 0; k < run >> 4; k++) this.bits(acT[0xf0]); run &= 15; }
      const [b, n] = this.num(du[i]); this.bits(acT[(run << 4) + n]); this.bits([b, n]); i++;
    }
    if (end !== 63) this.bits(acT[0x00]);
  }
  /* rgba: rows × w pixels, RGBA bytes, top row first. */
  addRows(rgba, rows) {
    const w = this.w, rowBytes = w * 4;
    let src = 0;
    while (rows > 0) {
      const take = Math.min(16 - this.have, rows);
      this.strip.set(rgba.subarray(src, src + take * rowBytes), this.have * rowBytes);
      this.have += take; rows -= take; src += take * rowBytes;
      if (this.have === 16 || this.row + this.have === this.h) this.mcuRow();
    }
  }
  mcuRow() {
    const w = this.w, have = this.have, s = this.strip, Y = this.Y, U = this.U, V = this.V;
    const px = (x, y) => (Math.min(y, have - 1) * w + Math.min(x, w - 1)) * 4;
    for (let x0 = 0; x0 < w; x0 += 16) {
      for (let by = 0; by < 2; by++) for (let bx = 0; bx < 2; bx++) {
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const p = px(x0 + bx * 8 + x, by * 8 + y), r = s[p], g = s[p + 1], b = s[p + 2];
          Y[y * 8 + x] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
        }
        this.block(Y, this.fy, 0, HT.dcl, HT.acl);
      }
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        let r = 0, g = 0, b = 0;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const p = px(x0 + x * 2 + dx, y * 2 + dy); r += s[p]; g += s[p + 1]; b += s[p + 2]; }
        r /= 4; g /= 4; b /= 4;
        U[y * 8 + x] = -0.168736 * r - 0.331264 * g + 0.5 * b;
        V[y * 8 + x] = 0.5 * r - 0.418688 * g - 0.081312 * b;
      }
      this.block(U, this.fc, 1, HT.dcc, HT.acc);
      this.block(V, this.fc, 2, HT.dcc, HT.acc);
    }
    this.row += have; this.have = 0;
  }
  finish() {
    if (this.have) this.mcuRow();
    if (this.bytepos >= 0 && this.bytepos < 7) this.bits([(1 << (this.bytepos + 1)) - 1, this.bytepos + 1]);
    this.o.word(0xffd9);
    return this.o.out();
  }
}

/* ---------- Exif ---------- */
/* The TIFF block of the first APP1 "Exif" segment of a JPEG file, or null. */
export function exifOf(bytes) {
  if (!bytes || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let p = 2;
  while (p + 4 < bytes.length) {
    if (bytes[p] !== 0xff) return null;
    const m = bytes[p + 1], len = (bytes[p + 2] << 8) | bytes[p + 3];
    if (m === 0xda || m === 0xd9) return null;
    if (m === 0xe1 && bytes[p + 4] === 0x45 && bytes[p + 5] === 0x78 && bytes[p + 6] === 0x69 && bytes[p + 7] === 0x66) return bytes.slice(p + 10, p + 2 + len);
    p += 2 + len;
  }
  return null;
}
/* Upright orientation, no thumbnail, and optionally no place. Returns a new copy, or null when it can't be read. */
export function fixExif(tiff, { dropGps = false } = {}) {
  if (!tiff || tiff.length < 8) return null;
  const t = tiff.slice(), dv = new DataView(t.buffer, t.byteOffset, t.byteLength);
  const le = t[0] === 0x49; if (!le && t[0] !== 0x4d) return null;
  const u16 = o => dv.getUint16(o, le), u32 = o => dv.getUint32(o, le);
  try {
    const ifd0 = u32(4), n = u16(ifd0);
    for (let i = 0; i < n; i++) {
      const e = ifd0 + 2 + i * 12, tag = u16(e);
      if (tag === 0x0112) dv.setUint16(e + 8, 1, le);
      if (tag === 0x8825 && dropGps) {
        const g = u32(e + 8), gn = u16(g);
        const SIZE = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
        for (let j = 0; j < gn; j++) {
          const ge = g + 2 + j * 12, type = u16(ge + 2), cnt = u32(ge + 4), bytes = (SIZE[type] || 1) * cnt;
          if (bytes > 4) { const off = u32(ge + 8); t.fill(0, off, Math.min(t.length, off + bytes)); }
        }
        t.fill(0, g + 2, g + 2 + gn * 12); dv.setUint16(g, 0, le);
      }
    }
    dv.setUint32(ifd0 + 2 + n * 12, 0, le);   // no IFD1: the old thumbnail would show the unedited photo
  } catch (e) { return null; }
  return t;
}
/* Date taken (DateTimeOriginal) as an ISO string, if present. */
export function exifDate(tiff) {
  if (!tiff || tiff.length < 8) return null;
  const dv = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength), le = tiff[0] === 0x49;
  try {
    const u16 = o => dv.getUint16(o, le), u32 = o => dv.getUint32(o, le);
    const find = (ifd, want) => { const n = u16(ifd); for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (u16(e) === want) return e; } return -1; };
    const ex = find(u32(4), 0x8769); if (ex < 0) return null;
    const d = find(u32(ex + 8), 0x9003); if (d < 0) return null;
    const off = u32(d + 8), s = String.fromCharCode(...tiff.slice(off, off + 19));
    const m = s.match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
    return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}` : null;
  } catch (e) { return null; }
}

/* ---------- ICC profile ---------- */
const PRIMS = {
  'display-p3': { r: [0.68, 0.32], g: [0.265, 0.69], b: [0.15, 0.06], name: 'Display P3' },
  srgb: { r: [0.64, 0.33], g: [0.3, 0.6], b: [0.15, 0.06], name: 'sRGB' }
};
const mul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
function inv3(m) {
  const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [[A, -(b * i - c * h), b * f - c * e], [B, a * i - c * g, -(a * f - c * d)], [C, -(a * h - b * g), a * e - b * d]].map(r => r.map(v => v / det));
}
/* RGB → XYZ (D50, Bradford-adapted) colorants: the columns are the red, green and blue XYZ. */
export function colorants(space = 'display-p3') {
  const p = PRIMS[space], xyz = ([x, y]) => [x / y, 1, (1 - x - y) / y];
  const P = [0, 1, 2].map(i => [xyz(p.r)[i], xyz(p.g)[i], xyz(p.b)[i]]);
  const W65 = xyz([0.3127, 0.329]), S = mul(inv3(P), W65.map(v => [v])).map(r => r[0]);
  const M = P.map(r => r.map((v, j) => v * S[j]));
  const MA = [[0.8951, 0.2664, -0.1614], [-0.7502, 1.7135, 0.0367], [0.0389, -0.0685, 1.0296]];
  const W50 = [0.9642, 1, 0.8249], cs = mul(MA, W65.map(v => [v])), cd = mul(MA, W50.map(v => [v]));
  const D = [0, 1, 2].map(i => [0, 1, 2].map(j => i === j ? cd[i][0] / cs[i][0] : 0));
  return mul(mul(mul(inv3(MA), D), MA), M);
}
export function iccProfile(space = 'display-p3') {
  const C = colorants(space), name = PRIMS[space].name;
  const parts = [];
  const tag = (sig, data) => parts.push({ sig, data });
  const s15 = v => Math.round(v * 65536);
  const xyzTag = (x, y, z) => { const b = new DataView(new ArrayBuffer(20)); b.setUint32(0, 0x58595a20); b.setInt32(8, s15(x)); b.setInt32(12, s15(y)); b.setInt32(16, s15(z)); return new Uint8Array(b.buffer); };
  const ascii = s => Array.from(s, ch => ch.charCodeAt(0) & 127);
  const desc = (() => { const a = ascii(name), b = new Uint8Array(12 + a.length + 1 + 78); const dv = new DataView(b.buffer); dv.setUint32(0, 0x64657363); dv.setUint32(8, a.length + 1); b.set(a, 12); return b; })();
  const cprt = (() => { const a = ascii('No copyright, use freely'), b = new Uint8Array(8 + a.length + 1); new DataView(b.buffer).setUint32(0, 0x74657874); b.set(a, 8); return b; })();
  const trc = (() => { const n = 1024, b = new Uint8Array(12 + 2 * n), dv = new DataView(b.buffer); dv.setUint32(0, 0x63757276); dv.setUint32(8, n); for (let i = 0; i < n; i++) { const x = i / (n - 1), y = x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); dv.setUint16(12 + 2 * i, Math.round(y * 65535)); } return b; })();
  tag('desc', desc); tag('cprt', cprt); tag('wtpt', xyzTag(0.9642, 1, 0.8249));
  tag('rXYZ', xyzTag(C[0][0], C[1][0], C[2][0])); tag('gXYZ', xyzTag(C[0][1], C[1][1], C[2][1])); tag('bXYZ', xyzTag(C[0][2], C[1][2], C[2][2]));
  tag('rTRC', trc);
  const shared = [['gTRC', 'rTRC'], ['bTRC', 'rTRC']];
  const count = parts.length + shared.length, tableEnd = 128 + 4 + 12 * count;
  let off = tableEnd; const offs = {};
  for (const p of parts) { off = (off + 3) & ~3; offs[p.sig] = off; off += p.data.length; }
  const size = (off + 3) & ~3, out = new Uint8Array(size), dv = new DataView(out.buffer);
  dv.setUint32(0, size); dv.setUint32(8, 0x02100000);
  out.set(ascii('mntrRGB XYZ '), 12);
  dv.setUint16(24, 2026); dv.setUint16(26, 1); dv.setUint16(28, 1);
  out.set(ascii('acsp'), 36);
  dv.setInt32(68, s15(0.9642)); dv.setInt32(72, s15(1)); dv.setInt32(76, s15(0.8249));
  dv.setUint32(128, count);
  let e = 132;
  const sigNum = s => (s.charCodeAt(0) << 24 | s.charCodeAt(1) << 16 | s.charCodeAt(2) << 8 | s.charCodeAt(3)) >>> 0;
  for (const p of parts) { dv.setUint32(e, sigNum(p.sig)); dv.setUint32(e + 4, offs[p.sig]); dv.setUint32(e + 8, p.data.length); out.set(p.data, offs[p.sig]); e += 12; }
  for (const [s, from] of shared) { dv.setUint32(e, sigNum(s)); dv.setUint32(e + 4, offs[from]); dv.setUint32(e + 8, trc.length); e += 12; }
  return out;
}
