/* Seuil — country rule packs.
   A pack gives the cost structure of owning in one country: what you pay to buy, to hold and to sell, and how the
   owner and the saver are taxed. Every figure is a starting value the person can change per location.
   Checked once a year (see MAINTAINING.md). All percentages are of the price or value unless said otherwise. */
export const PACKS_ASOF = '2026-11-14';

/* fields
   cur         currency of the amounts
   transfer    tax on the purchase, % of price (regions override it)
   notary      notary, land register and deed costs, % of price
   agentBuy    buyer's share of the agent, % of price (0 when bought direct)
   loanFee     cost of setting up the mortgage, % of the loan
   propTax     recurring property taxes, % of value per year
   upkeep      maintenance, renewal reserve and owner-only running costs, % of value per year
   ownerTax    other yearly tax effect of owning, % of value (positive = cost)
   relief      share of mortgage interest given back through income tax, %
   sell        cost of selling (agent, fees), % of sale price
   cgt         tax on the gain at sale, %; cgtFree = full years of ownership after which it no longer applies
               (0 = never taxed for a main home, null = always taxed)
   invTax      tax on investment gains for the money that is invested instead, %
   loan        'annuity' (repaid in full over the term) or 'target' (repaid down to loanTo % of the price over
               loanYears, interest only after that)
   rate, term  starting mortgage rate (%) and term (years)
   minDown     usual minimum own funds, % of price */
