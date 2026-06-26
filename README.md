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

---

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
* **Docker Compose & Linux Orchestration** - Advanced automated provision engine.
* **HashiCorp Vault (v1.13.3)** - Isolated runtime memory secrets engine (No hardcoded credentials on disk or container environment states).
* **Nginx Reversed Proxy && TLS terminal** - Secure perimeter traffic encryption via custom self-signed X.509 cryptographic configurations (TLSv1.2/TLSv1.3 forced compliance).
* **OWASP ModSecurity Core Rule Set(WAF)** - Web Application Firewall actively embedded to inspect, drop, and mitigate malicious payloads (SQL Injection, Cross-Site Scripting).

---

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

---

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
│   │   ├── chat
│   │   ├── collection
│   │   ├── common
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
├── vault/init.sh
├── nginx/default.conf
├── docker-compose.yml
├── Makefile
├── install_deps.sh
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
* Chat
* Notifications
* Tournaments
* Analytics
* Feedback
* Common

### Frontend Pages

* Landing Page
* Login / Register
* OAuth Callback
* Dashboard
* Rules
* Solo Mode
* Matchmaking
* Real-Time Game
* Collection
* Leaderboard
* Profile
* User Profile (public)
* Settings
* Friends
* Analytics
* Tournaments
* Privacy Policy
* Terms of Service

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

---

### Environment Configuration

To enforce high-level security perimeter controls, **no sensitive secrets (database passwords, JWT keys, OAuth client secrets) are stored in plain text on the filesystem.** Local configuration files are used strictly for non-sensitive networking routing metadata. The real production credentials are fully managed, isolated, and fetched in-memory from **HashiCorp Vault**.

***Security Notice:** To seed the system safely, you must create a local `.env` file at the root level of the project (which is strictly `gitignored`) to pass your production credentials into the Vault injection script during provisioning, ensuring zero hardcoded secrets exist within the repository.*

```.env.example
# database postgres
POSTGRES_USER=lexmon
POSTGRES_PASSWORD=lexmon
POSTGRES_DB=lexmon

# jwt
JWT_SECRET=change-me-in-production

# OAuth
OAUTH_GOOGLE_CLIENT_ID="your-google-id"
OAUTH_GOOGLE_CLIENT_SECRET="your-google-secret"
OAUTH_GITHUB_CLIENT_ID="your-github-id"
OAUTH_GITHUB_CLIENT_SECRET="your-github-secret"
OAUTH_42_CLIENT_ID="your-42-id"
OAUTH_42_CLIENT_SECRET="your-42-secret"

```

#### Backend Environment Variables (`backend/.env.example`)

Use `backend/.env.example` as the committed non-sensitive example configuration:

```env
# Only non-sensitive routing and framework parameters allowed
NODE_ENV=production
PORT=3000
JWT_EXPIRES_IN=1d
CORS_ORIGIN=https://localhost
FRONTEND_URL=https://localhost
OAUTH_CALLBACK_BASE_URL=https://localhost/api
VAULT_ADDR=http://localhost:8200
DB_HOST=localhost
```

#### Frontend Environment Variables (`frontend/.env.example`)

Use `frontend/.env.example` as the committed non-sensitive example configuration:

```env
VITE_API_URL=/api
VITE_SOCKET_URL=https://localhost
```

#### OAuth Setup

Register the following callback URLs:

- Google: `https://localhost/api/auth/oauth/google/callback`
- GitHub: `https://localhost/api/auth/oauth/github/callback`
- 42: `https://localhost/api/auth/oauth/42/callback`

OAuth providers are displayed in the login/register UI. They remain disabled until valid
credentials are configured in the root `.env` file and injected into Vault at startup.

