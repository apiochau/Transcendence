*This project has been created as part of the 42 curriculum by apiochau, cossadon, luxu, cwang, qizhang*

# Lexmon

## Description

### Project Overview

Lexmon is a semantic word game web application. The core principle is to find a secret word using semantic proximity hints, then play solo or in real-time duels to win words and grow the value of your collection.

The project contains a React frontend, a NestJS API, a Socket.IO WebSocket server, a PostgreSQL database managed with Prisma, and an Nginx proxy to serve the application in Docker.

### Goal

The objective of Lexmon is to create an educational and competitive semantic word game inspired by Cemantix, where players discover hidden words using semantic proximity clues and compete to build the most valuable collection.

### Key Features

* Authentication via email, username, and password.
* Optional OAuth 2.0 authentication with Google, GitHub, and 42.
* Optional TOTP two-factor authentication (2FA) via a compatible app.
* Player profile with avatar, display name, statistics, and collection value.
* Solo mode similar to Cemantix with controlled suggestions, proximity score, and history.
* Real-time 1v1 matchmaking via Socket.IO.
* Training mode with no word gains or losses.
* Daily mode limited to one participation per day, with a word reward for the winner.
* Duel mode where players stake a collection word against an opponent of the same rarity.
* Word collection with rarity, value, quantity, and total value.
* Leaderboard based on total collection value.
* Integrated rules page explaining objectives, modes, and rewards.
* Tournaments, friends, notifications, analytics, and feedback modules.
* Local word embeddings: the game does not depend on an external API during matches.

### Architecture and Technologies

#### Frontend

* React 18
* TypeScript
* Vite
* React Router
* Zustand
* Axios
* Socket.IO Client
* Tailwind CSS
* Lucide React

#### Backend

* NestJS 10
* TypeScript
* Prisma 5
* PostgreSQL 16
* Socket.IO
* JWT / Passport
* bcrypt

#### Infrastructure

* Docker Compose
* Nginx
* Docker Volumes

### Game Overview

#### Objective

The player must find a secret word. Suggested words serve as hints: each clicked suggestion reveals a semantic proximity score with the secret word.

#### Round Flow

1. The backend picks a secret word from the local word database.
2. The player receives four controlled suggestions.
3. Clicking a suggestion reveals its score and adds it to the history.
4. After a click, a short window allows the player to attempt a final answer.
5. The final answer must exactly match the secret word after normalization.
6. The history sorts attempts by best score to aid deduction.

#### Scores

* A score close to 100 indicates strong proximity to the secret word.
* A low score indicates a distant word.
* Wins and losses feed into player statistics.
* Profile and leaderboard scores correspond to total collection value.

### Game Modes

#### Solo

Individual practice mode allowing players to understand suggestions, scores, and the final answer without an opponent.

#### Training

Real-time 1v1 match with no collection reward.

#### Daily

Daily match limited to one participation per day. The winner earns the secret word in their collection.

#### Duel

Players stake one word from their collection. Matchmaking pairs players with words of the same rarity. The winner receives both words.

### Collection and Leaderboard

Each collection word contains:

* Text
* Rarity
* Value
* Quantity
* First-won date
* Last-won date

A player's total value is calculated as:

```text
sum(word.value * quantity)
```

The leaderboard ranks players by total collection value and uses wins as a tiebreaker.

### Project Structure

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

### Backend Modules

* Auth
* Users
* Game
* WebSocket
* Matchmaking
* Collection
* Stats
* Friends
* Notifications
* Tournaments
* Analytics
* Feedback
* Settings

### Frontend Pages

* Landing Page
* Login / Register
* Dashboard
* Rules
* Solo Mode
* Matchmaking
* Real-Time Game
* Collection
* Leaderboard
* Profile
* Analytics
* Tournaments

---

## Instructions

### Prerequisites

#### Required Software

For Docker deployment:

* Docker 27+
* Docker Compose v2+

For local development:

* Node.js 22+
* npm 10+
* PostgreSQL 16

### Environment Configuration

#### Backend Environment Variables

Create a `.env` file inside `backend/` based on `.env.example`.

Important variables:

```env
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
CORS_ORIGIN=
FRONTEND_URL=
OAUTH_CALLBACK_BASE_URL=
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_GITHUB_CLIENT_ID=
OAUTH_GITHUB_CLIENT_SECRET=
OAUTH_42_CLIENT_ID=
OAUTH_42_CLIENT_SECRET=
```

#### Frontend Environment Variables

Create a `.env` file inside `frontend/`.

```env
VITE_API_URL=/api
VITE_SOCKET_URL=http://localhost:8080
```

#### OAuth Setup

Register the following callback URLs:

```text
Google: http://localhost:8080/api/auth/oauth/google/callback
GitHub: http://localhost:8080/api/auth/oauth/github/callback
42: http://localhost:8080/api/auth/oauth/42/callback
```

OAuth providers remain hidden until valid credentials are configured.

### Installation

Clone the repository:

```sh
git clone <repository-url>
cd lexmon
```

Configure environment variables using the provided `.env.example` files.

### Running the Project with Docker

Build and start all services:

```sh
docker compose up --build
```

Open:

```text
http://localhost:8080
```

