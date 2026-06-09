export type SparseEmbedding = Record<string, number>;

export interface SemanticExpansionGroup {
  categories: string[];
  vector: SparseEmbedding;
  words: string[];
}

export const EMBEDDING_DIMENSIONS = [
  'animal',
  'pet',
  'wild',
  'vehicle',
  'road',
  'rail',
  'air',
  'technology',
  'computer',
  'communication',
  'food',
  'fruit',
  'building',
  'home',
  'education',
  'learning',
  'teaching',
  'classroom',
  'institution',
  'person',
  'child',
  'work',
  'office',
  'nature',
  'water',
  'sport',
  'travel',
  'commerce',
  'health',
  'music',
  'object',
  'abstract',
] as const;

export const SEMANTIC_EXPANSION_GROUPS: SemanticExpansionGroup[] = [
  {
    categories: ['animal', 'sauvage', 'nature', 'savane'],
    vector: { animal: 1, wild: 0.92, nature: 0.78 },
    words: [
      'savane', 'felin', 'fauve', 'criniere', 'predateur', 'chasse', 'gazelle', 'zebre', 'antilope', 'hyene',
      'panthere', 'leopard', 'guepard', 'rugissement', 'meute', 'territoire', 'safari', 'afrique', 'jungle',
      'brousse', 'steppe', 'proie', 'carnivore', 'griffe', 'morsure',
    ],
  },
  {
    categories: ['animal', 'domestique', 'maison'],
    vector: { animal: 1, pet: 0.92, home: 0.44, person: 0.18, nature: 0.16 },
    words: [
      'niche', 'laisse', 'collier', 'aboiement', 'croquette', 'veterinaire', 'promenade', 'maitre', 'patte',
      'museau', 'poil', 'compagnon', 'dressage', 'berger', 'caniche', 'labrador', 'chien', 'chiot',
      'chat', 'chaton', 'miaou', 'litiere', 'ronronnement', 'griffure', 'gamelle',
    ],
  },
  {
    categories: ['transport', 'rail', 'train', 'voyage'],
    vector: { vehicle: 0.86, rail: 1, travel: 0.78, institution: 0.26, object: 0.46 },
    words: [
      'rail', 'wagon', 'gare', 'locomotive', 'metro', 'tramway', 'tram', 'quai', 'voie', 'billet',
      'controleur', 'conducteur', 'passager', 'compartiment', 'tgv', 'rer', 'intercite', 'ter', 'sncf',
      'aiguillage', 'railway', 'cheminot', 'terminus', 'correspondance', 'horaires', 'retard', 'embarquement',
      'debarquement', 'valise', 'voyageur', 'train',
    ],
  },
  {
    categories: ['transport', 'route', 'vehicule'],
    vector: { vehicle: 0.96, road: 0.92, object: 0.45, travel: 0.55, commerce: 0.12 },
    words: [
      'voiture', 'automobile', 'auto', 'moteur', 'roue', 'pneu', 'volant', 'parebrise', 'frein',
      'embrayage', 'essence', 'diesel', 'garage', 'parking', 'autoroute', 'route', 'rue', 'conduite',
      'conducteur', 'chauffeur', 'carburant', 'vehicule', 'camion', 'taxi', 'bus', 'car', 'feu rouge',
      'permis', 'carrosserie', 'accident',
    ],
  },
  {
    categories: ['transport', 'air', 'voyage'],
    vector: { vehicle: 0.9, air: 0.96, travel: 0.86, object: 0.4 },
    words: [
      'avion', 'aeroport', 'pilote', 'cabine', 'hotesse', 'steward', 'decollage', 'atterrissage', 'vol',
      'piste', 'terminal', 'bagage', 'helice', 'reacteur', 'aile', 'altitude', 'nuage', 'escale',
      'boarding', 'embarquement', 'airbus', 'boeing', 'compagnie aerienne', 'siege', 'ceinture',
    ],
  },
  {
    categories: ['technologie', 'communication', 'telephone'],
    vector: { technology: 0.95, communication: 0.94, object: 0.58, person: 0.32, work: 0.22 },
    words: [
      'telephone', 'smartphone', 'portable', 'mobile', 'appel', 'message', 'sms', 'contact', 'numero',
      'sonnerie', 'reseau', 'antenne', 'forfait', 'operateur', 'sim', 'carte sim', 'batterie',
      'chargeur', 'cable', 'coque', 'ecran tactile', 'application', 'notification', 'bluetooth',
      'wifi', 'microphone', 'hautparleur', 'conversation', 'communication', 'whatsapp',
    ],
  },
  {
    categories: ['technologie', 'informatique', 'ordinateur'],
    vector: { technology: 1, computer: 0.96, object: 0.52, work: 0.55, office: 0.42 },
    words: [
      'ordinateur', 'pc', 'clavier', 'souris', 'ecran', 'logiciel', 'programme', 'fichier', 'dossier',
      'internet', 'navigateur', 'site', 'serveur', 'client', 'reseau', 'code', 'developpeur',
      'terminal', 'console', 'processeur', 'memoire', 'disque', 'carte graphique', 'webcam',
      'imprimante', 'bureau', 'informatique', 'algorithme', 'base de donnees', 'donnee',
      'developpement', 'developement', 'programmation', 'framework', 'architecture', 'debug',
      'compilation', 'typescript', 'javascript', 'cryptographie', 'chiffrement',
    ],
  },
  {
    categories: ['energie', 'technologie', 'electricite'],
    vector: { technology: 0.62, communication: 0.12, building: 0.08, home: 0.25, person: 0.04, object: 0.45, abstract: 0.28 },
    words: [
      'electricite', 'courant', 'prise', 'interrupteur', 'ampoule', 'lampe', 'circuit', 'tension',
      'volt', 'watt', 'batterie', 'pile', 'chargeur', 'cable', 'fil', 'energie', 'centrale',
      'transformateur', 'compteur', 'disjoncteur', 'panne', 'lumiere', 'electrique', 'electron',
      'charge', 'alimentation',
    ],
  },
  {
    categories: ['abstrait', 'philosophie', 'idee'],
    vector: { abstract: 1, education: 0.34, learning: 0.32, institution: 0.18, person: 0.1 },
    words: [
      'idee', 'concept', 'pensee', 'raisonnement', 'logique', 'theorie', 'hypothese',
      'philosophie', 'metaphysique', 'existence', 'conscience', 'verite', 'morale',
      'ethique', 'sagesse', 'paradoxe', 'abstraction', 'intuition',
    ],
  },
  {
    categories: ['education', 'ecole', 'apprentissage'],
    vector: { education: 1, learning: 0.9, teaching: 0.62, classroom: 0.86, institution: 0.76, building: 0.5, child: 0.44, person: 0.32 },
    words: [
      'ecole', 'classe', 'eleve', 'etudiant', 'professeur', 'prof', 'maitre', 'instituteur', 'cours',
      'lecon', 'devoir', 'examen', 'controle', 'note', 'bulletin', 'diplome', 'universite', 'faculte',
      'lycee', 'college', 'maternelle', 'primaire', 'cartable', 'cahier', 'stylo', 'crayon',
      'tableau', 'craie', 'recre', 'cantine', 'bibliotheque', 'apprendre', 'enseigner', 'revision',
      'matiere', 'mathematiques', 'francais', 'histoire', 'geographie', 'science',
    ],
  },
  {
    categories: ['maison', 'batiment', 'habitation'],
    vector: { building: 0.86, home: 1, person: 0.25, object: 0.22 },
    words: [
      'maison', 'appartement', 'chambre', 'salon', 'cuisine', 'salle de bain', 'toilette', 'garage',
      'jardin', 'porte', 'fenetre', 'toit', 'mur', 'escalier', 'couloir', 'canape', 'lit', 'table',
      'chaise', 'armoire', 'placard', 'frigo', 'four', 'evier', 'loyer', 'adresse', 'voisin',
      'famille', 'foyer', 'habitation',
    ],
  },
  {
    categories: ['fruit', 'nourriture', 'aliment'],
    vector: { food: 0.9, fruit: 0.96, nature: 0.32, commerce: 0.16 },
    words: [
      'fruit', 'pomme', 'poire', 'banane', 'orange', 'citron', 'fraise', 'framboise', 'cerise',
      'raisin', 'peche', 'abricot', 'melon', 'pasteque', 'kiwi', 'mangue', 'ananas', 'prune',
      'figue', 'datte', 'grenade', 'myrtille', 'clementine', 'mandarine', 'compote', 'jus',
      'verger', 'pepin', 'noyau', 'sucre',
    ],
  },
  {
    categories: ['nourriture', 'cuisine', 'aliment'],
    vector: { food: 0.9, commerce: 0.22, home: 0.22, object: 0.16 },
    words: [
      'pain', 'fromage', 'viande', 'poisson', 'riz', 'pate', 'soupe', 'salade', 'legume', 'carotte',
      'tomate', 'pomme de terre', 'oignon', 'ail', 'beurre', 'lait', 'oeuf', 'farine', 'sucre',
      'sel', 'poivre', 'restaurant', 'repas', 'dejeuner', 'diner', 'petit dejeuner', 'assiette',
      'fourchette', 'couteau', 'cuillere',
    ],
  },
  {
    categories: ['eau', 'nature', 'boisson'],
    vector: { water: 1, nature: 0.62, food: 0.32, health: 0.24, home: 0.08 },
    words: [
      'eau', 'boire', 'boisson', 'verre', 'robinet', 'source', 'riviere', 'lac', 'pluie',
      'goutte', 'liquide', 'fontaine', 'hydratation', 'mineral', 'bouteille',
    ],
  },
  {
    categories: ['plage', 'mer', 'vacances'],
    vector: { nature: 0.82, water: 0.9, travel: 0.55, sport: 0.12 },
    words: [
      'plage', 'mer', 'ocean', 'sable', 'vague', 'coquillage', 'maillot', 'serviette', 'parasol',
      'soleil', 'baignade', 'nage', 'surfer', 'surf', 'bateau', 'port', 'phare', 'maree', 'ecume',
      'littoral', 'cote', 'vacances', 'bronzage', 'crabe', 'poisson', 'algue', 'meduse',
    ],
  },
  {
    categories: ['montagne', 'nature', 'relief'],
    vector: { nature: 0.95, sport: 0.42, travel: 0.38, wild: 0.18 },
    words: [
      'montagne', 'sommet', 'vallee', 'colline', 'rocher', 'falaise', 'glacier', 'neige', 'ski',
      'station', 'piste', 'altitude', 'alpinisme', 'randonnee', 'sentier', 'refuge', 'chalet',
      'pic', 'massif', 'alpes', 'pyrenees', 'volcan', 'cascade', 'torrent', 'foret', 'sapin',
    ],
  },
  {
    categories: ['travail', 'metier', 'bureau'],
    vector: { work: 0.96, office: 0.62, institution: 0.45, person: 0.46, abstract: 0.44 },
    words: [
      'travail', 'metier', 'emploi', 'salaire', 'bureau', 'entreprise', 'collegue', 'patron',
      'manager', 'reunion', 'contrat', 'cv', 'entretien', 'projet', 'client', 'commerce',
      'vendeur', 'ingenieur', 'medecin', 'boulanger', 'avocat', 'infirmier', 'policier',
      'pompier', 'artisan', 'ouvrier', 'usine', 'atelier',
    ],
  },
  {
    categories: ['sport', 'jeu', 'sante'],
    vector: { sport: 0.98, health: 0.42, person: 0.22, object: 0.18, travel: 0.1 },
    words: [
      'sport', 'football', 'tennis', 'basket', 'rugby', 'handball', 'volley', 'natation', 'course',
      'marathon', 'velo', 'cyclisme', 'musculation', 'gymnastique', 'ski', 'boxe', 'judo',
      'karate', 'ballon', 'stade', 'terrain', 'match', 'equipe', 'joueur', 'arbitre',
      'entrainement', 'competition', 'victoire', 'defaite',
    ],
  },
  {
    categories: ['pays', 'lieu', 'geographie'],
    vector: { institution: 0.52, travel: 0.45, commerce: 0.25, person: 0.3, nature: 0.18, abstract: 0.28 },
    words: [
      'france', 'espagne', 'italie', 'allemagne', 'belgique', 'suisse', 'portugal', 'angleterre',
      'europe', 'paris', 'lyon', 'marseille', 'ville', 'village', 'pays', 'capitale', 'frontiere',
      'region', 'departement', 'carte', 'territoire', 'population', 'langue', 'culture',
    ],
  },
];

