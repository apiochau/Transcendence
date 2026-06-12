# Lexmon

Lexmon est une application web de jeu de mots semantique. Le principe central est de retrouver un mot secret grace a des indices de proximite semantique, puis de jouer en solo ou en duel temps reel pour gagner des mots et faire monter la valeur de sa collection.

Le projet contient un frontend React, une API NestJS, un serveur WebSocket Socket.IO, une base PostgreSQL geree avec Prisma, et un proxy Nginx pour servir l'application en Docker.

## Fonctionnalites

- Authentification par email, pseudo et mot de passe.
- Authentification OAuth 2.0 optionnelle avec Google, GitHub et 42.
- Profil joueur avec avatar, nom affiche, statistiques et valeur de collection.
- Partie solo type Cemantix avec suggestions controlees, score de proximite et historique.
- Matchmaking 1v1 temps reel via Socket.IO.
- Mode Training sans gain ni perte de mot.
- Mode Daily limite a une participation par jour, avec recompense de mot pour le vainqueur.
- Mode Duel avec mise d'un mot de collection contre un adversaire de meme rarete.
- Collection de mots avec rarete, valeur, quantite et valeur totale.
- Classement base sur la valeur totale des collections.
- Page de regles integree pour expliquer les objectifs, les modes et les recompenses.
- Tournois, amis et notifications presents cote API/UI comme modules applicatifs.
- Embeddings de mots locaux: le jeu ne depend pas d'une API externe pendant les parties.

## Stack Technique

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- Zustand
- Axios
- Socket.IO client
- Tailwind CSS
- Lucide React pour les icones

### Backend

- NestJS 10
- TypeScript
- Prisma 5
- PostgreSQL 16
- Socket.IO
- JWT / Passport
- bcrypt

### Infrastructure

- Docker Compose
- Nginx
- Volumes Docker pour PostgreSQL et les uploads

## Prerequis

Pour lancer le projet avec Docker:

- Docker
- Docker Compose

Pour travailler localement sans Docker:

- Node.js 22 recommande
- npm
- PostgreSQL accessible localement ou via Docker

## Demarrage Rapide

Depuis la racine du projet:

```sh
docker compose up --build
```

Puis ouvrir:

```text
http://localhost:8080
```

Les services exposes par Compose:

- Frontend public via Nginx: `http://localhost:8080`
- API backend proxifiee: `http://localhost:8080/api`
- WebSocket proxifie: `http://localhost:8080/socket.io`
- Backend interne Docker: `backend:3000`
- Frontend interne Docker: `frontend:80`
- PostgreSQL interne Docker: `postgres:5432`

Pour lancer en arriere-plan:

```sh
docker compose up -d --build
```

Pour arreter:

```sh
docker compose down
```

Pour arreter et supprimer les volumes de donnees:

```sh
docker compose down -v
```

Attention: `docker compose down -v` supprime la base PostgreSQL et donc les comptes, collections, daily attempts, parties, etc.

## Variables D'environnement

Docker Compose charge `backend/.env.example` puis surcharge certaines valeurs directement dans `docker-compose.yml`.

### Backend

