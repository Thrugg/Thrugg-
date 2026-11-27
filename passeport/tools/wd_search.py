import json, os, time, urllib.error, urllib.parse, urllib.request
terms = {
 "Palais Garnier (Opéra)": "Palais Garnier", "Bois de Boulogne": "Bois de Boulogne",
 "Saint-Germain-des-Prés Church": "Abbaye de Saint-Germain-des-Prés", "Galeries Lafayette Haussmann": "Galeries Lafayette Haussmann",
 "Mont-Saint-Michel": "Mont-Saint-Michel", "Montmartre village walk": "Montmartre", "Lyon – Fête des Lumières": "Fête des Lumières",
 "Strasbourg (Christmas capital)": "Christkindelsmärik", "Le Marais": "Le Marais", "Latin Quarter": "Quartier latin",
 "Saint-Germain-des-Prés": "Saint-Germain-des-Prés", "Banks of the Seine walk (UNESCO)": "Paris, rives de la Seine",
 "Trocadéro esplanade (Palais de Chaillot)": "Palais de Chaillot", "Pont Alexandre III": "Pont Alexandre-III",
 "Printemps Haussmann": "Printemps Haussmann", "Giverny – Monet's house & gardens (closed in December)": "Fondation Claude Monet",
 "Trianon & Marie-Antoinette's Estate": "Petit Trianon", "La Vallée Village (outlet)": "La Vallée Village",
 "Rue Mouffetard": "rue Mouffetard", "Rue Cler": "rue Cler", "Ladurée (Champs-Élysées)": "Ladurée", "Pierre Hermé (Rue Bonaparte)": "Pierre Hermé",
 "Poilâne": "Poilâne", "Mariage Frères (Marais)": "Mariage Frères", "La Grande Épicerie de Paris": "La Grande Épicerie de Paris",
 "Deyrolle": "Deyrolle", "Harry's New York Bar": "Harry's New York Bar", "Bouquinistes on the Seine": "bouquinistes de Paris",
 "Avenue Montaigne & Dior 30 Montaigne": "avenue Montaigne", "Rue du Faubourg Saint-Honoré": "rue du Faubourg-Saint-Honoré",
 "Statue of Liberty replica (Île aux Cygnes)": "Statue de la Liberté (Paris)", "Belleville": "Belleville (Paris)",
 "Le Relais de l'Entrecôte": "Le Relais de l'Entrecôte", "Cédric Grolet Opéra": "Cédric Grolet", "Du Pain et des Idées": "Du Pain et des Idées",
 "E. Dehillerin": "E. Dehillerin", "Rue des Martyrs & SoPi": "rue des Martyrs", "Seine river cruise": "Bateaux-Mouches",
}
out = json.load(open('wd_search.json')) if os.path.exists('wd_search.json') else {}
for k, t in terms.items():
    if k in out:
        continue
    url = 'https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode(dict(action='wbsearchentities', search=t, language='fr', uselang='en', format='json', limit=3))
    for attempt in range(10):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'city-spots-research/0.1 (tourist-sight fame check)'}), timeout=30))
            break
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            w = int(e.headers.get('Retry-After') or 0) or 45 * (attempt + 1)
            print('429 wait', w, flush=True); time.sleep(w)
    out[k] = [(x['id'], x.get('label', ''), x.get('description', '')) for x in r.get('search', [])]
    json.dump(out, open('wd_search.json', 'w'), ensure_ascii=False, indent=1)
    print(k[:40], '=>', ' | '.join(f"{a} {b} ({c[:45]})" for a, b, c in out[k]), flush=True)
    time.sleep(3)
print('done')
