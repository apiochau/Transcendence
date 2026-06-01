# Word Heist Arena

Web game prototype built on the Transcendence stack. The current solo mode is a Cémantix-like word guessing game using controlled suggestions from a local semantic word database.

## Folder Tree

```text
.
├── backend
│   ├── Dockerfile
│   ├── data
│   ├── package.json
│   ├── prisma
│   │   └── schema.prisma
│   ├── scripts
│   ├── src
│   │   ├── app.module.ts
│   │   ├── auth
│   │   ├── common
│   │   ├── friends
│   │   ├── game
│   │   ├── main.ts
│   │   ├── matchmaking
│   │   ├── notifications
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts
│   │   ├── stats
│   │   ├── tournaments
│   │   ├── users
│   │   └── websocket
│   ├── test
│   ├── tsconfig.build.json
│   └── tsconfig.json
├── frontend
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── postcss.config.js
│   ├── src
│   │   ├── api
│   │   ├── App.tsx
│   │   ├── components
│   │   ├── index.css
│   │   ├── layouts
│   │   ├── main.tsx
│   │   ├── pages
│   │   ├── routes
│   │   ├── store
│   │   └── types
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── nginx
│   └── default.conf
├── docker-compose.yml
└── README.md
```

## Run

```sh
docker compose up --build
```

Then open:

```text
http://localhost:8080
```

## Solo Gameplay

- The backend picks a secret word from the local word database.
- The player receives 4 controlled suggestions from known local words.
- Clicking a suggestion reveals its similarity score and stores it in history.
- After a click, the round is locked for 5 seconds so the player can try a final answer.
- The final answer is exact-match only after normalization; it does not return a similarity score.
- The history is sorted by best score first.

## Offline Word Embeddings

The solo word game uses local embeddings only. The backend loads:

```text
backend/data/embeddings/words.json
```

To generate a larger reduced dictionary from a local French FastText `.vec` file:

```sh
cd backend
npm run build:embeddings -- --fasttext /path/to/cc.fr.300.vec --wordlist /path/to/french-words.txt --output data/embeddings/words.json --limit 10000
```

The game does not call external embedding APIs during gameplay.


test