#### Secure Dynamic Credentials (Managed inside Vault via `vault/init.sh`)
During orchestration, your initialization routine automatically seeds HashiCorp Vault's in-memory storage. The system generates, injects, and completely manages these keys inside isolated RAM:
* `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
* `JWT_SECRET`
* `OAUTH_(GOOGLE/GITHUB/42)_CLIENT_ID` & `OAUTH_(GOOGLE/GITHUB/42)_CLIENT_SECRET`

<!-- as the provided .env.example -->

---



### Running the Project with Linux/Mac Automation (Production Staging)
The project includes an ANSI-colored GNU Makefile and initialization utilities to completely automate dependencies and security provisioning securely.

#### 1. Full Core Installation & Build
To install local dependencies inside your sub-repositories, pull secrets configurations into Vault memory, and boot the entire network bridge, run:
```bash
make
```
#### 2. Fine-Grained Operational Control Rules
* **Rebuild Service Layouts**: `make build`

* **Stop Cluster Gracefully (Preserves State Memory)**: `make stop`

* **Tear Down Networking Infrastructure Safely**: `make down`

* **Stream Aggregated Container Output Streams**: `make logs`

* **Secure Environment Clean (Prunes caches without wiping persistent PostgreSQL state volumes)**: `make clean`

#### 3. Accessing the Application
Once the cluster logs report that all services are online:

* Open your browser and navigate to: `https://localhost`

* Note on Self-Signed Certs: Click Advanced → Proceed/Accept Risk to bypass the development certificate warning.

---

### Installation & Local Host Development
If you want to run the application components locally on your host machine for debugging or rapid development without Docker isolation containers, follow this workflow:

#### 1. Automated Host Installation

Run the root automated installation target. This triggers a green ANSI shell utility script that cleanly updates your workspace directories, handles cross-repo packages, and generates local architecture-specific Prisma runtime compilation hooks:

```bash
make install
```

#### 2. Running Individual Development Engines Locally

Because the backend uses an adaptive programmatic synchronization step, running development watchers locally will dynamically target your exposed ports.

**Launch Backend Development Server (with live watch hot-reload):**
```bash
cd backend
npm run start:dev
```
*Note: This sequence automatically reads credentials securely over your host's network bridge, performs an incremental runtime `prisma db push` schema sync, and launches the NestJS HTTP/WebSocket routing tables safely.*

**Launch Frontend Development Server:**
```bash
cd frontend
npm run dev
```
---

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

---

### Persistent Data

Docker volumes:

* lexmon-postgres-data
* uploads-data


### Maintenance Notes

* **The project uses NestJS 10.**
* **JWT secrets must be changed in production.**
* **Daily mode uses the Europe/Paris timezone.**
* **Collection data is stored in PostgreSQL.**
* **Deleting PostgreSQL volumes removes all player data.**
* **Automated Programmatic Database Synchronization** — The application utilizes native Node.js sub-process compilation execution flags inside main.ts to bridge runtime settings immediately after Vault authentication, creating dynamic, type-safe database schemas with Prisma while keeping passwords safely inside isolated memory vector

---

## Resources

### Documentation and References

#### Frontend

* https://react.dev/learn
* https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html
* https://docs.nestjs.com/
* https://tailwindcss.com/docs
* https://huggingface.co/docs/transformers.js

#### Backend
* https://docs.nestjs.com/
* https://www.prisma.io/docs
* https://socket.io/docs/v4/
* https://jwt.io/introduction

### AI Usage

Artificial intelligence tools were used during the development process for:

* Learning full-stack concepts and understanding the tech stack (React, NestJS, Prisma, Socket.IO) during the early stages of the project.
* Analyzing module selection and evaluating the compatibility and coherence of chosen modules.
* Debugging deployment issues.
* Understanding and explaining unfamiliar technologies.
* Drafting documentation and README content.
* Reviewing code logic and identifying root causes of runtime errors.

All AI-generated suggestions were reviewed, tested, and adapted by team members before integration. AI was not used to generate application source code directly.

## Team & Project Report

---

## Team Information

### Roles and Responsibilities

