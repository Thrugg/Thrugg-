/* Forge — benchmark packs and the activity catalogue.
   Every number here comes from a source listed in SOURCES. Values marked `modelled` or `est`
   are derived by Forge from those sources; the method is described in MAINTAINING-forge.md. */

export const DATA_VERSION = '2026.11';

export const SOURCES = {
  sl: { name: 'Strength Level standards (1RM, by bodyweight)', url: 'https://strengthlevel.com/strength-standards', pop: { en: 'Lifters who log lifts on Strength Level (self-selected gym-goers)', fr: 'Pratiquants qui enregistrent leurs charges sur Strength Level (public de salle)' }, date: '03/2026', conf: 'medium' },
  c2: { name: 'Concept2 Online Ranking, 2024 season (RowErg)', url: 'https://log.concept2.com/rankings', pop: { en: 'People who rank RowErg results, all ages and weights', fr: 'Utilisateurs classés sur RowErg, tous âges et poids' }, date: '2024', conf: 'medium' },
  c2m: { name: 'Concept2 2024, Forge model between 100 m and 500 m', url: 'https://log.concept2.com/rankings', pop: { en: 'Interpolated per percentile on a log-log curve between the 100 m and 500 m rankings', fr: 'Interpolé par percentile sur une courbe log-log entre les classements 100 m et 500 m' }, date: '2024', conf: 'low' },
  friend: { name: 'FRIEND registry 2022 (Kaminsky et al., Mayo Clin Proc 97:285), treadmill, peak RER ≥ 1.10', url: 'https://pubmed.ncbi.nlm.nih.gov/34809986/', pop: { en: 'Apparently healthy US adults with a measured VO₂max test', fr: 'Adultes américains en bonne santé apparente, VO₂max mesurée' }, date: '2022', conf: 'high' },
  nhanes: { name: 'NHANES 1999–2004 whole-body DXA (Hologic), pooled US adults, n = 13,091', url: 'https://fitnessnorms.pages.dev/body-composition/body-fat/', pop: { en: 'US adults 20+, all ethnic groups', fr: 'Adultes américains de 20 ans et plus, toutes origines' }, date: '1999–2004', conf: 'high' },
  ffa: { name: 'FFA performance grid (table des cotations), levels D7 to IA', url: 'https://www.lifa-athle.fr/storage/uploads/ab1b664b-7a40-43f2-9882-71b01404a908/livret-corrig%C3%A9-v2.pdf', pop: { en: 'Licensed club athletes in France, from département level to international. Official times; which level starts which Forge tier is Forge’s choice.', fr: 'Athlètes licenciés en France, du niveau départemental à l’international. Temps officiels ; la correspondance niveau → palier Forge est un choix de Forge.' }, date: '2025', conf: 'medium' },
  wma: { name: 'World Masters Athletics 2023 age factors (one-year factors, in force since 1 January 2023)', url: 'https://world-masters-athletics.org/wp-content/uploads/2023/02/2023-Age-Factors-WMA.pdf', pop: { en: 'Turns a sprint time at any age from 30 to 90 into its open-class equivalent', fr: 'Convertit un temps de sprint, de 30 à 90 ans, en équivalent toutes catégories' }, date: '2023', conf: 'high' },
  gl: { name: 'IPF GL points (Goodlift formula, classic lifting)', url: 'https://www.powerlifting.sport/fileadmin/ipf/data/ipf-formula/Models_Evaluation-I-2020.pdf', pop: { en: 'The powerlifting federation’s bodyweight-adjusted score, fitted on competition results: lets lifters of different sizes and sexes compare', fr: 'Le score de la fédération de force athlétique, ajusté au poids de corps et calé sur les résultats de compétition : permet de comparer des gabarits et des sexes différents' }, date: '2020', conf: 'high' },
  walk: { name: 'Ludlow & Weyand 2016, J Appl Physiol 120:481 (walking cost from height, weight and speed)', url: 'https://journals.physiology.org/doi/pdf/10.1152/japplphysiol.00864.2015', date: '2016', conf: 'medium' },
  reds: { name: 'IOC consensus statement on Relative Energy Deficiency in Sport (Mountjoy et al., BJSM 2023)', url: 'https://stillmed.olympics.com/media/Documents/Athletes/Medical-Scientific/Consensus-Statements/REDs/BJSM-IOC-consensus-statement-on-Relative-Energy-Deficiency-in-Sport-REDs.pdf', date: '2023', conf: 'high' },
  dodds: { name: 'Dodds et al. 2014, PLoS ONE 9(12):e113637 (grip strength across the life course)', url: 'https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0113637', pop: { en: '49,964 people in 12 British studies; best of all trials', fr: '49 964 personnes dans 12 études britanniques ; meilleur de tous les essais' }, date: '2014', conf: 'high' },
  mandsager: { name: 'Mandsager et al. 2018, JAMA Netw Open 1(6):e183605 (fitness and long-term mortality)', url: 'https://jamanetwork.com/journals/jamanetworkopen/articlepdf/2707428/mandsager_2018_oi_180168.pdf', pop: { en: '122,007 adults with a treadmill test, 1.1 million person-years of follow-up', fr: '122 007 adultes avec test sur tapis, 1,1 million d’années-personnes de suivi' }, date: '2018', conf: 'high' },
  araujo: { name: 'Araujo et al. 2022, Br J Sports Med 56:975 (10-second one-leg stance and survival)', url: 'https://pubmed.ncbi.nlm.nih.gov/35728834/', pop: { en: '1,702 adults aged 51–75, median follow-up 7 years', fr: '1 702 adultes de 51 à 75 ans, suivi médian de 7 ans' }, date: '2022', conf: 'medium' },
  compendium: { name: '2024 Adult Compendium of Physical Activities (Herrmann et al.)', url: 'https://pacompendium.com/adult-compendium/', date: '2024', conf: 'high' },
  slr: { name: 'Strength Level bodyweight standards (max reps, by bodyweight)', url: 'https://strengthlevel.com/strength-standards/pull-ups', pop: { en: 'People who log reps on Strength Level (self-selected gym-goers)', fr: 'Pratiquants qui enregistrent leurs répétitions sur Strength Level (public de salle)' }, date: '03/2026', conf: 'medium' },
  c2x: { name: 'Concept2 Online Ranking, 2024 season (BikeErg 1,000 m, SkiErg 500 m)', url: 'https://log.concept2.com/rankings', pop: { en: 'People who rank results on that machine; small samples for women (n ≈ 140)', fr: 'Utilisateurs classés sur cette machine ; petits effectifs chez les femmes (n ≈ 140)' }, date: '2024', conf: 'low' },
  chms: { name: 'Canadian Health Measures Survey cycle 5, 2016–17 (Statistics Canada, Health Reports 30(10), 2019)', url: 'https://www150.statcan.gc.ca/n1/pub/82-003-x/2019010/article/00002/tbl/tbl04-eng.htm', pop: { en: 'Nationally representative Canadians, survey-weighted; countermovement jump with arm swing on a force plate', fr: 'Échantillon national représentatif (Canada), pondéré ; saut avec contre-mouvement et bras, sur plateforme de force' }, date: '2016–17', conf: 'high' },
  vdot: { name: 'Race time → VO₂max equivalent (Daniels & Gilbert VDOT), ranked on FRIEND 2022', url: 'https://pubmed.ncbi.nlm.nih.gov/34809986/', pop: { en: 'Your race time converted to the VO₂max it usually takes, then compared with measured VO₂max of adults your age', fr: 'Ton temps converti en VO₂max habituellement nécessaire, puis comparé aux VO₂max mesurées des adultes de ton âge' }, date: '2022', conf: 'medium' },
  kouri: { name: 'Kouri et al. 1995, Clin J Sport Med 5:223–228 (FFMI of drug-free vs steroid-using athletes)', date: '1995', conf: 'medium' }
};

