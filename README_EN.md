# Lexmon

Lexmon is a semantic word game web application. The core principle is to find a secret word using semantic proximity hints, then play solo or in real-time duels to win words and grow the value of your collection.

The project contains a React frontend, a NestJS API, a Socket.IO WebSocket server, a PostgreSQL database managed with Prisma, and an Nginx proxy to serve the application in Docker.

## Features

- Authentication via email, username, and password.
- Optional OAuth 2.0 authentication with Google, GitHub, and 42.
- Optional TOTP two-factor authentication (2FA) via a compatible app (Google Authenticator, iPhone, etc.).
- Player profile with avatar, display name, statistics, and collection value.
- Solo mode similar to Cemantix with controlled suggestions, proximity score, and history.
- Real-time 1v1 matchmaking via Socket.IO.
- Training mode with no word gains or losses.
- Daily mode limited to one participation per day, with a word reward for the winner.
- Duel mode where players stake a collection word against an opponent of the same rarity.
- Word collection with rarity, value, quantity, and total value.
- Leaderboard based on total collection value.
- Integrated rules page explaining objectives, modes, and rewards.
- Tournaments, friends, and notifications present on the API/UI side as application modules.
- Local word embeddings: the game does not depend on an external API during matches.

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- Zustand
- Axios
- Socket.IO client
- Tailwind CSS
- Lucide React for icons

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
- Docker volumes for PostgreSQL and uploads

## Prerequisites

To run the project with Docker:

- Docker
- Docker Compose

To work locally without Docker:

- Node.js 22 recommended
- npm
- PostgreSQL accessible locally or via Docker

## Quick Start

From the project root:

```sh
docker compose up --build
```

Then open:

```text
http://localhost:8080
```

Services exposed by Compose:

- Public frontend via Nginx: `http://localhost:8080`
- Proxied backend API: `http://localhost:8080/api`
- Proxied WebSocket: `http://localhost:8080/socket.io`
- Internal Docker backend: `backend:3000`
- Internal Docker frontend: `frontend:80`
- Internal Docker PostgreSQL: `postgres:5432`

To run in the background:

```sh
docker compose up -d --build
```

To stop:

```sh
docker compose down
```

To stop and remove data volumes:

```sh
docker compose down -v
```

Warning: `docker compose down -v` deletes the PostgreSQL database, including all accounts, collections, daily attempts, matches, etc.

## Environment Variables

Docker Compose loads `backend/.env.example` and then overrides certain values directly in `docker-compose.yml`.

### Backend

File: `backend/.env.example`

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

Key variables:

- `DATABASE_URL`: PostgreSQL URL used by Prisma.
- `JWT_SECRET`: JWT token signing secret. Must be changed outside of local environments.
- `JWT_EXPIRES_IN`: Token validity duration.
- `CORS_ORIGIN`: Frontend origin allowed by the backend.
- `FRONTEND_URL`: Public frontend URL used to redirect after a successful OAuth flow.
- `OAUTH_CALLBACK_BASE_URL`: Public API URL for building OAuth callbacks.
- `OAUTH_GOOGLE_CLIENT_ID` / `OAUTH_GOOGLE_CLIENT_SECRET`: Google OAuth credentials.
- `OAUTH_GITHUB_CLIENT_ID` / `OAUTH_GITHUB_CLIENT_SECRET`: GitHub OAuth credentials.
- `OAUTH_42_CLIENT_ID` / `OAUTH_42_CLIENT_SECRET`: 42 OAuth credentials.
- `PORT`: NestJS HTTP port.

### OAuth 2.0

OAuth providers remain hidden in the interface as long as their `CLIENT_ID` and `CLIENT_SECRET` are not provided.

Callback URLs to register in provider consoles for local Docker:

```text
Google: http://localhost:8080/api/auth/oauth/google/callback
GitHub: http://localhost:8080/api/auth/oauth/github/callback
42: http://localhost:8080/api/auth/oauth/42/callback
```

After validation by the provider, the backend creates or links the Lexmon account by email, generates a Lexmon JWT, then redirects to `/oauth/callback` on the frontend side.

### Frontend

File: `frontend/.env.example`

```env
VITE_API_URL=/api
VITE_SOCKET_URL=http://localhost:8080
```

In Docker, Nginx proxies `/api` and `/socket.io` to the backend.

## Local Development

The recommended path remains Docker Compose, as it configures PostgreSQL, Nginx, the backend, and the frontend together.

To run only the dependencies with Docker and execute backend/frontend on the host machine, adapt `DATABASE_URL` to point to the exposed PostgreSQL port. The current `docker-compose.yml` does not expose PostgreSQL on the host by default; it is only available within the Docker network as `postgres:5432`.

Example local workflow:

```sh
cd backend
npm install
npm run prisma:generate
npm run build
npm run start:dev
```

In another terminal:

```sh
cd frontend
npm install
npm run dev
```

The Vite frontend is then available on the port indicated by Vite, usually `http://localhost:5173`.

## Game Rules

### Objective

The player must find a secret word. The suggested words serve as hints: each clicked suggestion reveals a semantic proximity score with the secret word.

### Round Flow

1. The backend picks a secret word from the local word database.
2. The player receives 4 controlled suggestions.
3. Clicking a suggestion reveals its score and adds it to the history.
4. After a click, a short window allows the player to attempt a final answer.
5. The final answer must exactly match the secret word after normalization.
6. The history sorts attempts by best score to aid deduction.