- **apiochau — Product Owner (PO) / Developer**
  - Designed the core concept and gameplay mechanics of Lexmon, including the collection, rarity, matchmaking, and PvP systems.
  - Defined the overall project architecture and supervised the technical direction to ensure scalability and maintainability.
  - Implemented the core backend features, including authentication (JWT + OAuth), game session architecture, and the semantic word engine that powers the gameplay.

- **cossadon — Tech Lead / Developer**
  - Designed system architecture (NestJS, WebSocket, database structure)
  - Reviewed pull requests and ensured code quality
  - Made key technical decisions (Prisma, Socket.IO, embeddings system)
  - Implemented backend integration features and supported real-time module design

- **cwang — Project Manager (PM) / Developer**
  - Organized team meetings and planning sessions.
  - Tracked progress and deadlines.
  - Implemented the data analytics module and feedback sentiment analysis

- **luxu — Developer**
  - Implemented standard user management (registration, authentication, profile management)
  - Developed game statistics and match history tracking system
  - Implemented Two-Factor Authentication (2FA) system

- **qizhang — Developer (Security Engineer)**
  - Managed HashiCorp Vault to keep database passwords safe in memory.
  - Set up ModSecurity WAF and Nginx to block malicious web attacks.
  - Enabled HTTPS encryption (TLS 1.2/1.3) and secure browser headers.

---

## Project Management

### Work Organization

To efficiently manage the complexity of the project, the team adopted a modular development strategy. Tasks were distributed according to each member's strengths and interests. While individual modules were developed independently, regular synchronization meetings were held to discuss progress, resolve blockers, and coordinate integration efforts.

Version control workflows and pull-request reviews were used to maintain code quality and ensure consistency across the project. This organization allowed multiple features to be developed in parallel while minimizing merge conflicts and integration issues.

### Tools Used

- GitHub: task tracking, bug reporting, version control and collaboration

### Communication

- Discord: daily communication and coordination
- Voice calls: weekly meetings and integration sessions

---

## Technical Stack

### Frontend
- React 18 with TypeScript
- Vite, React Router, Zustand, Axios, Socket.IO Client
- Tailwind CSS and Lucide React

### Backend
- NestJS 10 with TypeScript
- Socket.IO for real-time multiplayer communication
- JWT, Passport, and bcrypt for authentication and security
- Prisma ORM for database access and schema management

### Database

- PostgreSQL 16

The project adopts a modern full-stack architecture designed for scalability, maintainability, and real-time interaction. The frontend is built with React 18 and TypeScript, providing a responsive and type-safe user interface. Vite enables fast development and optimized builds, while Zustand manages client-side state efficiently. Socket.IO Client supports real-time gameplay features such as matchmaking and multiplayer sessions.

On the backend, NestJS 10 offers a modular and structured architecture suitable for large applications. Socket.IO enables bidirectional real-time communication required for live matches. Authentication is secured through JWT, Passport, bcrypt, optional OAuth 2.0 providers (Google, GitHub, and 42), and TOTP-based two-factor authentication.

PostgreSQL 16 is used as the primary relational database, while Prisma ORM simplifies database modeling, migrations, and type-safe queries. The entire application is containerized with Docker Compose and served through Nginx, ensuring a consistent deployment environment and easy scalability.

### Other Technologies

- **Docker & Docker Compose** – Containerization and service orchestration.
- **Nginx & OWASP ModSecurity** — Reverse proxy perimeter gate and application shielding.
- **HashiCorp Vault** — Secured dynamic secrets repository engine.
- **OAuth 2.0** – Third-party authentication with Google, GitHub, and 42.
- **TOTP-based Two-Factor Authentication (2FA)** – Additional account security.
- **WebSockets (Socket.IO)** – Real-time communication for multiplayer gameplay.
- **JWT Authentication** – Stateless user authentication and authorization.
- **Prisma Migrations & Schema Management** – Database schema synchronization and management.