/* Strength Level 1RM standards in kg. Columns: Beginner, Novice, Intermediate, Advanced, Elite
   = stronger than 5 / 20 / 50 / 80 / 95 % of lifters. Rows by bodyweight (men 50–140, women 40–120, step 5). */
const SL_M_BW = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140];
const SL_F_BW = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120];
export const STRENGTH = {
  bench: {
    m: { bw: SL_M_BW, rows: [[27,41,58,78,101],[32,47,65,87,110],[37,53,72,95,119],[42,59,79,102,128],[47,64,85,110,136],[51,70,92,117,144],[56,75,98,124,151],[60,80,104,130,158],[65,85,109,137,165],[69,90,115,143,172],[73,95,120,149,179],[77,99,125,155,185],[81,104,131,160,191],[85,108,135,166,197],[89,113,140,171,203],[93,117,145,176,209],[97,121,150,181,214],[100,125,154,186,220],[104,129,158,191,225]] },
    f: { bw: SL_F_BW, rows: [[10,19,33,49,68],[12,22,36,54,74],[14,25,40,58,79],[17,28,44,62,84],[19,31,47,66,88],[21,33,50,70,92],[22,36,53,74,96],[24,38,56,77,100],[26,40,59,80,104],[28,43,61,83,107],[30,45,64,86,111],[31,47,66,89,114],[33,49,69,92,117],[35,51,71,94,120],[36,53,73,97,123],[38,54,75,99,126],[39,56,77,102,128]] }
  },
  squat: {
    m: { bw: SL_M_BW, rows: [[36,55,78,106,137],[43,63,88,118,150],[49,71,98,129,162],[56,79,107,139,174],[62,86,116,149,185],[69,94,124,159,196],[75,101,132,168,206],[81,108,140,177,216],[87,115,148,186,226],[93,121,156,194,235],[98,128,163,203,244],[104,134,170,211,253],[109,140,177,218,261],[115,147,184,226,270],[120,152,191,233,278],[125,158,197,240,285],[130,164,203,247,293],[135,169,209,254,300],[140,175,215,261,307]] },
    f: { bw: SL_F_BW, rows: [[19,34,53,76,102],[23,38,58,82,110],[26,42,63,88,116],[29,46,68,94,123],[32,49,72,99,129],[35,53,76,104,134],[37,56,80,109,140],[40,59,84,113,145],[42,62,88,117,149],[45,65,91,121,154],[47,68,94,125,158],[49,71,98,129,162],[52,74,101,132,166],[54,76,104,136,170],[56,79,107,139,174],[58,81,109,142,177],[60,83,112,145,181]] }
  },
  deadlift: {
    m: { bw: SL_M_BW, rows: [[46,68,96,129,164],[54,77,107,141,178],[61,86,117,153,191],[68,95,127,164,204],[75,103,137,175,216],[82,111,146,186,228],[89,119,155,196,239],[96,127,164,205,250],[102,134,172,215,260],[108,141,180,224,270],[114,148,188,232,279],[120,155,195,241,289],[126,161,203,249,298],[132,168,210,257,306],[137,174,217,265,315],[143,180,224,272,323],[148,186,231,280,331],[153,192,237,287,339],[159,198,243,294,346]] },
    f: { bw: SL_F_BW, rows: [[26,43,65,92,121],[30,48,71,99,129],[34,52,76,105,136],[37,56,81,111,143],[40,60,86,116,149],[43,64,90,121,155],[46,68,95,126,160],[49,71,99,131,166],[52,74,102,135,170],[54,77,106,139,175],[57,80,109,143,180],[59,83,113,147,184],[61,86,116,151,188],[64,89,119,154,192],[66,91,122,158,196],[68,94,125,161,200],[70,96,128,164,203]] }
  },
  ohp: {
    m: { bw: SL_M_BW, rows: [[15,24,36,51,67],[18,28,41,56,73],[21,32,45,62,79],[24,35,50,67,85],[27,39,54,72,90],[30,43,58,76,96],[33,46,62,81,101],[36,49,66,85,106],[38,53,70,90,111],[41,56,74,94,115],[44,59,77,98,120],[47,62,81,102,124],[49,65,84,105,128],[52,68,87,109,132],[54,71,90,113,136],[56,73,94,116,140],[59,76,97,119,144],[61,79,100,123,147],[63,81,102,126,151]] },
    f: { bw: SL_F_BW, rows: [[7,13,22,33,45],[9,15,24,36,48],[10,17,27,38,51],[11,19,29,41,54],[12,20,31,43,57],[14,22,32,45,59],[15,23,34,47,62],[16,25,36,49,64],[17,26,37,51,66],[18,27,39,53,68],[19,28,40,54,70],[20,30,42,56,72],[21,31,43,58,74],[22,32,45,59,75],[23,33,46,61,77],[24,34,47,62,79],[24,35,48,64,80]] }
  }
};
export const SL_P = [0.05, 0.20, 0.50, 0.80, 0.95];

