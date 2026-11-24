/* Prisme — the Guide: what each part of a device does, what to focus on for a goal, the traps, and the words to
   know, in English and French. Each topic links to the Prisme tool that applies it. Plain facts, no prices (those
   live in the catalogue and change weekly). test/prisme.test.mjs checks that every text exists in both languages. */
const L = (en, fr) => ({ en, fr });

export const GUIDE = [
{
  id: 'pc', go: { tab: 'build' },
  t: L('Gaming PC', 'PC gamer'),
  sub: L('What each part does, how they work together, and where the money should go.', 'Le rôle de chaque pièce, comment elles travaillent ensemble, et où mettre l\'argent.'),
  intro: L('A gaming PC is eight parts. The graphics card draws the picture and decides most of what you see on screen; the processor runs the game\'s logic and feeds the card; the rest (memory, drive, mainboard, power supply, cooler, case) must simply be good enough and fit together. The most common mistake is spending on the wrong part.',
    'Un PC gamer, c\'est huit pièces. La carte graphique dessine l\'image et décide de l\'essentiel de ce que vous voyez ; le processeur fait tourner la logique du jeu et alimente la carte ; le reste (mémoire, SSD, carte mère, alimentation, ventirad, boîtier) doit simplement être suffisant et compatible. L\'erreur la plus courante est de dépenser dans la mauvaise pièce.'),
  sections: [
    { h: L('Graphics card (GPU)', 'Carte graphique (GPU)'), p: [
      L('The most important part for games. It sets the frame rate at a resolution: the higher the resolution (1080p, 1440p, 4K), the more it has to do. At 4K it is almost always the limit.', 'La pièce la plus importante pour jouer. Elle fixe les images par seconde à une définition donnée : plus la définition est haute (1080p, 1440p, 4K), plus elle travaille. En 4K, c\'est presque toujours elle qui limite.'),
      L('Video memory (VRAM) holds textures. 8 GB is enough for 1080p only; 12 GB is tight at 1440p; 16 GB is the right amount for 1440p and 4K in new games.', 'La mémoire vidéo (VRAM) contient les textures. 8 Go ne suffisent qu\'en 1080p ; 12 Go sont justes en 1440p ; 16 Go conviennent pour la 1440p et la 4K dans les jeux récents.'),
      L('Upscaling (NVIDIA DLSS, AMD FSR 4, Intel XeSS) renders a lower resolution and rebuilds a sharp image: about 1.5× the frames in "Quality" mode with little visible loss. Frame generation inserts made-up frames between real ones: smoother motion, but the controls feel no faster, so it works best from about 60 real frames per second. RTX 50 cards can insert three frames (4×), others one (2×).', 'L\'upscaling (NVIDIA DLSS, AMD FSR 4, Intel XeSS) calcule une définition plus basse et reconstruit une image nette : environ 1,5× plus d\'images en mode « Qualité », presque sans perte visible. La génération d\'images insère des images calculées entre les vraies : mouvement plus fluide, mais les commandes ne répondent pas plus vite ; elle fonctionne au mieux à partir d\'environ 60 vraies images par seconde. Les RTX 50 insèrent trois images (4×), les autres une (2×).'),
      L('Ray tracing (realistic light) and path tracing (its full version) cost a lot of performance; NVIDIA cards handle them better than AMD\'s.', 'Le ray tracing (éclairage réaliste) et le path tracing (sa version complète) coûtent beaucoup de performance ; les cartes NVIDIA s\'en sortent mieux que celles d\'AMD.')] },
    { h: L('Processor (CPU)', 'Processeur (CPU)'), p: [
      L('The processor prepares every frame before the card draws it. It matters most at high frame rates: competitive games, 1440p at 240 Hz and more. At 4K with a mid-range card, a cheap processor is often enough.', 'Le processeur prépare chaque image avant que la carte la dessine. Il compte surtout à haute fréquence : jeux compétitifs, 1440p à 240 Hz et plus. En 4K avec une carte milieu de gamme, un processeur bon marché suffit souvent.'),
      L('AMD\'s X3D chips (9800X3D, 9850X3D) carry a large extra cache that games love: they are the fastest gaming processors. More cores (12-16, like a 9900X or 9950X) help work such as video, 3D rendering and compiling code, much less games.', 'Les puces X3D d\'AMD (9800X3D, 9850X3D) ont un grand cache supplémentaire que les jeux adorent : ce sont les processeurs les plus rapides en jeu. Plus de cœurs (12-16, comme un 9900X ou un 9950X) aident le travail (vidéo, rendu 3D, compilation), bien moins les jeux.'),
      L('The socket decides the upgrade path: AMD\'s AM5 will take new processors until at least 2027; Intel\'s LGA1851 and LGA1700 are at their last generation.', 'Le socket décide de l\'évolution : l\'AM5 d\'AMD acceptera de nouveaux processeurs jusqu\'en 2027 au moins ; les LGA1851 et LGA1700 d\'Intel sont à leur dernière génération.')] },
    { h: L('Memory (RAM)', 'Mémoire (RAM)'), p: [
      L('32 GB is the standard for gaming today; 64 GB or more for video editing, large AI models or heavy multitasking. Always two sticks (2 × 16 GB), never one: a single stick costs 10-20 % in games.', '32 Go sont la norme en jeu aujourd\'hui ; 64 Go ou plus pour le montage vidéo, les gros modèles d\'IA ou beaucoup de multitâche. Toujours deux barrettes (2 × 16 Go), jamais une : une seule barrette coûte 10-20 % en jeu.'),
      L('Speed: DDR5-6000 with CL30 timings is the sweet spot on AMD; Intel likes 6400 and up. Turn on EXPO (AMD) or XMP (Intel) in the BIOS, or the memory runs slower than its label.', 'Vitesse : la DDR5-6000 en CL30 est le meilleur compromis chez AMD ; Intel aime 6400 et plus. Activez EXPO (AMD) ou XMP (Intel) dans le BIOS, sinon la mémoire tourne en dessous de sa vitesse annoncée.')] },
    { h: L('Drive (SSD)', 'Stockage (SSD)'), p: [
      L('An NVMe M.2 drive of 2 TB is the comfortable minimum: big games take 100-200 GB each. PCIe 4.0 drives load games about as fast as PCIe 5.0 ones; 5.0 helps large file copies and runs hotter.', 'Un SSD NVMe M.2 de 2 To est le minimum confortable : les gros jeux prennent 100-200 Go chacun. Les SSD PCIe 4.0 chargent les jeux presque aussi vite que les 5.0 ; le 5.0 aide les grosses copies et chauffe davantage.'),
      L('A DRAM cache keeps a drive fast when it is nearly full; QLC drives are cheaper but slow down on long writes. TBW tells how much can be written over its life.', 'Un cache DRAM garde le SSD rapide quand il est presque plein ; les SSD QLC sont moins chers mais ralentissent sur les longues écritures. Le TBW indique combien on peut y écrire sur sa durée de vie.')] },
    { h: L('Mainboard, power supply, cooling, case', 'Carte mère, alimentation, refroidissement, boîtier'), p: [
      L('Mainboard: must match the processor\'s socket. The chipset (B650/B850 vs X870 on AMD, B860 vs Z890 on Intel) mostly adds ports, M.2 slots and overclocking; a B-board is enough for gaming. Size must fit the case: ATX, micro-ATX or mini-ITX.', 'Carte mère : doit correspondre au socket du processeur. Le chipset (B650/B850 contre X870 chez AMD, B860 contre Z890 chez Intel) ajoute surtout des ports, des emplacements M.2 et l\'overclocking ; une carte « B » suffit pour jouer. Son format doit convenir au boîtier : ATX, micro-ATX ou mini-ITX.'),
      L('Power supply: take about 20 % above the system\'s draw and at least what the card maker recommends (850 W for an RTX 5080). Pick a named, well-reviewed model (Cybenetics or tier lists), ATX 3.1, with a native 12V-2x6 cable for cards that use it.', 'Alimentation : prenez environ 20 % au-dessus de la consommation et au moins ce que recommande le fabricant de la carte (850 W pour une RTX 5080). Choisissez un modèle nommé et bien testé (Cybenetics ou tier lists), ATX 3.1, avec un câble 12V-2x6 natif pour les cartes qui l\'utilisent.'),
      L('Cooling: a good tower air cooler handles most gaming processors quietly; a 280-360 mm liquid cooler (AIO) helps 16-core and Intel K chips. Check the cooler height or radiator size against the case.', 'Refroidissement : un bon ventirad tour refroidit la plupart des processeurs gaming en silence ; un watercooling AIO de 280-360 mm aide les 16 cœurs et les Intel K. Vérifiez la hauteur du ventirad ou la taille du radiateur par rapport au boîtier.'),
      L('Case: a mesh front breathes; a closed glass front with few fans makes everything louder and hotter. Check the maximum graphics card length (modern cards are 300-360 mm).', 'Boîtier : une façade en mesh respire ; une façade vitrée fermée avec peu de ventilateurs rend tout plus bruyant et plus chaud. Vérifiez la longueur maximale de carte graphique (les cartes actuelles font 300-360 mm).')] },
    { h: L('Balance and bottlenecks', 'Équilibre et goulots d\'étranglement'), p: [
      L('The slower of the two decides your frame rate: if the processor can feed 185 frames and the card draws 72, you get 72. Prisme shows this balance on every build. Ready-made or self-built, the same rules apply; while memory and graphics cards are expensive, big makers\' ready-made PCs can cost less than the same parts.', 'Le plus lent des deux décide des images par seconde : si le processeur peut en fournir 185 et que la carte en dessine 72, vous obtenez 72. Prisme montre cet équilibre sur chaque config. PC monté ou à monter, les règles sont les mêmes ; tant que la mémoire et les cartes graphiques sont chères, les PC des grands assembleurs peuvent coûter moins que les mêmes pièces.')] }
  ],
  goals: [
    { g: L('4K in big games', '4K dans les gros jeux'), f: L('Graphics card first (RTX 5080 class or better, 16 GB), an X3D or fast 8-core processor, 32 GB, 850 W.', 'La carte graphique d\'abord (classe RTX 5080 ou mieux, 16 Go), un X3D ou un 8 cœurs rapide, 32 Go, 850 W.') },
    { g: L('1440p at high refresh', '1440p haute fréquence'), f: L('A balanced pair: RTX 5070 Ti / RX 9070 XT class with a 9800X3D-class processor.', 'Un duo équilibré : classe RTX 5070 Ti / RX 9070 XT avec un processeur classe 9800X3D.') },
    { g: L('Competitive games (240-500 fps)', 'Jeux compétitifs (240-500 fps)'), f: L('The processor matters most (X3D); a mid-range card is enough at 1080p/1440p.', 'Le processeur compte le plus (X3D) ; une carte milieu de gamme suffit en 1080p/1440p.') },
    { g: L('Creating, AI, streaming', 'Création, IA, streaming'), f: L('12-16 cores, 64 GB or more, a card with lots of video memory (NVIDIA for most AI tools).', '12-16 cœurs, 64 Go ou plus, une carte avec beaucoup de mémoire vidéo (NVIDIA pour la plupart des outils d\'IA).') },
    { g: L('Quiet', 'Silence'), f: L('Big air cooler or 360 mm AIO, mesh case with large slow fans, an efficient card, a quiet-rated power supply.', 'Grand ventirad ou AIO 360 mm, boîtier mesh avec grands ventilateurs lents, une carte efficace, une alimentation silencieuse.') }
  ],
  traps: [
    L('One memory stick instead of two.', 'Une seule barrette au lieu de deux.'),
    L('A power supply without a brand or model name.', 'Une alimentation sans marque ni modèle.'),
    L('8 GB graphics cards for 1440p or 4K.', 'Des cartes 8 Go pour la 1440p ou la 4K.'),
    L('A €400 mainboard under a gaming build: the money belongs in the graphics card.', 'Une carte mère à 400 € dans une config gaming : l\'argent doit aller à la carte graphique.'),
    L('Forgetting EXPO/XMP, or plugging the screen into the mainboard instead of the graphics card.', 'Oublier EXPO/XMP, ou brancher l\'écran sur la carte mère au lieu de la carte graphique.')
  ],
  terms: [
    [L('X3D', 'X3D'), L('AMD processors with stacked extra cache (3D V-Cache): the fastest for games.', 'Processeurs AMD avec un cache supplémentaire empilé (3D V-Cache) : les plus rapides en jeu.')],
    [L('VRAM', 'VRAM'), L('The graphics card\'s own memory, for textures and frames.', 'La mémoire propre à la carte graphique, pour les textures et les images.')],
    [L('DLSS / FSR / XeSS', 'DLSS / FSR / XeSS'), L('Upscaling from NVIDIA, AMD and Intel: more frames from a lower render resolution.', 'Upscaling de NVIDIA, AMD et Intel : plus d\'images depuis une définition de rendu plus basse.')],
    [L('TDP / power draw', 'TDP / consommation'), L('How much heat a part makes and power it uses; the cooler and power supply must cover the peak.', 'La chaleur produite et l\'énergie consommée ; ventirad et alimentation doivent couvrir le pic.')],
    [L('Socket', 'Socket'), L('The processor\'s mount on the mainboard (AM5, LGA1851, LGA1700): processor and board must match.', 'Le support du processeur sur la carte mère (AM5, LGA1851, LGA1700) : processeur et carte doivent correspondre.')],
    [L('12V-2x6', '12V-2x6'), L('The 16-pin power plug of high-end cards; push it in fully and do not bend it at the plug.', 'La prise 16 broches des cartes haut de gamme ; enfoncez-la à fond et ne la pliez pas à la prise.')],
    [L('EXPO / XMP', 'EXPO / XMP'), L('BIOS profiles that run memory at its rated speed.', 'Profils BIOS qui font tourner la mémoire à sa vitesse annoncée.')],
    [L('1% lows', '1 % low'), L('The slowest frames: what you feel as stutter. X3D chips raise them most.', 'Les images les plus lentes : ce que l\'on ressent comme des saccades. Les X3D les améliorent le plus.')]
  ]
},
{
  id: 'monitor', go: { tab: 'screens', screen: 'monitor' },
  t: L('Monitors', 'Moniteurs'),
  sub: L('Size, resolution, refresh rate, panel types, HDR, cables, and matching the graphics card.', 'Taille, définition, fréquence, types de dalle, HDR, câbles, et l\'accord avec la carte graphique.'),
  intro: L('A monitor is chosen for three things together: how big it looks from your seat, how sharp it is, and how fast your graphics card can feed it. A 57-inch dual-4K screen is spectacular, but it asks twice the work of 4K from the card.',
    'Un moniteur se choisit sur trois points à la fois : la taille vue de votre place, la netteté, et la vitesse à laquelle votre carte peut l\'alimenter. Un écran double 4K de 57 pouces est spectaculaire, mais il demande deux fois le travail de la 4K à la carte.'),
  sections: [
    { h: L('Size, resolution and sharpness', 'Taille, définition et netteté'), p: [
      L('Sharpness depends on pixels per inch (PPI) and on your distance: Prisme converts both into pixels per degree. About 60 means you no longer see pixels. 27" 4K and 32" 4K are very sharp at a desk; 27" 1440p is fine; 4K on 42"+ wants more distance.', 'La netteté dépend des pixels par pouce (PPI) et de la distance : Prisme convertit les deux en pixels par degré. Vers 60, on ne voit plus les pixels. Le 27" 4K et le 32" 4K sont très nets à un bureau ; le 27" 1440p est correct ; la 4K sur 42" et plus demande plus de recul.'),
      L('Ultrawides (21:9, like 3440×1440) wrap around you in racing, flight and open-world games; super-ultrawides (32:9, 5120×1440 or 7680×2160) equal two screens side by side. Not every game supports them; some show black bars.', 'Les ultra-larges (21:9, comme 3440×1440) vous entourent dans les jeux de course, de vol et en monde ouvert ; les super ultra-larges (32:9, 5120×1440 ou 7680×2160) valent deux écrans côte à côte. Tous les jeux ne les gèrent pas ; certains affichent des bandes noires.')] },
    { h: L('Refresh rate and motion', 'Fréquence et mouvement'), p: [
      L('Refresh rate (Hz) is how many images per second the screen can show; it only helps if the card delivers that many. 144-165 Hz is smooth; 240 Hz and up suits fast games; 360-540 Hz is for competitive players. OLED panels switch pixels almost instantly, so motion looks clearer than on LCD at the same Hz.', 'La fréquence (Hz) est le nombre d\'images par seconde que l\'écran peut afficher ; elle n\'aide que si la carte en fournit autant. 144-165 Hz est fluide ; 240 Hz et plus convient aux jeux rapides ; 360-540 Hz est pour les joueurs compétitifs. Les dalles OLED changent les pixels presque instantanément : le mouvement est plus net qu\'en LCD à fréquence égale.'),
      L('G-Sync and FreeSync (VRR) match the screen to the card\'s frame rate and remove tearing; nearly every gaming monitor has it.', 'G-Sync et FreeSync (VRR) calent l\'écran sur la cadence de la carte et suppriment le déchirement ; presque tous les moniteurs gaming l\'ont.')] },
    { h: L('Panel types', 'Types de dalle'), p: [
      L('QD-OLED and WOLED: perfect blacks, the best HDR and motion, but a risk of burn-in from static content (taskbar, game HUD) over years; makers cover it 2-3 years. QD-OLED has richer colours, glossy coatings look best in a dark room; WOLED often has a matte coat and slightly softer text.', 'QD-OLED et WOLED : noirs parfaits, le meilleur HDR et le meilleur mouvement, mais un risque de marquage par le contenu statique (barre des tâches, HUD) sur des années ; les fabricants le couvrent 2-3 ans. Le QD-OLED a des couleurs plus riches et brille surtout en pièce sombre ; le WOLED a souvent un traitement mat et un texte un peu plus doux.'),
      L('Mini-LED: an LCD with hundreds of local dimming zones: very bright HDR, no burn-in, some halo around bright objects. IPS: accurate colours and sharp text, weak blacks. VA: deep blacks for an LCD, slower in dark scenes. TN: only for 360-540 Hz esports at a low price.', 'Mini-LED : un LCD avec des centaines de zones de rétroéclairage : HDR très lumineux, aucun marquage, un peu de halo autour des objets clairs. IPS : couleurs justes et texte net, noirs faibles. VA : noirs profonds pour un LCD, plus lent dans les scènes sombres. TN : seulement pour l\'esport 360-540 Hz à petit prix.')] },
    { h: L('HDR', 'HDR'), p: [
      L('Real HDR needs bright highlights against dark areas. Labels: DisplayHDR True Black 400/500 (OLED) and DisplayHDR 1000 (Mini-LED) are real; DisplayHDR 400 on an ordinary LCD is barely HDR.', 'Le vrai HDR demande des zones très lumineuses à côté de zones sombres. Labels : DisplayHDR True Black 400/500 (OLED) et DisplayHDR 1000 (Mini-LED) sont réels ; un DisplayHDR 400 sur un LCD ordinaire n\'est presque pas du HDR.')] },
    { h: L('Cables: DisplayPort, HDMI and DSC', 'Câbles : DisplayPort, HDMI et DSC'), p: [
      L('4K at 240 Hz needs about 65 Gbit/s. DisplayPort 1.4 carries 26 and HDMI 2.1 about 43, so they use DSC compression (visually lossless; on some NVIDIA setups the screen blanks for a second when switching to full-screen games). DisplayPort 2.1 UHBR20 (80 Gbit/s, RTX 50 cards) carries it uncompressed. Prisme checks your card and the monitor together.', 'La 4K à 240 Hz demande environ 65 Gbit/s. Le DisplayPort 1.4 en transporte 26 et le HDMI 2.1 environ 43 : ils utilisent la compression DSC (sans perte visible ; sur certaines configs NVIDIA l\'écran devient noir une seconde en passant en plein écran). Le DisplayPort 2.1 UHBR20 (80 Gbit/s, cartes RTX 50) la transporte sans compression. Prisme vérifie votre carte et le moniteur ensemble.')] }
  ],
  goals: [
    { g: L('Competitive shooters', 'FPS compétitifs'), f: L('24-27", 1080p or 1440p, 360-540 Hz, OLED or TN; a fast processor matters more than the card.', '24-27", 1080p ou 1440p, 360-540 Hz, OLED ou TN ; un processeur rapide compte plus que la carte.') },
    { g: L('Immersive big games', 'Immersion dans les gros jeux'), f: L('32" 4K 240 Hz OLED, a 34-45" ultrawide, or 49-57" super-ultrawide with a top card.', '32" 4K 240 Hz OLED, un ultra-large de 34-45", ou un super ultra-large de 49-57" avec une carte haut de gamme.') },
    { g: L('Work and text', 'Travail et texte'), f: L('27-32" 4K or 5K IPS, or a 40" 5K2K; matte, flicker-free, USB-C/Thunderbolt to one cable for a laptop.', '27-32" 4K ou 5K IPS, ou un 40" 5K2K ; mat, sans scintillement, USB-C/Thunderbolt pour un seul câble vers le portable.') },
    { g: L('Bright room, long desktop hours', 'Pièce lumineuse, longues heures de bureau'), f: L('Mini-LED or IPS: no burn-in worries.', 'Mini-LED ou IPS : aucun souci de marquage.') }
  ],
  traps: [
    L('A 4K 240 Hz monitor with a card that reaches 60 fps there.', 'Un moniteur 4K 240 Hz avec une carte qui y atteint 60 fps.'),
    L('A large screen too close: a 45-57" ultrawide wants 80-120 cm.', 'Un grand écran trop près : un ultra-large de 45-57" veut 80-120 cm.'),
    L('"HDR 400" stickers on LCDs.', 'Les autocollants « HDR 400 » sur des LCD.'),
    L('Static content all day on OLED without a burn-in warranty.', 'Du contenu statique toute la journée sur OLED sans garantie marquage.')
  ],
  terms: [
    [L('PPI / PPD', 'PPI / PPD'), L('Pixels per inch / pixels per degree of your view: sharpness, with the distance included.', 'Pixels par pouce / pixels par degré de vision : la netteté, distance comprise.')],
    [L('Hz', 'Hz'), L('Images per second the screen can show.', 'Images par seconde que l\'écran peut afficher.')],
    [L('VRR (G-Sync, FreeSync)', 'VRR (G-Sync, FreeSync)'), L('The screen follows the card\'s frame rate: no tearing.', 'L\'écran suit la cadence de la carte : pas de déchirement.')],
    [L('DSC', 'DSC'), L('Display Stream Compression: visually lossless compression for high resolutions and refresh rates.', 'Display Stream Compression : compression sans perte visible pour les hautes définitions et fréquences.')],
    [L('UHBR20', 'UHBR20'), L('The fastest DisplayPort 2.1 mode (80 Gbit/s).', 'Le mode DisplayPort 2.1 le plus rapide (80 Gbit/s).')],
    [L('Burn-in', 'Marquage (burn-in)'), L('A faint permanent ghost of static content on OLED.', 'Une trace légère et permanente d\'un contenu statique sur OLED.')],
    [L('1800R / 1000R', '1800R / 1000R'), L('Curvature: the radius in millimetres; smaller is more curved.', 'Courbure : le rayon en millimètres ; plus petit = plus incurvé.')]
  ]
},
{
  id: 'tv', go: { tab: 'screens', screen: 'tv' },
  t: L('TVs', 'Téléviseurs'),
  sub: L('OLED or Mini-LED, the right size for your sofa, HDR formats and gaming features.', 'OLED ou Mini-LED, la bonne taille pour votre canapé, formats HDR et fonctions gaming.'),
  intro: L('The two big choices are the panel (OLED for dark rooms and films, Mini-LED for bright rooms and very large sizes) and the size, which follows your seating distance. Last year\'s model is usually most of the new one for much less.',
    'Les deux grands choix sont la dalle (OLED pour les pièces sombres et les films, Mini-LED pour les pièces lumineuses et les très grandes tailles) et la taille, qui suit la distance du canapé. Le modèle de l\'an dernier offre généralement l\'essentiel du nouveau pour bien moins cher.'),
  sections: [
    { h: L('Panel types', 'Types de dalle'), p: [
      L('OLED (WOLED from LG, QD-OLED from Samsung and Sony): perfect blacks, best viewing angles and motion; less bright overall than Mini-LED. Burn-in is rare in normal TV use but possible with news tickers all day.', 'OLED (WOLED de LG, QD-OLED de Samsung et Sony) : noirs parfaits, meilleurs angles et mouvement ; moins lumineux globalement que le Mini-LED. Le marquage est rare en usage TV normal mais possible avec des bandeaux d\'info toute la journée.'),
      L('Mini-LED (Neo QLED, QD-Mini-LED): very bright, ideal for sunny rooms, sport and sizes of 85-115". LED/QLED without local dimming is the budget way to a huge screen, with grey blacks.', 'Mini-LED (Neo QLED, QD-Mini-LED) : très lumineux, idéal pour les pièces ensoleillées, le sport et les tailles de 85-115". Le LED/QLED sans gradation locale est la voie économique vers un écran immense, avec des noirs grisâtres.')] },
    { h: L('Size and distance', 'Taille et distance'), p: [
      L('About 30-40° of your view is comfortable for films: roughly 65" at 2.5 m, 77" at 3 m, 85-98" at 3.5 m. Bigger is almost always nicer than people expect; Prisme suggests a size from your sofa distance.', 'Environ 30-40° du champ de vision est confortable pour les films : à peu près 65" à 2,5 m, 77" à 3 m, 85-98" à 3,5 m. Plus grand est presque toujours plus agréable qu\'on ne l\'imagine ; Prisme propose une taille d\'après votre distance.')] },
    { h: L('HDR and processing', 'HDR et traitement'), p: [
      L('HDR formats: HDR10 everyone has; Dolby Vision (Netflix, Disney+, Apple TV+) is missing on Samsung; HDR10+ is Samsung\'s answer. Processing (upscaling of TV channels, motion in sport) is where Sony and LG lead.', 'Formats HDR : tout le monde a le HDR10 ; le Dolby Vision (Netflix, Disney+, Apple TV+) manque chez Samsung ; le HDR10+ est la réponse de Samsung. Le traitement (mise à l\'échelle des chaînes TV, mouvement en sport) est le point fort de Sony et LG.')] },
    { h: L('Gaming', 'Jeu vidéo'), p: [
      L('For PS5, Xbox or a PC: HDMI 2.1 ports for 4K at 120 Hz or more, VRR, ALLM (game mode switches on by itself) and low input lag. LG and Samsung have four HDMI 2.1 ports; Sony and many Mini-LEDs only two (one is shared with the soundbar\'s eARC).', 'Pour PS5, Xbox ou PC : des ports HDMI 2.1 pour la 4K à 120 Hz ou plus, le VRR, l\'ALLM (le mode jeu s\'active seul) et une faible latence. LG et Samsung ont quatre ports HDMI 2.1 ; Sony et beaucoup de Mini-LED seulement deux (dont un partagé avec l\'eARC de la barre de son).')] }
  ],
  goals: [
    { g: L('Films in a dark room', 'Films en pièce sombre'), f: L('OLED, with Dolby Vision.', 'OLED, avec Dolby Vision.') },
    { g: L('Bright living room, sport', 'Salon lumineux, sport'), f: L('Mini-LED or a bright OLED with an anti-glare coat.', 'Mini-LED ou un OLED lumineux avec traitement antireflet.') },
    { g: L('Console and PC gaming', 'Consoles et PC'), f: L('4 HDMI 2.1 ports, 120-165 Hz, VRR (LG C/G, Samsung S90/S95).', '4 ports HDMI 2.1, 120-165 Hz, VRR (LG C/G, Samsung S90/S95).') },
    { g: L('As big as possible', 'Le plus grand possible'), f: L('98-115" Mini-LED; or a laser projector for 120-150".', 'Mini-LED de 98-115" ; ou un projecteur laser pour 120-150".') }
  ],
  traps: [L('Buying the size you have now out of habit.', 'Reprendre la taille actuelle par habitude.'), L('Ignoring the built-in sound: add a soundbar to any thin TV.', 'Négliger le son intégré : ajoutez une barre de son à toute TV fine.'), L('Paying launch price in spring for last year\'s performance.', 'Payer le prix de lancement au printemps pour la performance de l\'an dernier.')],
  terms: [
    [L('HDMI 2.1 / eARC', 'HDMI 2.1 / eARC'), L('Fast HDMI for 4K 120 Hz+; eARC sends lossless sound to a soundbar.', 'HDMI rapide pour la 4K 120 Hz+ ; l\'eARC envoie un son sans perte vers une barre de son.')],
    [L('Dolby Vision / HDR10+', 'Dolby Vision / HDR10+'), L('HDR formats that adjust the picture scene by scene.', 'Formats HDR qui ajustent l\'image scène par scène.')],
    [L('ALLM / VRR', 'ALLM / VRR'), L('Automatic game mode / variable refresh for consoles and PCs.', 'Mode jeu automatique / fréquence variable pour consoles et PC.')],
    [L('Local dimming', 'Gradation locale'), L('Zones of the backlight that dim separately: deeper blacks on LCD.', 'Zones du rétroéclairage qui s\'atténuent séparément : des noirs plus profonds en LCD.')]
  ]
},
{
  id: 'audio', go: { tab: 'choose', cat: 'soundbar' },
  t: L('Soundbars and headphones', 'Barres de son et casques'),
  sub: L('Channels and Dolby Atmos, subwoofers, noise cancelling, codecs and fit.', 'Canaux et Dolby Atmos, caissons, réduction de bruit, codecs et confort.'),
  intro: L('For a TV, a soundbar does more for films than any picture upgrade. For headphones, comfort and noise cancelling usually matter more than the last bit of sound quality.', 'Pour une TV, une barre de son apporte plus aux films que n\'importe quelle amélioration d\'image. Pour un casque, le confort et la réduction de bruit comptent souvent plus que le dernier détail de qualité sonore.'),
  sections: [
    { h: L('Soundbars', 'Barres de son'), p: [
      L('Channels read as front.subwoofer.height: 5.1.2 means five speakers around, one subwoofer, two pointing up. Dolby Atmos adds sound from above; up-firing speakers do it best, "virtual" Atmos less so.', 'Les canaux se lisent avant.caisson.hauteur : 5.1.2 = cinq haut-parleurs autour, un caisson, deux vers le haut. Le Dolby Atmos ajoute du son venant d\'en haut ; les haut-parleurs orientés vers le plafond le font le mieux, l\'Atmos « virtuel » moins bien.'),
      L('A separate subwoofer adds real bass; rear speakers make true surround. Connect with HDMI eARC. Staying in one ecosystem (Sonos, Samsung with a Samsung TV) brings extras like using the TV\'s speakers together with the bar.', 'Un caisson séparé apporte de vraies basses ; des enceintes arrière font un vrai surround. Branchez en HDMI eARC. Rester dans un écosystème (Sonos, Samsung avec une TV Samsung) apporte des extras, comme utiliser les haut-parleurs de la TV avec la barre.')] },
    { h: L('Headphones', 'Casques et écouteurs'), p: [
      L('Over-ear headphones isolate best and are most comfortable for long flights; in-ear earbuds go everywhere. Active noise cancelling (ANC) removes engine and office noise; Sony, Bose and Apple lead.', 'Les casques circum-auraux isolent le mieux et sont les plus confortables en long vol ; les écouteurs intra vont partout. La réduction de bruit active (ANC) supprime le bruit des moteurs et du bureau ; Sony, Bose et Apple dominent.'),
      L('Codecs: AAC suits iPhones; LDAC and aptX Adaptive carry more detail on Android. Multipoint connects a phone and a laptop at once. Gaming headsets use a 2.4 GHz dongle for no lag and have a better microphone.', 'Codecs : l\'AAC convient aux iPhone ; LDAC et aptX Adaptive transportent plus de détails sur Android. Le multipoint connecte un téléphone et un portable à la fois. Les casques gaming utilisent un dongle 2,4 GHz sans latence et ont un meilleur micro.')] }
  ],
  goals: [
    { g: L('Films at home', 'Films à la maison'), f: L('A bar with a subwoofer and Atmos up-firing speakers; rears if the room allows.', 'Une barre avec caisson et haut-parleurs Atmos vers le plafond ; des arrières si la pièce le permet.') },
    { g: L('Clear dialogue', 'Dialogues clairs'), f: L('A bar with a centre channel and a speech mode (Bose, Sonos, Sony).', 'Une barre avec canal central et mode voix (Bose, Sonos, Sony).') },
    { g: L('Travel', 'Voyage'), f: L('Over-ear ANC headphones; earbuds as a lighter option.', 'Casque ANC circum-aural ; des écouteurs pour voyager plus léger.') },
    { g: L('Gaming', 'Jeu'), f: L('A 2.4 GHz gaming headset with a good microphone.', 'Un casque gaming 2,4 GHz avec un bon micro.') }
  ],
  traps: [L('A soundbar connected by optical cable: no Atmos.', 'Une barre de son branchée en optique : pas d\'Atmos.'), L('Choosing earbuds that do not fit your ears: try the tip sizes.', 'Des écouteurs qui ne tiennent pas dans vos oreilles : essayez les embouts.')],
  terms: [
    [L('5.1.2', '5.1.2'), L('Front speakers . subwoofer . height speakers.', 'Haut-parleurs avant . caisson . haut-parleurs de hauteur.')],
    [L('Dolby Atmos', 'Dolby Atmos'), L('Surround sound with height.', 'Son surround avec la hauteur.')],
    [L('ANC', 'ANC'), L('Active noise cancelling.', 'Réduction de bruit active.')],
    [L('LDAC / aptX', 'LDAC / aptX'), L('Bluetooth codecs with more detail, mainly on Android.', 'Codecs Bluetooth plus détaillés, surtout sur Android.')]
  ]
},
{
  id: 'phone', go: { tab: 'choose', cat: 'phone' },
  t: L('Phones', 'Téléphones'),
  sub: L('Chip, screen, cameras, battery, updates and size: what really matters.', 'Puce, écran, photo, batterie, mises à jour et taille : ce qui compte vraiment.'),
  intro: L('Most current phones are fast enough. The real differences are the cameras (especially zoom and low light), battery life, how many years of updates you get, size, and which ecosystem you already live in.', 'La plupart des téléphones actuels sont assez rapides. Les vraies différences sont la photo (surtout le zoom et la basse lumière), l\'autonomie, le nombre d\'années de mises à jour, la taille, et l\'écosystème où vous vivez déjà.'),
  sections: [
    { h: L('Cameras', 'Photo'), p: [L('Sensor size matters more than megapixels: a large sensor (1-inch type in some Ultras) gathers more light. A periscope telephoto gives sharp 3-5× zoom. Video quality is where iPhones are strongest.', 'La taille du capteur compte plus que les mégapixels : un grand capteur (type 1 pouce sur certains Ultra) capte plus de lumière. Un téléobjectif périscope donne un zoom 3-5× net. La vidéo est le point fort des iPhone.')] },
    { h: L('Screen, battery, charging', 'Écran, batterie, charge'), p: [L('OLED with LTPO (refresh down to 1 Hz) saves battery; brightness above 2,000 nits helps outdoors. Battery capacity (mAh) compares within Android; newer silicon-carbon batteries hold more in the same size. Fast charging in watts varies from 25 W to 120 W.', 'Un OLED LTPO (fréquence jusqu\'à 1 Hz) économise la batterie ; plus de 2 000 nits aident en plein soleil. La capacité (mAh) se compare entre Android ; les nouvelles batteries silicium-carbone stockent plus pour la même taille. La charge rapide varie de 25 W à 120 W.')] },
    { h: L('Updates and longevity', 'Mises à jour et durée de vie'), p: [L('Apple, Samsung and Google promise about seven years of updates; others four to six. Since June 2025, phones sold in the EU carry an energy label with battery endurance and a repairability class (A-E).', 'Apple, Samsung et Google promettent environ sept ans de mises à jour ; les autres quatre à six. Depuis juin 2025, les téléphones vendus dans l\'UE portent une étiquette énergie avec l\'endurance de la batterie et une classe de réparabilité (A-E).')] },
    { h: L('Size and foldables', 'Taille et pliables'), p: [L('Compact (about 6.1") for one-hand use, standard (6.3"), large (6.7-6.9") for battery and video. Foldables open to an 8" tablet (book style) or fold to pocket size (flip style); they cost more and are less robust.', 'Compact (env. 6,1") pour une main, standard (6,3"), grand (6,7-6,9") pour l\'autonomie et la vidéo. Les pliables s\'ouvrent en tablette de 8" (format livre) ou se plient à la taille de poche (format clapet) ; plus chers et moins robustes.')] }
  ],
  goals: [
    { g: L('Best camera', 'Meilleure photo'), f: L('An Ultra or Pro with a large sensor and periscope zoom.', 'Un Ultra ou Pro avec grand capteur et zoom périscope.') },
    { g: L('Keep it 6-7 years', 'Le garder 6-7 ans'), f: L('Seven years of updates, a good repairability class, 256 GB.', 'Sept ans de mises à jour, une bonne classe de réparabilité, 256 Go.') },
    { g: L('Value', 'Rapport qualité-prix'), f: L('Last year\'s flagship, or a "FE"/"a" model.', 'Le haut de gamme de l\'an dernier, ou un modèle « FE »/« a ».') }
  ],
  traps: [L('Buying a new iPhone in August or a Galaxy in January, weeks before the successor.', 'Acheter un iPhone en août ou un Galaxy en janvier, quelques semaines avant le successeur.'), L('128 GB if you film in 4K.', '128 Go si vous filmez en 4K.')],
  terms: [
    [L('LTPO', 'LTPO'), L('A screen that lowers its refresh rate to save battery.', 'Un écran qui baisse sa fréquence pour économiser la batterie.')],
    [L('Periscope telephoto', 'Téléobjectif périscope'), L('A folded zoom lens for sharp 3-5× zoom.', 'Un objectif replié pour un zoom 3-5× net.')],
    [L('Nits', 'Nits'), L('Screen brightness.', 'Luminosité de l\'écran.')]
  ]
},
{
  id: 'laptop', go: { tab: 'choose', cat: 'laptop' },
  t: L('Laptops and tablets', 'Portables et tablettes'),
  sub: L('Processors, graphics power, screens, weight and battery.', 'Processeurs, puissance graphique, écrans, poids et autonomie.'),
  intro: L('A laptop is a set of compromises between power, weight, battery and noise. Decide what you will carry and how often you will game before looking at specs.', 'Un portable est un compromis entre puissance, poids, autonomie et bruit. Décidez ce que vous transporterez et à quelle fréquence vous jouerez avant de regarder les fiches.'),
  sections: [
    { h: L('Processors', 'Processeurs'), p: [L('Apple M chips lead on battery and quiet power; Intel Core Ultra and AMD Ryzen AI run every Windows program and game; Snapdragon X gives long battery on Windows but some games and tools do not run.', 'Les puces Apple M dominent en autonomie et en puissance silencieuse ; Intel Core Ultra et AMD Ryzen AI font tourner tous les programmes et jeux Windows ; Snapdragon X donne une longue autonomie sous Windows mais certains jeux et outils ne fonctionnent pas.')] },
    { h: L('Graphics in laptops', 'Graphisme des portables'), p: [L('A laptop "RTX 5080" is slower than the desktop card, and its speed depends on the power the maker allows (TGP, in watts): a 175 W version can be 30-40 % faster than a thin 100 W one. Check the TGP in reviews.', 'Une « RTX 5080 » de portable est plus lente que la carte de bureau, et sa vitesse dépend de la puissance autorisée par le fabricant (TGP, en watts) : une version 175 W peut être 30-40 % plus rapide qu\'une version fine à 100 W. Vérifiez le TGP dans les tests.')] },
    { h: L('Screen, memory, ports, tablets', 'Écran, mémoire, ports, tablettes'), p: [L('OLED or Mini-LED screens look best; 120 Hz+ for games. Memory is often soldered: buy enough at the start (16 GB minimum, 32 GB for work). Thunderbolt/USB4 drives a dock and screens with one cable. Tablets: iPads have the most apps, Galaxy Tabs come with a pen, a Surface runs full Windows.', 'Les écrans OLED ou Mini-LED sont les plus beaux ; 120 Hz+ pour jouer. La mémoire est souvent soudée : prenez assez dès le départ (16 Go minimum, 32 Go pour travailler). Thunderbolt/USB4 alimente un dock et des écrans avec un seul câble. Tablettes : les iPad ont le plus d\'apps, les Galaxy Tab sont livrées avec un stylet, une Surface fait tourner Windows complet.')] }
  ],
  goals: [
    { g: L('Carry every day', 'Transporter tous les jours'), f: L('Under 1.4 kg, Apple M or Snapdragon X, 12+ hours of battery.', 'Moins de 1,4 kg, Apple M ou Snapdragon X, plus de 12 h d\'autonomie.') },
    { g: L('Gaming laptop', 'Portable gaming'), f: L('RTX 5070 Ti-5080 with a high TGP, 32 GB, a 16" 240 Hz screen; accept 2.5 kg and fan noise.', 'RTX 5070 Ti-5080 avec un TGP élevé, 32 Go, écran 16" 240 Hz ; acceptez 2,5 kg et le bruit des ventilateurs.') },
    { g: L('Creative work', 'Création'), f: L('MacBook Pro or a laptop with 32 GB+ and a calibrated OLED or Mini-LED screen.', 'MacBook Pro ou un portable avec 32 Go+ et un écran OLED ou Mini-LED calibré.') }
  ],
  traps: [L('Judging a gaming laptop by the card name alone.', 'Juger un portable gaming au seul nom de la carte.'), L('8 GB of soldered memory.', '8 Go de mémoire soudée.')],
  terms: [[L('TGP', 'TGP'), L('The power a laptop graphics chip may use; higher is faster.', 'La puissance qu\'une puce graphique de portable peut utiliser ; plus haut = plus rapide.')], [L('Thunderbolt / USB4', 'Thunderbolt / USB4'), L('A fast port for docks, screens and drives.', 'Un port rapide pour docks, écrans et disques.')]]
},
{
  id: 'other', go: { tab: 'choose', cat: 'watch' },
  t: L('Watches, consoles, projectors', 'Montres, consoles, projecteurs'),
  sub: L('Compatibility, ecosystems and the essentials of each.', 'Compatibilité, écosystèmes et l\'essentiel de chacun.'),
  intro: L('Three categories where one fact decides most of the choice: the phone you own (watches), the games you want (consoles), and how dark your room is (projectors).', 'Trois catégories où un fait décide de l\'essentiel du choix : le téléphone que vous avez (montres), les jeux que vous voulez (consoles), et l\'obscurité de la pièce (projecteurs).'),
  sections: [
    { h: L('Watches', 'Montres'), p: [L('An Apple Watch needs an iPhone; Samsung and Pixel watches need Android; Garmin, Huawei and Withings work with both. Smartwatches do apps and payments but last 1-3 days; sport watches (Garmin) last one to three weeks with dual-band GPS and training load.', 'Une Apple Watch demande un iPhone ; les montres Samsung et Pixel demandent Android ; Garmin, Huawei et Withings fonctionnent avec les deux. Les montres connectées font apps et paiements mais tiennent 1-3 jours ; les montres de sport (Garmin) tiennent une à trois semaines avec GPS bi-fréquence et charge d\'entraînement.')] },
    { h: L('Consoles', 'Consoles'), p: [L('PlayStation for Sony exclusives, Xbox for Game Pass (hundreds of games by subscription), Nintendo Switch 2 for Nintendo games at home and on the go, a Steam Deck or Windows handheld to play your PC library anywhere. A PS5 Pro shows its advantage on a 4K TV.', 'PlayStation pour les exclusivités Sony, Xbox pour le Game Pass (des centaines de jeux par abonnement), Nintendo Switch 2 pour les jeux Nintendo à la maison et en déplacement, un Steam Deck ou une console portable Windows pour emporter votre ludothèque PC. La PS5 Pro montre son avantage sur une TV 4K.')] },
    { h: L('Projectors', 'Projecteurs'), p: [L('Ultra short throw (UST) projectors sit against the wall and throw 100-150"; standard ones hang at the back of the room. Brightness is in ANSI or ISO lumens (2,000+ for a dim room, 3,000+ with some light). A grey ALR screen keeps contrast in a lit room. "4K" usually means pixel-shift; native 4K costs much more.', 'Les projecteurs ultra courte focale (UST) se posent contre le mur et projettent 100-150" ; les standards se placent au fond de la pièce. La luminosité s\'exprime en lumens ANSI ou ISO (2 000+ pour une pièce sombre, 3 000+ avec un peu de lumière). Un écran gris ALR garde le contraste dans une pièce éclairée. « 4K » signifie souvent pixel-shift ; la 4K native coûte bien plus cher.')] }
  ],
  goals: [
    { g: L('Running and training', 'Course et entraînement'), f: L('A Garmin with dual-band GPS.', 'Une Garmin avec GPS bi-fréquence.') },
    { g: L('Couch gaming without a PC', 'Jouer au salon sans PC'), f: L('PS5 Pro on a 4K TV, or Xbox with Game Pass.', 'PS5 Pro sur une TV 4K, ou Xbox avec Game Pass.') },
    { g: L('Cinema-size picture', 'Image grand écran'), f: L('A laser UST projector and an ALR screen.', 'Un projecteur laser UST et un écran ALR.') }
  ],
  traps: [L('An Apple Watch with an Android phone.', 'Une Apple Watch avec un téléphone Android.'), L('Comparing "lumens" from different standards.', 'Comparer des « lumens » de normes différentes.')],
  terms: [[L('Dual-band GPS', 'GPS bi-fréquence'), L('Two satellite frequencies: accurate tracks between buildings and trees.', 'Deux fréquences satellite : des traces précises entre immeubles et arbres.')], [L('UST', 'UST'), L('Ultra short throw: the projector sits a few centimetres from the wall.', 'Ultra courte focale : le projecteur se pose à quelques centimètres du mur.')], [L('ANSI lumens', 'Lumens ANSI'), L('A standard measure of projector brightness.', 'Une mesure normalisée de la luminosité des projecteurs.')]]
},
{
  id: 'buying', go: { tab: 'pulse' },
  t: L('Buying smart', 'Bien acheter'),
  sub: L('When to buy, where prices come from, warranty rights in Germany and France.', 'Quand acheter, d\'où viennent les prix, la garantie en Allemagne et en France.'),
  intro: L('The same product can cost 20-40 % less a few weeks later. Prisme\'s guide prices are marked "checked", "reported" or "estimate"; always open the price comparison before buying.', 'Le même produit peut coûter 20-40 % de moins quelques semaines plus tard. Les prix indicatifs de Prisme sont marqués « vérifié », « relevé » ou « estimation » ; ouvrez toujours le comparateur avant d\'acheter.'),
  sections: [
    { h: L('Timing', 'Le bon moment'), p: [L('Product cycles: new phones arrive in September (Apple), February (Samsung) and August (Google); TVs in spring; graphics cards about every two years. Sales: Black Friday week, Prime Day in July, 11.11, and in France the legal soldes in January and late June. During a shortage (graphics cards and memory in 2026), sales cut less than usual.', 'Cycles : les nouveaux téléphones arrivent en septembre (Apple), février (Samsung) et août (Google) ; les TV au printemps ; les cartes graphiques environ tous les deux ans. Promotions : semaine du Black Friday, Prime Day en juillet, le 11.11, et en France les soldes légales de janvier et de fin juin. Pendant une pénurie (cartes graphiques et mémoire en 2026), les promos baissent moins que d\'habitude.')] },
    { h: L('Prices', 'Les prix'), p: [L('Compare on Geizhals or idealo (Germany), idealo.fr or LeDénicheur (France). Watch for marketplace sellers abroad (warranty, returns) and "price before" figures that were never real.', 'Comparez sur Geizhals ou idealo (Allemagne), idealo.fr ou LeDénicheur (France). Méfiez-vous des vendeurs tiers à l\'étranger (garantie, retours) et des « anciens prix » jamais pratiqués.')] },
    { h: L('Your rights', 'Vos droits'), p: [L('Germany: two years of legal warranty from the seller; in the first year the seller must prove a fault was not there. France: two years, and for new goods the fault is presumed for the full two years. Online purchases can be returned within 14 days in both. A maker\'s warranty comes on top; Prisme tracks the dates in your gear.', 'Allemagne : deux ans de garantie légale du vendeur ; la première année, le vendeur doit prouver que le défaut n\'existait pas. France : deux ans, et pour un produit neuf le défaut est présumé pendant les deux ans. Les achats en ligne peuvent être retournés sous 14 jours dans les deux pays. La garantie constructeur s\'ajoute ; Prisme suit les dates dans votre matériel.')] }
  ],
  goals: [
    { g: L('Pay less', 'Payer moins'), f: L('Put it on the watch list with a target price; buy last year\'s model.', 'Mettez-le dans le suivi des prix avec un prix cible ; achetez le modèle de l\'an dernier.') },
    { g: L('No regrets', 'Aucun regret'), f: L('Check the successor\'s launch month and the return window.', 'Vérifiez le mois de sortie du successeur et le délai de retour.') }
  ],
  traps: [L('Grey imports without EU warranty.', 'Les imports parallèles sans garantie UE.'), L('Buying in the two months before a successor.', 'Acheter dans les deux mois avant un successeur.')],
  terms: [[L('Gewährleistung / garantie légale', 'Gewährleistung / garantie légale'), L('The seller\'s legal two-year liability.', 'La responsabilité légale de deux ans du vendeur.')], [L('Guide price', 'Prix indicatif'), L('Prisme\'s reference price, dated and marked with its confidence.', 'Le prix de référence de Prisme, daté et marqué selon sa fiabilité.')]]
}
];