Docker and Docker Compose provide a reproducible development and deployment environment. Nginx acts as a reverse proxy, routing HTTP and WebSocket requests to the appropriate services. OAuth 2.0 and TOTP-based 2FA enhance account security and authentication flexibility. Socket.IO enables real-time interactions required for matchmaking and multiplayer games. JWT is used for secure stateless authentication, while Prisma simplifies database schema management and migrations.

---

## Database Schema

### Overview

The database is designed around player management, semantic word games, collections, matchmaking, tournaments, and social interactions. PostgreSQL is used as the primary database, while Prisma ORM manages schema definitions and database access.

### Main Tables

#### User

* Stores account information, authentication credentials, and profile data.
* Supports OAuth authentication and optional two-factor authentication (2FA).
* Maintains relationships with games, statistics, collections, friendships, notifications, messages, and tournaments.

#### Game

* Represents real-time multiplayer matches.
* Stores participating players, winner information, room identifiers, game status, and timestamps.

#### GameSession

* Represents semantic word game sessions.
* Stores the secret word, session state, displayed suggestions, and game progress.

#### Word

* Stores all words available in the game.
* Contains semantic embeddings, rarity, value, category, and normalized text used for similarity calculations.

#### WordCollectionItem

* Represents words owned by players.
* Tracks ownership, quantity, and acquisition history.

### Additional Tables

#### UserStats

* Stores player statistics such as games played, wins, losses, and rating.
* Each User has exactly one UserStats record.

#### Friendship

* Manages friend requests and friendship relationships between users.

#### Notification

* Stores user notifications and read status.

#### Message

* Supports private and global messaging between users.

   ##### * sender → User
   ##### * recipient → User (optional for global messages)

#### Tournament

* Stores tournament information and status.

#### TournamentEntry

* Associates players with tournaments.
   ##### * Many-to-many relationship (User ↔ Tournament)

#### DailyMatchAttempt

* Tracks daily match participation and enforces one attempt per day.

#### WordStakeLock

* Handles duel matchmaking staking system. Tracks locked words, room binding, status (QUEUED / SETTLED), timestamps

#### SuggestionHistory

* Stores word suggestions, similarity scores, player actions and timestamps.

#### Feedback

* Stores player feedback and sentiment analysis results.

### Relationships Summary

User → UserStats (1:1)

User → Game (1:N as PlayerOne / PlayerTwo / Winner)

User → Friendship (1:N sent / received)

User → Message (1:N sent / received)

User → Notification (1:N)

User → WordCollectionItem (1:N)

User → TournamentEntry (1:N)

User → DailyMatchAttempt (1:N)

User → WordStakeLock (1:N)

User → Feedback (1:N)

GameSession → Word (1:1 secret word)

GameSession → SuggestionHistory (1:N)

GameSession → Feedback (1:N)

Tournament → TournamentEntry (1:N)

Word → WordCollectionItem (1:N)

Word → SuggestionHistory (1:N)

---

## Features List


| Feature                                       | Team Member(s) | Description                                                                                              |
| --------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| User Authentication and Account Management    | apiochau, luxu | Provides user registration, login, profile management, and account security features.               |
| OAuth 2.0 and Two-Factor Authentication (2FA) | apiochau, luxu | Supports secure authentication through OAuth 2.0 providers and TOTP-based two-factor authentication. |
| Semantic Word-Guessing Gameplay               | apiochau       | Implements the core gameplay mechanic where players guess target words based on semantic similarity. |
| Solo and Real-Time Multiplayer Game Modes     | apiochau       | Allows players to play individually or compete against others in real time.                         |
| Training, Daily, and Duel Matchmaking Modes   | apiochau       | Provides multiple gameplay modes, including practice sessions, daily challenges, and player matchmaking. |
| Word Collection and Reward System             | luxu           | Enables players to collect discovered words and earn rewards based on gameplay achievements.             |
| Collection-Based Leaderboard                  | luxu           | Ranks players according to the value and rarity of their collected words.                                |
| Friend and Notification Systems               | luxu           | Allows users to add friends, track online status, and receive notifications.                             |
| Tournament Management                         | apiochau       | Supports tournament creation and player registration.                                                    |
| Analytics Dashboard and Feedback Tracking     | cwang          | Visualizes gameplay statistics and automatically analyzes player feedback to generate insights.          |