/* Concept2 2024 RowErg rankings: time (s) at the 25th/50th/75th/90th percentile
   (percentile = share of ranked people who are slower), n ranked, #1 time. */
export const C2 = {
  100: { m: { n: 2377, t: { 0.25: 19.2, 0.5: 17.7, 0.75: 16.5, 0.9: 15.5 }, top: 12.5 }, f: { n: 581, t: { 0.25: 24.1, 0.5: 21.7, 0.75: 19.9, 0.9: 18.5 }, top: 14.7 } },
  500: { m: { n: 4815, t: { 0.25: 112.3, 0.5: 101.8, 0.75: 94.0, 0.9: 88.0 }, top: 69.8 }, f: { n: 1257, t: { 0.25: 136.6, 0.5: 120.4, 0.75: 110.4, 0.9: 103.2 }, top: 87.0 } }
};

/* FRIEND 2022 treadmill VO2peak (ml/kg/min), peak RER ≥ 1.10: 5th, 25th, 50th, 75th, 95th percentile by decade. */
export const FRIEND_P = [0.05, 0.25, 0.50, 0.75, 0.95];
export const FRIEND = {
  m: { 20: [24.8, 37.3, 45.4, 52.6, 62.1], 30: [20.6, 31.3, 38.6, 46.5, 57.9], 40: [19.7, 28.4, 34.8, 41.8, 53.2], 50: [16.5, 23.9, 29.4, 35.5, 46.8], 60: [13.8, 19.7, 24.4, 29.9, 40.2], 70: [11.6, 16.8, 20.6, 25.0, 35.2], 80: [12.2, 15.9, 17.7, 20.9, 25.6] },
  f: { 20: [19.3, 28.6, 35.6, 42.2, 50.1], 30: [16.6, 23.1, 28.3, 34.5, 45.5], 40: [15.3, 21.3, 25.9, 30.9, 40.7], 50: [14.5, 19.5, 23.1, 27.3, 35.3], 60: [12.0, 16.4, 19.4, 23.1, 29.7], 70: [11.3, 14.8, 17.1, 20.0, 24.2], 80: [10.7, 12.8, 15.1, 17.2, 20.7] }
};

/* Strength Level max-rep standards (bodyweight converted from lb). Columns Beginner…Elite = 5/20/50/80/95 % of lifters.
   "< 1" stored as 0.5. */
const LB = x => Math.round(x * 0.45359237 * 10) / 10;
const SLR_M_BW = [110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310].map(LB);
const SLR_F_BW = [90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260].map(LB);
export const REPS = {
  pullups: {
    m: { bw: SLR_M_BW, rows: [[0.5,6,14,24,34],[0.5,7,14,24,34],[0.5,7,14,23,33],[0.5,7,14,23,32],[0.5,7,14,22,31],[0.5,7,14,22,30],[0.5,7,13,21,29],[1,7,13,21,28],[1,7,13,20,28],[1,7,12,19,27],[1,7,12,19,26],[0.5,6,11,18,25],[0.5,6,11,18,24],[0.5,6,11,17,24],[0.5,6,10,16,23],[0.5,5,10,16,22],[0.5,5,10,15,21],[0.5,5,9,15,21],[0.5,5,9,14,20],[0.5,4,9,14,19],[0.5,4,9,13,19]] },
    f: { bw: SLR_F_BW, rows: [[0.5,0.5,6,14,23],[0.5,0.5,6,13,22],[0.5,0.5,6,13,22],[0.5,0.5,6,13,21],[0.5,0.5,6,12,20],[0.5,0.5,6,12,19],[0.5,0.5,6,11,18],[0.5,0.5,5,11,17],[0.5,0.5,5,10,16],[0.5,0.5,5,10,16],[0.5,0.5,4,9,15],[0.5,0.5,4,9,14],[0.5,0.5,3,8,13],[0.5,0.5,3,8,13],[0.5,0.5,3,8,12],[0.5,0.5,2,7,11],[0.5,0.5,2,7,11],[0.5,0.5,1,6,10]] }
  },
  pushups: {
    m: { bw: SLR_M_BW, rows: [[0.5,18,42,70,102],[2,19,42,69,99],[3,19,41,67,96],[4,20,41,66,93],[5,20,40,64,91],[5,20,40,63,88],[6,20,39,61,85],[6,20,38,60,83],[6,20,37,58,81],[6,19,37,57,78],[6,19,36,55,76],[6,19,35,54,74],[6,18,34,53,73],[6,18,34,52,71],[6,18,33,50,69],[6,17,32,49,67],[6,17,32,48,66],[6,17,31,47,64],[6,16,30,46,63],[6,16,30,45,61],[6,16,29,44,60]] },
    f: { bw: SLR_F_BW, rows: [[0.5,5,19,36,55],[0.5,6,19,35,53],[0.5,7,19,34,51],[0.5,7,19,33,49],[0.5,7,18,32,48],[0.5,7,18,31,46],[0.5,7,17,30,44],[0.5,7,17,29,43],[0.5,7,16,28,41],[0.5,7,16,27,40],[0.5,6,15,26,38],[0.5,6,15,25,37],[0.5,6,14,25,36],[0.5,6,14,24,34],[0.5,5,13,23,33],[0.5,5,12,22,32],[0.5,5,12,21,31],[0.5,5,11,21,30]] }
  }
};

/* Concept2 2024 BikeErg 1,000 m and SkiErg 500 m: time (s) at the 25/50/75/90th percentile. */
export const ERG = {
  bike1000: { m: { n: 492, t: { 0.25: 111.0, 0.5: 100.5, 0.75: 93.1, 0.9: 87.0 }, top: 74.7 }, f: { n: 146, t: { 0.25: 134.3, 0.5: 118.4, 0.75: 106.6, 0.9: 101.0 }, top: 92.5 } },
  ski500: { m: { n: 615, t: { 0.25: 119.0, 0.5: 107.3, 0.75: 98.0, 0.9: 90.3 }, top: 69.4 }, f: { n: 135, t: { 0.25: 150.6, 0.5: 133.9, 0.75: 118.6, 0.9: 111.5 }, top: 95.2 } }
};