export const PACKS = {
  DE: {
    cur: 'EUR', transfer: 3.5, notary: 2.0, agentBuy: 3.57, loanFee: 0, propTax: 0.15, upkeep: 1.3, ownerTax: 0, relief: 0,
    sell: 3.57, cgt: 0, cgtFree: 0, invTax: 26.375, loan: 'annuity', rate: 4.3, term: 30, minDown: 10, region: 'BY',
    regions: [['BW', 'Baden-Württemberg', 5.0], ['BY', 'Bayern', 3.5], ['BE', 'Berlin', 6.0], ['BB', 'Brandenburg', 6.5], ['HB', 'Bremen', 5.5], ['HH', 'Hamburg', 5.5], ['HE', 'Hessen', 6.0], ['MV', 'Mecklenburg-Vorpommern', 6.0], ['NI', 'Niedersachsen', 5.0], ['NW', 'Nordrhein-Westfalen', 6.5], ['RP', 'Rheinland-Pfalz', 5.0], ['SL', 'Saarland', 6.5], ['SN', 'Sachsen', 5.5], ['ST', 'Sachsen-Anhalt', 5.0], ['SH', 'Schleswig-Holstein', 6.5], ['TH', 'Thüringen', 5.0]],
    src: [['Grunderwerbsteuer by Land (rates checked 6 Nov 2026)', 'https://covago.de/kaufnebenkosten-rechner/'], ['Notary and land register after GNotKG, agent share after § 656c BGB', 'https://www.finanz.de/finanzierung/kaufnebenkosten/'], ['Mortgage rates, 10-year fix, Nov 2026', 'https://www.interhyp.de/zinsen/']]
  },
  CH: {
    cur: 'CHF', transfer: 0, notary: 0.5, agentBuy: 0, loanFee: 0.2, propTax: 0, upkeep: 1.0, ownerTax: 0, relief: 0,
    sell: 2.5, cgt: 20, cgtFree: null, invTax: 0, loan: 'target', loanTo: 65, loanYears: 15, rate: 1.8, term: 15, minDown: 20, region: 'ZH',
    regions: [['ZH', 'Zürich', 0], ['ZG', 'Zug', 0], ['SZ', 'Schwyz', 0], ['LU', 'Luzern', 1.5], ['NW', 'Nidwalden', 1.0], ['BE', 'Bern', 1.8], ['TI', 'Ticino', 1.1], ['VS', 'Valais', 1.0], ['GE', 'Genève', 3.0], ['VD', 'Vaud', 3.3]],
    src: [['Transfer tax by canton', 'https://neho.ch/en/blog/property-transfer-tax-switzerland'], ['Imputed rental value ends on 1 January 2029 (Federal Council, 1 April 2026)', 'https://www.admin.ch/de/newnsb/yGTqBPowRqyVh0zPokW-q'], ['Mortgage reference rates', 'https://www.comparis.ch/hypotheken/zinssatz']]
  },
  DK: {
    cur: 'DKK', transfer: 0.6, notary: 0.6, agentBuy: 0, loanFee: 1.25, propTax: 0.7, upkeep: 1.3, ownerTax: 0, relief: 25,
    sell: 2.5, cgt: 0, cgtFree: 0, invTax: 27, loan: 'annuity', rate: 4.0, term: 30, minDown: 5,
    src: [['Deed 0.6 % + DKK 1,850; mortgage deed 1.25 % + DKK 1,825', 'https://investropa.com/blogs/news/copenhagen-property-taxes-fees'], ['Property value tax 0.51 % / 1.4 % and land tax, on the valuation less 20 %', 'https://bomae.dk/en/home-buying-guides/property-tax-land-tax-property-value-tax-denmark']]
  },
  PL: {
    cur: 'PLN', transfer: 2.0, notary: 0.8, agentBuy: 2.5, loanFee: 1.0, propTax: 0.02, upkeep: 1.0, ownerTax: 0, relief: 0,
    sell: 2.5, cgt: 19, cgtFree: 5, invTax: 19, loan: 'annuity', rate: 6.7, term: 25, minDown: 20,
    src: [['PCC 2 % on resale, notary scale, agent 2–3 % + VAT', 'https://freenance.io/cost-guides/cost-of-buying-apartment-poland/'], ['Average mortgage rate', 'https://polandinsight.com/housing-prices-remain-stable-but-mortgage-costs-keep-poland-among-the-most-expensive-in-the-eu-34716/']]
  },
  FR: {
    cur: 'EUR', transfer: 6.32, notary: 1.3, agentBuy: 0, loanFee: 1.2, propTax: 0.4, upkeep: 1.2, ownerTax: 0, relief: 0,
    sell: 5.0, cgt: 0, cgtFree: 0, invTax: 31.4, loan: 'annuity', rate: 3.6, term: 25, minDown: 10,
    src: [['Droits de mutation: 6.32 % where the department raised its rate, 5.81 % elsewhere and for first-time buyers', 'https://www.reassurez-moi.fr/guide/pret-immobilier/calcul-frais-notaire'], ['Mortgage rates, November 2026', 'https://www.pretto.fr/taux-immobilier/historique-taux-immobilier/2026/analyse-taux-immobilier-novembre-2026/']]
  },
  XX: {
    cur: 'EUR', transfer: 3.0, notary: 1.5, agentBuy: 0, loanFee: 0.5, propTax: 0.3, upkeep: 1.2, ownerTax: 0, relief: 0,
    sell: 3.0, cgt: 0, cgtFree: 0, invTax: 25, loan: 'annuity', rate: 4.0, term: 25, minDown: 20, src: []
  }
};
export const PACK_ORDER = ['DE', 'CH', 'DK', 'PL', 'FR', 'XX'];
export const CURRENCIES = ['EUR', 'CHF', 'DKK', 'PLN', 'NOK', 'SEK', 'GBP', 'CZK', 'USD'];
/* the fields a location may override */
export const RULE_FIELDS = ['transfer', 'notary', 'agentBuy', 'loanFee', 'propTax', 'upkeep', 'ownerTax', 'relief', 'sell', 'cgt', 'cgtFree', 'invTax'];

/* The rules that apply to one location: the pack, the region's transfer tax, then the person's own changes. */
export function rulesFor(loc) {
  const pack = PACKS[loc.pack] || PACKS.XX;
  const r = {};
  for (const k of RULE_FIELDS) r[k] = pack[k];
  r.loan = pack.loan; r.loanTo = pack.loanTo ?? 0; r.loanYears = pack.loanYears ?? 0;
  if (pack.regions) { const reg = pack.regions.find(x => x[0] === (loc.region || pack.region)); if (reg) r.transfer = reg[2]; }
  const ov = loc.ov || {};
  for (const k of RULE_FIELDS) {
    if (k === 'cgtFree') { if (ov.cgtFree !== undefined) r.cgtFree = ov.cgtFree; }
    else if (ov[k] !== undefined && ov[k] !== null && ov[k] !== '' && isFinite(Number(ov[k]))) r[k] = Number(ov[k]);
  }
  if (ov.loan === 'annuity' || ov.loan === 'target') { r.loan = ov.loan; if (r.loan === 'target' && !r.loanYears) { r.loanTo = 65; r.loanYears = 15; } }
  return r;
}