Fichier: `backend/.env.example`

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://lexmon:lexmon@postgres:5432/lexmon?schema=public
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:8080
FRONTEND_URL=http://localhost:8080
OAUTH_CALLBACK_BASE_URL=http://localhost:8080/api
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_GITHUB_CLIENT_ID=
OAUTH_GITHUB_CLIENT_SECRET=
OAUTH_42_CLIENT_ID=
OAUTH_42_CLIENT_SECRET=
```

Variables importantes:

- `DATABASE_URL`: URL PostgreSQL utilisee par Prisma.
- `JWT_SECRET`: secret de signature des tokens JWT. A changer hors environnement local.
- `JWT_EXPIRES_IN`: duree de validite des tokens.
- `CORS_ORIGIN`: origine frontend autorisee par le backend.
- `FRONTEND_URL`: URL publique du frontend utilisee pour rediriger apres un OAuth reussi.
- `OAUTH_CALLBACK_BASE_URL`: URL publique de l'API pour construire les callbacks OAuth.
- `OAUTH_GOOGLE_CLIENT_ID` / `OAUTH_GOOGLE_CLIENT_SECRET`: identifiants OAuth Google.
- `OAUTH_GITHUB_CLIENT_ID` / `OAUTH_GITHUB_CLIENT_SECRET`: identifiants OAuth GitHub.
- `OAUTH_42_CLIENT_ID` / `OAUTH_42_CLIENT_SECRET`: identifiants OAuth 42.
- `PORT`: port HTTP NestJS.

### OAuth 2.0

Les providers OAuth restent invisibles dans l'interface tant que leur `CLIENT_ID` et leur `CLIENT_SECRET` ne sont pas renseignes.

URLs de callback a declarer dans les consoles provider en local Docker:

```text
Google: http://localhost:8080/api/auth/oauth/google/callback
GitHub: http://localhost:8080/api/auth/oauth/github/callback
42: http://localhost:8080/api/auth/oauth/42/callback
```

Apres validation par le provider, le backend cree ou lie le compte Lexmon par email, genere un JWT Lexmon, puis redirige vers `/oauth/callback` cote frontend.

### Frontend

Fichier: `frontend/.env.example`

```env
VITE_API_URL=/api
VITE_SOCKET_URL=http://localhost:8080
```

En Docker, Nginx proxy `/api` et `/socket.io` vers le backend.

## Developpement Local

Le chemin recommande reste Docker Compose, car il configure PostgreSQL, Nginx, le backend et le frontend ensemble.

Pour lancer seulement les dependances avec Docker et executer backend/frontend sur la machine hote, adapter `DATABASE_URL` pour pointer vers le port PostgreSQL expose. Le `docker-compose.yml` actuel n'expose pas PostgreSQL sur l'hote par defaut; il est seulement disponible dans le reseau Docker sous `postgres:5432`.

Exemple de workflow local:

```sh
cd backend
npm install
npm run prisma:generate
npm run build
npm run start:dev
```

Dans un autre terminal:

```sh
cd frontend
npm install
npm run dev
```

Le frontend Vite est alors disponible sur le port indique par Vite, generalement `http://localhost:5173`.

## Regles Du Jeu

### Objectif

Le joueur doit retrouver un mot secret. Les mots proposes servent d'indices: chaque suggestion cliquee revele un score de proximite semantique avec le mot secret.

### Deroulement D'une Manche

1. Le backend choisit un mot secret depuis la base locale de mots.
2. Le joueur recoit 4 suggestions controlees.
3. Cliquer une suggestion revele son score et l'ajoute a l'historique.
4. Apres un clic, une courte fenetre permet de tenter une reponse finale.
5. La reponse finale doit correspondre exactement au mot secret apres normalisation.
6. L'historique trie les essais par meilleur score pour faciliter la deduction.

### Scores

- Un score proche de 100 indique une forte proximite avec le mot secret.
- Un score faible indique un mot eloigne.
- Les victoires et defaites alimentent les statistiques joueur.
- La valeur affichee sur le profil et le classement correspond a la valeur totale de collection, pas au rating interne historique.

## Modes De Jeu

### Partie Solo

Mode d'entrainement individuel. Il permet de comprendre les suggestions, les scores et la reponse finale sans adversaire.

### Training

Match 1v1 en temps reel sans recompense de collection. Les deux joueurs cherchent un mot secret et le gagnant est celui qui trouve le premier ou qui reste apres abandon adverse.

### Daily

Match quotidien limite a une participation par jour et par joueur. Le vainqueur gagne le mot secret dans sa collection.

Le statut Daily est stocke dans la table `DailyMatchAttempt`. Le reset utilise la date de Paris (`Europe/Paris`).

### Duel