### Scores

- A score close to 100 indicates strong proximity to the secret word.
- A low score indicates a distant word.
- Wins and losses feed into player statistics.
- The value displayed on the profile and leaderboard corresponds to the total collection value, not the internal historical rating.

## Game Modes

### Solo

Individual practice mode. It allows players to understand suggestions, scores, and the final answer without an opponent.

### Training

Real-time 1v1 match with no collection reward. Both players search for a secret word; the winner is the first to find it, or the one remaining after the opponent forfeits.

### Daily

Daily match limited to one participation per day per player. The winner earns the secret word in their collection.

The Daily status is stored in the `DailyMatchAttempt` table. The reset uses the Paris timezone (`Europe/Paris`).

### Duel

Each player selects a word from their collection to put at stake. Matchmaking groups two players who stake a word of the same rarity. The winner takes both staked words.

During the search, the staked word is locked via a `WordStakeLock`. If the player leaves the queue before the match starts, the stake is refunded.

## Collection And Leaderboard

Each collection word has:

- a text;
- a rarity;
- a value;
- a quantity;
- a first-won date;
- a last-won date.

A player's total value is calculated as:

```text
sum(word.value * quantity)
```

The leaderboard sorts players by total collection value, then by wins in case of a tie.

## Project Structure

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

## Backend: Main Modules

- `auth`: registration, login, JWT, current user retrieval.
- `users`: public profile, personal profile, avatar, display name update.
- `game`: solo game logic, words, suggestions, similarity, history.
- `websocket`: real-time matches, rooms, player signals, end of match.
- `matchmaking`: Training/Daily/Duel queues, match consumption, daily status, stakes.
- `collection`: word attribution, player collection, stake locking and settlement.
- `stats`: player statistics and collection leaderboard.
- `friends`: friend requests and relationships.
- `notifications`: user notifications.
- `tournaments`: tournaments and registrations.
- `analytics`: game statistics, activity charts, and performance indicators.
- `feedback`: player comments and automatic sentiment analysis.
- `settings`: account settings, 2FA activation and deactivation.

## Frontend: Main Pages

- `/`: public landing page.
- `/login`: login.
- `/register`: registration.
- `/dashboard`: logged-in home with main menus.
- `/rules`: rules, objectives, and game modes.
- `/solo`: solo match.
- `/matchmaking`: Training, Daily, or Duel mode selection.
- `/game/:roomId`: real-time 1v1 match.
- `/collection`: player collection.
- `/leaderboard`: leaderboard by collection value.
- `/profile`: personal profile.
- `/users/:id`: public profile of a player.
- `/tournaments`: tournament list.
- `/analytics`: data visualizations.

## Main HTTP API

All backend routes are prefixed with `/api`.

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

### Other Modules

- `GET /api/friends`
- `POST /api/friends/requests`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/tournaments`
- `POST /api/tournaments`
- `POST /api/tournaments/:id/entries`
- `POST /api/feedback`

## WebSocket

The backend uses Socket.IO for real-time matches.

Endpoint:

```text
/socket.io
```

Main events:

- `room:join`: join a game room.
- `room:leave`: leave a room.
- `game:signal`: send a game signal.

Common game signals:

- `player:ready`
- `suggestion:click`
- `final-answer`
- `player:forfeit`

Events emitted to the client:

- `game:started`
- `game:suggestions`
- `game:history`
- `game:session-state`
- `game:finished`

## Useful Commands

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

`test:game` covers in particular:

- starting a 1v1 match;
- Daily rewards;
- reconnection during a match;
- forfeiting;
- Duel stake settlement;
- collection sorting;
- leaderboard by collection value;
- Daily locking;
- controlled suggestions and similarity.

## Embeddings And Local Dictionary

Lexmon loads embeddings from:

```text
backend/data/embeddings/words.json
```

The backend synchronizes controlled words in the database at startup.

To generate a reduced dictionary from a local French FastText file:

```sh
cd backend
npm run build:embeddings -- \
  --fasttext /path/to/cc.fr.300.vec \
  --wordlist /path/to/french-words.txt \
  --output data/embeddings/words.json \
  --limit 10000
```

Gameplay does not call any external embeddings API.

## Persistent Data

Docker Compose creates two volumes:

- `lexmon-postgres-data`: PostgreSQL database.
- `uploads-data`: avatars and uploaded files.

To inspect containers:

```sh
docker compose ps
```

To read logs:

```sh
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
docker compose logs -f postgres
```

To open a SQL shell:

```sh
docker exec -it lexmon-postgres psql -U lexmon -d lexmon
```

## Maintenance Notes

- The project currently uses NestJS 10. Some backend npm audits may recommend a major migration to NestJS 11; do not run `npm audit fix --force` without testing the migration.
- The JWT secret in Docker Compose is a development value and must be replaced in production.
- The Daily mode is based on the `Europe/Paris` timezone.
- The leaderboard and profile score display the collection value, not the historical `rating` field.
- Collection data lives in PostgreSQL; do not delete the Postgres volume if you want to preserve accounts and inventories.

## Current State

The project is a playable prototype with authentication, collection, solo and multiplayer modes, matchmaking, and a rules page. Some areas such as tournaments, friends, and notifications already exist as modules but may be further enriched functionally based on product needs.

## License

No license is currently defined. Add a `LICENSE` file before any public distribution or external reuse.
