/* The Funds Ladder — English and French. {name} is replaced; [one|many] picks a form from n. */
const EN = {
  'tab.ladder': 'Ladder', 'tab.car': '812 maths', 'tab.log': 'Log', 'tab.settings': 'Settings',
  'common.cancel': 'Cancel', 'common.done': 'Done',
  'shell.update': 'A new version is ready.', 'shell.reload': 'Reload', 'shell.saveFail': 'This device refused to save. Free some storage, or export a backup from Settings.',
  'kind.safety': 'Emergency fund', 'kind.move': 'Move buffer', 'kind.dog': 'Dog, first year', 'kind.events': 'Weddings and travel', 'kind.etf': 'ETF core', 'kind.car': 'Supercar days', 'kind.custom': 'Another target',
  'move.p0': 'Rental deposit', 'move.p1': 'Double rent', 'move.p2': 'Removal and travel',
  'ex.banner': 'An example ladder with invented amounts. Tap a rung to make it yours, or start clean.', 'ex.off': 'Remove the examples', 'ex.on': 'Add the example rungs back',
  'next.k': 'Your next target', 'next.sub': '{v} to go.', 'next.when': 'Reached in {m} at {a} a month.', 'next.noPace': 'Set a monthly amount to see when.',
  'next.none': 'No rungs yet', 'next.noneSub': 'Add your first target: what it is, how much, and by when.', 'next.done': 'Every rung is reached', 'next.doneSub': 'Add the next target, or raise one of them.',
  'pace.monthly': 'You put aside each month', 'pace.rule': 'Shared between rungs', 'pace.order': 'One after the other', 'pace.pct': 'By shares',
  'late.order': '[{name} would be reached after its date|{n} rungs would be reached after their date] at this pace. Reorder the ladder, switch to shares, or put aside about {v} a month for the dated rungs.',
  'late.pct': '[{name} would be reached after its date|{n} rungs would be reached after their date] with these shares. Change the shares, or put aside about {v} a month for the dated rungs.',
  'wall.top': '{s} of {t} climbed', 'wall.ground': 'Start here',
  'rung.add': '+ Add a rung', 'rung.full': 'Reached', 'rung.paused': 'Paused', 'rung.linked': 'from Safety Net Score', 'rung.share': '+{v} this month', 'rung.when': 'reached {m}', 'rung.never': 'nothing reaches it yet',
  'rung.due': 'wanted by {m}: on time', 'rung.dueLate': 'wanted by {m}: {n} [month|months] late', 'rung.dueMiss': 'wanted by {m}: not reached',
  'ladder.note': 'A planning aid, not advice. Amounts are yours and stay in this browser and in your own account.',
  'edit.h': 'Rung {n}', 'edit.up': 'Later', 'edit.down': 'Sooner', 'edit.pause': 'Pause', 'edit.resume': 'Resume', 'edit.del': 'Delete this rung',
  'f.kind': 'What is it for', 'f.name': 'Name', 'f.namePh': 'Leave empty to use the kind as its name', 'f.target': 'Target', 'f.saved': 'Already set aside', 'f.due': 'Wanted by', 'f.dueHint': 'Optional. The ladder says whether your pace gets there.', 'f.pct': 'Share', 'f.pctHint': 'Used with “By shares”.', 'f.parts': 'What the target is made of',
  'part.start': 'Build the target from several lines', 'part.add': '+ Add a line', 'part.label': 'What', 'part.amt': 'Amount', 'part.del': 'Remove this line', 'part.n': 'Line {n}', 'part.sum': 'Target: {v}',
  'link.use': 'Take the figures from Safety Net Score', 'link.off': 'Type the target and what you have yourself.', 'link.none': 'Safety Net Score holds no figures of yours on this device yet.', 'link.on': 'Cash savings {s}, “Excellent” level {t}. Update them there.', 'link.onNoLevel': 'Cash savings {s}. Open Safety Net Score once so it shares its “Excellent” level; until then the target typed here is used.', 'link.cur': 'Safety Net Score is in another currency, so the figures typed here are used.', 'link.open': 'Open Safety Net Score',
  'add.h': 'Add a rung', 'add.go': 'Add',
  'alloc.cta': 'Put this month’s {v} on the ladder', 'alloc.h': 'Where this month’s {v} goes', 'alloc.subOrder': 'One rung after the other, lowest first.', 'alloc.subPct': 'By shares; a rung that fills up hands the rest to the others.', 'alloc.left': 'Left over: every rung is reached', 'alloc.linked': 'in Safety Net Score', 'alloc.linkedNote': 'The emergency fund is read from Safety Net Score: add this part to your cash savings there.', 'alloc.yes': 'Confirm', 'alloc.done': '{v} on the ladder',
  'car.k': 'Own it or rent it', 'car.h1': 'The same money rents one for {n} days a year', 'car.sub': 'A year of owning costs {v} in lost value, insurance and servicing. A premium rental day costs {d}.',
  'car.need': 'Fill in the yearly costs and the price of a rental day.', 'car.own': 'Owned', 'car.rent': 'Rented', 'car.perDay': 'per day actually driven',
  'car.verdictRent': 'For {d} days of driving a year, renting leaves {v} a year for the ladder.', 'car.verdictOwn': 'For {d} days of driving a year, owning is cheaper by {v} a year, before the money tied up in the car.',
  'car.inputs': 'The figures', 'car.f.dep': 'Value lost per year', 'car.f.ins': 'Insurance per year', 'car.f.service': 'Service, tyres and tax per year', 'car.f.day': 'One premium rental day', 'car.f.days': 'Days you would really drive it', 'car.u.days': 'days',
  'car.note': 'Typed by hand for now. The money tied up in the car, and what it would earn elsewhere, is left out: counting it would favour renting further.', 'car.ex': 'Invented figures. Replace them with a real car and a real rental quote.',
  'log.h1': 'What went on the ladder', 'log.empty': 'Nothing yet. On the Ladder tab, “Put this month’s amount on the ladder” records it here.', 'log.sub': '{n} [entry|entries], {v} in total.', 'log.undo': 'Undo this entry', 'log.undone': 'Entry undone',
  'set.h1': 'Settings', 'set.lang': 'Language', 'set.cur': 'Currency', 'set.sync': 'Sync', 'set.ideas': 'Ideas inbox', 'set.data': 'Your data',
  'sync.none': 'Sync is not set up on this site.', 'sync.off': 'Not signed in. Your ladder is saved on this device only.', 'sync.on': 'Signed in as {e}. Your ladder is saved to your account and follows you to your other devices.', 'sync.signin': 'Sign in to sync', 'sync.manage': 'Account', 'sync.private': 'Your amounts stay in this browser and in your own account. They are never part of the public code of this site.',
  'ideas.sub': 'Something missing or annoying while you use the app? Note it in your “Apps ideas inbox” file; the weekly review reads it. Paste the link to that file once and every app on this device will offer it.', 'ideas.link': 'Link to the file', 'ideas.open': 'Open the inbox',
  'data.export': 'Export a backup', 'data.import': 'Import a backup', 'data.imported': 'Backup imported', 'data.importFail': 'That file is not a Funds Ladder backup', 'data.reset': 'Delete everything',
  'reset.h': 'Delete the whole ladder?', 'reset.sub': 'This empties the ladder and its log on this device and, once it syncs, in your account. The examples come back.', 'reset.yes': 'Delete everything',
  'rung.linkedGG': 'from Gains & Greeks', 'rung.ret': '+{r} % a year',
  'link.useMove': 'Take the target from Safety Net Score’s move planner', 'link.offMove': 'Type the target yourself, or split it into parts.', 'link.noneMove': 'The move planner in Safety Net Score has no plan of yours on this device yet.', 'link.onMove': 'The move needs {t} on the day you leave ({g} to arrive with a Good safety net). What you set aside stays here.',
  'link.useGG': 'Take what is invested from Gains & Greeks', 'link.offGG': 'Type what is already invested yourself.', 'link.noneGG': 'Gains & Greeks holds no capital invested on this device yet.', 'link.onGG': 'Capital invested: {s}, from its tax desk. Update it there; this month’s money is not added here.', 'link.openGG': 'Open Gains & Greeks',
  'f.ret': 'Expected return', 'f.retHint': 'Optional, % a year on what is already in the rung: about 5–7 for an equity ETF, your savings rate for cash.',
  'set.infl': 'Inflation on targets', 'infl.sub': 'Targets grow by this much a year in the projection, so far-off rungs stay honest in today’s money. 2 % is the euro-area aim; 0 turns it off.'
};
const FR = {
  'tab.ladder': 'Échelle', 'tab.car': 'Calcul 812', 'tab.log': 'Journal', 'tab.settings': 'Réglages',
  'common.cancel': 'Annuler', 'common.done': 'Terminé',
  'shell.update': 'Une nouvelle version est prête.', 'shell.reload': 'Recharger', 'shell.saveFail': 'Cet appareil a refusé d’enregistrer. Libérez de l’espace, ou exportez une sauvegarde depuis les Réglages.',
  'kind.safety': 'Fonds d’urgence', 'kind.move': 'Réserve de déménagement', 'kind.dog': 'Chien, première année', 'kind.events': 'Mariages et voyages', 'kind.etf': 'Socle ETF', 'kind.car': 'Journées supercar', 'kind.custom': 'Autre objectif',
  'move.p0': 'Dépôt de garantie', 'move.p1': 'Double loyer', 'move.p2': 'Déménagement et trajets',
  'ex.banner': 'Une échelle d’exemple aux montants inventés. Touchez un barreau pour le faire vôtre, ou partez de zéro.', 'ex.off': 'Retirer les exemples', 'ex.on': 'Remettre les barreaux d’exemple',
  'next.k': 'Votre prochain objectif', 'next.sub': 'Il reste {v}.', 'next.when': 'Atteint en {m} à {a} par mois.', 'next.noPace': 'Indiquez un montant mensuel pour voir quand.',
  'next.none': 'Pas encore de barreau', 'next.noneSub': 'Ajoutez votre premier objectif : quoi, combien, et pour quand.', 'next.done': 'Tous les barreaux sont atteints', 'next.doneSub': 'Ajoutez l’objectif suivant, ou relevez-en un.',
  'pace.monthly': 'Vous mettez de côté chaque mois', 'pace.rule': 'Réparti entre les barreaux', 'pace.order': 'L’un après l’autre', 'pace.pct': 'Par parts',
  'late.order': '[{name} serait atteint après sa date|{n} barreaux seraient atteints après leur date] à ce rythme. Réordonnez l’échelle, passez aux parts, ou mettez de côté environ {v} par mois pour les barreaux datés.',
  'late.pct': '[{name} serait atteint après sa date|{n} barreaux seraient atteints après leur date] avec ces parts. Modifiez les parts, ou mettez de côté environ {v} par mois pour les barreaux datés.',
  'wall.top': '{s} gravis sur {t}', 'wall.ground': 'Départ',
  'rung.add': '+ Ajouter un barreau', 'rung.full': 'Atteint', 'rung.paused': 'En pause', 'rung.linked': 'depuis Safety Net Score', 'rung.share': '+{v} ce mois-ci', 'rung.when': 'atteint en {m}', 'rung.never': 'rien ne l’alimente encore',
  'rung.due': 'voulu pour {m} : dans les temps', 'rung.dueLate': 'voulu pour {m} : {n} mois de retard', 'rung.dueMiss': 'voulu pour {m} : non atteint',
  'ladder.note': 'Une aide à la planification, pas un conseil. Les montants sont les vôtres et restent dans ce navigateur et dans votre propre compte.',
  'edit.h': 'Barreau {n}', 'edit.up': 'Plus tard', 'edit.down': 'Plus tôt', 'edit.pause': 'Mettre en pause', 'edit.resume': 'Reprendre', 'edit.del': 'Supprimer ce barreau',
  'f.kind': 'À quoi sert-il', 'f.name': 'Nom', 'f.namePh': 'Vide : le type sert de nom', 'f.target': 'Objectif', 'f.saved': 'Déjà mis de côté', 'f.due': 'Voulu pour', 'f.dueHint': 'Facultatif. L’échelle dit si votre rythme y arrive.', 'f.pct': 'Part', 'f.pctHint': 'Utilisée avec « Par parts ».', 'f.parts': 'De quoi l’objectif est fait',
  'part.start': 'Composer l’objectif en plusieurs lignes', 'part.add': '+ Ajouter une ligne', 'part.label': 'Quoi', 'part.amt': 'Montant', 'part.del': 'Retirer cette ligne', 'part.n': 'Ligne {n}', 'part.sum': 'Objectif : {v}',
  'link.use': 'Reprendre les chiffres de Safety Net Score', 'link.off': 'Saisissez vous-même l’objectif et ce que vous avez.', 'link.none': 'Safety Net Score ne contient pas encore vos chiffres sur cet appareil.', 'link.on': 'Épargne disponible {s}, niveau « Excellent » {t}. Mettez-les à jour là-bas.', 'link.onNoLevel': 'Épargne disponible {s}. Ouvrez Safety Net Score une fois pour qu’il partage son niveau « Excellent » ; d’ici là, l’objectif saisi ici est utilisé.', 'link.cur': 'Safety Net Score est dans une autre devise : les chiffres saisis ici sont utilisés.', 'link.open': 'Ouvrir Safety Net Score',
  'add.h': 'Ajouter un barreau', 'add.go': 'Ajouter',
  'alloc.cta': 'Poser les {v} du mois sur l’échelle', 'alloc.h': 'Où vont les {v} du mois', 'alloc.subOrder': 'Un barreau après l’autre, en commençant par le bas.', 'alloc.subPct': 'Par parts ; un barreau rempli laisse le reste aux autres.', 'alloc.left': 'Reste : tous les barreaux sont atteints', 'alloc.linked': 'dans Safety Net Score', 'alloc.linkedNote': 'Le fonds d’urgence est lu dans Safety Net Score : ajoutez-y cette part à votre épargne disponible.', 'alloc.yes': 'Confirmer', 'alloc.done': '{v} posés sur l’échelle',
  'car.k': 'L’avoir ou la louer', 'car.h1': 'La même somme en loue une {n} jours par an', 'car.sub': 'Une année de possession coûte {v} en décote, assurance et entretien. Une journée de location haut de gamme coûte {d}.',
  'car.need': 'Renseignez les coûts annuels et le prix d’une journée de location.', 'car.own': 'Possédée', 'car.rent': 'Louée', 'car.perDay': 'par jour réellement roulé',
  'car.verdictRent': 'Pour {d} jours de conduite par an, louer laisse {v} par an pour l’échelle.', 'car.verdictOwn': 'Pour {d} jours de conduite par an, posséder revient moins cher de {v} par an, hors argent immobilisé dans la voiture.',
  'car.inputs': 'Les chiffres', 'car.f.dep': 'Décote par an', 'car.f.ins': 'Assurance par an', 'car.f.service': 'Entretien, pneus et taxe par an', 'car.f.day': 'Une journée de location haut de gamme', 'car.f.days': 'Jours où vous la conduiriez vraiment', 'car.u.days': 'jours',
  'car.note': 'Saisie manuelle pour l’instant. L’argent immobilisé dans la voiture, et ce qu’il rapporterait ailleurs, n’est pas compté : le compter avantagerait encore la location.', 'car.ex': 'Chiffres inventés. Remplacez-les par une vraie voiture et un vrai devis de location.',
  'log.h1': 'Ce qui est monté sur l’échelle', 'log.empty': 'Rien pour l’instant. Dans l’onglet Échelle, « Poser le montant du mois sur l’échelle » l’inscrit ici.', 'log.sub': '{n} [entrée|entrées], {v} au total.', 'log.undo': 'Annuler cette entrée', 'log.undone': 'Entrée annulée',
  'set.h1': 'Réglages', 'set.lang': 'Langue', 'set.cur': 'Devise', 'set.sync': 'Synchronisation', 'set.ideas': 'Boîte à idées', 'set.data': 'Vos données',
  'sync.none': 'La synchronisation n’est pas configurée sur ce site.', 'sync.off': 'Non connecté. Votre échelle est enregistrée sur cet appareil seulement.', 'sync.on': 'Connecté en tant que {e}. Votre échelle est enregistrée dans votre compte et vous suit sur vos autres appareils.', 'sync.signin': 'Se connecter pour synchroniser', 'sync.manage': 'Compte', 'sync.private': 'Vos montants restent dans ce navigateur et dans votre propre compte. Ils ne figurent jamais dans le code public de ce site.',
  'ideas.sub': 'Quelque chose manque ou agace à l’usage ? Notez-le dans votre fichier « Apps ideas inbox » ; la revue hebdomadaire le lit. Collez une fois le lien vers ce fichier et toutes les apps de cet appareil le proposeront.', 'ideas.link': 'Lien vers le fichier', 'ideas.open': 'Ouvrir la boîte à idées',
  'data.export': 'Exporter une sauvegarde', 'data.import': 'Importer une sauvegarde', 'data.imported': 'Sauvegarde importée', 'data.importFail': 'Ce fichier n’est pas une sauvegarde de l’Échelle', 'data.reset': 'Tout supprimer',
  'reset.h': 'Supprimer toute l’échelle ?', 'reset.sub': 'L’échelle et son journal sont vidés sur cet appareil et, après synchronisation, dans votre compte. Les exemples reviennent.', 'reset.yes': 'Tout supprimer',
  'rung.linkedGG': 'depuis Gains & Greeks', 'rung.ret': '+{r} % par an',
  'link.useMove': 'Reprendre l’objectif du planificateur de déménagement de Safety Net Score', 'link.offMove': 'Saisissez l’objectif vous-même, ou découpez-le.', 'link.noneMove': 'Le planificateur de déménagement de Safety Net Score ne contient pas encore votre projet sur cet appareil.', 'link.onMove': 'Le déménagement demande {t} le jour du départ ({g} pour arriver avec un filet « Bien »). Ce que vous mettez de côté reste ici.',
  'link.useGG': 'Reprendre le capital investi de Gains & Greeks', 'link.offGG': 'Saisissez vous-même ce qui est déjà investi.', 'link.noneGG': 'Gains & Greeks ne contient pas encore de capital investi sur cet appareil.', 'link.onGG': 'Capital investi : {s}, depuis son bureau fiscal. Mettez-le à jour là-bas ; l’argent du mois n’est pas ajouté ici.', 'link.openGG': 'Ouvrir Gains & Greeks',
  'f.ret': 'Rendement attendu', 'f.retHint': 'Facultatif, % par an sur ce qui est déjà dans le barreau : environ 5–7 pour un ETF actions, votre taux d’épargne pour du cash.',
  'set.infl': 'Inflation sur les objectifs', 'infl.sub': 'Les objectifs augmentent d’autant chaque année dans la projection, pour rester honnêtes en euros d’aujourd’hui. 2 % est la cible de la zone euro ; 0 la désactive.'
};
const DICT = { en: EN, fr: FR };
let cur = 'en';
export const setLang = l => { cur = DICT[l] ? l : 'en'; };
export const lang = () => cur;
export const keys = () => ({ en: Object.keys(EN), fr: Object.keys(FR) });
export function t(key, vars = {}) {
  let s = DICT[cur][key] ?? EN[key] ?? key;
  s = s.replace(/\[(?:(\w+):)?([^\]|]*)\|([^\]]*)\]/g, (_, v, one, many) => { const n = Number(vars[v || 'n']); return (cur === 'fr' ? n < 2 : n === 1) ? one : many; });
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
