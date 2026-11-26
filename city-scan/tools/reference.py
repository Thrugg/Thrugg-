# Reference tables for the workbook.

IMPORTANCE = [
    (5, 'World icon', 'A first visit feels incomplete without it. Plan the trip around these.', 'Eiffel Tower, Louvre, Notre-Dame, Arc de Triomphe, Champs-Élysées, Sacré-Cœur & Montmartre, the Seine, Versailles'),
    (4, 'Major highlight', 'On almost every first-timer list; worth half a day or a dedicated trip.', "Orsay, Sainte-Chapelle, Palais Garnier, Panthéon, Invalides, the Marais, Luxembourg, Seine cruise, Galeries Lafayette at Christmas"),
    (3, 'Worth a detour', 'Excellent if it matches your interests or is on your way; strong for a second visit.', 'Rodin, Orangerie, Père-Lachaise, Catacombs, Canal Saint-Martin, Le Train Bleu, Angelina'),
    (2, 'Nice if nearby', 'A good add-on in the area or for a specific interest.', 'Rue Crémieux, Musée Grévin, Bouillon Pigalle, Deyrolle'),
    (1, 'Niche or personal', 'Specialist interest or a personal favourite.', 'Montmartre funicular'),
]

# Yearly calendar for the "seasonal layers" idea (typical timing; verify every year).
SEASONS = [
    ('January', 'Galette des rois (kings\' cake)', 'From ~6 Jan, all month', 'Every bakery', 'Seasonal food', 'Find the fève (charm) and wear the crown.'),
    ('January', 'Winter sales (soldes)', 'From early/mid Jan, ~4 weeks', 'Department stores, everywhere', 'Shopping', 'Official national dates each year.'),
    ('Jan–Feb', 'Chinese New Year parades', 'Late Jan–Feb (lunar calendar)', '13e (Chinatown), Belleville, Marais', 'Festival', ''),
    ('Feb–Mar', 'Salon international de l\'Agriculture', 'Late Feb–early Mar', 'Paris Expo Porte de Versailles', 'Fair', "France's farm show: food from every region."),
    ('Mar–Apr', 'Cherry blossoms', 'Late Mar–mid Apr', 'Parc de Sceaux, Champ de Mars, Square Jean-XXIII (behind Notre-Dame)', 'Nature', 'Peak lasts about 10 days.'),
    ('April', 'Paris Marathon', 'Early April (Sunday)', 'Champs-Élysées → Bois de Vincennes → Bois de Boulogne', 'Sport', 'Road closures.'),
    ('April', 'Giverny and seasonal gardens reopen; Versailles fountain shows begin', '1 Apr (Giverny); spring (Versailles)', 'Giverny, Versailles', 'Reopening', ''),
    ('May', 'European Night of Museums', 'A Saturday in mid-May', 'Most museums, free in the evening', 'Culture', ''),
    ('May', 'Fête du Pain (best croissant of Grand Paris announced)', 'Mid-May', 'Parvis de Notre-Dame', 'Food', ''),
    ('May–Jun', 'Roland-Garros (French Open tennis)', 'Late May–early June', 'Porte d\'Auteuil', 'Sport', ''),
    ('June', 'Nuit Blanche (all-night contemporary art)', 'Early June (moved from October in 2024)', 'All over Paris', 'Culture', 'Check the date each year.'),
    ('June', 'Fête de la Musique', '21 June', 'Every street', 'Festival', 'Free music everywhere, all night.'),
    ('June', 'Paris Pride (Marche des Fiertés)', 'Late June (Saturday)', 'Central Paris', 'Festival', ''),
    ('July', 'Bastille Day', '14 July', 'Champs-Élysées parade (morning), Eiffel Tower fireworks (night)', 'National holiday', 'Arrive hours early for the fireworks.'),
    ('Jul–Aug', 'Paris Plages (city beaches)', 'Mid-July–mid-August', 'Seine banks, Bassin de la Villette', 'Summer', ''),
    ('July', 'Tour de France finish', 'Late July (Sunday)', 'Champs-Élysées / Montmartre', 'Sport', ''),
    ('August', 'Summer closures', 'Mid-August, 2–4 weeks', 'Many small restaurants and bakeries', 'Practical', 'Check before going.'),
    ('September', 'European Heritage Days', '3rd weekend of September', 'Élysée, Senate, ministries and private mansions open', 'Culture', 'Rare chance to see official palaces.'),
    ('Sep–Oct', 'Paris Fashion Week (women)', 'Late Sep–early Oct (and late Feb–early Mar)', 'Around the city', 'Fashion', ''),
    ('October', 'Fête des Vendanges de Montmartre (grape harvest)', 'Around the 2nd weekend of October', 'Montmartre', 'Festival', ''),
    ('October', 'Art Basel Paris', 'October', 'Grand Palais', 'Art fair', ''),
    ('Oct–Nov', 'Salon du Chocolat', 'Late Oct–early Nov', 'Paris Expo Porte de Versailles', 'Food', ''),
    ('November', 'Beaujolais Nouveau', '3rd Thursday of November', 'Wine bars', 'Seasonal food', ''),
    ('November', 'Christmas lights switch-on and market openings', 'Mid–late November', 'Champs-Élysées, Montaigne, Vendôme, Haussmann', 'Christmas', 'See the Christmas 2026 sheet.'),
    ('November', 'Paris Photo', 'November', 'Grand Palais', 'Art fair', ''),
    ('December', 'Christmas season: windows, markets, rinks, light festivals, réveillon (24 Dec), Saint-Sylvestre (31 Dec)', 'All month', 'Everywhere', 'Christmas', 'See the Christmas 2026 sheet.'),
    ('December', 'Lyon Fête des Lumières', 'Around 8 December (4 nights)', 'Lyon (2h by TGV)', 'Light festival', '2026: 5–8 Dec.'),
]

