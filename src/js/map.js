/* ───────────── Map ───────────── */
const OFM = 'https://tiles.openfreemap.org/planet';
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const F_REG = ['Noto Sans Regular'], F_BOLD = ['Noto Sans Bold'], F_IT = ['Noto Sans Italic'];
let map, demSource = null, mapReady = false, selectedId = null;

function isDark() {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
}
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function palette() {
  const dark = isDark();
  return dark ? {
    dark, bg: '#10181E', wood: '#17271F', grass: '#1A2621', rock: '#262A2B', ice: '#BCD3DF', sand: '#2A2927', wet: '#17262A', res: '#1D2329',
    water: '#163C4E', waterLine: '#2B6680', waterLbl: '#7FC0DB', park: '#5E9B72', road: '#3B464E', roadCase: '#20282E', major: '#6A5A3E', path: '#D99476', track: '#8C7B66',
    rail: '#6C7378', lift: '#B9B2A6', border: '#8E7FB0', bld: '#232B31', lbl: '#DCE3E1', lbl2: '#A7B4B8', halo: '#10181E', peak: '#CDB89C', contour: '#A08A70', hut: '#E08A6A',
    hsHi: '#5C6B70', hsSh: '#000000', hsAcc: '#0A1014',
    relief: [0, '#16231F', 600, '#18261F', 1100, '#1D2822', 1600, '#26302A', 2100, '#323632', 2600, '#45484A', 3200, '#7C8286', 4000, '#B8C2C7'],
    case: '#DDE5E3', glow: '#F08AA6', gold: '#E0B252', ink: '#E3EAE8', lake: '#5CB2D5', unknown: '#8A9AA2',
    easy: '#52B26E', moderate: '#EDB13A', hard: '#EC5D52', expert: '#05040A',
    sky: { 'sky-color': '#0A1520', 'horizon-color': '#1A2A34', 'fog-color': '#142029', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.35, 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 12, 0] }
  } : {
    dark, bg: '#EEF0E9', wood: '#C9DBBB', grass: '#E1E9D2', rock: '#E6E1D9', ice: '#F8FBFD', sand: '#ECE5D9', wet: '#D7E5DA', res: '#E7E2DA',
    water: '#9CCADC', waterLine: '#6FADC7', waterLbl: '#2B6C8A', park: '#5F8F5B', road: '#FFFFFF', roadCase: '#C9C2B6', major: '#F1C98A', path: '#B0503A', track: '#9C8770',
    rail: '#8A8A8A', lift: '#3C3C3C', border: '#8C7AA6', bld: '#DCD5CA', lbl: '#24343D', lbl2: '#5B6A72', halo: '#F6F7F3', peak: '#5A4632', contour: '#A8896A', hut: '#8B3A2E',
    hsHi: '#FFFFFF', hsSh: '#5E6E74', hsAcc: '#2C3A42',
    relief: [0, '#DCE6CB', 500, '#E1E9D0', 900, '#E6EAD2', 1300, '#EBE7CF', 1700, '#ECE3CC', 2100, '#EAE2D6', 2600, '#F0EDE7', 3100, '#F8F7F4', 4000, '#FFFFFF'],
    case: '#FFFFFF', glow: '#DE6B8C', gold: '#B8862A', ink: '#1B2A32', lake: '#22769A', unknown: '#6B7C85',
    easy: '#3A9555', moderate: '#DE9E1B', hard: '#CF4038', expert: '#1C1924',
    sky: { 'sky-color': '#B7D2E3', 'horizon-color': '#E7EEF0', 'fog-color': '#EDF2F1', 'sky-horizon-blend': 0.55, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.3, 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 12, 0] }
  };
}
const gradeExpr = C => ['match', ['get', 'g'], 'easy', C.easy, 'moderate', C.moderate, 'hard', C.hard, 'expert', C.expert, C.unknown];
const zi = (...stops) => ['interpolate', ['linear'], ['zoom'], ...stops];

function setupDem() {
  if (demSource || !window.mlcontour) return;
  try {
    demSource = new mlcontour.DemSource({ url: TERRARIUM, encoding: 'terrarium', maxzoom: 13, worker: true, timeoutMs: 30000, cacheSize: 300 });
    demSource.setupMaplibre(maplibregl);
  } catch (e) { console.warn('Contours unavailable', e); demSource = null; }
}
const demTiles = () => [demSource ? demSource.sharedDemProtocolUrl : TERRARIUM];

