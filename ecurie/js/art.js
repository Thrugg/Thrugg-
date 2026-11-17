/* Écurie — side-profile illustrations by body archetype (not the actual car), carried over from Prüfstand.
   viewBox 0 0 400 150, ground at y=138, the car faces right. */
export const ARCH = {
  hatch: {
    body: "M44 116 C39 112 38 102 39 92 C40 82 42 74 46 66 L62 44 C68 38 76 35 86 34 L190 31 C204 31 214 34 224 41 L256 61 C284 66 320 71 350 77 C365 80 372 86 373 95 L374 108 C374 113 371 116 366 116 Z",
    glass: "M78 44 C82 40 88 38 96 38 L188 35 C200 35 208 38 216 44 L244 63 L82 65 C79 58 78 50 78 44 Z",
    pillars: [[150, 36, 149, 64], [96, 38, 90, 65]], wheels: { rx: 110, fx: 300, r: 24 }, sill: 116,
    belt: [44, 70, 356, 79], head: "M346 79 L368 85 L370 92 L352 90 Z", tail: "M40 72 L50 70 L48 84 L39 84 Z", wing: [74, 40]
  },
  crossover: {
    body: "M40 112 C35 108 34 96 35 84 C36 72 38 62 42 54 L58 36 C64 30 72 27 82 26 L192 23 C206 23 216 26 226 33 L260 55 C288 59 324 64 350 70 C365 73 373 80 375 90 L376 104 C376 109 373 112 368 112 Z",
    glass: "M74 36 C78 32 84 30 92 30 L190 27 C202 27 210 30 218 36 L248 57 L78 59 C75 52 74 44 74 36 Z",
    pillars: [[150, 28, 149, 58], [92, 30, 88, 59]], wheels: { rx: 110, fx: 302, r: 26 }, sill: 112,
    belt: [40, 62, 358, 72], head: "M346 72 L370 78 L371 86 L352 84 Z", tail: "M36 60 L48 58 L46 76 L35 76 Z", wing: null
  },
  sedan: {
    body: "M24 116 C19 112 18 100 20 90 L24 76 C26 71 30 69 36 69 L92 66 C110 54 126 44 146 39 C170 33 208 33 228 36 C244 40 258 52 272 63 C300 67 340 71 364 75 C375 78 381 84 382 94 L382 108 C382 113 379 116 374 116 Z",
    glass: "M104 66 C120 55 134 47 150 43 C172 38 206 38 224 40 L260 63 Z",
    pillars: [[186, 38, 184, 64]], wheels: { rx: 96, fx: 306, r: 25 }, sill: 116,
    belt: [36, 73, 366, 78], head: "M352 77 L376 83 L378 90 L358 89 Z", tail: "M21 76 L34 72 L33 84 L21 86 Z", wing: null
  },
  wagon: {
    body: "M24 116 C19 112 18 100 19 90 C20 78 21 66 24 56 C26 46 30 40 38 38 L62 36 L194 33 C208 33 218 36 228 42 L262 63 C290 67 334 71 360 75 C373 78 380 84 381 94 L381 108 C381 113 378 116 373 116 Z",
    glass: "M34 46 C36 42 40 40 46 40 L64 40 L192 37 C204 37 212 40 220 46 L250 65 L38 66 C35 60 34 52 34 46 Z",
    pillars: [[184, 37, 183, 65], [104, 39, 102, 66], [62, 40, 60, 66]], wheels: { rx: 98, fx: 306, r: 25 }, sill: 116,
    belt: [30, 70, 364, 79], head: "M350 77 L375 83 L377 90 L356 89 Z", tail: "M20 60 L30 58 L29 80 L20 80 Z", wing: null
  },
  coupe: {
    body: "M22 117 C18 113 17 102 19 94 L22 82 C24 77 28 75 34 75 L64 72 C86 60 108 48 134 44 C156 40 186 40 200 43 C214 47 230 58 248 70 C284 74 330 78 362 82 C374 84 381 90 382 98 L382 109 C382 114 379 117 374 117 Z",
    glass: "M80 71 C98 60 116 51 138 47 C158 44 184 44 196 47 C208 51 222 60 236 70 Z",
    pillars: [[170, 45, 166, 70]], wheels: { rx: 92, fx: 304, r: 24 }, sill: 117,
    belt: [34, 78, 366, 84], head: "M352 83 L377 89 L378 95 L357 94 Z", tail: "M20 80 L34 77 L33 87 L20 89 Z", wing: [44, 70]
  },
  fastback: {
    body: "M24 116 C19 112 18 100 20 90 L23 78 C25 73 29 71 35 71 L52 68 C80 56 112 42 146 37 C172 33 206 33 224 36 C242 40 256 52 270 63 C300 67 340 71 364 75 C375 78 381 84 382 94 L382 108 C382 113 379 116 374 116 Z",
    glass: "M72 67 C98 56 124 45 150 41 C172 38 204 38 222 40 L258 63 Z",
    pillars: [[184, 38, 182, 64], [112, 50, 110, 66]], wheels: { rx: 96, fx: 306, r: 25 }, sill: 116,
    belt: [36, 74, 366, 78], head: "M352 77 L376 83 L378 90 L358 89 Z", tail: "M22 76 L36 72 L35 82 L22 85 Z", wing: [40, 68]
  },
  rear: {
    body: "M26 117 C21 113 20 104 21 96 C22 88 26 80 34 76 C52 66 80 52 112 44 C134 39 160 38 178 40 C196 43 212 54 230 68 C264 74 312 80 352 86 C368 89 378 94 380 102 L380 110 C380 114 377 117 372 117 Z",
    glass: "M92 64 C110 54 132 46 154 43 C168 42 180 43 188 46 C200 51 210 59 220 68 L94 70 Z",
    pillars: [[158, 43, 154, 69]], wheels: { rx: 94, fx: 300, r: 24 }, sill: 117,
    belt: [34, 82, 364, 88], head: "M346 86 C356 86 368 89 374 94 L366 96 C358 94 350 91 346 86 Z", tail: "M22 92 C26 86 32 82 40 80 L42 84 C34 86 28 90 24 96 Z", wing: [52, 70]
  },
  mid: {
    body: "M22 118 C18 114 17 104 18 96 L21 86 C23 81 27 79 34 79 L100 74 C128 68 150 62 170 58 C186 55 204 55 218 57 C236 61 252 72 270 84 C300 89 334 94 362 99 C373 101 379 105 380 110 L380 113 C380 116 377 118 372 118 Z",
    glass: "M160 62 C174 59 192 58 210 60 C224 63 236 71 250 82 L164 84 C160 76 158 68 160 62 Z",
    pillars: [[160, 62, 158, 84]], wheels: { rx: 96, fx: 300, r: 24 }, sill: 118,
    belt: [34, 86, 366, 102], head: "M346 98 L372 103 L373 108 L352 106 Z", tail: "M20 86 L34 83 L33 92 L20 94 Z", wing: [52, 76],
    extra: "M112 86 C126 81 142 81 152 87 L150 101 C138 99 124 99 112 101 Z"
  },
  roadster: {
    body: "M22 117 C18 113 17 102 19 94 L22 84 C24 79 28 77 34 77 L120 75 C136 72 150 68 164 66 L196 66 C204 66 210 70 214 74 C262 78 318 82 360 86 C373 88 380 93 381 101 L381 110 C381 114 378 117 373 117 Z",
    glass: "M214 74 L234 54 L240 56 L222 75 Z",
    pillars: [], wheels: { rx: 92, fx: 302, r: 24 }, sill: 117,
    belt: [34, 82, 364, 88], head: "M352 87 L376 92 L377 98 L356 97 Z", tail: "M20 82 L34 79 L33 89 L20 91 Z", wing: null,
    extra: "M158 66 C158 58 163 55 170 55 C177 55 182 58 182 66 Z M186 66 C186 59 190 56 196 56 C202 56 206 60 206 66 Z"
  },
  suv: {
    body: "M28 108 C22 104 21 90 22 78 C23 60 24 46 28 36 C31 26 36 21 46 20 L200 17 C214 17 224 20 234 27 L268 52 C296 56 334 60 358 64 C370 67 377 74 378 86 L378 100 C378 105 375 108 370 108 Z",
    glass: "M38 30 C40 26 44 24 50 24 L198 21 C210 21 218 24 226 30 L256 54 L42 56 C39 48 38 40 38 30 Z",
    pillars: [[188, 21, 187, 55], [110, 22, 108, 56], [62, 23, 60, 56]], wheels: { rx: 100, fx: 302, r: 28 }, sill: 108,
    belt: [32, 60, 362, 68], head: "M350 66 L374 72 L375 80 L356 78 Z", tail: "M24 44 L36 42 L34 68 L23 68 Z", wing: null
  },
  coupesuv: {
    body: "M28 108 C22 104 21 92 22 80 L25 66 C27 60 31 57 38 56 L52 54 C76 42 106 28 140 23 C166 20 202 20 220 23 C236 27 252 39 268 52 C296 56 334 60 358 64 C370 67 377 74 378 86 L378 100 C378 105 375 108 370 108 Z",
    glass: "M68 53 C94 41 120 30 144 26 C168 24 200 24 216 27 L256 54 Z",
    pillars: [[186, 24, 184, 54], [108, 36, 106, 54]], wheels: { rx: 100, fx: 302, r: 28 }, sill: 108,
    belt: [34, 60, 362, 68], head: "M350 66 L374 72 L375 80 L356 78 Z", tail: "M24 62 L38 58 L37 70 L24 73 Z", wing: null
  },
  boxy: {
    body: "M28 112 C24 110 22 100 22 88 L22 36 C22 28 26 24 34 24 L226 23 C232 23 236 26 238 30 L252 54 L356 56 C364 56 368 60 368 66 L368 104 C368 109 365 112 360 112 Z",
    glass: "M34 32 L224 31 C228 31 230 33 232 36 L244 56 L34 58 Z",
    pillars: [[190, 31, 190, 57], [114, 31, 114, 58], [64, 32, 64, 58]], wheels: { rx: 98, fx: 296, r: 28 }, sill: 112,
    belt: [24, 64, 366, 64], head: "M356 62 C362 62 366 66 366 71 C366 76 362 79 356 79 Z", tail: "M24 46 L32 46 L32 70 L24 70 Z", wing: null,
    extra: "M10 60 L22 58 L22 92 L12 92 Z"
  }
};

