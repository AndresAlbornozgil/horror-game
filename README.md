# Dead Signal

A browser-based cooperative multiplayer 2D horror game. This repository currently contains the **foundation only**: multiplayer rooms, lobby, a Phaser integration with a placeholder world, and the project architecture. There is no horror gameplay yet.

## Stack

TypeScript (strict) · Next.js (App Router) · React · Tailwind CSS · Phaser · Socket.IO · Node.js · PostgreSQL + Prisma

## Responsibilities

| Layer | Owns |
| --- | --- |
| React / Next.js (`src/app`, `src/components`) | Home, lobby, settings, menus, HUD overlays, API routes |
| Phaser (`src/game`) | The 2D world: movement, camera, sprites, collisions, future entities |
| Socket.IO server (`server/`) | All shared real-time state: rooms, players, ready states, host, settings, positions |
| PostgreSQL + Prisma | Persistent data only (profiles, history, progression…). Never lobby or movement data |

The server is authoritative for shared state. React only holds local UI state.

## Getting started

```bash
npm install
cp .env.example .env      # then edit DATABASE_URL
npm run db:generate       # generate the Prisma client
npm run dev               # Next.js on :3000 + Socket.IO server on :4000
```

The database is optional for now: lobby and game work without it. `GET /api/health` reports `database: "ok" | "unavailable"`. Run `npm run db:push` once Postgres is available.

Try it: open <http://localhost:3000>, create a room, then open the invite link (`/lobby/ABCD23`) in a second tab. Ready up in the second tab, start from the host tab, and move with WASD / arrow keys.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO URL used by the browser (default `http://localhost:4000`) |
| `SOCKET_PORT` | Port of the Socket.IO server (default `4000`) |
| `CLIENT_ORIGIN` | Comma-separated origins allowed by the Socket.IO CORS policy (default `http://localhost:3000`). Add your LAN/production URL here to play with others |

### Scripts

`dev`, `build`, `start`, `lint`, `typecheck`, `db:generate`, `db:push`, `db:migrate`, `db:studio`.

## Flow

1. Enter a name → **Create Room** (or enter a code → **Join Room**). Opening `/lobby/CODE` directly asks for a name first.
2. Everyone appears in the lobby; the host edits map / difficulty / max players (synced live).
3. Non-host players ready up; the host starts the game.
4. The server emits `game-starting`; everyone navigates to `/game/CODE`, where Phaser joins the session (`join-game`) and positions sync through `player-move` / `player-moved`.

Room codes are 6 characters from an alphabet without look-alikes (no `I`, `O`, `0`, `1`).

## Identity and reconnecting

There are no accounts. Each browser tab keeps a private session token in `sessionStorage`; the player name is remembered in `localStorage`. The token is never broadcast and lets a tab reclaim its seat after a refresh (the server keeps a seat for 10 s after a disconnect). Players get a separate, server-assigned public `id`.

## Layout

```
server/          Socket.IO server (socket handlers, room manager, game server)
src/app/         Next.js routes (home, lobby, game, API)
src/components/  React UI (home, lobby, game overlay, ui primitives)
src/game/        Phaser: config, scenes, player, plus empty folders for future systems
src/multiplayer/ Socket client, event names (events.ts), room/game clients
src/hooks/       usePlayer, useRoom, useSocket
src/types/       Shared Player, Room, RoomSettings, GameSession, socket payload types
prisma/          Prisma schema
```

All socket event names live in `src/multiplayer/events.ts`; payload types in `src/types/socket.ts`. The server imports shared types, constants and utilities from `src/` using relative paths.

Phaser is imported dynamically inside an effect in `GameContainer`, so it never runs during server rendering.

## Not implemented yet

Enemies, flashlight/lighting, doors, inventory, equipment, evidence, objectives, sanity, audio, tilemaps/collisions, and persistent database models. Their folders exist under `src/game/` as placeholders.
