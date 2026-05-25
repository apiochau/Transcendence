# Transcendence

Production-ready base architecture for a real-time 1v1 quiz web application.

## Folder Tree

```text
.
├── backend
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma
│   │   └── schema.prisma
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