/* CHMS cycle 5 countermovement jump height (cm), survey-weighted GAMLSS percentiles by age band (key = band start). */
export const VJ_P = [0.05, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 0.95];
export const VJ = {
  m: { 18: [32.6,36.3,40.7,43.8,46.3,48.7,51.0,53.5,56.3,60.1,63.2], 20: [32.6,36.6,41.2,44.3,47.0,49.4,51.7,54.1,56.9,60.7,63.8], 25: [31.5,35.5,40.0,43.1,45.7,48.0,50.3,52.6,55.3,59.0,61.9], 30: [30.1,33.9,38.2,41.1,43.6,45.8,47.9,50.2,52.8,56.3,59.1], 35: [28.8,32.3,36.3,39.1,41.4,43.5,45.5,47.7,50.2,53.5,56.2], 40: [27.5,30.7,34.4,37.0,39.1,41.1,43.1,45.1,47.5,50.7,53.3], 45: [26.2,29.1,32.5,34.9,36.9,38.8,40.6,42.6,44.9,48.0,50.5], 50: [24.8,27.4,30.6,32.8,34.7,36.4,38.2,40.0,42.2,45.1,47.6], 55: [23.4,25.7,28.5,30.6,32.3,33.9,35.6,37.3,39.3,42.2,44.5], 60: [21.7,23.8,26.4,28.2,29.8,31.3,32.8,34.4,36.3,39.0,41.2], 65: [19.9,21.7,24.0,25.7,27.1,28.5,29.8,31.3,33.1,35.5,37.6] },
  f: { 18: [23.6,25.6,28.0,29.8,31.3,32.8,34.2,35.8,37.6,40.2,42.4], 20: [22.8,24.7,27.1,28.9,30.4,31.8,33.3,34.8,36.7,39.3,41.4], 25: [22.2,24.1,26.5,28.3,29.9,31.3,32.8,34.3,36.2,38.8,41.0], 30: [21.7,23.6,26.1,27.9,29.4,30.9,32.3,33.9,35.8,38.5,40.7], 35: [21.0,22.9,25.4,27.2,28.7,30.2,31.6,33.2,35.1,37.8,40.0], 40: [20.1,22.0,24.4,26.1,27.7,29.1,30.5,32.1,34.0,36.6,38.7], 45: [19.0,20.8,23.1,24.8,26.3,27.7,29.1,30.6,32.4,34.9,37.0], 50: [17.7,19.5,21.7,23.3,24.7,26.1,27.4,28.8,30.5,32.9,34.9], 55: [16.4,18.1,20.2,21.8,23.1,24.4,25.6,27.0,28.6,30.9,32.7], 60: [15.2,16.8,18.8,20.2,21.5,22.7,23.9,25.2,26.7,28.8,30.6], 65: [14.1,15.6,17.4,18.8,20.0,21.1,22.2,23.4,24.9,26.9,28.5] }
};

/* NHANES 1999–2004 DXA % body fat: 5th, 25th, 50th, 75th, 95th percentile by 5-year band (key = band start). */
export const BF_P = [0.05, 0.25, 0.50, 0.75, 0.95];
export const BF_NHANES = {
  m: { 20: [14.3, 19.0, 23.8, 29.5, 37.7], 25: [16.1, 22.2, 26.4, 30.4, 37.6], 30: [16.4, 21.6, 26.6, 30.1, 36.6], 35: [17.5, 22.9, 26.7, 31.0, 37.5], 40: [18.9, 24.8, 27.9, 31.8, 37.2], 45: [19.3, 24.7, 27.8, 31.5, 37.2], 50: [19.5, 25.8, 29.4, 32.7, 38.2], 55: [20.6, 26.7, 30.0, 33.2, 38.3], 60: [21.8, 26.7, 30.2, 34.3, 39.0], 65: [22.4, 27.6, 31.0, 34.8, 40.0], 70: [21.7, 27.3, 30.9, 34.5, 40.8], 75: [23.5, 27.8, 31.2, 34.7, 39.1], 80: [22.9, 27.5, 31.1, 33.9, 39.1], 85: [21.0, 26.9, 30.3, 34.0, 38.3] },
  f: { 20: [24.8, 31.5, 36.4, 42.0, 49.5], 25: [25.1, 32.7, 37.8, 42.4, 48.7], 30: [25.8, 33.0, 38.5, 43.5, 49.9], 35: [27.2, 33.9, 39.1, 43.7, 50.5], 40: [27.0, 34.9, 39.8, 43.6, 50.0], 45: [27.8, 35.9, 40.8, 45.3, 50.5], 50: [30.1, 37.2, 41.4, 45.3, 50.4], 55: [31.8, 38.4, 43.2, 46.7, 52.3], 60: [33.4, 38.8, 42.8, 46.6, 50.6], 65: [32.6, 39.5, 43.2, 46.4, 51.4], 70: [31.3, 38.8, 42.9, 46.4, 50.9], 75: [31.1, 39.2, 42.8, 45.6, 50.1], 80: [29.5, 37.0, 41.4, 44.9, 49.2], 85: [30.4, 37.0, 40.7, 43.9, 48.6] }
};

/* Sprints: the French federation's performance grid ("table des cotations", FFA; as printed in the Ligue
   Île-de-France 2025 rulebook), times in seconds from the lowest scoring level (D7) up to International A.
   Electronic timing. Hand timing adds 0.24 s (0.14 s for 400 m). */
