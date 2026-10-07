import { ClientEvent, ServerEvent } from "../../src/multiplayer/events";
import { safe } from "./context";
import type { ServerContext, TypedSocket } from "./context";

export function registerPlayerEvents(ctx: ServerContext, socket: TypedSocket): void {
  socket.on(
    ClientEvent.PlayerMove,
    safe(socket, (payload) => {
      const membership = ctx.rooms.getMembership(socket.id);
      if (!membership) return;
      const { room, player } = membership;
      if (!ctx.games.movePlayer(room, player, payload?.x, payload?.y)) return;
      socket.volatile.to(room.code).emit(ServerEvent.PlayerMoved, { playerId: player.id, x: player.x, y: player.y });
    }),
  );
}