Run in background:

```sh
docker compose up -d --build
```

Stop services:

```sh
docker compose down
```

Remove all persistent data:

```sh
docker compose down -v
```

### Local Development

Backend:

```sh
cd backend
npm install
npm run prisma:generate
npm run build
npm run start:dev
```

Frontend:

```sh
cd frontend
npm install
npm run dev
```

### Main HTTP API

All routes are prefixed with:

```text
/api
```

Examples:

#### Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

#### Users

```text
GET    /api/users/me
PATCH  /api/users/me
POST   /api/users/me/avatar
GET    /api/users/:id
```

#### Collection

```text
GET /api/collection/me
```

#### Matchmaking

```text
GET    /api/matchmaking/queue
POST   /api/matchmaking/queue
DELETE /api/matchmaking/queue
```

### WebSocket

Endpoint:

```text
/socket.io
```

Main events:

```text
room:join
room:leave
game:signal
```

Common game signals:

```text
player:ready
suggestion:click
final-answer
player:forfeit
```

### Testing

Backend tests:

```sh
cd backend
npm run test:similarity
npm run test:game
```

### Useful Commands

#### Frontend

```sh
cd frontend
npm install
npm run build
npm run dev
```

#### Backend

```sh
cd backend
npm install
npm run build
npm run start:dev
```

#### Prisma

```sh
cd backend
npm run prisma:generate
npm run prisma:push
```

### Embeddings and Local Dictionary

Embeddings are stored in:

```text
backend/data/embeddings/words.json
```

Generate a reduced dictionary:

```sh
cd backend
npm run build:embeddings -- \
  --fasttext /path/to/cc.fr.300.vec \
  --wordlist /path/to/french-words.txt \
  --output data/embeddings/words.json \
  --limit 10000
```

Gameplay does not rely on external AI APIs.

### Persistent Data

Docker volumes:

* lexmon-postgres-data
* uploads-data

Inspect containers:

```sh
docker compose ps
```

View logs:

```sh
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
docker compose logs -f postgres
```

### Maintenance Notes

* The project uses NestJS 10.
* JWT secrets must be changed in production.
* Daily mode uses the Europe/Paris timezone.
* Collection data is stored in PostgreSQL.
* Deleting PostgreSQL volumes removes all player data.

---

## Resources

### Documentation and References

#### Frontend

* https://react.dev/learn
* https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html
* https://docs.nestjs.com/
* https://www.prisma.io/docs
* .....


### AI Usage

Artificial intelligence tools were used during the development process for:

* .....

## Team & Project Report

---

## Team Information

### Roles and Responsibilities

> ⚠️ Replace names below with actual team members

- **Member 1 — Product Owner (PO) / Backend Developer**
  - Defined project scope and core game mechanics
  - Supervised feature priorities and delivery
  - Contributed to backend architecture and API design

- **Member 2 — Project Manager (PM) / Full Stack Developer**
  - Organized tasks and sprint planning
  - Managed GitHub Issues and project milestones
  - Worked on both frontend integration and backend coordination

- **Member 3 — Tech Lead**
  - Designed system architecture (NestJS, WebSocket, database structure)
  - Reviewed pull requests and ensured code quality
  - Made key technical decisions (Prisma, Socket.IO, embeddings system)

- **Member 4 — Frontend Developer**
  - Built React UI components and game interface
  - Implemented game pages, routing, and state management
  - Integrated API calls and real-time updates
  
- **Member 5 — ...**
  - ...

---

## Project Management

### Work Organization

The team followed a modular development approach:
...

### Tools Used

- GitHub: task tracking, bug reporting, version control and collaboration

### Communication

- Discord: daily communication and coordination
- Voice calls: weekly meetings and integration sessions

---

## Technical Stack

### Frontend
- 
- 

### Backend
- 
- 


### Database

- 

**Justification:**


### Other Technologies

- 

---

## Database Schema

### Overview

The database is structured around users, game sessions, collections, and matchmaking.

### Main Tables

- User
  -

- GameSession
  - 

- CollectionWord
  - 

- Match
  - 

### Relationships

- 

---

## Features List

- ...

---

## Modules

### Major Modules (2 pts each)

- 

### Minor Modules (1 pt each)

- 

### Implementation Notes
- (Justification for each module choice, How each module was implemented, Which team member(s) worked on each module.)
- 

---

## Individual Contributions

> ⚠️ Replace names with your actual team members

- **Member 1**
  - Implemented authentication system and JWT logic
  - Designed user schema and security flow

- **Member 2**
  - Managed project organization and backend integration
  - Implemented matchmaking system and API routing

- **Member 3**
  - Designed system architecture and database schema
  - Implemented WebSocket real-time engine

- **Member 4**
  - Built frontend UI and game interface
  - Integrated backend APIs and state management
  
- **Member 5 — ...**
  - ...

---


---

## Current State

The project is a playable prototype featuring authentication, semantic gameplay, matchmaking, collections, leaderboards, and real-time multiplayer functionality. Additional modules such as tournaments, friends, notifications, analytics, and feedback are already integrated and can be further expanded.

## License

No license is currently defined. A LICENSE file should be added before public distribution or external reuse.
