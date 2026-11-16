/* Révélateur — the WebGL2 renderer. The fragment shader is the pipeline of engine.process(), written from the same
   constants (K), so what you see, the export and the checks all agree.
   Passes: (1) the photo is reduced to about 256 px (mipmaps) keeping its luminance and darkest channel, (2) that is
   blurred both ways, (3) the main shader reads the photo and the blur and applies every setting.
   Display: the canvas shows the photo fitted, zoomed and panned through uView (image coordinates).
   Export: the full-size photo is rendered in strips into a framebuffer and read back for the JPEG writer. */
import { K, BAND_HUE, GAUSS, tidy, tonePrep } from './engine.js';

const f = n => { const s = String(n); return s.includes('.') || s.includes('e') ? s : s + '.0'; };
const VS = `#version 300 es
in vec2 aPos; out vec2 vUV;
void main(){ vUV = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const DOWN = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o; uniform sampler2D uImg;
void main(){ vec3 c = texture(uImg, vec2(vUV.x, 1.0 - vUV.y)).rgb;
  o = vec4(dot(c, vec3(${f(K.W[0])}, ${f(K.W[1])}, ${f(K.W[2])})), min(c.r, min(c.g, c.b)), 0.0, 1.0); }`;

const BLUR = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o; uniform sampler2D uSrc; uniform vec2 uDir;
const float G[${GAUSS.length}] = float[](${GAUSS.map(f).join(',')});
void main(){ vec4 s = vec4(0.0); for (int i = 0; i < ${GAUSS.length}; i++) s += G[i] * texture(uSrc, vUV + uDir * float(i - ${(GAUSS.length - 1) / 2}));
  o = vec4(s.rg, 0.0, 1.0); }`;

const MAIN = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o;
uniform sampler2D uImg, uBlur;
uniform vec4 uView; uniform float uFlip; uniform vec3 uBg; uniform float uBefore, uDither;
uniform vec3 uWB; uniform float uEx, uBp, uWp, uG, uFb, uAir;
uniform float uDehaze, uHi, uSh, uClar, uVig, uVib, uSatA;
uniform float uHue[8], uSatB[8], uLum[8];
const vec3 W = vec3(${f(K.W[0])}, ${f(K.W[1])}, ${f(K.W[2])});
const float BH[9] = float[](${[...BAND_HUE, 360].map(f).join(',')});
float dec(float c){ return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4); }
float enc(float c){ c = max(c, 0.0); return c <= 0.0031308 ? 12.92 * c : 1.055 * pow(c, 1.0 / 2.4) - 0.055; }
float sm(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
vec3 rgb2hsv(vec3 c){ float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), d = mx - mn, h = 0.0;
  if (d > 1e-6) { if (mx == c.r) h = mod((c.g - c.b) / d, 6.0); else if (mx == c.g) h = (c.b - c.r) / d + 2.0; else h = (c.r - c.g) / d + 4.0; h *= 60.0; if (h < 0.0) h += 360.0; }
  return vec3(h, mx > 1e-6 ? d / mx : 0.0, mx); }
vec3 hsv2rgb(float h, float s, float v){ h = mod(mod(h, 360.0) + 360.0, 360.0); float c = v * s, x = c * (1.0 - abs(mod(h / 60.0, 2.0) - 1.0)), m = v - c; vec3 r;
  if (h < 60.0) r = vec3(c, x, 0.0); else if (h < 120.0) r = vec3(x, c, 0.0); else if (h < 180.0) r = vec3(0.0, c, x); else if (h < 240.0) r = vec3(0.0, x, c); else if (h < 300.0) r = vec3(x, 0.0, c); else r = vec3(c, 0.0, x);
  return r + m; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float toneY(float Y, float yb){
  float xm = enc(min(1.0, 0.4 * Y + 0.6 * yb));
  float mh = sm(0.5, 0.95, xm) * (1.0 - 0.45 * sm(0.95, 1.0, xm)), ms = 1.0 - sm(0.0, 0.5, xm);
  float gain = exp2(uHi * ${f(K.hi)} * mh + uSh * ${f(K.sh)} * ms);
  float x = enc(Y * gain);
  if (uClar != 0.0) { float xb = enc(yb * gain), t = clamp(2.0 * x - 1.0, -1.0, 1.0); x += uClar * ${f(K.clarity)} * (x - xb) * (1.0 - t * t); }
  x = (x - uBp) / (uWp - uBp);
  if (x > 0.0 && x < 1.0) { float m = ${f(K.pivot)}; x = x < m ? m * pow(x / m, uG) : 1.0 - (1.0 - m) * pow((1.0 - x) / (1.0 - m), uG); }
  x = x > 0.0 ? uFb + x * (1.0 - uFb) : uFb * (1.0 + x);
  return dec(max(x, 0.0));
}
void main(){
  float vy = uFlip > 0.5 ? 1.0 - vUV.y : vUV.y;
  vec2 uv = uView.xy + vec2(vUV.x, vy) * uView.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { o = vec4(uBg, 1.0); return; }
  vec3 e = texture(uImg, uv).rgb;
  if (uBefore > 0.5) { o = vec4(e, 1.0); return; }
  vec2 bl = texture(uBlur, vec2(uv.x, 1.0 - uv.y)).rg;
  vec3 c = vec3(dec(e.r), dec(e.g), dec(e.b)) * uWB;
  float lb = dec(bl.r), A = uAir;
  if (uDehaze > 0.0) { float t = max(1.0 - uDehaze * ${f(K.dehaze)} * dec(bl.g) / A, ${f(K.tMin)}); c = max((c - A) / t + A, 0.0); lb = max((lb - A) / t + A, 0.0); }
  else if (uDehaze < 0.0) { float h = -uDehaze * 0.5; c = c * (1.0 - h) + A * h; lb = lb * (1.0 - h) + A * h; }
  c *= uEx; lb *= uEx;
  float Y = dot(c, W), Yt = toneY(Y, lb);
  c = (c + 1e-4) * (Yt / (Y + 1e-4));
  if (uVig != 0.0) { vec2 d2 = (uv - 0.5) * 2.0; float d = length(d2) / 1.41421356; c *= max(0.0, 1.0 + uVig * ${f(K.vig)} * sm(0.3, 1.0, d)); }
  c = max(c, 0.0); float m = max(c.r, max(c.g, c.b));
  if (m > 1.0) { float Yc = dot(c, W), k = Yc >= 1.0 ? 0.0 : (1.0 - Yc) / (m - Yc); c = 0.5 * (min(Yc, 1.0) + (c - Yc) * k) + 0.5 * min(c, vec3(1.0)); }
  vec3 q = vec3(enc(c.r), enc(c.g), enc(c.b));
  vec3 hsv = rgb2hsv(q); float h = hsv.y > 0.0 ? hsv.x : 0.0, s = hsv.y;
  float dh = 0.0, ds = 0.0, dl = 0.0;
  for (int i = 0; i < 8; i++) { if (h >= BH[i] && h < BH[i + 1]) { float t = (h - BH[i]) / (BH[i + 1] - BH[i]); int j = i == 7 ? 0 : i + 1;
    dh = (1.0 - t) * uHue[i] + t * uHue[j]; ds = (1.0 - t) * uSatB[i] + t * uSatB[j]; dl = (1.0 - t) * uLum[i] + t * uLum[j]; } }
  if (dh != 0.0 && s > 1e-4) q = hsv2rgb(h + dh * ${f(K.hueDeg)}, s, max(q.r, max(q.g, q.b)));
  float vib = 0.0;
  if (uVib > 0.0) { float skin = (1.0 - sm(10.0, 28.0, abs(h - 25.0))) * sm(0.1, 0.25, s) * (1.0 - sm(0.55, 0.75, s)); vib = uVib * ${f(K.vib)} * (1.0 - s) * (1.0 - 0.65 * skin); }
  else if (uVib < 0.0) vib = uVib * ${f(K.vib)} * (0.4 + 0.6 * s);
  float k = (1.0 + uSatA) * (1.0 + vib) * (1.0 + ds * ${f(K.satHsl)});
  float y = dot(q, W), mn = min(q.r, min(q.g, q.b)), mx = max(q.r, max(q.g, q.b));
  if (k > 1.0) { if (mn < y - 1e-6) k = min(k, y / (y - mn)); if (mx > y + 1e-6) k = min(k, (1.0 - y) / (mx - y)); k = max(k, 1.0); }
  k = max(k, 0.0);
  q = y + (q - y) * k;
  if (dl != 0.0) q *= 1.0 + dl * ${f(K.lum)} * sm(0.05, 0.35, s);
  q = clamp(q, 0.0, 1.0) + (hash(gl_FragCoord.xy) - 0.5) * uDither;
  o = vec4(q, 1.0);
}`;

