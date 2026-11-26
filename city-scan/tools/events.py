# Time-bound events (Christmas 2026 season). `spot` links to a spot name (for coordinates); `q` geocodes otherwise.
# conf: 'Confirmed' (official source or 2+ consistent sources) / 'One source' / 'Not confirmed'

def E(name, etype, start, end, imp, spot=None, q=None, pc=None, hours='', price='', conf='Confirmed', notes='', src=''):
    return dict(name=name, type=etype, start=start, end=end, imp=imp, spot=spot, q=q, pc=pc, hours=hours, price=price, conf=conf, notes=notes, src=src)

SRC_MARKETS = 'https://bulletindescommunes.net/marches-de-noel-paris-2026-dates/'

EVENTS = [
# --- Windows, trees & decorations ---
E('Galeries Lafayette: tree under the dome & windows "Au cœur de Noël" (J.-C. de Castelbajac)', 'Windows & tree', '2026-11-12', '2027-01-03', 5, spot='Galeries Lafayette Haussmann',
  hours='Store hours', price='Free', notes='End date given as 3 Jan by some sources and 5 Jan by others. The tree has divided opinion online.', src='https://lapistacheparis.com/evenements/sapin-noel-galeries-lafayette-2026/'),
E('Printemps Haussmann windows "Un Noël bien tricoté"', 'Windows & tree', '2026-11-10', '2027-01-03', 5, spot='Printemps Haussmann',
  hours='Visible from the pavement', price='Free', conf='One source', notes='Start date varies by source (5 or 10 Nov); the inauguration was postponed as a precaution during demonstrations. Visible until 3 Jan.',
  src='https://www.jds.fr/paris/actu/noel-2026-au-printemps-haussmann-des-vitrines-feeriques-et-un-noel-bien-tricote-a-paris-1814083_A'),
E('Le Bon Marché "Village Noël"', 'Windows & tree', '2026-10-24', '2026-12-31', 3, spot='Le Bon Marché Rive Gauche', hours='Store hours', price='Free',
  src='https://www.arts-in-the-city.com/243431-les-plus-belles-vitrines-de-noel-a-voir-a-paris'),
E('La Samaritaine "Balade de Noël" decorations market', 'Windows & tree', '2026-11-04', '2027-01-05', 2, spot='La Samaritaine', hours='Store hours', price='Free', conf='One source',
  notes='Only one source reports it; others say nothing has been announced.', src='https://www.arts-in-the-city.com/243431-les-plus-belles-vitrines-de-noel-a-voir-a-paris'),
E('Dior 30 Montaigne: Christmas façade & animated windows ("Christian Dior\'s Night in Color")', 'Windows & tree', '2026-11-14', '2027-01-04', 4, spot='Avenue Montaigne & Dior 30 Montaigne',
  hours='Evenings for the light show', price='Free', conf='One source', notes='End date not published; Dior usually keeps it into early January.',
  src='https://www.sortiraparis.com/en/news/christmas-and-holidays/articles/336487-dior-s-2026-christmas-lights-a-light-show-and-animated-window-displays-at-30-montaigne-opening-hours'),
E('Place Vendôme: eight 10 m fir trees, light arches and jewellers\' façades', 'Lights', '2026-11-17', '2027-01-11', 5, spot='Place Vendôme', hours='Evenings', price='Free', conf='One source',
  notes='Several sites give 17 Nov–11 Jan; one says the dates are still to be confirmed.', src='https://www.sortiraparis.com/actualites/noel-et-fetes/articles/335505-illuminations-de-noel-a-paris-le-calendrier-2026-des-lancements-dans-la-capitale'),
E('Hôtel de Crillon: Jules Verne festive season', 'Windows & tree', '2026-11-25', '2027-01-04', 2, q='Hôtel de Crillon, Paris', pc='75008', hours='', price='Free to look', conf='Not confirmed',
  notes='Festive theme inspired by Jules Verne\'s "Voyages Extraordinaires"; submarine bûche by Matthieu Carlin from 15 Dec. Exact décor dates not published.',
  src='https://www.rosewoodhotels.com/en/global/media-hub/press-releases/hotel-de-crillon-celebrates-the-holidays-in-paris-with-a-jules-verne-inspired-se/'),

# --- Street illuminations ---
E('Champs-Élysées illuminations', 'Lights', '2026-11-22', '2027-01-03', 5, spot='Avenue des Champs-Élysées', hours='17:00–01:00 (all night on 24 & 31 Dec)', price='Free',
  notes='Switched on Sun 22 Nov 2026 (godmother: Cate Blanchett). End date 3 or 4 Jan depending on source.', src='https://parisjetaime.com/eng/event/illuminations-des-champs-elysees-e221'),
E('Avenue Montaigne illuminations', 'Lights', '2026-11-19', '2027-01-04', 4, spot='Avenue Montaigne & Dior 30 Montaigne', hours='Evenings', price='Free', conf='One source',
  notes='End date not published.', src='https://www.sortiraparis.com/en/news/christmas-and-holidays/articles/336487-dior-s-2026-christmas-lights-a-light-show-and-animated-window-displays-at-30-montaigne-opening-hours'),
E('Rue du Faubourg Saint-Honoré lights & luxury windows', 'Lights', None, None, 3, spot='Rue du Faubourg Saint-Honoré', hours='Evenings', price='Free', conf='Not confirmed',
  notes='Lit every year from late November; 2026 dates not found.'),

# --- Christmas markets ---
E('Champs-Élysées Christmas market (back after ~10 years)', 'Christmas market', '2026-11-22', '2027-01-04', 4, spot='Avenue des Champs-Élysées',
  hours='~10:00–22:00 (Fri–Sun to 23:00); 24 Dec until 20:00; closed 31 Dec', price='Free', notes='About 200 chalets in the gardens at the bottom of the avenue (Concorde → Rond-Point). Hours differ between sources.',
  src='https://agenda.parisjetaime.com/marche-de-noel-des-champs-elysees-grand-retour-en-2026/'),
E('Tuileries "La Magie de Noël" (market, ice rink, fairground)', 'Christmas market', '2026-11-14', '2027-01-03', 4, spot='Jardin des Tuileries', hours='Daily 11:00–23:45', price='Free entry; rides paid',
  src=SRC_MARKETS),
E('Notre-Dame Christmas market (Square René-Viviani)', 'Christmas market', '2026-11-26', '2026-12-27', 4, q='Square René Viviani, Paris', pc='75005', hours='10:00–20:00 (Fri & Sat to 21:00)', price='Free',
  notes='Dates from the City of Paris.', src=SRC_MARKETS),
E('La Défense Christmas market (largest in Île-de-France) & ice rink', 'Christmas market', '2026-11-12', '2026-12-31', 3, spot='La Défense & Grande Arche', hours='Daily', price='Free',
  notes='300+ chalets. Some sources give 3 Jan 2027 as the end.', src=SRC_MARKETS),
E('Gare de l\'Est Alsace Christmas market', 'Christmas market', '2026-12-02', '2026-12-18', 2, q='Gare de l\'Est, Paris', pc='75010', hours='', price='Free', conf='Not confirmed',
  notes='Announced dates, not officially confirmed.', src=SRC_MARKETS),
E('Saint-Germain-des-Prés Christmas market', 'Christmas market', None, None, 3, spot='Saint-Germain-des-Prés Church', hours='', price='Free', conf='Not confirmed',
  notes='Usually late Nov–late Dec (2025: 25 Nov–1 Jan). 2026 dates TBC.', src=SRC_MARKETS),
E('Montmartre Christmas market', 'Christmas market', None, None, 2, spot='Montmartre village walk', hours='', price='Free', conf='Not confirmed', notes='Usually late Nov–late Dec. 2026 dates TBC.', src=SRC_MARKETS),

# --- Ice rinks ---
E('Grand Palais des Glaces (ice rink under the glass nave, 16 m moon)', 'Ice rink', '2026-12-12', '2027-01-06', 5, spot='Grand Palais',
  hours='Sessions 10–13, 14–19, 20–01; closes 18:00 on 24 & 31 Dec', price='Adults €27 morning / €32 afternoon / €39 night', notes='Online tickets only. Some sources say it starts 13 Dec.',
  src='https://fugace.media/rendez-vous/grand-palais-des-glaces'),
E('Galeries Lafayette rooftop ice rink', 'Ice rink', '2026-11-24', '2027-01-03', 3, spot='Galeries Lafayette rooftop terrace', hours='Store hours', price='Paid',
  src='https://www.parisselectbook.com/2026/11/16/ce-palace-parisien-rouvre-sa-patinoire-avec-chalet-raclette-des-le-26-novembre/'),
E('Plaza Athénée courtyard ice rink & raclette chalet', 'Ice rink', '2026-11-26', '2027-01-31', 3, q='Hôtel Plaza Athénée, Paris', pc='75008', hours='', price='Paid',
  notes='About 100 m² of real ice in the palace courtyard on Avenue Montaigne.', src='https://www.parisselectbook.com/2026/11/16/ce-palace-parisien-rouvre-sa-patinoire-avec-chalet-raclette-des-le-26-novembre/'),
E('"Patins en Folie" rink & "Féeries de Noël" light show, Parc André-Citroën', 'Ice rink', '2026-11-21', '2027-01-03', 2, spot='Parc André-Citroën & Ballon de Paris', hours='Light show from 4 Dec',
  price='Paid', src='https://www.paris-friendly.fr/patins-en-folie-patinoire-parc-andre-citroen-2026.html'),

# --- Light festivals ---
E('Jardin d\'Acclimatation lantern festival "Nuits Indiennes"', 'Light festival', '2026-11-27', '2027-02-21', 4, spot="Jardin d'Acclimatation", hours='18:00–21:30 (last entry 21:00)', price='~€18 dated ticket',
  src='https://www.sortiraparis.com/en/what-to-visit-in-paris/walks/articles/301085-indian-nights-the-jardin-d-acclimatation-s-2026-light-trail-takes-us-to-india'),
E('Jardin des Plantes winter light festival 2026–27', 'Light festival', None, None, 2, spot='Jardin des Plantes', hours='', price='', conf='Not confirmed',
  notes='The 2025–26 edition ran 12 Nov 2025–18 Jan 2026. No official 2026–27 announcement, and one listing marks it cancelled.', src='https://www.jardindesplantesdeparis.fr/fr/illuminations'),
E('Lyon Fête des Lumières', 'Light festival', '2026-12-05', '2026-12-08', 4, spot='Lyon – Fête des Lumières', hours='~18:00–00:00', price='Free', notes='~2h by TGV. Book the train early.',
  src='https://www.lyon.fr/node/952681'),

# --- Châteaux, parks & out of town ---
E('Versailles "Le Parcours du Roi" (evening show-visit, Marie-Antoinette & Père Noël)', 'Show', '2026-12-12', '2027-01-02', 4, spot='Palace of Versailles', hours='Departures 18:00–20:05, ~1h10',
  price='Paid (check)', src='https://www.arts-in-the-city.com/275169-le-parcours-du-roi-2026-au-chateau-de-versailles-marie-antoinette-fete-noel'),
E('Versailles Royal Chapel Christmas concerts', 'Concert', '2026-12-05', '2026-12-19', 3, spot='Palace of Versailles',
  hours='5 Dec Charpentier & Bach · 11 Dec Bach Christmas Oratorio · 12–13 Dec Handel Messiah · 19 Dec Vivaldi Gloria', price='Paid (check)', src='https://78.agendaculturel.fr/chateau-de-versailles'),
E('Vaux-le-Vicomte "Le Grand Noël" (9 stops round the world, projection, ice rink)', 'Christmas at a château', '2026-11-14', '2027-01-03', 4, spot='Château de Vaux-le-Vicomte',
  hours='~10:30–20:00; closed 25 Dec & 1 Jan, and Mon–Tue outside school holidays', price='€25.90–27.90 adult; rink €5', notes='Online booking required.',
  src='https://vaux-le-vicomte.com/en/news/grand-noel-at-vaux-le-vicomte-2026-free-child-ticket/'),
E('Chantilly equestrian show "Le Noël oublié"', 'Show', '2026-11-28', '2027-01-03', 3, spot='Château de Chantilly & Grandes Écuries', hours='Check schedule', price='Paid',
  src='https://www.paris-friendly.fr/noel-oublie-spectacle-equestre-chantilly.html'),
E('Disneyland Paris "Disney Enchanted Christmas" (now in World of Frozen too)', 'Theme park season', '2026-11-07', '2027-01-06', 3, spot='Disneyland Paris', hours='Park hours', price='Park ticket',
  src='https://www.sortiraparis.com/en/news/christmas-and-holidays/articles/44467-christmas-2026-at-disneyland-paris-dates-and-schedule-of-the-enchanted-christmas-at-disney-with-world-of-frozen'),
E('Strasbourg Christkindelsmärik', 'Christmas market', '2026-11-27', '2026-12-24', 4, spot='Strasbourg (Christmas capital)', hours='11:30–21:00 (24 Dec to 18:00)', price='Free',
  src='https://www.parisselectbook.com/en/2026/11/11/strasbourg-opens-its-christmas-markets-on-27-november-and-colmar-from-23-november-2026/'),
E('Reims Christmas market', 'Christmas market', '2026-11-25', '2026-12-27', 3, spot='Reims (cathedral & champagne houses)', hours='Closed 25 Dec', price='Free',
  notes='~150 chalets at the Hautes Promenades, not on the cathedral square.', src='https://www.thewomtravel.fr/france/marche-noel-reims-2026-dates-horaires-chalets-tgv-paris.html'),
E('Reims "Regalia" light show on the cathedral façade', 'Light festival', '2026-11-27', '2027-01-02', 3, spot='Reims (cathedral & champagne houses)', hours='20:00 on selected dates (mostly Fri & Sat; not 12 Dec)',
  price='Free', src='https://www.thewomtravel.fr/france/marche-noel-reims-2026-dates-horaires-chalets-tgv-paris.html'),

# --- Masses, concerts & shows ---
E('Notre-Dame Christmas Eve masses (16:00, 18:00, 20:00, 23:00 vigil, midnight)', 'Mass', '2026-12-24', '2026-12-24', 5, spot='Notre-Dame de Paris',
  hours='Arrive 30 min early; entrance in the centre of the parvis', price='Free, no booking', notes='Beware of fake paid tickets: no platform is authorised to sell access.',
  src='https://www.notredamedeparis.fr/en/christmas-2026-a-notre-dame-de-paris/'),
E('Notre-Dame Christmas Day masses (8:30, 10:00, 11:30; Lauds 9:30)', 'Mass', '2026-12-25', '2026-12-25', 4, spot='Notre-Dame de Paris', hours='', price='Free, no booking',
  src='https://www.notredamedeparis.fr/en/christmas-2026-a-notre-dame-de-paris/'),
E('Sainte-Chapelle Christmas concerts (Four Seasons, Messiah, carols)', 'Concert', '2026-12-18', '2026-12-29', 4, spot='Sainte-Chapelle', hours='Mostly 18:00; carols 24 & 26 Dec; Messiah 19–20 Dec',
  price='~€20–60', conf='One source', notes='Aggregator listings with some inconsistencies; book with an official seller.', src='https://75.agendaculturel.fr/la-sainte-chapelle'),
E('Nutcracker ballet, Palais des Congrès', 'Show', '2026-12-23', '2027-01-10', 2, q='Palais des Congrès de Paris', pc='75017', hours='', price='From €48',
  notes='Not the Paris Opera Ballet. Its Dec 2026 programme was not checked here.', src='https://www.offi.fr/theatre/palais-des-congres-2908/casse-noisette-100163.html'),
E('Cirque d\'Hiver Bouglione "Volte"', 'Show', '2026-10-10', '2027-03-07', 2, spot='Cirque d\'Hiver Bouglione – "Volte"', hours='2h show', price='Paid',
  src='https://75.agendaculturel.fr/arts-du-spectacle/volte.html'),
E('New Year\'s Eve on the Champs-Élysées: projection on the Arc de Triomphe & midnight fireworks', 'Fireworks', '2026-12-31', '2026-12-31', 5, spot='Arc de Triomphe',
  hours='Projection ~23:50, fireworks at midnight (2026 programme not yet published)', price='Free', conf='Not confirmed',
  notes='Huge crowds and security perimeter; the Champs-Élysées market is closed on 31 Dec.', src='https://presse.paris.fr/communiques/nouvel-an-sur-les-champs-elysees-le-programme-des-festivites'),

# --- Food of the season ---
E('Palace bûches de Noël 2026 (Plaza Athénée, Peninsula, Shangri-La, Crillon, Ritz…)', 'Seasonal food', '2026-12-01', '2026-12-31', 3, q='Hôtel Plaza Athénée, Paris', pc='75008',
  hours='Order ahead; collection mostly in Dec', price='€120–290',
  notes='Plaza Athénée "Au pied du sapin" €180 · Peninsula "L\'Épi de Blé" €120 · Shangri-La "La Feuille de Chêne" €128 · Crillon submarine (from 15 Dec) · Ritz Le Comptoir "Carrousel" €290.',
  src='https://larevuedeshotels.com/en/paris-palace-hotels-christmas-yule-logs-2026-prices'),
E('Oysters, roast chestnuts, vin chaud & foie gras season', 'Seasonal food', '2026-12-01', '2026-12-31', 3, spot='Le Baron Rouge', hours='', price='',
  notes='Roast-chestnut sellers by metro exits, mulled wine at the markets, oysters at their best. The galette des rois appears from early January.'),

# --- Free days & exhibitions ---
E('Louvre free evening (1st Friday of the month)', 'Free day', '2026-12-04', '2026-12-04', 3, spot='Louvre Museum', hours='Evening opening (booking advised)', price='Free',
  src='https://ulysse.com/news/paris-lance-les-dimanches-gratuits-dans-ses-musees-comment-en-profiter-facilement'),
E('1st Sunday free: Orsay (booking), Arc de Triomphe, Panthéon, Versailles estate & others', 'Free day', '2026-12-06', '2026-12-06', 3, spot="Musée d'Orsay", hours='Book a slot where required', price='Free',
  src='https://parisjetaime.com/visiter-a-paris/paris-gratuit/musees-et-monuments-gratuits-a-paris/les-musees-et-monuments-gratuits-a-paris'),
E('Grand Palais exhibition "Girls"', 'Exhibition', '2026-12-09', '2027-03-21', 2, spot='Grand Palais', hours='', price='Paid', src='https://expo.paris/quelles-expos-voir-a-paris-en-decembre'),
E('Musée d\'Orsay "Mary Cassatt"', 'Exhibition', '2026-10-01', '2027-01-31', 3, spot="Musée d'Orsay", hours='', price='Included', conf='One source', notes='Start date approximate.',
  src='https://expo.paris/quelles-expos-voir-a-paris-en-decembre'),
E('Louvre "Les Hôtes du Louvre: Kader Attia & Elizabeth Peyton"', 'Exhibition', None, '2026-12-14', 2, spot='Louvre Museum', hours='', price='Included', src='https://expo.paris/quelles-expos-voir-a-paris-en-decembre'),
E('Louvre "Le trésor du Louvre"', 'Exhibition', None, '2026-12-19', 2, spot='Louvre Museum', hours='', price='Included', src='https://expo.paris/quelles-expos-voir-a-paris-en-decembre'),

# --- Closures to plan around ---
E('Christmas Day closures (Louvre, Orsay, Versailles, Sainte-Chapelle, many museums; shops, La Vallée Village)', 'Closure', '2026-12-25', '2026-12-25', 4, spot='Louvre Museum',
  hours='The Eiffel Tower, Notre-Dame and the Champs-Élysées stay open', price='', conf='Not confirmed', notes='Usual pattern; check each site. Plan an outdoor or church day on 25 Dec.'),
E('New Year\'s Day closures (Louvre, Versailles, Vaux, many museums)', 'Closure', '2027-01-01', '2027-01-01', 3, spot='Palace of Versailles', hours='', price='', conf='Not confirmed',
  notes='Usual pattern; check each site.'),
E('Early closing on 24 & 31 Dec (shops, rinks, markets)', 'Closure', '2026-12-24', '2026-12-31', 2, spot='Galeries Lafayette Haussmann', hours='e.g. Grand Palais rink 18:00, Champs market 20:00 on 24 Dec',
  price='', conf='Not confirmed', notes='Usual pattern; check each site.'),
E('Monet\'s Giverny closed for the season', 'Closure', '2026-11-02', '2027-03-31', 2, spot="Giverny – Monet's house & gardens (closed in December)", hours='', price='',
  notes='2026 season ended 1 Nov.', src='https://claudemonetgiverny.fr/en/useful-information/'),
E('Tour Montparnasse observatory closed for works', 'Closure', '2026-03-31', None, 2, spot='Tour Montparnasse observatory (closed)', hours='', price='', notes='Closed for several years.',
  src='https://www.lasourisglobe-trotteuse.fr/tour-montparnasse/'),
E('Old cardboard metro tickets accepted for the last time', 'Practical', '2026-12-14', '2026-12-14', 2, q='Châtelet, Paris', pc='75001', hours='', price='',
  notes='Paper tickets are no longer sold; leftover cardboard tickets work in the metro until 14 Dec 2026. Use a Navigo Easy card (€2) or contactless.', src='https://plansdumetro.com/paris/tickets/'),
]