export const FFA_LEVELS = ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'R6', 'R5', 'R4', 'R3', 'R2', 'R1', 'IR4', 'IR3', 'IR2', 'IR1', 'N4', 'N3', 'N2', 'N1', 'IB', 'IA'];
export const FFA = {
  m: {
    60: [9.04, 8.84, 8.64, 8.54, 8.44, 8.34, 8.24, 8.14, 8.04, 7.94, 7.84, 7.74, 7.64, 7.54, 7.44, 7.34, 7.24, 7.14, 6.94, 6.84, 6.74, 6.66, 6.56],
    100: [14.14, 13.74, 13.44, 13.14, 12.94, 12.74, 12.54, 12.44, 12.34, 12.24, 12.14, 11.94, 11.74, 11.54, 11.44, 11.34, 11.14, 10.94, 10.84, 10.64, 10.34, 10.20, 10.10],
    200: [29.04, 28.24, 27.44, 26.94, 26.54, 26.14, 25.74, 25.44, 25.14, 24.84, 24.54, 24.14, 23.74, 23.44, 23.14, 22.84, 22.54, 22.24, 21.84, 21.44, 20.94, 20.64, 20.44],
    400: [66.44, 65.44, 64.44, 63.44, 62.44, 61.44, 60.44, 59.44, 58.44, 57.44, 56.44, 55.44, 54.44, 53.44, 52.44, 51.44, 50.44, 49.64, 48.64, 47.64, 46.64, 45.84, 45.24]
  },
  f: {
    60: [10.14, 9.94, 9.74, 9.64, 9.44, 9.34, 9.24, 9.14, 9.04, 8.94, 8.74, 8.64, 8.44, 8.34, 8.24, 8.14, 8.04, 7.94, 7.84, 7.64, 7.44, 7.34, 7.24],
    100: [16.94, 16.54, 16.14, 15.74, 15.34, 14.94, 14.54, 14.24, 14.04, 13.84, 13.64, 13.44, 13.24, 13.04, 12.84, 12.64, 12.44, 12.24, 12.04, 11.84, 11.54, 11.34, 11.14],
    200: [34.24, 33.74, 33.24, 32.74, 32.14, 31.54, 30.94, 30.34, 29.74, 29.24, 28.74, 28.24, 27.74, 27.24, 26.74, 26.24, 25.74, 25.24, 24.74, 24.24, 23.74, 23.14, 22.74],
    400: [80.54, 78.24, 76.84, 75.54, 74.44, 73.14, 71.84, 70.54, 69.24, 67.94, 66.64, 65.34, 64.04, 62.74, 61.74, 60.74, 59.14, 57.64, 56.04, 54.74, 53.44, 52.04, 51.24]
  }
};
/* Index in FFA_LEVELS of the first level of each Forge tier above Hobbit:
   Gaulish Villager from D7, Legionary from D4, Viking from R6, Spartan from IR4, Saiyan from N4, Viltrumite at IB, Olympian God at IA. */
export const FFA_TIER_START = [0, 3, 7, 13, 17, 21, 22];

/* World Masters Athletics 2023 one-year age factors, ages 30–90 (index 0 = age 30).
   Open-equivalent time = time × factor. Below 30 the factor is 1. */
export const WMA = {
  m: {
    60: [1, 1, 1, 1, 1, .9991, .9946, .9901, .9855, .9809, .9763, .9716, .9669, .9622, .9574, .9526, .9478, .9429, .9380, .9331, .9281, .9232, .9181, .9131, .9080, .9029, .8978, .8926, .8874, .8822, .8769, .8716, .8663, .8610, .8556, .8502, .8448, .8393, .8338, .8283, .8228, .8172, .8116, .8060, .8003, .7946, .7889, .7832, .7774, .7716, .7658, .7593, .7521, .7442, .7357, .7264, .7164, .7058, .6944, .6824, .6696],
    100: [1, 1, 1, 1, 1, .9999, .9932, .9866, .9799, .9733, .9668, .9602, .9537, .9473, .9409, .9345, .9281, .9218, .9155, .9093, .9031, .8969, .8908, .8847, .8786, .8726, .8666, .8606, .8546, .8487, .8429, .8370, .8312, .8254, .8197, .8139, .8083, .8026, .7970, .7914, .7858, .7803, .7748, .7693, .7638, .7584, .7530, .7477, .7423, .7370, .7317, .7257, .7190, .7116, .7035, .6946, .6850, .6747, .6637, .6520, .6396],
    200: [1, 1, .9981, .9917, .9854, .9791, .9729, .9667, .9605, .9543, .9482, .9421, .9360, .9299, .9239, .9179, .9120, .9060, .9001, .8942, .8883, .8825, .8767, .8709, .8652, .8594, .8537, .8480, .8424, .8368, .8312, .8256, .8200, .8145, .8090, .8035, .7980, .7926, .7872, .7818, .7764, .7711, .7658, .7605, .7552, .7500, .7447, .7388, .7322, .7249, .7170, .7083, .6990, .6890, .6783, .6669, .6549, .6421, .6287, .6146, .5998],
    400: [1, 1, 1, .9950, .9887, .9824, .9761, .9699, .9636, .9574, .9513, .9451, .9390, .9329, .9269, .9208, .9148, .9088, .9028, .8969, .8909, .8850, .8791, .8733, .8674, .8616, .8558, .8501, .8443, .8386, .8329, .8272, .8215, .8159, .8103, .8047, .7991, .7935, .7880, .7825, .7770, .7715, .7654, .7588, .7517, .7440, .7357, .7269, .7175, .7075, .6970, .6859, .6743, .6620, .6493, .6360, .6221, .6076, .5926, .5770, .5609]
  },
  f: {
    60: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, .9985, .9909, .9834, .9760, .9686, .9613, .9541, .9469, .9398, .9328, .9259, .9190, .9122, .9055, .8988, .8922, .8857, .8793, .8729, .8666, .8603, .8541, .8480, .8420, .8360, .8300, .8242, .8184, .8127, .8070, .8014, .7958, .7903, .7849, .7796, .7743, .7690, .7632, .7569, .7501, .7427, .7348, .7263, .7173, .7078, .6977, .6871, .6759, .6643, .6520, .6393],
    100: [1, 1, 1, 1, 1, 1, 1, 1, .9960, .9885, .9810, .9735, .9661, .9588, .9514, .9441, .9368, .9295, .9223, .9151, .9080, .9008, .8937, .8866, .8796, .8726, .8656, .8586, .8517, .8447, .8379, .8310, .8242, .8174, .8106, .8038, .7971, .7904, .7838, .7771, .7705, .7639, .7573, .7508, .7442, .7377, .7313, .7248, .7184, .7114, .7040, .6960, .6875, .6785, .6690, .6590, .6484, .6373, .6258, .6137, .6011],
    200: [1, 1, 1, 1, 1, 1, 1, 1, .9939, .9863, .9787, .9712, .9636, .9561, .9486, .9411, .9337, .9262, .9188, .9114, .9040, .8966, .8893, .8819, .8746, .8673, .8600, .8527, .8454, .8382, .8309, .8237, .8165, .8093, .8022, .7950, .7879, .7807, .7736, .7665, .7594, .7524, .7453, .7382, .7312, .7242, .7172, .7102, .7032, .6956, .6875, .6787, .6693, .6593, .6486, .6374, .6256, .6132, .6002, .5865, .5723],
    400: [1, 1, .9980, .9915, .9849, .9783, .9716, .9648, .9580, .9511, .9441, .9371, .9300, .9229, .9157, .9084, .9011, .8937, .8862, .8787, .8711, .8635, .8558, .8481, .8403, .8324, .8245, .8166, .8086, .8005, .7924, .7842, .7760, .7677, .7594, .7510, .7426, .7341, .7256, .7171, .7084, .6998, .6911, .6823, .6735, .6647, .6555, .6459, .6359, .6255, .6148, .6037, .5922, .5804, .5682, .5556, .5426, .5292, .5155, .5014, .4869]
  }
};
/* World Athletics combined-events scoring: points = a × (b − time)^1.81 (decathlon / heptathlon tables). */
export const WA_POINTS = { m: { 60: [58.015, 11.5], 100: [25.4347, 18], 200: [5.8425, 38], 400: [1.53775, 82] }, f: { 60: [46.0849, 13], 100: [17.857, 21], 200: [4.99087, 42.5], 400: [1.34285, 91.7] } };
export const SPRINT = { hand: { 60: 0.24, 100: 0.24, 200: 0.24, 400: 0.14 }, wr: { 60: { m: 6.34, f: 6.92 }, 100: { m: 9.58, f: 10.49 }, 200: { m: 19.19, f: 21.34 }, 400: { m: 43.03, f: 47.60 } } };

