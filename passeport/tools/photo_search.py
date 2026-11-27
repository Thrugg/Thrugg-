"""Targeted Commons searches for spots whose automatic photo was wrong or missing; prints candidates to choose from."""
import json, sys, time, urllib.error, urllib.parse, urllib.request

UA = 'passeport-build/0.1 (one-off photo lookup for a travel guide)'
Q = {
    'Statue of Liberty replica (Île aux Cygnes)': 'Statue de la Liberté île aux Cygnes',
    'Seine river cruise': 'bateau-mouche Seine Paris',
    "Rue de l'Université (Eiffel view)": "rue de l'Université tour Eiffel",
    'La Galerie Dior': 'Galerie Dior 30 Montaigne',
    'Pierre Hermé (Rue Bonaparte)': 'Pierre Hermé boutique',
    'Carette (Trocadéro)': 'Carette Trocadéro',
    'Poilâne': 'Poilâne Cherche-Midi',
    'Du Pain et des Idées': 'Du Pain et des Idées',
    'Philharmonie de Paris': 'Philharmonie de Paris façade',
    'Opéra Bastille / Palais Garnier performances': 'Opéra Bastille façade',
    'Bouquinistes on the Seine': 'bouquinistes Paris',
    'Rue du Calvaire (Montmartre steps)': 'rue du Calvaire Montmartre',
    'Place de la République': 'Place de la République Marianne statue',
    'Bouillon Pigalle': 'Bouillon Pigalle',
    'Rue des Martyrs & SoPi': 'rue des Martyrs Paris',
    'La Vallée Village (outlet)': 'La Vallée Village',
    'Benoit': 'Benoit restaurant rue Saint-Martin',
    'Breizh Café': 'Breizh Café Paris',
    'Café Lapérouse (Hôtel de la Marine)': 'Hôtel de la Marine Lapérouse',
    'Les Ombres (quai Branly rooftop)': 'Les Ombres restaurant quai Branly',
    'Chapelle du Saint-Esprit (30 rue Lhomond)': 'chapelle du Saint-Esprit rue Lhomond',
    'Le Jardin RH (RH Paris)': 'RH Paris Champs-Élysées',
    'Madame Brasserie (Eiffel Tower)': 'Tour Eiffel premier étage',
    'Little Red Door': 'Little Red Door bar Paris',
    'Cinéma Les Élysées Lincoln': 'Élysées Lincoln cinéma',
    'Cédric Grolet Opéra': 'Cédric Grolet',
    'Loulou': 'Musée des Arts décoratifs terrasse Rivoli',
    'BeauCoco (Palais Garnier)': 'Palais Garnier rotonde du glacier',
    'Jacques Genin': 'Jacques Genin chocolatier',
    'Merci': 'Merci concept store boulevard Beaumarchais',
}
out = {}
for spot, q in Q.items():
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(dict(action='query', format='json', list='search', srnamespace='6', srsearch=q + ' filetype:bitmap', srlimit='8'))
    for attempt in range(10):
        try:
            data = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=40))
            break
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503):
                raise
            time.sleep(int(e.headers.get('Retry-After') or 0) or 30 * (attempt + 1))
    out[spot] = [r['title'] for r in data.get('query', {}).get('search', [])]
    print('##', spot, '<-', q, flush=True)
    for t in out[spot]:
        print('   ', t[:110], flush=True)
    time.sleep(1.5)
json.dump(out, open('photo_search.json', 'w'), ensure_ascii=False, indent=1)
