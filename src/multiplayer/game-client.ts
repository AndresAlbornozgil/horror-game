import { ClientEvent, ServerEvent } from "./events";
import type { Identity } from "./room-client";
import { getSocket } from "./socket";
import type {
  GameStatePayload,
  HostChangedPayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  PlayerMovedPayload,
  RoomErrorPayload,
} from "@/types/socket";

export function joinGame(roomCode: string, identity: Identity): void {
  getSocket().emit(ClientEvent.JoinGame, { roomCode, ...identity });
}

export function sendMove(x: number, y: number): void {
  getSocket().volatile.emit(ClientEvent.PlayerMove, { x, y });
}

export interface GameHandlers {
  /** Fires on every (re)connection so the caller can re-join the game session. */
  onConnect: () => void;
  onState: (payload: GameStatePayload) => void;
  onPlayerJoined: (payload: PlayerJoinedPayload) => void;
  onPlayerLeft: (payload: PlayerLeftPayload) => void;
  onPlayerMoved: (payload: PlayerMovedPayload) => void;
  onHostChanged: (payload: HostChangedPayload) => void;
  onError: (payload: RoomErrorPayload) => void;
}

const noop = () => {};

/** Subscribes to in-game events on the shared socket. Returns an unsubscribe function. */
export function subscribeGame(partial: Partial<GameHandlers>): () => void {
  const handlers: GameHandlers = {
    onConnect: noop,
    onState: noop,
    onPlayerJoined: noop,
    onPlayerLeft: noop,
    onPlayerMoved: noop,
    onHostChanged: noop,
    onError: noop,
    ...partial,
  };
  const socket = getSocket();
  socket.on("connect", handlers.onConnect);
  socket.on(ServerEvent.GameState, handlers.onState);
  socket.on(ServerEvent.PlayerJoined, handlers.onPlayerJoined);
  socket.on(ServerEvent.PlayerLeft, handlers.onPlayerLeft);
  socket.on(ServerEvent.PlayerMoved, handlers.onPlayerMoved);
  socket.on(ServerEvent.HostChanged, handlers.onHostChanged);
  socket.on(ServerEvent.RoomError, handlers.onError);
  return () => {
    socket.off("connect", handlers.onConnect);
    socket.off(ServerEvent.GameState, handlers.onState);
    socket.off(ServerEvent.PlayerJoined, handlers.onPlayerJoined);
    socket.off(ServerEvent.PlayerLeft, handlers.onPlayerLeft);
    socket.off(ServerEvent.PlayerMoved, handlers.onPlayerMoved);
    socket.off(ServerEvent.HostChanged, handlers.onHostChanged);
    socket.off(ServerEvent.RoomError, handlers.onError);
  };
}