/* IPF GL ("Goodlift") points, classic lifting, in force since 1 May 2020: points = lifted × 100 / (A − B·e^(−C·bodyweight)). */
export const GL = { m: { total: [1199.72839, 1025.18162, 0.00921], bench: [320.98041, 281.40258, 0.01008] }, f: { total: [610.32796, 1045.59282, 0.03048], bench: [142.40398, 442.52671, 0.04724] } };

/* Grip strength, Dodds et al. 2014 (12 British studies, 49,964 people): young-adult peak mean and SD (kg, best of all trials),
   and the T-score cut-offs the authors propose for weak grip (−2 and −2.5 SD). */
export const GRIP = { m: { mean: 51.9, sd: 9.9, low: 32, weak: 27 }, f: { mean: 31.4, sd: 6.1, low: 19, weak: 16 } };

/* Tier ladder: lower bound of each tier as a percentile among people who do the event. */
export const TIER_P = [0.05, 0.20, 0.50, 0.80, 0.95, 0.99, 0.999];
export const TIERS = [
  { id: 'hobbit', color: '#8b9097' },
  { id: 'gaul', color: '#a0703f' },
  { id: 'legionary', color: '#3aa56a' },
  { id: 'viking', color: '#3b7fe0', f: 'shieldmaiden' },
  { id: 'spartan', color: '#9157dc', f: 'amazon' },
  { id: 'saiyan', color: '#e2b11c' },
  { id: 'viltrumite', color: '#e0443a' },
  { id: 'olympian', color: 'prism' }
];

/* Events ranked in the Arena. q = share of adults of that sex assumed to practise the event at a level
   comparable to the source population (Forge estimate, used only for the "all adults" range). */
export const EVENTS = {
  bench: { domain: 'strength', kind: 'lift', src: 'sl', q: { m: 0.12, f: 0.06 } },
  squat: { domain: 'strength', kind: 'lift', src: 'sl', q: { m: 0.12, f: 0.06 } },
  deadlift: { domain: 'strength', kind: 'lift', src: 'sl', q: { m: 0.12, f: 0.06 } },
  ohp: { domain: 'strength', kind: 'lift', src: 'sl', q: { m: 0.10, f: 0.05 } },
  sprint60: { domain: 'speed', kind: 'sprint', dist: 60, src: 'ffa', noPop: true, q: { m: 0.04, f: 0.03 } },
  sprint100: { domain: 'speed', kind: 'sprint', dist: 100, src: 'ffa', noPop: true, q: { m: 0.04, f: 0.03 } },
  sprint200: { domain: 'speed', kind: 'sprint', dist: 200, src: 'ffa', noPop: true, q: { m: 0.04, f: 0.03 } },
  sprint400: { domain: 'speed', kind: 'sprint', dist: 400, src: 'ffa', noPop: true, q: { m: 0.03, f: 0.02 } },
  row100: { domain: 'power', kind: 'row', dist: 100, src: 'c2', q: { m: 0.05, f: 0.04 } },
  row200: { domain: 'power', kind: 'row', dist: 200, src: 'c2m', q: { m: 0.05, f: 0.04 } },
  row250: { domain: 'power', kind: 'row', dist: 250, src: 'c2m', q: { m: 0.05, f: 0.04 } },
  row500: { domain: 'power', kind: 'row', dist: 500, src: 'c2', q: { m: 0.05, f: 0.04 } },
  row1min: { domain: 'power', kind: 'rowtime', secs: 60, src: 'c2m', q: { m: 0.05, f: 0.04 } },
  bike1000: { domain: 'power', kind: 'erg', src: 'c2x', q: { m: 0.03, f: 0.02 } },
  ski500: { domain: 'power', kind: 'erg', src: 'c2x', q: { m: 0.03, f: 0.02 } },
  vjump: { domain: 'explosive', kind: 'jump', src: 'chms', q: { m: 1, f: 1 } },
  pullups: { domain: 'upper', kind: 'reps', src: 'slr', q: { m: 0.10, f: 0.05 } },
  pushups: { domain: 'upper', kind: 'reps', src: 'slr', q: { m: 0.15, f: 0.10 } },
  vo2: { domain: 'aerobic', kind: 'vo2', src: 'friend', q: { m: 1, f: 1 } },
  run5k: { domain: 'aerobic', kind: 'race', dist: 5000, src: 'vdot', q: { m: 1, f: 1 } },
  run10k: { domain: 'aerobic', kind: 'race', dist: 10000, src: 'vdot', q: { m: 1, f: 1 } }
};
/* Performance domains on the radar (Leanness is a separate, secondary score). Aerobic events measure one quality,
   so that domain keeps the best result; the others average the best three. */
