import { config } from "dotenv";
import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "../src/types/socket";
import { GameServer } from "./game/game-server";
import { RoomManager } from "./rooms/room-manager";
import { registerConnection } from "./socket/connection";

config({ path: [".env.local", ".env"], quiet: true });

const port = Number(process.env.SOCKET_PORT ?? process.env.PORT ?? 4000);
const origins = (process.env.CLIENT_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: origins },
});

registerConnection(io, { rooms: new RoomManager(), games: new GameServer() });

httpServer.listen(port, () => {
  console.log(`[server] Socket.IO listening on :${port} (allowed origins: ${origins.join(", ")})`);
});