function cordeeLayers(C, opts = {}) {
  const L = [];
  L.push({ id: 'bg', type: 'background', paint: { 'background-color': C.bg } });
  L.push({ id: 'relief', type: 'color-relief', source: 'dem-relief', maxzoom: 15, paint: { 'color-relief-color': ['interpolate', ['linear'], ['elevation'], ...C.relief], 'color-relief-opacity': 1 } });
  const lc = (id, cls, color, op) => ({ id, type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], cls], paint: { 'fill-color': color, 'fill-opacity': op, 'fill-antialias': false } });
  L.push(lc('lc-wood', 'wood', C.wood, C.dark ? 0.75 : 0.6), lc('lc-grass', 'grass', C.grass, 0.45), lc('lc-rock', 'rock', C.rock, 0.55), lc('lc-sand', 'sand', C.sand, 0.5), lc('lc-wet', 'wetland', C.wet, 0.5));
  L.push({ id: 'lc-ice', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'ice'], paint: { 'fill-color': C.ice, 'fill-opacity': C.dark ? 0.55 : 0.9, 'fill-outline-color': C.waterLine } });
  L.push({ id: 'landuse', type: 'fill', source: 'omt', 'source-layer': 'landuse', minzoom: 10, filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood', 'commercial', 'industrial']]], paint: { 'fill-color': C.res, 'fill-opacity': 0.6 } });
  L.push({ id: 'park', type: 'line', source: 'omt', 'source-layer': 'park', minzoom: 8, paint: { 'line-color': C.park, 'line-width': zi(8, 0.8, 13, 2), 'line-dasharray': [3, 2], 'line-opacity': 0.55 } });
  L.push({ id: 'hillshade', type: 'hillshade', source: 'dem-hill', paint: { 'hillshade-method': 'multidirectional', 'hillshade-illumination-direction': [270, 315, 0, 345], 'hillshade-illumination-altitude': [35, 45, 40, 30], 'hillshade-highlight-color': [C.hsHi, C.hsHi, C.hsHi, C.hsHi], 'hillshade-shadow-color': [C.hsSh, C.hsSh, C.dark ? C.hsSh : '#6A6F66', C.hsSh], 'hillshade-exaggeration': C.dark ? 0.45 : 0.3 } });
  L.push({ id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': C.water } });
  L.push({ id: 'water-edge', type: 'line', source: 'omt', 'source-layer': 'water', minzoom: 10, paint: { 'line-color': C.waterLine, 'line-width': 0.7, 'line-opacity': 0.8 } });
  L.push({ id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 8, paint: { 'line-color': C.waterLine, 'line-width': zi(8, ['match', ['get', 'class'], 'river', 0.8, 0.15], 14, ['match', ['get', 'class'], 'river', 2.8, 1]) } });
  if (opts.contours) {
    L.push({ id: 'contour', type: 'line', source: 'contours', 'source-layer': 'contours', minzoom: 11, paint: { 'line-color': C.contour, 'line-opacity': ['match', ['get', 'level'], 1, C.dark ? 0.35 : 0.5, C.dark ? 0.18 : 0.28], 'line-width': ['match', ['get', 'level'], 1, 0.9, 0.5] } });
    L.push({ id: 'contour-lbl', type: 'symbol', source: 'contours', 'source-layer': 'contours', minzoom: 12.5, filter: ['>', ['get', 'level'], 0], layout: { 'symbol-placement': 'line', 'text-field': ['concat', ['to-string', ['get', 'ele']], ' m'], 'text-font': F_REG, 'text-size': 9.5, 'symbol-spacing': 320 }, paint: { 'text-color': C.contour, 'text-halo-color': C.halo, 'text-halo-width': 1 } });
  }
  const tr = (id, filter, paint, minzoom = 5, layout = {}) => ({ id, type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom, filter, layout: Object.assign({ 'line-join': 'round', 'line-cap': 'round' }, layout), paint });
  L.push(tr('track', ['==', ['get', 'class'], 'track'], { 'line-color': C.track, 'line-width': zi(12, 0.7, 16, 1.6), 'line-dasharray': [3, 2] }, 12, { 'line-cap': 'butt' }));
  L.push(tr('path', ['==', ['get', 'class'], 'path'], { 'line-color': C.path, 'line-width': zi(12, 0.8, 16, 1.8), 'line-dasharray': [2.2, 1.6] }, 12, { 'line-cap': 'butt' }));
  L.push(tr('minor-case', ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary']]], { 'line-color': C.roadCase, 'line-width': zi(11, 1.2, 16, 7) }, 11));
  L.push(tr('minor', ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary']]], { 'line-color': C.road, 'line-width': zi(11, 0.6, 16, 5) }, 11));
  L.push(tr('major-case', ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'trunk', 'motorway']]], { 'line-color': C.roadCase, 'line-width': zi(6, 0.6, 10, 2.4, 16, 11) }, 6));
  L.push(tr('major', ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'trunk', 'motorway']]], { 'line-color': ['match', ['get', 'class'], ['motorway', 'trunk'], C.major, C.road], 'line-width': zi(6, 0.3, 10, 1.5, 16, 9) }, 6));
  L.push(tr('rail', ['==', ['get', 'class'], 'rail'], { 'line-color': C.rail, 'line-width': zi(8, 0.5, 14, 1.6) }, 8));
  L.push(tr('lift', ['any', ['==', ['get', 'class'], 'aerialway'], ['in', ['get', 'subclass'], ['literal', ['cable_car', 'gondola', 'chair_lift', 'mixed_lift']]]], { 'line-color': C.lift, 'line-width': 1.1, 'line-dasharray': [5, 1.5] }, 11, { 'line-cap': 'butt' }));
  L.push({ id: 'border', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': C.border, 'line-width': zi(5, 1, 12, 2.2), 'line-dasharray': [4, 2, 1, 2], 'line-opacity': 0.8 } });
  L.push({ id: 'bld', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': C.bld, 'fill-opacity': 0.8 } });
  L.push(...labelLayers(C));
  return L;
}
function labelLayers(C) {
  return [
    { id: 'park-lbl', type: 'symbol', source: 'omt', 'source-layer': 'park', minzoom: 9, filter: ['has', 'name'], layout: { 'text-field': ['get', 'name'], 'text-font': F_IT, 'text-size': 11, 'text-max-width': 8, 'symbol-placement': 'point' }, paint: { 'text-color': C.park, 'text-halo-color': C.halo, 'text-halo-width': 1.2 } },
    { id: 'water-lbl', type: 'symbol', source: 'omt', 'source-layer': 'water_name', minzoom: 9, layout: { 'text-field': ['get', 'name'], 'text-font': F_IT, 'text-size': zi(9, 10.5, 14, 13), 'text-max-width': 7, 'text-letter-spacing': 0.05 }, paint: { 'text-color': C.waterLbl, 'text-halo-color': C.halo, 'text-halo-width': 1.2 } },
    { id: 'hut-osm', type: 'symbol', source: 'omt', 'source-layer': 'poi', minzoom: 13, filter: ['in', ['get', 'subclass'], ['literal', ['alpine_hut', 'wilderness_hut']]], layout: { 'text-field': ['get', 'name'], 'text-font': F_BOLD, 'text-size': 10.5, 'text-max-width': 8, 'text-optional': true }, paint: { 'text-color': C.hut, 'text-halo-color': C.halo, 'text-halo-width': 1.3 } },
    { id: 'peak-dot', type: 'circle', source: 'omt', 'source-layer': 'mountain_peak', minzoom: 9, filter: ['in', ['get', 'class'], ['literal', ['peak', 'volcano']]], paint: { 'circle-radius': zi(9, 1.6, 14, 2.6), 'circle-color': C.peak } },
    { id: 'peak-lbl', type: 'symbol', source: 'omt', 'source-layer': 'mountain_peak', minzoom: 9, filter: ['all', ['in', ['get', 'class'], ['literal', ['peak', 'volcano']]], ['has', 'name']], layout: { 'text-field': ['format', ['get', 'name'], { 'text-font': ['literal', F_REG] }, '\n', {}, ['concat', ['to-string', ['get', 'ele']], ' m'], { 'font-scale': 0.82, 'text-font': ['literal', F_IT] }], 'text-font': F_REG, 'text-size': zi(9, 10, 14, 12), 'text-anchor': 'top', 'text-offset': [0, 0.45], 'text-max-width': 9, 'text-optional': true }, paint: { 'text-color': C.peak, 'text-halo-color': C.halo, 'text-halo-width': 1.3 } },
    { id: 'place-small', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 11, filter: ['in', ['get', 'class'], ['literal', ['village', 'hamlet', 'suburb']]], layout: { 'text-field': ['get', 'name'], 'text-font': F_REG, 'text-size': zi(11, 10.5, 15, 13), 'text-max-width': 8 }, paint: { 'text-color': C.lbl2, 'text-halo-color': C.halo, 'text-halo-width': 1.4 } },
    { id: 'place-town', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 7, filter: ['==', ['get', 'class'], 'town'], layout: { 'text-field': ['get', 'name'], 'text-font': F_BOLD, 'text-size': zi(7, 10.5, 13, 14), 'text-max-width': 8 }, paint: { 'text-color': C.lbl, 'text-halo-color': C.halo, 'text-halo-width': 1.5 } },
    { id: 'place-city', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 4, filter: ['==', ['get', 'class'], 'city'], layout: { 'text-field': ['get', 'name'], 'text-font': F_BOLD, 'text-size': zi(5, 11, 12, 17), 'text-transform': 'uppercase', 'text-letter-spacing': 0.08, 'text-max-width': 8 }, paint: { 'text-color': C.lbl, 'text-halo-color': C.halo, 'text-halo-width': 1.6 } }
  ];
}

function hikeLayers(C) {
  const lj = { 'line-join': 'round', 'line-cap': 'round' };
  return [
    { id: 'ex-line', type: 'line', source: 'explore', layout: lj, paint: { 'line-color': gradeExpr(C), 'line-width': zi(10, 1.4, 15, 3.4), 'line-opacity': 0.8 } },
    { id: 'ex-lbl', type: 'symbol', source: 'explore', minzoom: 12, layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': F_IT, 'text-size': 11, 'symbol-spacing': 400 }, paint: { 'text-color': C.ink, 'text-halo-color': C.halo, 'text-halo-width': 1.4 } },
    { id: 'hut-pt', type: 'circle', source: 'huts', paint: { 'circle-radius': zi(10, 4, 15, 6), 'circle-color': C.hut, 'circle-stroke-color': C.case, 'circle-stroke-width': 1.5 } },
    { id: 'hut-lbl', type: 'symbol', source: 'huts', minzoom: 11.5, layout: { 'text-field': ['get', 'name'], 'text-font': F_BOLD, 'text-size': 10.5, 'text-offset': [0, 0.9], 'text-anchor': 'top', 'text-optional': true, 'text-max-width': 8 }, paint: { 'text-color': C.hut, 'text-halo-color': C.halo, 'text-halo-width': 1.3 } },
    { id: 'hl-glow', type: 'line', source: 'hike-lines', minzoom: 7, filter: ['==', ['get', 'done'], 1], layout: lj, paint: { 'line-color': C.glow, 'line-width': zi(7, 5, 14, 15), 'line-blur': zi(7, 3, 14, 7), 'line-opacity': 0.6 } },
    { id: 'hl-case', type: 'line', source: 'hike-lines', minzoom: 7, layout: lj, paint: { 'line-color': C.case, 'line-width': zi(7, 2.4, 14, 7), 'line-opacity': 0.9 } },
    { id: 'hl-line', type: 'line', source: 'hike-lines', minzoom: 7, layout: lj, paint: { 'line-color': gradeExpr(C), 'line-width': zi(7, 1.2, 14, 4) } },
    { id: 'edit-line', type: 'line', source: 'edit', layout: lj, paint: { 'line-color': C.ink, 'line-width': 2, 'line-dasharray': [2, 2] } },
    { id: 'build-pre', type: 'line', source: 'build-pre', layout: lj, paint: { 'line-color': C.ink, 'line-width': 2, 'line-dasharray': [1.5, 2], 'line-opacity': 0.55 } },
    { id: 'build-case', type: 'line', source: 'build', layout: lj, paint: { 'line-color': C.case, 'line-width': zi(7, 5, 14, 10) } },
    { id: 'build-line', type: 'line', source: 'build', filter: ['!=', ['get', 'src'], 'line'], layout: lj, paint: { 'line-color': C.lake, 'line-width': zi(7, 3, 14, 5.5) } },
    { id: 'build-free', type: 'line', source: 'build', filter: ['==', ['get', 'src'], 'line'], layout: lj, paint: { 'line-color': C.ink, 'line-width': zi(7, 2.5, 14, 4.5), 'line-dasharray': [1.4, 1.2] } },
    { id: 'sel-case', type: 'line', source: 'sel', layout: lj, paint: { 'line-color': C.case, 'line-width': zi(7, 5, 14, 11) } },
    { id: 'sel-line', type: 'line', source: 'sel', layout: lj, paint: { 'line-color': gradeExpr(C), 'line-width': zi(7, 3, 14, 6.5) } },
    { id: 'sel-prog', type: 'line', source: 'prog', layout: lj, paint: { 'line-color': C.glow, 'line-width': zi(7, 3, 14, 6.5) } },
    { id: 'hk-glow', type: 'circle', source: 'hikes', filter: ['==', ['get', 'done'], 1], paint: { 'circle-radius': zi(5, 7, 12, 14), 'circle-color': C.glow, 'circle-blur': 0.6, 'circle-opacity': 0.85 } },
    { id: 'hk-wish', type: 'circle', source: 'hikes', filter: ['==', ['get', 'wish'], 1], paint: { 'circle-radius': zi(5, 6, 12, 11), 'circle-opacity': 0, 'circle-stroke-color': C.gold, 'circle-stroke-width': 2 } },
    { id: 'hk-pt', type: 'circle', source: 'hikes', paint: { 'circle-radius': zi(5, 3.6, 9, 5.5, 13, 7.5), 'circle-color': gradeExpr(C), 'circle-stroke-color': C.case, 'circle-stroke-width': ['case', ['==', ['get', 'g'], 'expert'], 2, 1.5] } },
    { id: 'hk-sel', type: 'circle', source: 'hikes', filter: ['==', ['get', 'id'], selectedId || ''], paint: { 'circle-radius': zi(5, 8, 13, 13), 'circle-opacity': 0, 'circle-stroke-color': C.ink, 'circle-stroke-width': 2.5 } },
    { id: 'hk-lbl', type: 'symbol', source: 'hikes', minzoom: 9.5, layout: { 'text-field': ['get', 'name'], 'text-font': F_BOLD, 'text-size': zi(9.5, 10.5, 14, 12.5), 'text-offset': [0, 1], 'text-anchor': 'top', 'text-max-width': 9, 'text-optional': true }, paint: { 'text-color': C.ink, 'text-halo-color': C.halo, 'text-halo-width': 1.6 } },
    { id: 'home-pt', type: 'circle', source: 'home', paint: { 'circle-radius': 6, 'circle-color': C.lake, 'circle-stroke-color': C.case, 'circle-stroke-width': 2 } },
    { id: 'home-lbl', type: 'symbol', source: 'home', layout: { 'text-field': ['get', 'name'], 'text-font': F_BOLD, 'text-size': 11, 'text-offset': [0, 1], 'text-anchor': 'top' }, paint: { 'text-color': C.lake, 'text-halo-color': C.halo, 'text-halo-width': 1.5 } },
    { id: 'pos', type: 'circle', source: 'pos', paint: { 'circle-radius': 7, 'circle-color': C.glow, 'circle-stroke-color': C.case, 'circle-stroke-width': 2.5 } }
  ];
}

const EMPTY = { type: 'FeatureCollection', features: [] };
const GEO = { hikes: EMPTY, 'hike-lines': EMPTY, sel: EMPTY, prog: EMPTY, pos: EMPTY, explore: EMPTY, huts: EMPTY, edit: EMPTY, home: EMPTY, build: EMPTY, 'build-pre': EMPTY };

function buildStyle() {
  setupDem();
  const C = palette();
  const dem = { type: 'raster-dem', tiles: demTiles(), tileSize: 256, maxzoom: 13, encoding: 'terrarium', attribution: 'Terrain: Mapzen / AWS Terrain Tiles' };
  const sources = { 'dem-terrain': { ...dem }, 'dem-hill': { ...dem } };
  const omt = { type: 'vector', url: OFM, attribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>' };
  let layers = [];
  const contours = S.contours && demSource && S.base !== 'topo';
  if (contours) sources.contours = { type: 'vector', tiles: [demSource.contourProtocolUrl({ multiplier: 1, thresholds: { 11: [100, 500], 12: [50, 250], 13: [50, 250], 14: [20, 100], 15: [10, 50] }, elevationKey: 'ele', levelKey: 'level', contourLayer: 'contours' })], maxzoom: 15 };
  if (S.base === 'cordee' || S.base === 'swiss') {
    sources.omt = omt; sources['dem-relief'] = { ...dem };
    layers = cordeeLayers(C, { contours });
    if (S.base === 'swiss') {
      sources.swiss = { type: 'raster', tiles: ['https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg'], tileSize: 256, maxzoom: 18, bounds: [5.7, 45.7, 10.6, 47.9], attribution: '© swisstopo' };
      const at = layers.findIndex(l => l.id === 'contour' || l.id === 'track');
      layers.splice(at, 0, { id: 'swiss', type: 'raster', source: 'swiss', paint: { 'raster-opacity': 0.95 } });
    }
  } else if (S.base === 'topo') {
    sources.topo = { type: 'raster', tiles: ['a', 'b', 'c'].map(s => `https://${s}.tile.opentopomap.org/{z}/{x}/{y}.png`), tileSize: 256, maxzoom: 17, attribution: 'Map: © <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a> (CC-BY-SA), © OpenStreetMap contributors' };
    layers = [{ id: 'bg', type: 'background', paint: { 'background-color': C.bg } }, { id: 'topo', type: 'raster', source: 'topo', paint: C.dark ? { 'raster-brightness-max': 0.82, 'raster-saturation': -0.15 } : {} }];
  } else {
    sources.sat = { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' };
    sources.omt = omt;
    const Cs = Object.assign({}, C, { lbl: '#FFFFFF', lbl2: '#F1F1EE', halo: '#1A2228', peak: '#FFF4E0', waterLbl: '#CDEBFA', park: '#C8E6B8', hut: '#FFD2C2', contour: '#F3E3C8' });
    layers = [{ id: 'bg', type: 'background', paint: { 'background-color': '#2A3328' } }, { id: 'sat', type: 'raster', source: 'sat' }];
    if (contours) layers.push({ id: 'contour', type: 'line', source: 'contours', 'source-layer': 'contours', minzoom: 12, paint: { 'line-color': '#FFFFFF', 'line-opacity': ['match', ['get', 'level'], 1, 0.35, 0.15], 'line-width': 0.6 } });
    layers.push({ id: 'path', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 13, filter: ['==', ['get', 'class'], 'path'], paint: { 'line-color': '#FFE3B8', 'line-width': 1.2, 'line-dasharray': [2, 1.6], 'line-opacity': 0.85 } });
    layers.push(...labelLayers(Cs));
  }
  if (S.trails) {
    sources.wmt = { type: 'raster', tiles: ['https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 18, attribution: 'Trails: <a href="https://hiking.waymarkedtrails.org" target="_blank">Waymarked Trails</a>' };
    layers.push({ id: 'wmt', type: 'raster', source: 'wmt', paint: { 'raster-opacity': 0.85 } });
  }
  for (const k in GEO) sources[k] = { type: 'geojson', data: GEO[k] };
  sources.hikes.attribution = 'Weather: <a href="https://open-meteo.com" target="_blank">Open-Meteo</a> · Routes: BRouter';
  layers.push(...hikeLayers(C));
  const style = { version: 8, glyphs: GLYPHS, sources, layers, sky: C.sky };
  if (S.threeD) style.terrain = { source: 'dem-terrain', exaggeration: S.exag };
  return style;
}

function mapPadding() {
  if (isPhone()) {
    const sh = parseFloat(getComputedStyle($('#panel')).height) || 300;
    return { top: 70, right: 64, bottom: sh + 20, left: 24 };
  }
  return { top: 60, right: 70, bottom: 40, left: $('#panel').offsetWidth + 40 };
}
const REGION = [[7.55, 45.8], [13.8, 47.95]];

function initMap() {
  const st = buildStyle();
  map = new maplibregl.Map({
    container: 'map', style: st, bounds: REGION, fitBoundsOptions: { padding: mapPadding() },
    pitch: S.threeD ? 48 : 0, bearing: -6, maxPitch: 78, attributionControl: { compact: true }, fadeDuration: 150, dragRotate: true
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showZoom: !isPhone() }), 'bottom-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
  map.on('load', () => { mapReady = true; pushHikeData(); pushHome(); if (!Builder.on && !UI.detailId) fitRegion(false); });
  map.on('style.load', () => { pushHikeData(); });
  map.on('error', e => { if (e && e.error) console.warn('map:', e.error.message || e.error); });
  map.on('click', onMapClick);
  map.on('mousemove', e => {
    if (Builder.on) { map.getCanvas().style.cursor = queryAt(e.point, ['build-line', 'build-free']).length ? 'copy' : 'crosshair'; return; }
    if (Pick.on || Edit.on) { map.getCanvas().style.cursor = 'crosshair'; return; }
    const f = queryAt(e.point, ['hk-pt', 'hl-line', 'ex-line', 'hut-pt']);
    map.getCanvas().style.cursor = f.length ? 'pointer' : '';
  });
  map.on('moveend', debounce(() => { if (UI.state.inView) UI.renderList(); renderWxMarkers(); }, 200));
}
function fitRegion(anim = true) {
  const pts = (UI.filtered && UI.filtered.length ? UI.filtered : HK).map(h => h.start);
  if (!pts.length) return;
  const b = new maplibregl.LngLatBounds();
  pts.forEach(p => b.extend([p[1], p[0]]));
  map.fitBounds(b, { padding: mapPadding(), pitch: S.threeD ? 48 : 0, bearing: -6, duration: anim ? 1400 : 0, maxZoom: 11 });
}
function queryAt(pt, ids) {
  const layers = ids.filter(id => map.getLayer(id));
  if (!layers.length) return [];
  const r = isPhone() ? 14 : 7;
  return map.queryRenderedFeatures([[pt.x - r, pt.y - r], [pt.x + r, pt.y + r]], { layers });
}
function onMapClick(e) {
  if (Builder.on) return Builder.click(e);
  if (Pick.on) return Pick.click(e);
  if (Edit.on) return Edit.click(e);
  const f = queryAt(e.point, ['hk-pt', 'sel-line', 'hl-line', 'hut-pt', 'ex-line']);
  if (!f.length) return;
  const top = f[0];
  if (top.layer.id === 'hut-pt') return Explore.hutPopup(top, e.lngLat);
  if (top.layer.id === 'ex-line') return Explore.routePopup(top, e.lngLat);
  UI.openHike(top.properties.id);
}
function setSrc(id, data) { GEO[id] = data; try { const s = map && map.getSource(id); if (s) s.setData(data); } catch (e) { } }
function pushHikeData() {
  if (!map) return;
  const dm = doneMap(), list = UI.filtered || HK;
  setSrc('hikes', { type: 'FeatureCollection', features: list.map(h => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [h.start[1], h.start[0]] }, properties: { id: h.id, g: h.g, name: h.n, done: dm[h.id] ? 1 : 0, wish: isWish(h.id) && !dm[h.id] ? 1 : 0 } })) });
  const lines = [];
  for (const h of list) { const r = Routes.cached(h); if (r) lines.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: r.c.map(c => [c[0], c[1]]) }, properties: { id: h.id, g: h.g, done: dm[h.id] ? 1 : 0 } }); }
  setSrc('hike-lines', { type: 'FeatureCollection', features: lines });
  selFilter();
}
function pushHome() { setSrc('home', { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [S.home.lon, S.home.lat] }, properties: { name: S.home.name || 'Home' } }] }); }
function selFilter() { try { if (map && map.isStyleLoaded() && map.getLayer('hk-sel')) map.setFilter('hk-sel', ['==', ['get', 'id'], selectedId || '']); } catch (e) { } }
function showSelected(h) {
  selectedId = h ? h.id : null;
  selFilter();
  const r = h && Routes.cached(h);
  setSrc('sel', r ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: r.c.map(c => [c[0], c[1]]) }, properties: { g: h.g } }] } : EMPTY);
  setSrc('prog', EMPTY); setSrc('pos', EMPTY);
}
function flyToHike(h) {
  const r = Routes.cached(h);
  const b = new maplibregl.LngLatBounds();
  (r ? r.c : h.p.map(q => [q[1], q[0]])).forEach(c => b.extend([c[0], c[1]]));
  map.fitBounds(b, { padding: mapPadding(), pitch: S.threeD ? 58 : 0, bearing: map.getBearing(), maxZoom: 14.3, duration: 1600 });
}
function setBase(base) { S.base = base; saveSettings(); restyle(); }
function restyle() { if (!map) return; map.setStyle(buildStyle(), { diff: false }); }
function set3D(on) {
  S.threeD = on; saveSettings();
  $('#btn3d').setAttribute('aria-pressed', on);
  if (!map.isStyleLoaded()) { map.once('style.load', () => set3D(on)); return; }
  if (on) { map.setTerrain({ source: 'dem-terrain', exaggeration: S.exag }); map.easeTo({ pitch: 55, duration: 900 }); }
  else { map.setTerrain(null); map.easeTo({ pitch: 0, bearing: 0, duration: 900 }); }
}

