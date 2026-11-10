# Yearly rule update: Safety Net Score and Gains & Greeks

Both apps hold rules that are set per calendar year. They are updated **once a year, in the second half of January**, when the new figures are published. There is no mid-year update: changes during the year (for example France's 1 July revaluation) wait for January.

Until the update is done, each app shows a line saying that it still holds last year's rules.

## Steps

1. Run `node --test tests/*.mjs`. Everything must pass before anything is changed.
2. **Safety Net Score** (`safety-net/index.html`, the first script: country rule set). For each of the 16 countries, check every number in `p` and every sentence in `facts` against this year's official publication (the benefit agency, the ministry or the law itself, not a private website) and update the `sources` links. Typical yearly changes: contribution ceilings, maximum benefit, minimum benefit, tax tariff (Germany: `deTariff` and the allowances), reference amounts.
3. Update `ASOF`, the "Rules as of" chip, the method text that names the year, and the exchange rates `FX` (ECB reference rates of the day).
4. **Gains & Greeks** (`gains-greeks/index.html`, between `ENGINE-START` and `ENGINE-END`). Re-check the countries marked `conf:'V'` against this year's sources first: rates, allowances, thresholds, wrappers. Then turn up to three `conf:'K'` countries into `'V'` by checking them the same way. Update the year in the texts (search for the old year), the year in the line at the bottom of the page and in the small script that shows the "last year's rules" notice, the reform watchlist, and `FX`: the six currencies shared with Safety Net Score must be identical in both apps.
5. Update the reference figures in `tests/engines.test.mjs` to the new published maximums and worked examples, each with its source in a comment, and run the tests again.
6. Bump the version text `V` in `safety-net/sw.js` and `gains-greeks/sw.js` so phones fetch the new pages.
7. Add a section to `data/changelog.md` listing what changed per country, with the old and the new figure.
8. Commit and push. If a figure for the new year is not published yet, keep the old one, and say so in the changelog.
