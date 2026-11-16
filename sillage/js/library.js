/* Sillage — the fragrance library: well-known fragrances with their published note pyramids, so similar scents,
   the scent profile and the next picks work offline. One row per fragrance:
     house | name | year | family | price band | top notes ; … | heart notes | base notes
   Price band, for a usual bottle: budget (< €60), mid (€60–120), premium (€120–250), niche (above).
   Compiled Nov 2026 from the houses' pyramids as commonly published; the twice-yearly "Sillage library refresh"
   task re-checks rows against the houses' pages and adds new releases. Only add rows at the end. */
const ROWS = `
Dior|Sauvage|2015|aromatic|mid|bergamot;pepper|Sichuan pepper;lavender;geranium;elemi|ambroxan;cedar;labdanum
Dior|Sauvage Elixir|2021|spicy|premium|grapefruit;cinnamon;nutmeg;cardamom|lavender|licorice;sandalwood;amber;patchouli;vetiver
Dior|Dior Homme Intense|2011|floral|premium|lavender|iris;ambrette;pear|vetiver;cedar
Dior|Dior Homme|2020|woody|premium|bergamot;pink pepper;elemi|cashmere wood;cedar;iris|vetiver;patchouli
Dior|Fahrenheit|1988|woody|mid|lavender;mandarin;hawthorn;nutmeg|violet leaf;honeysuckle;cedar|leather;vetiver;musk
Dior|Eau Sauvage|1966|citrus|mid|lemon;bergamot;basil|jasmine;rosemary;coriander|vetiver;oakmoss;musk
Dior|Bois d'Argent|2004|woody|niche|iris;myrrh;incense|honey;leather|patchouli;vanilla;musk
Chanel|Bleu de Chanel|2014|woody|premium|grapefruit;lemon;mint;pink pepper|ginger;nutmeg;jasmine|incense;cedar;sandalwood;vetiver;labdanum
Chanel|Allure Homme Sport|2004|citrus|mid|orange;sea notes;aldehydes|pepper;neroli;cedar|tonka;vanilla;white musk;vetiver
Chanel|Égoïste Platinum|1993|aromatic|mid|lavender;rosemary;petitgrain|geranium;clary sage;jasmine|vetiver;cedar;oakmoss;labdanum
Chanel|Coco Mademoiselle|2001|chypre|premium|orange;bergamot;grapefruit|rose;jasmine;litchi|patchouli;vetiver;vanilla;white musk
Chanel|N°5|1921|floral|premium|aldehydes;ylang-ylang;neroli|rose;jasmine;iris|sandalwood;vanilla;vetiver
Hermès|Terre d'Hermès|2006|woody|premium|orange;grapefruit|pepper;geranium;flint|vetiver;cedar;patchouli;benzoin
Hermès|H24|2021|green|premium|clary sage|narcissus|rosewood;metallic notes
Hermès|Un Jardin sur le Nil|2005|green|premium|green mango;grapefruit;lotus|lotus;bulrush|incense;sycamore
Hermès|Eau d'Orange Verte|1979|citrus|mid|orange;lemon;mandarin|mint;blackcurrant|oakmoss;patchouli
Hermès|Voyage d'Hermès|2010|woody|premium|cardamom;lemon|juniper;tea|musk;cedar;amber
Hermès|Bel Ami|1986|leather|premium|lemon;bergamot;basil|iris;jasmine;carnation;cardamom|leather;oakmoss;vetiver;patchouli
Tom Ford|Tobacco Vanille|2007|amber|niche|tobacco leaf;spices|vanilla;tonka;cacao;tobacco blossom|dried fruits;woods
Tom Ford|Oud Wood|2007|woody|niche|rosewood;cardamom;Sichuan pepper|oud;sandalwood;vetiver|tonka;vanilla;amber
Tom Ford|Neroli Portofino|2011|citrus|niche|bergamot;mandarin;lemon;lavender|neroli;orange blossom;jasmine|amber;angelica;rosemary
Tom Ford|Tuscan Leather|2007|leather|niche|saffron;raspberry;thyme|olibanum;jasmine|leather;suede;amber;woods
Tom Ford|Ombré Leather|2018|leather|premium|cardamom|leather;jasmine sambac|amber;moss;patchouli
Tom Ford|Noir Extreme|2015|amber|premium|cardamom;nutmeg;saffron;mandarin|kulfi;rose;orange blossom;jasmine|vanilla;amber;sandalwood
Tom Ford|Lost Cherry|2018|gourmand|niche|black cherry;bitter almond|cherry liqueur;rose;jasmine|Peru balsam;tonka;sandalwood;vetiver
Tom Ford|Soleil Blanc|2016|amber|niche|cardamom;bergamot;pistachio|ylang-ylang;tuberose;jasmine|coconut;benzoin;amber
Tom Ford|Grey Vetiver|2009|woody|premium|grapefruit;orange blossom;sage|vetiver;nutmeg;orris|amber;oakmoss;guaiac wood
Tom Ford|Beau de Jour|2019|aromatic|premium|lavender;rosemary;basil;mint|geranium;patchouli|amber;oakmoss
Giorgio Armani|Acqua di Giò|1996|aquatic|mid|bergamot;neroli;green tangerine;lime|marine notes;jasmine;rosemary;peach|cedar;patchouli;white musk;oakmoss
Giorgio Armani|Acqua di Giò Profumo|2015|aquatic|premium|sea notes;bergamot|rosemary;sage;geranium|incense;patchouli
Giorgio Armani|Armani Code|2004|amber|mid|lemon;bergamot|star anise;olive blossom|guaiac wood;tonka;leather;tobacco
Giorgio Armani|Stronger With You|2017|gourmand|mid|cardamom;pink pepper;violet leaf|sage|chestnut;vanilla;amber
Yves Saint Laurent|Y Eau de Parfum|2018|aromatic|mid|apple;ginger;bergamot|sage;juniper;geranium|amberwood;tonka;cedar;vetiver
Yves Saint Laurent|La Nuit de l'Homme|2009|spicy|mid|cardamom|lavender;cedar;bergamot|vetiver;caraway
Yves Saint Laurent|L'Homme|2006|woody|mid|ginger;bergamot;lemon|white pepper;basil;violet leaf|cedar;tonka;vetiver
Yves Saint Laurent|Libre|2019|floral|premium|lavender;mandarin;blackcurrant|lavender;orange blossom;jasmine|vanilla;musk;cedar;ambergris
Yves Saint Laurent|Black Opium|2014|gourmand|mid|pear;pink pepper;orange blossom|coffee;jasmine;licorice|vanilla;patchouli;cedar
Prada|L'Homme|2016|floral|premium|neroli;pepper;cardamom|iris;violet;geranium|amber;patchouli;cedar;sandalwood
Prada|Luna Rossa Carbon|2017|aromatic|mid|bergamot;pepper|lavender;metallic notes|ambroxan;patchouli
Prada|Luna Rossa Black|2018|amber|mid|bergamot|patchouli;angelica|amber;tonka;musk
Prada|Infusion d'Iris|2007|floral|premium|mandarin;orange blossom;neroli|iris;galbanum|incense;cedar;vetiver;benzoin
Guerlain|Vétiver|1961|woody|mid|lemon;bergamot;neroli|vetiver;nutmeg;pepper|tobacco;tonka;cedar
Guerlain|L'Homme Idéal|2014|amber|mid|almond;bergamot;rosemary|tonka|vetiver;leather;cedar
Guerlain|Habit Rouge|1965|amber|mid|bergamot;lemon;orange|rose;carnation;cinnamon|vanilla;leather;benzoin;labdanum
Guerlain|Shalimar|1925|amber|premium|bergamot;lemon|iris;jasmine;rose|vanilla;tonka;opoponax;incense
Creed|Aventus|2010|fruity|niche|pineapple;bergamot;blackcurrant;apple|birch;patchouli;jasmine|musk;oakmoss;ambergris;vanilla
Creed|Green Irish Tweed|1985|green|niche|lemon verbena;iris|violet leaf|ambergris;sandalwood
Creed|Silver Mountain Water|1995|citrus|niche|bergamot;mandarin|green tea;blackcurrant|musk;petitgrain;sandalwood
Creed|Virgin Island Water|2007|citrus|niche|lime;coconut;bergamot|ginger;rum;jasmine|musk;sugar cane
Maison Francis Kurkdjian|Baccarat Rouge 540|2015|amber|niche|saffron;jasmine|amberwood;ambergris|fir resin;cedar
Maison Francis Kurkdjian|Grand Soir|2016|amber|niche|labdanum|benzoin;tonka|amber;vanilla
Maison Francis Kurkdjian|Aqua Universalis|2009|citrus|niche|bergamot;lemon|lily of the valley;sweet pea|white woods;musk
Le Labo|Santal 33|2011|woody|niche|cardamom;violet|iris;ambroxan|sandalwood;cedar;leather;papyrus
Le Labo|Another 13|2010|musk|niche|pear|jasmine;ambrette|ambroxan;musk;moss
Le Labo|Thé Noir 29|2015|woody|niche|fig;bergamot;bay leaf|black tea;cedar|tobacco;vetiver;musk
Le Labo|Bergamote 22|2006|citrus|niche|bergamot;grapefruit|petitgrain;orange blossom|vetiver;cedar;amber;musk
Byredo|Gypsy Water|2008|woody|niche|bergamot;lemon;pepper;juniper|incense;pine;orris|vanilla;amber;sandalwood
Byredo|Bal d'Afrique|2009|floral|niche|bergamot;lemon;neroli;marigold|violet;jasmine;cyclamen|vetiver;musk;cedar;amber
Byredo|Mojave Ghost|2014|woody|niche|ambrette;sapodilla|magnolia;violet;sandalwood|cedar;amber;musk
Byredo|Super Cedar|2016|woody|niche|rose|cedar;vetiver|musk
Diptyque|Tam Dao|2003|woody|niche|rosewood;myrtle;cypress|sandalwood;cedar|amber;musk
Diptyque|Philosykos|1996|green|niche|fig leaf|fig;coconut|fig wood;cedar
Diptyque|Do Son|2005|floral|niche|orange blossom;rose|tuberose;jasmine|musk;benzoin
Diptyque|Eau des Sens|2016|citrus|niche|orange blossom;bitter orange|angelica;juniper|patchouli
Parfums de Marly|Layton|2016|amber|niche|apple;lavender;bergamot;mandarin|geranium;violet;jasmine|vanilla;cardamom;sandalwood;pepper;patchouli
Parfums de Marly|Pegasus|2011|amber|niche|bergamot;heliotrope;cumin|almond;lavender;jasmine|vanilla;sandalwood;amber
Parfums de Marly|Delina|2017|floral|niche|litchi;rhubarb;bergamot;nutmeg|rose;peony;vanilla|cashmeran;musk;vetiver;incense
Xerjoff|Naxos|2015|gourmand|niche|lavender;bergamot;lemon|honey;cinnamon;jasmine|tobacco;tonka;vanilla
Amouage|Interlude Man|2012|amber|niche|oregano;pepper;bergamot|incense;amber;labdanum;opoponax|leather;oud;sandalwood;patchouli
Amouage|Reflection Man|2007|floral|niche|rosemary;pink pepper;petitgrain|jasmine;orris;neroli|sandalwood;cedar;vetiver;patchouli
Penhaligon's|Halfeti|2015|spicy|niche|grapefruit;cypress;bergamot;cardamom|rose;saffron;nutmeg;lavender|oud;leather;amber;vanilla;sandalwood
Acqua di Parma|Colonia|1916|citrus|premium|lemon;bergamot;orange|lavender;rosemary;rose|vetiver;sandalwood;patchouli
Acqua di Parma|Fico di Amalfi|2006|green|mid|fig;lemon;bergamot;grapefruit|fig nectar;pink pepper;jasmine|fig wood;cedar;benzoin
Jo Malone|Wood Sage & Sea Salt|2014|aromatic|premium|ambrette|sea salt|sage
Jo Malone|Lime Basil & Mandarin|1999|citrus|mid|lime;mandarin;bergamot|basil;thyme;lilac|vetiver;amber
Montblanc|Explorer|2019|woody|mid|bergamot;pink pepper;clary sage|vetiver;leather|ambroxan;patchouli;cacao
Montblanc|Legend|2011|fougere|budget|bergamot;lavender;pineapple leaf|apple;rose;coumarin|sandalwood;tonka;oakmoss
Paco Rabanne|1 Million|2008|spicy|budget|grapefruit;mint;blood mandarin|rose;cinnamon;spices|leather;amber;patchouli;woods
Paco Rabanne|Invictus|2013|aquatic|budget|grapefruit;marine notes|bay leaf;jasmine|guaiac wood;ambergris;patchouli;oakmoss
Jean Paul Gaultier|Le Male|1995|fougere|budget|lavender;mint;cardamom;bergamot;artemisia|cinnamon;orange blossom;cumin|vanilla;tonka;sandalwood;amber;cedar
Jean Paul Gaultier|Le Male Elixir|2023|amber|mid|lavender;mint|vanilla;benzoin|honey;tonka;tobacco
Versace|Eros|2012|fougere|budget|mint;green apple;lemon|tonka;ambroxan;geranium|vanilla;vetiver;oakmoss;cedar
Versace|Dylan Blue|2016|aromatic|budget|bergamot;grapefruit;fig leaf;water notes|violet leaf;black pepper;papyrus;ambroxan|musk;tonka;saffron;incense
Viktor&Rolf|Spicebomb|2012|spicy|mid|pink pepper;elemi;bergamot;grapefruit|cinnamon;saffron;paprika|leather;tobacco;vetiver
Viktor&Rolf|Flowerbomb|2005|floral|premium|bergamot;tea|orchid;jasmine;rose;freesia|patchouli;musk
Givenchy|Gentleman Eau de Parfum|2018|floral|mid|pepper|iris;lavender|patchouli;vanilla;balsam
Hugo Boss|Boss Bottled|1998|woody|budget|apple;plum;bergamot;lemon|geranium;cinnamon;carnation|vanilla;sandalwood;cedar;vetiver
Dolce&Gabbana|Light Blue pour Homme|2007|citrus|budget|grapefruit;bergamot;mandarin;juniper|pepper;rosemary;rosewood|musk;incense;oakmoss
Dolce&Gabbana|The One for Men Eau de Parfum|2015|amber|mid|grapefruit;coriander;basil|ginger;cardamom;orange blossom|tobacco;amber;cedar
Bvlgari|Aqva pour Homme|2005|aquatic|mid|mandarin;petitgrain|seaweed;santolina|mineral notes;amber
Bvlgari|Man in Black|2014|spicy|mid|rum;spices|tuberose;leather;iris|tonka;benzoin;guaiac wood
Narciso Rodriguez|For Him|2007|musk|mid|violet leaf|musk|patchouli;vetiver;cedar
Issey Miyake|L'Eau d'Issey pour Homme|1994|aquatic|mid|yuzu;lemon;bergamot;mandarin|water lily;nutmeg;saffron;cinnamon|vetiver;sandalwood;tobacco;musk;amber
Azzaro|Chrome|1996|citrus|budget|lemon;bergamot;rosemary;pineapple|jasmine;cyclamen;oakmoss|musk;sandalwood;tonka;cedar
Davidoff|Cool Water|1988|aquatic|budget|mint;lavender;sea water;rosemary|jasmine;sandalwood;neroli;geranium|musk;oakmoss;amber;tobacco;cedar
Calvin Klein|CK One|1994|citrus|budget|lemon;bergamot;cardamom;pineapple;papaya|jasmine;violet;rose;nutmeg|musk;amber;cedar;green tea
Mugler|A*Men|1996|gourmand|mid|lavender;mint;bergamot|coffee;patchouli;caramel|tonka;vanilla;tar;musk
Mugler|Alien|2005|floral|mid|jasmine|jasmine sambac|cashmere wood;amber
Lancôme|La Vie est Belle|2012|gourmand|premium|pear;blackcurrant|iris;jasmine;orange blossom|praline;vanilla;patchouli;tonka
Burberry|Hero|2021|woody|mid|bergamot|juniper;black pepper|cedar
Initio|Oud for Greatness|2018|woody|niche|saffron;nutmeg;lavender|oud|patchouli;musk
Kilian|Angels' Share|2020|gourmand|niche|cognac|cinnamon;tonka;oak|praline;vanilla;sandalwood
Frédéric Malle|Portrait of a Lady|2010|floral|niche|rose;raspberry;blackcurrant;cinnamon;clove|patchouli;incense|sandalwood;musk;benzoin;amber
Frédéric Malle|Musc Ravageur|2000|amber|niche|lavender;bergamot;mandarin|cinnamon;clove|vanilla;amber;musk;sandalwood;tonka
Serge Lutens|Chergui|2001|amber|niche|tobacco leaf;honey|hay;incense;iris|musk;amber;sandalwood
Serge Lutens|Ambre Sultan|2000|amber|niche|oregano;myrtle;bay leaf|coriander|amber;benzoin;patchouli;sandalwood;vanilla
Maison Margiela|Replica Jazz Club|2013|amber|premium|pink pepper;neroli;lemon|rum;clary sage;vetiver|tobacco leaf;vanilla;styrax
Maison Margiela|Replica By the Fireplace|2015|woody|premium|pink pepper;orange blossom;clove|chestnut;guaiac wood;juniper|vanilla;Peru balsam;cashmeran
Maison Margiela|Replica Lazy Sunday Morning|2013|musk|premium|aldehydes;pear;lily of the valley|iris;rose;orange blossom|white musk;ambrette;patchouli
Atelier Cologne|Orange Sanguine|2010|citrus|mid|blood orange;bitter orange;mandarin|jasmine;geranium;pepper|sandalwood;tonka;amber
Nishane|Hacivat|2017|chypre|niche|pineapple;grapefruit;bergamot|cedar;patchouli;jasmine|oakmoss;woods;clary sage
Lattafa|Khamrah|2022|gourmand|budget|cinnamon;nutmeg;bergamot|dates;praline;tuberose|vanilla;tonka;benzoin;myrrh;amberwood
Armaf|Club de Nuit Intense Man|2015|fruity|budget|lemon;pineapple;bergamot;blackcurrant;apple|rose;jasmine;birch|musk;ambergris;patchouli;vanilla
Lalique|Encre Noire|2006|woody|budget|cypress|vetiver|cashmere wood;musk
Ralph Lauren|Polo Blue|2002|aquatic|budget|melon;cucumber;mandarin|basil;sage;geranium|suede;musk;woods
Cartier|Déclaration|1998|spicy|mid|bitter orange;bergamot;caraway;cardamom|cedar;leather;juniper;artemisia|vetiver;oakmoss;patchouli
L'Artisan Parfumeur|Timbuktu|2004|woody|niche|cardamom;pink pepper;mango|papyrus;karo karounde|vetiver;myrrh;incense
Mancera|Cedrat Boisé|2011|woody|mid|lemon;blackcurrant;bergamot;spices|fruity notes;patchouli;jasmine|cedar;leather;sandalwood;vanilla;musk
Aesop|Hwyl|2017|woody|niche|thyme|cypress;incense|vetiver;oakmoss
Chloé|Chloé Eau de Parfum|2008|floral|premium|peony;litchi;freesia|rose;magnolia;lily of the valley|cedar;amber
`;
const BANDS_P = ['budget', 'mid', 'premium', 'niche'];
export const LIBRARY = ROWS.trim().split('\n').map(r => {
  const [house, name, year, family, price, top, heart, base] = r.split('|');
  const sp = s => (s || '').split(';').map(x => x.trim()).filter(Boolean);
  return { house, name, year: +year, family, price: BANDS_P.includes(price) ? price : 'mid', notes: { top: sp(top), heart: sp(heart), base: sp(base) } };
});
