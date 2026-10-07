import type { Server, Socket } from "socket.io";
import { GAME_CONFIG } from "../../src/config/game.config";
import { ServerEvent } from "../../src/multiplayer/events";
import type { ClientToServerEvents, ServerToClientEvents } from "../../src/types/socket";
import type { GameServer } from "../game/game-server";
import { RoomError } from "../rooms/room-manager";
import type { JoinResult, LeaveResult, RoomManager } from "../rooms/room-manager";

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export interface ServerContext {
  io: TypedServer;
  rooms: RoomManager;
  games: GameServer;
}

export const reconnectGraceMs = GAME_CONFIG.reconnectGraceMs;

/** Wraps a handler so thrown errors become `room-error` events instead of crashing the server. */
export function safe<Args extends unknown[]>(
  socket: TypedSocket,
  handler: (...args: Args) => void,
): (...args: Args) => void {
  return (...args) => {
    try {
      handler(...args);
    } catch (error) {
      if (error instanceof RoomError) {
        socket.emit(ServerEvent.RoomError, { code: error.code, message: error.message });
        return;
      }
      console.error("[socket] unhandled handler error", error);
      socket.emit(ServerEvent.RoomError, { code: "internal", message: "Something went wrong." });
    }
  };
}

/** Removes the socket from whatever room it is in and notifies the remaining players. */
export function leaveCurrentRoom(ctx: ServerContext, socket: TypedSocket): void {
  const result = ctx.rooms.leave(socket.id);
  if (!result) return;
  void socket.leave(result.roomCode);
  announceDeparture(ctx, result);
}

export function announceDeparture(ctx: ServerContext, result: LeaveResult): void {
  if (!result.room) {
    ctx.games.removeSession(result.roomCode);
    return;
  }
  const { io } = ctx;
  io.to(result.roomCode).emit(ServerEvent.PlayerLeft, { playerId: result.player.id });
  if (result.newHostId) io.to(result.roomCode).emit(ServerEvent.HostChanged, { hostId: result.newHostId });
  io.to(result.roomCode).emit(ServerEvent.RoomUpdated, { room: result.room });
}

/** Syncs Socket.IO channels with a completed create/join: leaves the old room, enters the new one. */
export function attachToRoom(ctx: ServerContext, socket: TypedSocket, result: JoinResult): JoinResult {
  if (result.departed) {
    void socket.leave(result.departed.roomCode);
    announceDeparture(ctx, result.departed);
  }
  if (result.previousSocketId) {
    ctx.io.in(result.previousSocketId).socketsLeave(result.room.code);
  }
  void socket.join(result.room.code);
  return result;
}
