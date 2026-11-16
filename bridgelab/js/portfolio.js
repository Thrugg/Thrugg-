/* BridgeLab — the invented portfolio. Every name, volume and price here is made up for teaching; none comes from
   any real company. Volumes in tonnes, net prices in euros per kilo, so net sales = tonnes × 1,000 × €/kg. */

export const CATS = [
  { id: 'dairy', name: { en: 'Dairy', fr: 'Produits laitiers' } },
  { id: 'plant', name: { en: 'Plant-based', fr: 'Végétal' } }
];
export const SKUS = [
  { id: 'nat', cat: 'dairy', name: { en: 'Natural yogurt 500 g', fr: 'Yaourt nature 500 g' }, q0: 4200, p0: 1.90 },
  { id: 'fruit', cat: 'dairy', name: { en: 'Fruit yogurt 4 × 125 g', fr: 'Yaourt aux fruits 4 × 125 g' }, q0: 3100, p0: 2.60 },
  { id: 'skyr', cat: 'dairy', name: { en: 'Skyr 450 g', fr: 'Skyr 450 g' }, q0: 1400, p0: 3.70 },
  { id: 'milk', cat: 'dairy', name: { en: 'Fresh milk 1 L', fr: 'Lait frais 1 L' }, q0: 6500, p0: 1.05 },
  { id: 'oatd', cat: 'plant', name: { en: 'Oat drink 1 L', fr: 'Boisson à l’avoine 1 L' }, q0: 3800, p0: 1.45 },
  { id: 'almd', cat: 'plant', name: { en: 'Almond drink 1 L', fr: 'Boisson aux amandes 1 L' }, q0: 900, p0: 2.30 },
  { id: 'oaty', cat: 'plant', name: { en: 'Oat yogurt 4 × 115 g', fr: 'Spécialité d’avoine 4 × 115 g' }, q0: 700, p0: 4.10 },
  { id: 'soyd', cat: 'plant', name: { en: 'Soy dessert 4 × 125 g', fr: 'Dessert au soja 4 × 125 g' }, q0: 500, p0: 3.20 }
];
/* Changes against the prior year, in per cent: dv on volume, dp on net price per kilo. */
const z = () => Object.fromEntries(SKUS.map(s => [s.id, { dv: 0, dp: 0 }]));
const set = (o) => { const a = z(); for (const [k, v] of Object.entries(o)) a[k] = { dv: v[0], dp: v[1] }; return a; };
export const PRESETS = {
  year: { name: { en: 'A typical year', fr: 'Une année type' }, adj: set({ nat: [-2, 4], fruit: [-4, 5], skyr: [12, 2], milk: [-6, 3], oatd: [14, -3], almd: [-8, 0], oaty: [25, 1], soyd: [-10, 2] }) },
  price: { name: { en: 'Price-led year', fr: 'Année tirée par les prix' }, adj: set({ nat: [-6, 8], fruit: [-7, 9], skyr: [-3, 7], milk: [-8, 8], oatd: [-2, 4], almd: [-4, 5], oaty: [0, 4], soyd: [-3, 4] }) },
  shift: { name: { en: 'Shift to plant-based', fr: 'Bascule vers le végétal' }, adj: set({ nat: [-8, 0], fruit: [-8, 0], skyr: [-8, 0], milk: [-8, 0], oatd: [30, 0], almd: [30, 0], oaty: [30, 0], soyd: [30, 0] }) },
  premium: { name: { en: 'Premiumisation', fr: 'Montée en gamme' }, adj: set({ skyr: [30, 0], oaty: [30, 0], milk: [-10, 0], nat: [-3, 0] }) },
  flat: { name: { en: 'Flat: start from zero', fr: 'À plat : partir de zéro' }, adj: z() }
};
export const PRESET_KEYS = Object.keys(PRESETS);
export const blankAdj = z;
