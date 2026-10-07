import { announceDeparture, reconnectGraceMs } from "./context";
import type { ServerContext, TypedServer } from "./context";
import { registerGameEvents } from "./game.events";
import { registerLobbyEvents } from "./lobby.events";
import { registerPlayerEvents } from "./player.events";

export function registerConnection(io: TypedServer, ctx: Omit<ServerContext, "io">): void {
  const context: ServerContext = { io, ...ctx };

  io.on("connection", (socket) => {
    console.log(`[socket] connected ${socket.id}`);

    registerLobbyEvents(context, socket);
    registerGameEvents(context, socket);
    registerPlayerEvents(context, socket);

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected ${socket.id} (${reason})`);
      context.rooms.handleDisconnect(socket.id, reconnectGraceMs, (result) => announceDeparture(context, result));
    });
  });
}