function _shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

let _carUid = 0;
export function carSVG(car, opts = {}) {
  const a = ARCH[car.art] || ARCH.sedan;
  const id = "c" + (++_carUid);
  const col = car.color || "#6b7480";
  const light = _shade(col, 0.32), mid = col, dark = _shade(col, -0.45), darker = _shade(col, -0.62);
  const { rx, fx, r } = a.wheels;
  const cy = 138 - r;
  const cal = opts.caliper || (["sports", "gt", "exotic", "sport4", "super"].includes(car.cls) ? "#c8202b" : "#7b828b");
  const perf = car.ps >= 300;
  const wheel = (cx) => {
    const spokes = [];
    const n = perf ? 10 : 5;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const x1 = cx + Math.cos(ang) * r * 0.18, y1 = cy + Math.sin(ang) * r * 0.18;
      const x2 = cx + Math.cos(ang) * r * 0.62, y2 = cy + Math.sin(ang) * r * 0.62;
      spokes.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`);
    }
    return `<g class="wh">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#16181b"/>
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.86).toFixed(1)}" fill="none" stroke="#2a2d31" stroke-width="1.2"/>
      <path d="M${cx + r * 0.28} ${cy - r * 0.5} a${r * 0.58} ${r * 0.58} 0 0 1 ${r * 0.3} ${r * 0.62}" stroke="${cal}" stroke-width="${(r * 0.2).toFixed(1)}" fill="none" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.66).toFixed(1)}" fill="url(#${id}rim)"/>
      <g class="sp" style="transform-origin:${cx}px ${cy}px" stroke="#3a3f45" stroke-width="${perf ? 1.6 : 3}" stroke-linecap="round">${spokes.join("")}</g>
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.16).toFixed(1)}" fill="#5b6168"/>
    </g>`;
  };
  const arch = (cx) => `<circle cx="${cx}" cy="${cy}" r="${r + 3.5}" fill="${darker}" clip-path="url(#${id}clip)"/>`;
  const wing = car.wing && a.wing ? `<g fill="${dark}"><rect x="${a.wing[0] - 12}" y="${a.wing[1] - 16}" width="34" height="5" rx="2"/><rect x="${a.wing[0] - 2}" y="${a.wing[1] - 12}" width="3" height="12"/><rect x="${a.wing[0] + 12}" y="${a.wing[1] - 12}" width="3" height="12"/></g>` : "";
  return `<svg class="car" viewBox="0 0 400 150" role="img" aria-label="Illustration: ${car.body} body style" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light}"/><stop offset=".42" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fb3c8"/><stop offset=".55" stop-color="#3b4654"/><stop offset="1" stop-color="#1c232c"/></linearGradient>
    <radialGradient id="${id}rim" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#e9ecef"/><stop offset=".6" stop-color="#a8afb7"/><stop offset="1" stop-color="#6c737b"/></radialGradient>
    <clipPath id="${id}clip"><rect x="0" y="0" width="400" height="${a.sill}"/></clipPath>
  </defs>
  ${opts.shadow === false ? "" : `<ellipse cx="200" cy="139" rx="176" ry="5.5" fill="var(--car-shadow, rgba(0,0,0,.28))"/>`}
  ${a.extra && car.art === "boxy" ? `<path d="${a.extra}" fill="${dark}"/>` : ""}
  <path d="${a.body}" fill="url(#${id}b)"/>
  ${wing}
  <path d="${a.glass}" fill="url(#${id}g)"/>
  ${a.pillars.map(p => `<line x1="${p[0]}" y1="${p[1]}" x2="${p[2]}" y2="${p[3]}" stroke="${mid}" stroke-width="5"/>`).join("")}
  ${a.extra && car.art === "roadster" ? `<path d="${a.extra}" fill="${darker}"/><path d="M214 74 L234 54 L240 56" fill="none" stroke="${darker}" stroke-width="2"/>` : ""}
  ${a.extra && car.art === "mid" ? `<path d="${a.extra}" fill="${darker}" opacity=".85"/>` : ""}
  <line x1="${a.belt[0]}" y1="${a.belt[1]}" x2="${a.belt[2]}" y2="${a.belt[3]}" stroke="#fff" stroke-opacity=".28" stroke-width="1.4"/>
  <path d="M${a.wheels.rx + r + 6} ${a.sill - 3} L${a.wheels.fx - r - 6} ${a.sill - 3}" stroke="${darker}" stroke-width="4" stroke-opacity=".6"/>
  ${arch(rx)}${arch(fx)}
  <path d="${a.head}" fill="#fff7d6" opacity=".95"/>
  <path d="${a.tail}" fill="#d31b2b"/>
  ${wheel(rx)}${wheel(fx)}
</svg>`;
}