Chaque joueur choisit un mot de sa collection a mettre en jeu. Le matchmaking regroupe deux joueurs qui misent un mot de meme rarete. Le vainqueur remporte les deux mots mis en jeu.

Pendant la recherche, le mot mise est verrouille via un `WordStakeLock`. Si le joueur quitte la file avant le match, la mise est remboursee.

## Collection Et Classement

Chaque mot de collection possede:

- un texte;
- une rarete;
- une valeur;
- une quantite;
- une date de premier gain;
- une date de dernier gain.

La valeur totale d'un joueur est calculee comme:

```text
somme(mot.value * quantite)
```

Le classement trie les joueurs par valeur totale de collection, puis par victoires en cas d'egalite.

## Structure Du Projet

```text
.
├── backend
│   ├── data/embeddings/words.json
│   ├── prisma/schema.prisma
│   ├── scripts/buildEmbeddings.ts
│   ├── src
│   │   ├── analytics
│   │   ├── auth
│   │   ├── collection
│   │   ├── feedback
│   │   ├── friends
│   │   ├── game
│   │   ├── matchmaking
│   │   ├── notifications
│   │   ├── stats
│   │   ├── tournaments
│   │   ├── users
│   │   └── websocket
│   └── test
├── frontend
│   ├── src
│   │   ├── api
│   │   ├── components
│   │   ├── layouts
│   │   ├── pages
│   │   ├── routes
│   │   ├── store
│   │   └── types
│   └── nginx.conf
├── nginx/default.conf
├── docker-compose.yml
└── README.md
```

## Backend: Modules Principaux

- `auth`: inscription, connexion, JWT, recuperation de l'utilisateur courant.
- `users`: profil public, profil personnel, avatar, mise a jour du nom affiche.
- `game`: logique de partie solo, mots, suggestions, similarite, historique.
- `websocket`: parties temps reel, rooms, signaux joueurs, fin de partie.
- `matchmaking`: files Training/Daily/Duel, consommation des matchs, daily status, mises.
- `collection`: attribution de mots, collection joueur, verrouillage et reglement des mises.
- `stats`: statistiques joueur et classement collection.
- `friends`: demandes d'amis et relations.
- `notifications`: notifications utilisateur.
- `tournaments`: tournois et inscriptions.
- `analytics`: statistiques de jeu, graphiques d'activité et indicateurs de performance.
- `feedback`: commentaires des joueurs et analyse automatique des sentiments.

## Frontend: Pages Principales

- `/`: page d'arrivee publique.
- `/login`: connexion.
- `/register`: inscription.
- `/dashboard`: accueil connecte avec les menus principaux.
- `/rules`: regles, objectifs et modes de jeu.
- `/solo`: partie solo.
- `/matchmaking`: choix du mode Training, Daily ou Duel.
- `/game/:roomId`: partie 1v1 temps reel.
- `/collection`: collection du joueur.
- `/leaderboard`: classement par valeur de collection.
- `/profile`: profil personnel.
- `/users/:id`: profil public d'un joueur.
- `/tournaments`: liste des tournois.
- `/analytics`: visualisations des données.

## API HTTP Principale

Toutes les routes backend sont prefixees par `/api`.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Users

- `GET /api/users/me`
- `PATCH /api/users/me`
- `POST /api/users/me/avatar`
- `GET /api/users/:id`

### Collection

- `GET /api/collection/me`

### Game Solo

- `POST /api/game/solo/start`
- `GET /api/game/solo/:sessionId/suggestions`
- `POST /api/game/solo/:sessionId/click-suggestion`
- `POST /api/game/solo/:sessionId/final-answer`
- `POST /api/game/solo/:sessionId/give-up`
- `GET /api/game/solo/:sessionId/history`

### Matchmaking

- `GET /api/matchmaking/queue`
- `GET /api/matchmaking/status`
- `GET /api/matchmaking/daily/status`
- `POST /api/matchmaking/queue`
- `POST /api/matchmaking/consume`
- `DELETE /api/matchmaking/queue`

