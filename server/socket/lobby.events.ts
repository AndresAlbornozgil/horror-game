import { ClientEvent, ServerEvent } from "../../src/multiplayer/events";
import { attachToRoom, leaveCurrentRoom, safe } from "./context";
import type { ServerContext, TypedSocket } from "./context";

export function registerLobbyEvents(ctx: ServerContext, socket: TypedSocket): void {
  const { io, rooms } = ctx;

  socket.on(
    ClientEvent.CreateRoom,
    safe(socket, (payload) => {
      const result = attachToRoom(ctx, socket, rooms.createRoom(socket.id, payload?.name, payload?.sessionToken));
      socket.emit(ServerEvent.RoomCreated, { room: result.room, playerId: result.player.id });
    }),
  );

  socket.on(
    ClientEvent.JoinRoom,
    safe(socket, (payload) => {
      const result = attachToRoom(
        ctx,
        socket,
        rooms.joinRoom(socket.id, payload?.roomCode, payload?.name, payload?.sessionToken),
      );
      socket.emit(ServerEvent.RoomJoined, { room: result.room, playerId: result.player.id });
      if (result.isNewMember) socket.to(result.room.code).emit(ServerEvent.PlayerJoined, { player: result.player });
      socket.to(result.room.code).emit(ServerEvent.RoomUpdated, { room: result.room });
    }),
  );

  socket.on(
    ClientEvent.LeaveRoom,
    safe(socket, () => {
      leaveCurrentRoom(ctx, socket);
    }),
  );

  socket.on(
    ClientEvent.PlayerReady,
    safe(socket, (payload) => {
      const { room } = rooms.setReady(socket.id, payload?.isReady);
      io.to(room.code).emit(ServerEvent.RoomUpdated, { room });
    }),
  );

  socket.on(
    ClientEvent.UpdateRoomSettings,
    safe(socket, (payload) => {
      const room = rooms.updateSettings(socket.id, payload?.settings);
      io.to(room.code).emit(ServerEvent.RoomUpdated, { room });
    }),
  );
}