---

## Modules

### Major Modules (2 pts each)

1. **Use a framework for both the frontend and backend** (2 pts)
   - Frontend: React 18 with TypeScript, Vite, React Router, Zustand
   - Backend: NestJS 10 with TypeScript, Prisma ORM
   - Team member(s): apiochau, cossadon

2. **Real-time features using WebSockets** (2 pts)
   - Socket.IO for live multiplayer matches, matchmaking, and real-time game state synchronization
   - Team member(s): apiochau

3. **User interaction system (chat, profile, friends)** (2 pts)
   - Chat: send/receive messages between users (ChatWidget, global and private messaging)
   - Profile: view user information, avatar, display name, statistics
   - Friends: add/remove friends, see friends list and online status
   - Team member(s): cossadon

4. **Standard user management and authentication** (2 pts)
   - Profile update, avatar upload with default, friend system with online status, user profile page
   - Team member(s): luxu, cossadon

5. **WAF/ModSecurity + HashiCorp Vault for secrets** (2 pts)
   - OWASP ModSecurity Core Rule Set embedded in Nginx reverse proxy
   - HashiCorp Vault (v1.13.3) for runtime secrets injection (database credentials, JWT, OAuth keys)
   - Team member(s): qizhang

6. **Complete web-based game** (2 pts)
   - Semantic word-guessing game inspired by Cemantix with solo and multiplayer modes
   - Clear rules, win/loss conditions, real-time gameplay
   - Team member(s): apiochau

7. **Advanced analytics dashboard with data visualization.** (2 pt)
  - Analytics module with game activity visualization, performance indicators
  - Interactive charts and graphs, real-time data updates, export functionality, customizable date ranges and filters
  - Team member(s): cwang

### Minor Modules (1 pt each)

1. **Use an ORM for the database** (1 pt)
   - Prisma ORM is used for schema definition, relations, and type-safe database access.
   - Team member(s): ⚠️

2. **Game statistics and match history** (1 pt)
   - Track wins, losses, ranking; display match history and leaderboard
   - Team member(s): apiochau, luxu

3. **Remote authentication with OAuth 2.0** (1 pt)
   - OAuth 2.0 integration with Google, GitHub, and 42
   - Team member(s): apiochau

4. **Two-Factor Authentication (2FA)** (1 pt)
   - TOTP-based 2FA via compatible apps (Google Authenticator, etc.)
   - Team member(s): luxu

5. **Sentiment analysis for user-generated content** (1 pt)
   - Automatic sentiment analysis on player feedback
   - Team member(s): cwang


### Point Calculation

| Type  | Count | Points per module | Subtotal |
|-------|-------|-------------------|----------|
| Major | 7     | 2                 | 14       |
| Minor | 5     | 1                 | 5        |
| **Total** |   |                   | **19**   |

### Implementation Notes

Lexmon is a real-time multiplayer semantic word game. The module selection was driven by the nature of the game, the chosen tech stack, and the need for a secure, interactive, and data-aware web application.

**Frameworks (Major + Minor):** React and NestJS were chosen as the foundation. React provides component-based UI development suited for a dynamic game interface with multiple views (solo, matchmaking, live game, collection, leaderboard). NestJS offers a modular backend architecture that naturally maps to the project's domain modules (auth, game, matchmaking, collection, etc.). Both use TypeScript, ensuring type safety across the full stack.

**Real-time WebSockets (Major):** A multiplayer word game requires instant state synchronization between two players. Socket.IO was chosen for its built-in room management, reconnection handling, and fallback to HTTP polling, which directly supports the live match, matchmaking queue, and friend online status features.

**User interaction — chat, profile, friends (Major):** The project requirements mandate user-to-user interaction. A semantic word game benefits from social features: players can chat during or between matches, view each other's profiles , online status and collection stats, and manage a friends list for quick rematches.