### Stats

- `GET /api/stats/me`
- `GET /api/stats/leaderboard`
- `GET /api/stats/:userId`

### Analytics

- `GET /api/analytics/overview`
- `GET /api/analytics/games-over-time`
- `GET /api/analytics/similarity-distribution`
- `GET /api/analytics/collection-rarity-distribution`
- `GET /api/analytics/win-speed-distribution`
- `GET /api/analytics/sentiment`

### Autres Modules

- `GET /api/friends`
- `POST /api/friends/requests`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/tournaments`
- `POST /api/tournaments`
- `POST /api/tournaments/:id/entries`
- `POST /api/feedback`

## WebSocket

Le backend utilise Socket.IO pour les parties temps reel.

Endpoint:

```text
/socket.io
```

Evenements principaux:

- `room:join`: rejoindre une room de partie.
- `room:leave`: quitter une room.
- `game:signal`: envoyer un signal de jeu.

Signaux de jeu courants:

- `player:ready`
- `suggestion:click`
- `final-answer`
- `player:forfeit`

Evenements emis au client:

- `game:started`
- `game:suggestions`
- `game:history`
- `game:session-state`
- `game:finished`

## Commandes Utiles

### Frontend

```sh
cd frontend
npm install
npm run build
npm run dev
```

### Backend

```sh
cd backend
npm install
npm run build
npm run start:dev
```

### Prisma

```sh
cd backend
npm run prisma:generate
npm run prisma:push
```

### Tests

```sh
cd backend
npm run test:similarity
npm run test:game
```

`test:game` couvre notamment:

- le demarrage d'une partie 1v1;
- les recompenses Daily;
- la reconnexion en cours de partie;
- l'abandon;
- le reglement des mises Duel;
- le tri de collection;
- le classement par valeur de collection;
- le verrouillage Daily;
- les suggestions controlees et la similarite.

## Embeddings Et Dictionnaire Local

Lexmon charge les embeddings depuis:

```text
backend/data/embeddings/words.json
```

Le backend synchronise les mots controles en base au demarrage.

Pour generer un dictionnaire reduit depuis un fichier FastText francais local:

```sh
cd backend
npm run build:embeddings -- \
  --fasttext /path/to/cc.fr.300.vec \
  --wordlist /path/to/french-words.txt \
  --output data/embeddings/words.json \
  --limit 10000
```

Le gameplay n'appelle pas d'API externe d'embeddings.

## Donnees Persistantes

Docker Compose cree deux volumes:

- `lexmon-postgres-data`: base PostgreSQL.
- `uploads-data`: avatars et fichiers uploades.

Pour inspecter les conteneurs:

```sh
docker compose ps
```

Pour lire les logs:

```sh
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
docker compose logs -f postgres
```

Pour ouvrir un shell SQL:

```sh
docker exec -it lexmon-postgres psql -U lexmon -d lexmon
```

## Notes De Maintenance

- Le projet utilise actuellement NestJS 10. Certains audits npm backend peuvent recommander une migration majeure vers NestJS 11; ne pas lancer `npm audit fix --force` sans tester la migration.
- Le secret JWT dans Docker Compose est une valeur de developpement et doit etre remplace en production.
- Le Daily est base sur la date `Europe/Paris`.
- Le classement et le score de profil affichent la valeur de collection, pas le champ historique `rating`.
- Les donnees de collection vivent dans PostgreSQL; ne pas supprimer le volume Postgres si l'on veut conserver les comptes et inventaires.

## Etat Actuel

Le projet est un prototype jouable avec authentification, collection, modes solo et multijoueur, matchmaking et page de regles. Certaines zones comme les tournois, amis et notifications existent deja comme modules mais peuvent encore etre enrichies fonctionnellement selon les besoins produit.

## Licence

Aucune licence n'est definie pour le moment. Ajouter un fichier `LICENSE` avant toute distribution publique ou reutilisation externe.
