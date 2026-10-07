import { ClientEvent, ServerEvent } from "../../src/multiplayer/events";
import { RoomError } from "../rooms/room-manager";
import { attachToRoom, safe } from "./context";
import type { ServerContext, TypedSocket } from "./context";

export function registerGameEvents(ctx: ServerContext, socket: TypedSocket): void {
  const { io, rooms, games } = ctx;

  socket.on(
    ClientEvent.StartGame,
    safe(socket, () => {
      const { room, player } = rooms.requireMembership(socket.id);
      games.startGame(room, player);
      io.to(room.code).emit(ServerEvent.RoomUpdated, { room });
      io.to(room.code).emit(ServerEvent.GameStarting, { roomCode: room.code });
    }),
  );

  socket.on(
    ClientEvent.JoinGame,
    safe(socket, (payload) => {
      const existing = rooms.getRoom(payload?.roomCode ?? "");
      if (!existing) throw new RoomError("room-not-found", "That room does not exist.");
      if (existing.status === "lobby") throw new RoomError("game-not-started", "The game has not started yet.");

      const result = attachToRoom(
        ctx,
        socket,
        rooms.joinRoom(socket.id, payload?.roomCode, payload?.name, payload?.sessionToken),
      );
      const { state, statusChanged } = games.joinGame(result.room, result.player);
      socket.emit(ServerEvent.GameState, state);
      socket.to(result.room.code).emit(ServerEvent.PlayerJoined, { player: result.player });
      if (statusChanged) io.to(result.room.code).emit(ServerEvent.RoomUpdated, { room: result.room });
    }),
  );
}