function deterministicNoise(word: string, dimensionIndex: number): number {
  let hash = 2166136261;

  for (const character of `${word}:${dimensionIndex}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 1000) / 1000;
}

function vectorFromSparse(word: string, sparseVector: SparseEmbedding): number[] {
  return EMBEDDING_DIMENSIONS.map((dimension, index) => {
    const baseValue = sparseVector[dimension] ?? 0;
    if (baseValue === 0) {
      return 0;
    }

    const noise = deterministicNoise(word, index) * 0.08 - 0.04;
    return Number(Math.min(1, Math.max(0, baseValue + noise)).toFixed(4));
  });
}

export function buildSemanticExpansionEmbeddings(normalizeWord: (word: string) => string): Record<string, number[]> {
  const embeddings: Record<string, number[]> = {};

  for (const group of SEMANTIC_EXPANSION_GROUPS) {
    for (const word of group.words) {
      const normalizedWord = normalizeWord(word);
      if (normalizedWord && !embeddings[normalizedWord]) {
        embeddings[normalizedWord] = vectorFromSparse(normalizedWord, group.vector);
      }
    }
  }

  return embeddings;
}

export function buildSemanticExpansionCategories(normalizeWord: (word: string) => string): Record<string, string[]> {
  const categories: Record<string, string[]> = {};

  for (const group of SEMANTIC_EXPANSION_GROUPS) {
    for (const word of group.words) {
      const normalizedWord = normalizeWord(word);
      if (normalizedWord && !categories[normalizedWord]) {
        categories[normalizedWord] = group.categories;
      }
    }
  }

  return categories;
}