PRACTICAL = [
    ('Metro, RER & bus tickets (2026)', 'Metro–Train–RER ticket €2.55 (valid 2h, not to the airports). Bus–Tram ticket €2.05 (no metro transfer). Day pass "Navigo Jour" €12.30. Paper tickets are no longer sold: buy a Navigo Easy card (€2) or tap a bank card or phone. Old cardboard tickets work in the metro until 14 Dec 2026.', 'https://plansdumetro.com/paris/tickets/'),
    ('Weekly pass', 'Navigo Semaine €32.40, Monday to Sunday only, all zones, including CDG, Orly, Versailles and Disneyland. Needs a Navigo Découverte card (€5 + an ID photo). Worth it if your stay covers most of a Mon–Sun week.', 'https://plansdumetro.com/paris/tickets/'),
    ('Airports', 'CDG: RER B (~35–50 min to the centre). Orly: metro line 14 (~25 min to Châtelet). Both cost a special €14 airport ticket; the €2.55 ticket is not valid to the airport stations.', 'https://cdgfacile.com/en/paris-transport-tickets/'),
    ('Strikes', 'An open-ended union notice (CGT-RATP) has covered metro strikes since 28 Sep 2026 (strike days on 5 and 17 Nov). No December date was announced as of mid-November. Check the RATP / Île-de-France Mobilités apps the evening before.', 'https://www.actu-alt-plus.com/idees-solutions/prochaine-greve-ratp-quand-apres-17-novembre-2026-preavis/43058/'),
    ('Non-EU price surcharge (since 14 Jan 2026)', 'Visitors who are not EU/EEA residents pay more at the Louvre (€32 vs €22), Sainte-Chapelle (€22 vs €16), Versailles, Opéra Garnier visits and Chambord. More sites may follow in 2027. Carry an ID or proof of residence.', 'https://www.euronews.com/2026/01/14/paris-louvre-leads-french-museums-in-raising-entry-fees-for-non-europeans'),
    ('Free under 26 (EU/EEA residents)', 'EU/EEA residents aged 18–25 enter national museums and monuments free (Louvre, Orsay, Versailles, Sainte-Chapelle, Arc de Triomphe, Panthéon, Conciergerie…). Under-18s are free for everyone. Bring ID; you usually still need a free timed ticket.', 'https://www.euronews.com/2026/01/14/paris-louvre-leads-french-museums-in-raising-entry-fees-for-non-europeans'),
    ('Free days in December 2026', 'Louvre: Fri 4 Dec evening (1st Friday). 1st Sunday, Sun 6 Dec: Orsay (booking), Arc de Triomphe, Panthéon, Versailles estate and other national sites (Nov–Mar).', 'https://parisjetaime.com/visiter-a-paris/paris-gratuit/musees-et-monuments-gratuits-a-paris/les-musees-et-monuments-gratuits-a-paris'),
    ('Paris Museum Pass', 'About €90 / €109 / €139 for 2 / 4 / 6 consecutive days (2026 guides; official price not confirmed). Covers ~50 sites (Louvre, Orsay, Versailles château, Arc, Sainte-Chapelle, Panthéon, Orangerie, Rodin, Invalides, Notre-Dame towers), but not the Eiffel Tower or temporary exhibitions. Worth it only for 3+ paid sites a day; under-26 EU residents do not need it.', 'https://www.nomadotravel.app/fr/guides/paris-museum-pass-worth-it'),
    ('Weekly closing days', 'Closed MONDAY: Orsay, Rodin, Picasso, Carnavalet, Petit Palais, Cluny, Marmottan, quai Branly, Versailles. Closed TUESDAY: Louvre, Orangerie, Fontainebleau, Chantilly, Grande Galerie de l\'Évolution, Fondation Louis Vuitton, Bourse de Commerce. Plan the Louvre on any day but Tuesday and Versailles on any day but Monday.', 'Official sites (check each)'),
    ('Holidays', '25 Dec and 1 Jan: most museums are closed, and shops and La Vallée Village are closed on 25 Dec. The Eiffel Tower, Notre-Dame and the Champs-Élysées stay open. 24 and 31 Dec: early closing for shops, rinks and markets. Book réveillon dinners (24 and 31 Dec) early.', 'Usual pattern: check each site'),
    ('Book ahead', 'Weeks ahead: Eiffel Tower summit, La Galerie Dior, Septime and fine dining, Moulin Rouge, Versailles "Parcours du Roi", Vaux-le-Vicomte. Days ahead: Louvre, Catacombs, Notre-Dame towers, Grand Palais rink, Sainte-Chapelle concerts. Notre-Dame cathedral: free slot about 2 days ahead, or queue.', ''),
    ('Scams & safety', 'Pickpockets on metro line 1, at Montmartre, Trocadéro and the Eiffel Tower. Ignore the "string bracelet" sellers on the Sacré-Cœur steps, the deaf-petition clipboards and the "found a gold ring" trick. Buy tickets only on official sites (Notre-Dame is free: paid "tickets" are fake).', ''),
    ('Weather in December', 'Usually 3–8 °C, often grey with frequent light rain; snow is rare. Pack layers, waterproof shoes and an umbrella, and keep indoor options (covered passages, museums, department stores) for rainy hours.', 'Climate normals (general)'),
    ('Restaurants', 'Lunch ~12:00–14:00, dinner from ~19:30; kitchens close in between. Book for Friday and Saturday. Many bistros close on Sunday and/or Monday. Service is included; rounding up or leaving a few euros is a kind extra, not an obligation. Ask for "une carafe d\'eau" for free tap water.', ''),
    ('Emergency numbers', '112 (EU emergency) · 17 police · 15 medical (SAMU) · 18 fire.', ''),
    ('Data used in this file', 'Coordinates: © OpenStreetMap contributors (ODbL), geocoded with Nominatim on 26 Nov 2026 (a few spots placed by hand: see the Location source column). Fame signal: number of Wikipedia language editions, from Wikidata (CC0). Sunrise and sunset computed for Paris with the NOAA algorithm (Python "astral" library).', 'https://www.openstreetmap.org/copyright'),
]