/* Weather badges on the map */
let wxMarkers = [];
function renderWxMarkers() {
  wxMarkers.forEach(m => m.remove()); wxMarkers = [];
  if (!UI.state.wxOnMap || !WX || !map) return;
  const b = map.getBounds(), placed = [];
  const cand = (UI.filtered || HK).map(h => ({ h, w: wxOf(h) })).filter(x => x.w && b.contains([x.h.top[1], x.h.top[0]]))
    .map(x => ({ ...x, s: dayScore(x.w, wxDay), p: map.project([x.h.top[1], x.h.top[0]]) })).sort((a, z) => (z.s ?? -1) - (a.s ?? -1));
  for (const { h, w, s, p } of cand) {
    if (placed.some(q => Math.abs(q.x - p.x) < 66 && Math.abs(q.y - p.y) < 30)) continue; // declutter: best days win the space
    placed.push(p); if (placed.length > 80) break;
    const [icn] = wmo(w.code[wxDay]);
    const el = document.createElement('button');
    el.className = 'wxm'; el.title = h.n + ' · ' + scoreWord(s) + ' day at the top';
    el.innerHTML = ic(icn) + Math.round(w.tx[wxDay]) + '°<i class="' + scoreCls(s) + '"></i>';
    el.addEventListener('click', ev => { ev.stopPropagation(); UI.openHike(h.id); });
    wxMarkers.push(new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -10] }).setLngLat([h.top[1], h.top[0]]).addTo(map));
  }
}