export const DOMAINS = ['strength', 'explosive', 'speed', 'power', 'aerobic', 'upper'];
export const DOMAIN_AGG = { aerobic: 'max' };

/* Occupation baseline METs for awake, non-exercise hours (Forge estimates on the Compendium scale). */
export const OCCUPATION = { desk: 1.3, mixed: 1.6, standing: 2.2, manual: 3.0 };

/* Activity catalogue. met = [light, moderate, vigorous, very hard] from the 2024 Adult Compendium
   (codes alongside). cadence = steps per minute counted by a watch during the session (Forge estimate,
   used to avoid double counting with daily steps). pace = net kcal per kg per km when a pace is given (ACSM). */
export const CATALOGUE = {
  strength: { en: 'Weight training', fr: 'Musculation', met: [3.5, 5.0, 6.0, 6.0], codes: ['02054', '02052', '02050', '02050'], cadence: 25, strength: true, lift: true, hk: ['TraditionalStrengthTraining'] },
  circuit: { en: 'Circuit / functional / CrossFit', fr: 'Circuit / fonctionnel / CrossFit', met: [3.5, 5.0, 6.0, 7.5], codes: ['02034', '02035', '02032', '02040'], cadence: 40, strength: true, hk: ['FunctionalStrengthTraining', 'CrossTraining'] },
  hiit: { en: 'HIIT', fr: 'HIIT', met: [5.0, 7.0, 8.8, 11.0], codes: ['02035', '02210', '01305', '02214'], cadence: 60, hk: ['HighIntensityIntervalTraining'] },
  calisthenics: { en: 'Calisthenics / core', fr: 'Callisthénie / gainage', met: [2.8, 3.8, 7.5, 7.5], codes: ['02024', '02022', '02020', '02020'], cadence: 15, strength: true, hk: ['CoreTraining'] },
  run: { en: 'Running', fr: 'Course à pied', met: [7.5, 9.3, 11.8, 14.8], codes: ['12020', '12050', '12080', '12120'], cadence: 165, pace: 1.0, hk: ['Running'] },
  sprint: { en: 'Sprint / track session', fr: 'Sprint / séance sur piste', met: [6.0, 8.0, 10.0, 10.0], codes: ['12010', '12150', '12180', '15734'], cadence: 90, interval: true, hk: ['TrackAndField'] },
  walk: { en: 'Brisk walk (as a workout)', fr: 'Marche rapide (séance)', met: [4.8, 4.8, 5.5, 5.5], codes: ['17200', '17200', '17220', '17220'], cadence: 115, hk: ['Walking'] },
  hike: { en: 'Hiking', fr: 'Randonnée', met: [3.8, 5.3, 6.0, 7.8], codes: ['17081', '17082', '17080', '17012'], cadence: 95, hk: ['Hiking'] },
  cycle: { en: 'Cycling (outdoor)', fr: 'Vélo (extérieur)', met: [6.8, 8.0, 10.0, 12.0], codes: ['01020', '01030', '01040', '01050'], cadence: 0, hk: ['Cycling'] },
  spin: { en: 'Indoor bike / spin', fr: 'Vélo d’intérieur / spinning', met: [5.0, 6.8, 9.0, 10.8], codes: ['01216', '01224', '01270', '01236'], cadence: 0, watts: [[60, 5.0, '01216'], [80, 5.8, '01218'], [100, 6.0, '01220'], [125, 6.8, '01224'], [150, 8.0, '01228'], [199, 10.3, '01232'], [229, 10.8, '01236'], [260, 12.5, '01240'], [305, 13.8, '01244'], [9999, 16.3, '01248']], hk: [] },
  row: { en: 'Rowing machine', fr: 'Rameur', met: [5.0, 7.5, 11.0, 14.0], codes: ['02071', '02072', '02073', '02074'], cadence: 0, watts: [[99, 5.0, '02071'], [149, 7.5, '02072'], [199, 11.0, '02073'], [9999, 14.0, '02074']], hk: ['Rowing'] },
  swim: { en: 'Swimming', fr: 'Natation', met: [5.3, 5.8, 8.0, 10.5], codes: ['18265', '18292', '18290', '18280'], cadence: 0, hk: ['Swimming'] },
  boxing: { en: 'Boxing (bag, pads)', fr: 'Boxe (sac, pattes d’ours)', met: [5.8, 7.0, 8.5, 10.8], codes: ['15110', '15113', '15115', '15118'], cadence: 70, hk: ['Boxing'] },
  sparring: { en: 'Boxing sparring', fr: 'Sparring de boxe', met: [7.8, 7.8, 7.8, 12.3], codes: ['15120', '15120', '15120', '15100'], cadence: 70, hk: [] },
  martial: { en: 'Martial arts / kickboxing', fr: 'Arts martiaux / kickboxing', met: [5.3, 7.3, 10.3, 11.3], codes: ['15425', '15457', '15430', '15433'], cadence: 40, hk: ['MartialArts', 'Kickboxing', 'TaiChi'] },
  grappling: { en: 'Wrestling / BJJ / judo', fr: 'Lutte / JJB / judo', met: [5.3, 6.0, 10.3, 11.3], codes: ['15425', '15730', '15430', '15433'], cadence: 0, hk: ['Wrestling'] },
  soccer: { en: 'Football (soccer)', fr: 'Football', met: [7.0, 7.0, 9.5, 9.5], codes: ['15610', '15610', '15605', '15605'], cadence: 90, hk: ['Soccer'] },
  basketball: { en: 'Basketball', fr: 'Basket-ball', met: [7.5, 7.5, 8.0, 8.0], codes: ['15055', '15055', '15040', '15040'], cadence: 80, hk: ['Basketball'] },
  volleyball: { en: 'Volleyball', fr: 'Volley-ball', met: [3.0, 4.0, 6.0, 8.0], codes: ['15720', '15710', '15711', '15725'], cadence: 40, hk: ['Volleyball'] },
  handball: { en: 'Handball', fr: 'Handball', met: [8.0, 8.0, 8.0, 12.0], codes: ['15330', '15330', '15330', '15320'], cadence: 80, hk: ['Handball'] },
  rugby: { en: 'Rugby', fr: 'Rugby', met: [6.3, 6.3, 8.3, 8.3], codes: ['15562', '15562', '15560', '15560'], cadence: 70, hk: ['Rugby', 'AustralianFootball'] },
  hockey: { en: 'Hockey (field / ice)', fr: 'Hockey (gazon / glace)', met: [7.8, 8.0, 10.0, 10.0], codes: ['15350', '15360', '15362', '15362'], cadence: 40, hk: ['Hockey'] },
  amfootball: { en: 'American football', fr: 'Football américain', met: [4.0, 8.0, 8.0, 8.0], codes: ['15232', '15230', '15210', '15210'], cadence: 60, hk: ['AmericanFootball'] },
  tennis: { en: 'Tennis', fr: 'Tennis', met: [6.0, 6.8, 8.0, 8.0], codes: ['15680', '15675', '15690', '15676'], cadence: 60, hk: ['Tennis'] },
  padel: { en: 'Padel / pickleball', fr: 'Padel / pickleball', met: [4.5, 6.0, 6.8, 6.8], codes: ['15685', '15680', '15675', '15675'], cadence: 50, proxy: true, hk: ['Pickleball'] },
  badminton: { en: 'Badminton', fr: 'Badminton', met: [5.5, 5.5, 7.0, 9.0], codes: ['15030', '15030', '15020', '15025'], cadence: 60, hk: ['Badminton'] },
  squash: { en: 'Squash', fr: 'Squash', met: [7.3, 7.3, 12.0, 12.0], codes: ['15652', '15652', '15650', '15650'], cadence: 70, hk: ['Squash', 'Racquetball'] },
  tabletennis: { en: 'Table tennis', fr: 'Tennis de table', met: [4.0, 4.0, 4.0, 4.0], codes: ['15660', '15660', '15660', '15660'], cadence: 20, hk: ['TableTennis'] },
  climbing: { en: 'Climbing / bouldering', fr: 'Escalade / bloc', met: [5.8, 7.3, 8.0, 8.8], codes: ['15537', '15535', '15533', '15534'], cadence: 10, hk: ['Climbing'] },
  elliptical: { en: 'Elliptical', fr: 'Vélo elliptique', met: [5.0, 5.0, 9.0, 9.0], codes: ['02048', '02048', '02049', '02049'], cadence: 0, hk: ['Elliptical'] },
  stairs: { en: 'Stair climber', fr: 'Stepper / escalier', met: [4.5, 6.8, 9.3, 9.3], codes: ['17133', '17131', '02065', '17134'], cadence: 70, hk: ['StairClimbing', 'Stairs', 'StepTraining'] },
  jumprope: { en: 'Jump rope', fr: 'Corde à sauter', met: [9.0, 9.0, 11.0, 11.0], codes: ['02069', '02069', '02068', '02068'], cadence: 0, hk: ['JumpRope'] },
  yoga: { en: 'Yoga', fr: 'Yoga', met: [2.3, 2.7, 4.0, 4.0], codes: ['02150', '02185', '02160', '02160'], cadence: 0, hk: ['Yoga', 'MindAndBody'] },
  pilates: { en: 'Pilates', fr: 'Pilates', met: [1.8, 2.8, 2.8, 2.8], codes: ['02103', '02105', '02105', '02105'], cadence: 0, hk: ['Pilates', 'Barre'] },
  mobility: { en: 'Stretching / mobility', fr: 'Étirements / mobilité', met: [2.3, 2.3, 2.3, 2.3], codes: ['02101', '02101', '02101', '02101'], cadence: 0, hk: ['Flexibility', 'PreparationAndRecovery', 'Cooldown'] },
  ski: { en: 'Downhill ski / snowboard', fr: 'Ski alpin / snowboard', met: [4.3, 6.3, 8.0, 8.0], codes: ['19150', '19160', '19170', '19170'], cadence: 0, hk: ['DownhillSkiing', 'Snowboarding', 'SnowSports'] },
  xcski: { en: 'Cross-country skiing', fr: 'Ski de fond', met: [6.8, 8.5, 11.3, 14.0], codes: ['19080', '19090', '19100', '19110'], cadence: 0, hk: ['CrossCountrySkiing'] },
  skating: { en: 'Ice skating', fr: 'Patinage', met: [5.5, 7.0, 9.0, 9.0], codes: ['19020', '19030', '19040', '19040'], cadence: 0, hk: ['SkatingSports'] },
  paddle: { en: 'Kayak / canoe / SUP', fr: 'Kayak / canoë / paddle', met: [3.5, 5.0, 6.5, 12.5], codes: ['18070', '18100', '18224', '18060'], cadence: 0, hk: ['PaddleSports'] },
  golf: { en: 'Golf (walking)', fr: 'Golf (à pied)', met: [4.3, 4.3, 4.3, 4.3], codes: ['15265', '15265', '15265', '15265'], cadence: 70, hk: ['Golf'] },
  other: { en: 'Other activity', fr: 'Autre activité', met: [2.5, 4.5, 7.0, 9.0], codes: ['class', 'class', 'class', 'class'], cadence: 0, generic: true, hk: [] }
};
export const INTENSITIES = ['light', 'moderate', 'vigorous', 'very'];

/* Map of Apple Health workout names (without the HKWorkoutActivityType prefix) to catalogue ids. */
export const HK_MAP = (() => { const m = {}; for (const [id, c] of Object.entries(CATALOGUE)) for (const h of c.hk) m[h] = id; m.MixedCardio = 'other'; m.Other = 'other'; return m; })();

export const HELPLINES = {
  de: { name: 'BIÖG Beratungstelefon Essstörungen', phone: '0221 892031', hours: 'Mo–Do 10–22, Fr–So 10–18', url: 'https://essstoerungen.bioeg.de' },
  fr: { name: 'Anorexie Boulimie Info Écoute (FFAB)', url: 'https://www.ffab.fr' }
};