function compile(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Program: ' + gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i), name = a.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}

export class Renderer {
  /* canvas: the display canvas. opts.p3: use Display P3 when the browser supports it. */
  constructor(canvas, opts = {}) {
    const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 is not available on this browser');
    this.gl = gl; this.canvas = canvas;
    this.p3 = !!(opts.p3 !== false && 'drawingBufferColorSpace' in gl && 'unpackColorSpace' in gl && typeof matchMedia === 'function' && matchMedia('(color-gamut: p3)').matches);
    if (this.p3) { try { gl.drawingBufferColorSpace = 'display-p3'; gl.unpackColorSpace = 'display-p3'; } catch (e) { this.p3 = false; } }
    this.space = this.p3 ? 'display-p3' : 'srgb';
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const vp = gl.getParameter(gl.MAX_VIEWPORT_DIMS); this.maxView = Math.min(vp[0], vp[1], gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
    this.progs = { down: compile(gl, VS, DOWN), blur: compile(gl, VS, BLUR), main: compile(gl, VS, MAIN) };
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.img = null; this.bg = [0.086, 0.086, 0.086];
  }
  /* source: an <img>, canvas or ImageBitmap. Returns { tex, blur, w, h } and makes it current. */
  load(source, w, h) {
    const gl = this.gl;
    if (w > this.maxTex || h > this.maxTex) throw new Error(`Photo too big for this device (${w} × ${h})`);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const img = { tex, w, h, blur: this.makeBlur(tex, w, h) };
    return img;
  }
  use(img) { this.img = img; }
  free(img) { if (!img) return; const gl = this.gl; gl.deleteTexture(img.tex); gl.deleteTexture(img.blur.tex); if (this.img === img) this.img = null; }
  target(w, h) {
    const gl = this.gl, tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb, w, h };
  }
  drop(t) { const gl = this.gl; gl.deleteFramebuffer(t.fb); if (t.keep !== true) gl.deleteTexture(t.tex); }
  makeBlur(tex, w, h) {
    const gl = this.gl, s = Math.min(1, 256 / Math.max(w, h)), bw = Math.max(1, Math.round(w * s)), bh = Math.max(1, Math.round(h * s));
    const a = this.target(bw, bh), b = this.target(bw, bh);
    gl.viewport(0, 0, bw, bh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb); gl.useProgram(this.progs.down.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(this.progs.down.u.uImg, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const bp = this.progs.blur; gl.useProgram(bp.p); gl.uniform1i(bp.u.uSrc, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, b.fb); gl.bindTexture(gl.TEXTURE_2D, a.tex); gl.uniform2f(bp.u.uDir, 1 / bw, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb); gl.bindTexture(gl.TEXTURE_2D, b.tex); gl.uniform2f(bp.u.uDir, 0, 1 / bh); gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.drop(b); a.keep = true; this.drop(a);
    return { tex: a.tex, w: bw, h: bh };
  }
  uniforms(P, opts) {
    const gl = this.gl, { u } = this.progs.main, T = tonePrep(P), n = K.W[0] * T.wr + K.W[1] * T.wg + K.W[2] * T.wbb;
    gl.uniform3f(u.uWB, T.wr / n, T.wg / n, T.wbb / n);
    gl.uniform1f(u.uEx, T.ex); gl.uniform1f(u.uBp, T.bp); gl.uniform1f(u.uWp, T.wp); gl.uniform1f(u.uG, T.g); gl.uniform1f(u.uFb, T.fb);
    gl.uniform1f(u.uAir, opts.air || 1);
    const c = x => x / 100;
    gl.uniform1f(u.uDehaze, c(P.dehaze)); gl.uniform1f(u.uHi, c(P.highlights)); gl.uniform1f(u.uSh, c(P.shadows)); gl.uniform1f(u.uClar, c(P.clarity));
    gl.uniform1f(u.uVig, c(P.vignette)); gl.uniform1f(u.uVib, c(P.vibrance)); gl.uniform1f(u.uSatA, c(P.saturation));
    const B = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];
    gl.uniform1fv(u.uHue, B.map(b => c(P['hue_' + b]))); gl.uniform1fv(u.uSatB, B.map(b => c(P['sat_' + b]))); gl.uniform1fv(u.uLum, B.map(b => c(P['lum_' + b])));
    gl.uniform1f(u.uBefore, opts.before ? 1 : 0); gl.uniform1f(u.uDither, opts.dither === false ? 0 : 1 / 255);
    gl.uniform3fv(u.uBg, this.bg);
  }
  draw(img, P, view, flip, opts) {
    const gl = this.gl, m = this.progs.main;
    gl.useProgram(m.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, img.tex); gl.uniform1i(m.u.uImg, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, img.blur.tex); gl.uniform1i(m.u.uBlur, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform4f(m.u.uView, view[0], view[1], view[2], view[3]); gl.uniform1f(m.u.uFlip, flip ? 1 : 0);
    this.uniforms(tidy(P), opts);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  /* Draw on the display canvas. view: [x0, y0, sx, sy] maps the canvas onto image coordinates (0..1). */
  render(P, view, opts = {}) {
    if (!this.img) return;
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.draw(this.img, P, view, true, opts);
  }
  /* Render a whole image at w × h and read it back (top row first). */
  pixels(img, P, w, h, opts = {}) {
    const gl = this.gl, t = this.target(w, h);
    gl.viewport(0, 0, w, h);
    this.draw(img, P, [0, 0, 1, 1], false, opts);
    const out = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out);
    this.drop(t); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return out;
  }
  /* Full-size render in strips. onStrip(rgba, rows) is awaited between strips so the page stays responsive. */
  async strips(img, P, opts, onStrip) {
    const gl = this.gl, W = img.w, H = img.h;
    if (W > this.maxView) throw new Error('Photo too wide for this device');
    let rows = Math.max(16, Math.min(512, Math.floor(4_000_000 / W / 16) * 16));
    const t = this.target(W, rows), buf = new Uint8Array(W * rows * 4);
    try {
      for (let y = 0; y < H; y += rows) {
        const r = Math.min(rows, H - y);
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, W, r);
        this.draw(img, P, [0, y / H, 1, r / H], false, opts);
        const view = r === rows ? buf : buf.subarray(0, W * r * 4);
        gl.readPixels(0, 0, W, r, gl.RGBA, gl.UNSIGNED_BYTE, view);
        await onStrip(view, r, y);
      }
    } finally { this.drop(t); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
  }
  lost() { return this.gl.isContextLost(); }
}
