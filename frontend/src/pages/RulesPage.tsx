import { BookOpen, Clock, Crown, Gem, Search, Swords, Trophy, WalletCards, Zap } from 'lucide-react';

const ruleSections = [
  {
    title: 'But du jeu',
    icon: Crown,
    items: [
      'Lexmon est un jeu de deduction semantique: tu dois retrouver un mot secret.',
      'Les suggestions indiquent a quel point certains mots sont proches du mot secret.',
      'Plus tu utilises bien les indices, plus tu peux trouver vite et gagner des recompenses.',
    ],
  },
  {
    title: 'Comment se joue une manche',
    icon: Search,
    items: [
      'La partie te propose des mots controles issus de la base locale.',
      'Quand tu cliques une suggestion, son score de proximite est revele et ajoute a ton historique.',
      'Apres un clic, une courte fenetre te permet de tenter une reponse finale.',
      'La reponse finale doit correspondre exactement au mot secret apres normalisation.',
    ],
  },
  {
    title: 'Scores et historique',
    icon: Trophy,
    items: [
      'Un score proche de 100 indique un mot tres proche du secret.',
      'L historique trie tes essais pour faire ressortir les meilleurs indices.',
      'Les victoires, defaites et parties jouees alimentent tes statistiques de profil.',
    ],
  },
];

const modes = [
  {
    title: 'Partie solo',
    icon: Zap,
    body: 'Mode d entrainement personnel. Tu apprends les mecaniques sans adversaire, sans perdre de mot et sans attendre le matchmaking.',
  },
  {
    title: 'Training',
    icon: Swords,
    body: 'Match 1v1 libre. Les deux joueurs cherchent le meme mot secret en temps reel. Ce mode sert a jouer sans recompense de collection.',
  },
  {
    title: 'Daily',
    icon: Clock,
    body: 'Match quotidien limite a une participation par jour. Le vainqueur gagne le mot secret dans sa collection.',
  },
  {
    title: 'Duel',
    icon: Gem,
    body: 'Chaque joueur mise un mot de meme rarete. Le gagnant remporte les deux mots mis en jeu.',
  },
];

const collectionRules = [
  'Chaque mot possede une rarete, une valeur et une quantite.',
  'La valeur totale de ta collection sert au classement.',
  'En Duel, le mot mise est verrouille pendant la recherche puis restitue ou transfere selon le resultat.',
];

export function RulesPage() {
  return (
    <section className="page-enter">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Guide</p>
      <h1 className="mt-2 text-3xl font-bold">Regles de Lexmon</h1>
      <p className="mt-3 max-w-3xl text-slate-500">
        Retrouve le mot secret grace aux indices de proximite semantique, joue en solo ou contre un autre joueur,
        puis fais grandir ta collection de mots.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {ruleSections.map((section) => {
          const Icon = section.icon;
          return (
            <article key={section.title} className="panel-surface p-5">
              <Icon className="h-6 w-6 text-accent" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-black">{section.title}</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-500">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-cyan-300" aria-hidden="true" />
          <h2 className="text-2xl font-black">Modes de jeu</h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <article key={mode.title} className="rounded-md border border-slate-700 bg-slate-900 p-5">
                <Icon className="h-6 w-6 text-accent" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-black">{mode.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{mode.body}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="panel-surface mt-8 p-6">
        <div className="flex items-center gap-3">
          <WalletCards className="h-6 w-6 text-amber-300" aria-hidden="true" />
          <h2 className="text-2xl font-black">Collection et classement</h2>
        </div>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-500 md:grid-cols-3">
          {collectionRules.map((rule) => (
            <li key={rule} className="rounded-md border border-slate-700 bg-slate-900 p-4">{rule}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