/* ───────────── Routes: snap, trace, cache ───────────── */
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
async function overpass(q, ms = 30000) {
  let last;
  for (const u of OVERPASS) {
    try {
      const r = await fetchT(u, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, ms);
      if (r.ok) return await r.json();
      last = new Error('Overpass ' + r.status);
    } catch (e) { last = e; }
  }
  throw last || new Error('Overpass unavailable');
}
function simplify(c, tol = 5) { // Douglas-Peucker in 3D (metres), so climbs survive on straight stretches
  if (c.length < 3) return c;
  const k = Math.cos(c[0][1] * Math.PI / 180) * 111320, P = c.map(p => [p[0] * k, p[1] * 110540, (p[2] ?? 0) * 1.5]);
  const keep = new Uint8Array(c.length); keep[0] = keep[c.length - 1] = 1;
  const st = [[0, c.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const A = P[a], B = P[b], D = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L2 = D[0] * D[0] + D[1] * D[1] + D[2] * D[2];
    for (let i = a + 1; i < b; i++) {
      const Q = P[i]; let t = L2 ? ((Q[0] - A[0]) * D[0] + (Q[1] - A[1]) * D[1] + (Q[2] - A[2]) * D[2]) / L2 : 0; t = clamp(t, 0, 1);
      const d = Math.hypot(Q[0] - A[0] - t * D[0], Q[1] - A[1] - t * D[1], Q[2] - A[2] - t * D[2]);
      if (d > md) { md = d; mi = i; }
    }
    if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return c.filter((_, i) => keep[i]);
}
function lineStats(c) {
  let km = 0, asc = 0, desc = 0, mx = -1e9, mn = 1e9, ref = null;
  for (let i = 0; i < c.length; i++) {
    if (i) km += havLL(c[i - 1], c[i]);
    const e = c[i][2]; if (e == null) continue;
    mx = Math.max(mx, e); mn = Math.min(mn, e);
    if (ref == null) { ref = e; continue; }
    const d = e - ref;
    if (d >= 4) { asc += d; ref = e; } else if (d <= -4) { desc -= d; ref = e; }
  }
  return { km, asc: Math.round(asc), desc: Math.round(desc), mx: mx > -1e9 ? Math.round(mx) : null, mn: mn < 1e9 ? Math.round(mn) : null };
}
async function fillElevation(c) {
  const miss = []; c.forEach((p, i) => { if (p[2] == null) miss.push(i); });
  if (!miss.length) return c;
  const m = Math.min(100, miss.length), pick = [];
  for (let k = 0; k < m; k++) pick.push(miss[Math.round(k * (miss.length - 1) / Math.max(1, m - 1))]);
  const qs = new URLSearchParams({ latitude: pick.map(i => c[i][1].toFixed(5)).join(','), longitude: pick.map(i => c[i][0].toFixed(5)).join(',') });
  const r = await fetchT('https://api.open-meteo.com/v1/elevation?' + qs, {}, 15000);
  const el = (await r.json()).elevation || [];
  const known = pick.map((i, k) => [i, el[k]]).filter(x => x[1] != null);
  if (!known.length) return c;
  for (const i of miss) {
    let lo = null, hi = null;
    for (const kv of known) { if (kv[0] <= i) lo = kv; if (kv[0] >= i) { hi = kv; break; } }
    lo = lo || hi; hi = hi || lo;
    c[i][2] = Math.round(hi[0] === lo[0] ? lo[1] : lo[1] + (hi[1] - lo[1]) * (i - lo[0]) / (hi[0] - lo[0]));
  }
  return c;
}
async function addElevation(c) {
  const n = c.length, m = Math.min(100, n), idx = [];
  for (let i = 0; i < m; i++) idx.push(Math.round(i * (n - 1) / Math.max(1, m - 1)));
  const qs = new URLSearchParams({ latitude: idx.map(i => c[i][1].toFixed(5)).join(','), longitude: idx.map(i => c[i][0].toFixed(5)).join(',') });
  const r = await fetchT('https://api.open-meteo.com/v1/elevation?' + qs, {}, 15000);
  const el = (await r.json()).elevation;
  for (let j = 0; j < idx.length - 1; j++) {
    const a = idx[j], b = idx[j + 1];
    for (let i = a; i <= b; i++) { const t = b === a ? 0 : (i - a) / (b - a); c[i][2] = Math.round(el[j] + (el[j + 1] - el[j]) * t); }
  }
  return c;
}
const Routes = {
  inflight: {}, queue: [], running: false,
  key: h => JSON.stringify(h.p) + '|' + h.ty,
  cached(h) { const it = ITEMS['route:' + h.id]; return it && !it.x && it.d && it.d.c ? it.d : null; },
  fresh(h) { const r = this.cached(h); return r && (r.wk === this.key(h) || r.src === 'gpx'); },
  async snap(name, pt) { // move the summit/hut waypoint onto the named OSM feature: Nominatim first, Overpass as fallback
    const rank = (cat, type) => ((cat === 'natural' && (type === 'peak' || type === 'volcano')) || (cat === 'tourism' && (type === 'alpine_hut' || type === 'wilderness_hut'))) ? 0 : (type === 'saddle' || type === 'mountain_pass') ? 1 : (cat === 'tourism' || cat === 'amenity') ? 2 : 3;
    const pickBest = c => { c.sort((a, b) => a.r - b.r || a.d - b.d); return c.length && c[0].d < 2.5 && c[0].r < 3 ? [c[0].lat, c[0].lon] : null; };
    try {
      const u = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=jsonv2&limit=10&bounded=1&viewbox=${pt[1] - 0.07},${pt[0] + 0.05},${pt[1] + 0.07},${pt[0] - 0.05}`;
      const r = await fetchT(u, {}, 12000);
      if (r.ok) {
        const j = await r.json();
        return pickBest(j.map(e => ({ lat: +e.lat, lon: +e.lon, r: rank(e.category, e.type), d: hav(pt, [+e.lat, +e.lon]) })));
      }
    } catch (e) { console.warn('Nominatim', e.message); }
    const words = (name.match(/[\p{L}]{4,}/gu) || []).sort((a, b) => b.length - a.length);
    if (!words.length) return null;
    const w = words[0].replace(/[\\"^$.*+?()[\]{}|]/g, '\\$&');
    const j = await overpass(`[out:json][timeout:12];nwr["name"~"${w}",i](around:2500,${pt[0]},${pt[1]});out center tags 25;`, 12000);
    return pickBest(j.elements.map(e => { const t = e.tags || {}, lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon; return { lat, lon, r: rank(t.natural ? 'natural' : t.tourism ? 'tourism' : t.amenity ? 'amenity' : '', t.natural || t.tourism || (t.mountain_pass === 'yes' ? 'mountain_pass' : '') || t.amenity), d: lat != null ? hav(pt, [lat, lon]) : 99 }; }));
  },
  async place(name, pt) { // a named trailhead, station or lake from the catalogue's "pq" list: nearest OSM match within 3 km
    const u = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=jsonv2&limit=8&bounded=1&viewbox=${pt[1] - 0.06},${pt[0] + 0.04},${pt[1] + 0.06},${pt[0] - 0.04}`;
    const r = await fetchT(u, {}, 12000);
    if (!r.ok) return null;
    const c = (await r.json()).map(e => [+e.lat, +e.lon]).filter(q => hav(pt, q) < 3).sort((a, b) => hav(pt, a) - hav(pt, b));
    return c[0] || null;
  },
  async brouter(pts) { return (await this.brouterFull(pts)).c; },
  /* The whole answer: the line with elevations, plus BRouter's per-stretch way tags (highway, sac_scale, surface…). */
  async brouterFull(pts) {
    const ll = pts.map(p => p[1].toFixed(5) + ',' + p[0].toFixed(5)).join('|');
    const r = await fetchT(`https://brouter.de/brouter?lonlats=${ll}&profile=hiking-mountain&alternativeidx=0&format=geojson`, {}, 35000);
    if (r.status === 403 || r.status === 429 || r.status === 503) throw Object.assign(new Error('BRouter is busy'), { rate: true });
    if (!r.ok) { const t = await r.text().catch(() => ''); throw Object.assign(new Error(/not mapped|no track|not found|target island|from-position|to-position/i.test(t) ? 'No trail connects these points' : 'BRouter ' + r.status), { unroutable: r.status === 400 || r.status === 500 }); }
    const f = (await r.json()).features?.[0];
    if (!f) throw new Error('No route');
    const m = f.properties && f.properties.messages, msgs = [];
    if (Array.isArray(m) && m.length > 1) { const H = m[0], iD = H.indexOf('Distance'), iW = H.indexOf('WayTags'); for (const row of m.slice(1)) msgs.push({ d: +row[iD] || 0, w: row[iW] || '' }); }
    return { c: f.geometry.coordinates.map(c => [c[0], c[1], c[2] != null ? Math.round(c[2]) : null]), msgs };
  },
  /* Straight segments, densified so the terrain profile shows the hills in between. */
  async straight(pts) {
    const c = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(hav(a, b) / 0.06));
      for (let k = i ? 1 : 0; k <= n; k++) c.push([a[1] + (b[1] - a[1]) * k / n, a[0] + (b[0] - a[0]) * k / n, null]);
    }
    return fillElevation(c);
  },
  async osrm(pts) {
    const r = await fetchT(`https://routing.openstreetmap.de/routed-foot/route/v1/driving/${pts.map(p => p[1].toFixed(5) + ',' + p[0].toFixed(5)).join(';')}?overview=full&geometries=geojson`, {}, 25000);
    const j = await r.json();
    if (j.code !== 'Ok') throw new Error('OSRM ' + j.code);
    return addElevation(j.routes[0].geometry.coordinates.map(c => [c[0], c[1], null]));
  },
  get(h, force = false, bg = false) {
    if (!force && this.fresh(h)) return Promise.resolve(this.cached(h));
    if (this.inflight[h.id]) return this.inflight[h.id];
    return (this.inflight[h.id] = (async () => {
      try {
        const pts = h.p.map(q => [q[0], q[1]]);
        if (h.free) {
          if (h.ty === 'loop') pts.push(pts[0]);
          const c = simplify(await this.straight(pts), 5).map(p => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5, p[2]]);
          const r = { c, wk: this.key(h), src: 'line', snapped: false, ...lineStats(c), ts: Date.now() };
          putItem('route:' + h.id, 'route', r);
          return r;
        }
        let snapped = false, topSnapped = false;
        if (h.tn && ['peak', 'hut', 'pass'].includes(h.tk)) {
          try { const s = await this.snap(h.tn, pts[h.hiIdx]); if (s) { pts[h.hiIdx] = s; snapped = topSnapped = true; } } catch (e) { console.warn('snap', e.message); }
        }
        if (Array.isArray(h.pq)) for (let i = 0; i < pts.length; i++) {
          if (!h.pq[i] || (topSnapped && i === h.hiIdx)) continue;
          try { const s = await this.place(h.pq[i], pts[i]); if (s) { pts[i] = s; snapped = true; } } catch (e) { console.warn('place', e.message); }
          await sleep(1100); // Nominatim allows one request per second
        }
        if (h.ty === 'loop') pts.push(pts[0]);
        let c, src = 'brouter';
        try { c = await this.brouter(pts); } catch (e) {
          if (bg) throw e; // background tracing waits for BRouter instead of storing a rougher line
          console.warn('BRouter failed, trying OSRM', e.message); src = 'osrm';
          try { c = await this.osrm(pts); } catch (e2) { src = 'line'; c = await addElevation(pts.map(p => [p[1], p[0], null])).catch(() => pts.map(p => [p[1], p[0], null])); }
        }
        c = simplify(c, 5).map(p => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5, p[2]]);
        const st = lineStats(c);
        const r = { c, wk: this.key(h), src, snapped, ...st, ts: Date.now() };
        putItem('route:' + h.id, 'route', r);
        if (h.custom && h.auto) {
          const k = h.ty === 'out' ? 2 : 1;
          saveHike(h, { km: Math.round(st.km * k * 10) / 10, up: h.ty === 'out' ? st.asc + st.desc : st.asc, dn: st.desc, mx: st.mx || h.mx, lo: c[0][2] ?? h.lo, auto: true });
        }
        return r;
      } finally { delete this.inflight[h.id]; }
    })());
  },
  /* Trace every untraced hike politely in the background (1 at a time). */
  background() {
    if (!S.autoTrace || this.running) return;
    this.running = true;
    (async () => {
      while (S.autoTrace) {
        const c = map ? map.getCenter() : { lat: 47.3, lng: 11.4 };
        const needs = h => !this.failed[h.id] && (!this.fresh(h) || (!h.free && ['osrm', 'line'].includes(this.cached(h).src) && !this.upgraded[h.id]));
        const todo = (UI.filtered || HK).filter(needs).sort((a, b) => hav([c.lat, c.lng], a.start) - hav([c.lat, c.lng], b.start));
        if (!todo.length) break;
        const h = todo[0];
        try { if (this.fresh(h)) this.upgraded[h.id] = 1; await this.get(h, this.fresh(h), true); pushHikeData(); }
        catch (e) { if (e.rate) { await sleep(180000); continue; } this.failed[h.id] = 1; }
        await sleep(3500);
      }
      this.running = false;
    })();
  },
  upgraded: {},
  failed: {}
};