**Standard user management (Major):** Players need persistent accounts to track their word collection, statistics, and ranking. Avatar upload, display name customization, and profile pages give each player a visible identity on the leaderboard and in multiplayer matches.

**WAF/ModSecurity + Vault (Major):** As the application handles user credentials, game state, and OAuth tokens, security is critical. ModSecurity provides runtime protection against common web attacks (SQLi, XSS). HashiCorp Vault ensures that no sensitive credentials (database passwords, JWT secrets, OAuth keys) are stored in plain text — they are injected into container memory at boot time.

**Complete web-based game (Major):** The semantic word-guessing game (inspired by Cemantix) uses local word embeddings for similarity scoring, with clear win/loss conditions and multiple game modes (Solo, Training, Daily, Duel).

**Prisma ORM (Minor):** Prisma defines the PostgreSQL schema, relations, and generated client used by the backend modules.

**Game statistics and match history (Minor):** A competitive word game naturally produces data worth tracking. Wins, losses, ranking, and match history feed into the leaderboard and player profile, reinforcing the competitive loop.

**OAuth 2.0 (Minor):** As a 42 school project, supporting 42 OAuth login is a natural fit. Google and GitHub OAuth were added to broaden access and demonstrate multi-provider integration.

**2FA (Minor):** TOTP-based two-factor authentication adds an extra layer of account security, particularly relevant given that the application stores player collections with in-game value.


**Sentiment analysis (Minor):** This module automatically analyzes player feedback to assess user satisfaction and identify areas for improvement. By examining sentiment trends in user comments and reviews, it helps support data-driven decisions for enhancing the gaming experience.

**Analytics dashboard (Minor):** The analytics page visualizes game activity, similarity distribution, collection rarity distribution, win speed, and feedback sentiment. It includes date filters and CSV export for the games-over-time chart.

---

## Individual Contributions

- **apiochau**
  - Designed and implemented the semantic word-guessing gameplay.
  - Implemented authentication flow, OAuth integration, matchmaking, and live game routing.
  - Built collection rewards, daily mode, duel mode, and core backend game logic.

- **cossadon**
  - Designed the NestJS and Socket.IO backend architecture.
  - Implemented and reviewed backend modules for users, WebSocket flows, and Prisma relations.
  - Helped integrate real-time multiplayer behavior with frontend game pages.

- **cwang**
  - Designed and implemented the Analytics Dashboard.
  - Developed backend analytics APIs and data aggregation logic for player engagement, completion rates, and gameplay statistics.
  - Implemented an AI-powered feedback analysis system using sentiment classification to automatically categorize player feedback.

- **luxu**
  - Build the profile page with display name editing, statistics display, and collection value calculation.
  - Developed avatar upload and management system with file type validation, size limiting, and default avatar fallback.
  - Implemented online status tracking for user profiles and friends list.
  - Implemented TOTP-based Two-Factor Authentication (2FA): secret generation, QR code provisioning, enable/disable flow, and login verification with temporary token mechanism.
  - Created Privacy Policy and Terms of Service pages.

- **qizhang**
  - Linked Vault secrets to the Prisma database engine safely on boot.
  - Configured Nginx to encrypt web traffic and handle secure handshakes.
  - Set up firewall rules to automatically drop SQL injection and XSS exploits

During development, the team encountered several technical and coordination challenges. Integrating multiple frontend and backend components required careful API design and consistent data models to ensure compatibility between modules. These challenges were addressed through regular team communication, code reviews, and iterative testing, which helped identify issues early and maintain smooth collaboration throughout the project.

## Current State

The project is a playable prototype featuring authentication, semantic gameplay, matchmaking, collections, leaderboards, and real-time multiplayer functionality. Additional modules such as tournaments, friends, notifications, analytics, and feedback are already integrated and can be further expanded.

## License

No license is currently defined. A LICENSE file should be added before public distribution or external reuse.
