import { ClientEvent, ServerEvent } from "./events";
import { getSocket } from "./socket";
import type {
  RoomCreatedPayload,
  RoomErrorPayload,
  RoomJoinedPayload,
  RoomUpdatedPayload,
  GameStartingPayload,
} from "@/types/socket";
import type { RoomSettings } from "@/types/room";

export interface Identity {
  name: string;
  sessionToken: string;
}

const REQUEST_TIMEOUT_MS = 8000;

export class RoomRequestError extends Error {
  constructor(
    message: string,
    public readonly code: RoomErrorPayload["code"] | "timeout",
  ) {
    super(message);
    this.name = "RoomRequestError";
  }
}

export function createRoom(identity: Identity): Promise<RoomCreatedPayload> {
  const socket = getSocket();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      socket.off(ServerEvent.RoomCreated, onSuccess);
      socket.off(ServerEvent.RoomError, onError);
    };
    const onSuccess = (payload: RoomCreatedPayload) => {
      cleanup();
      resolve(payload);
    };
    const onError = (payload: RoomErrorPayload) => {
      cleanup();
      reject(new RoomRequestError(payload.message, payload.code));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new RoomRequestError("Could not reach the game server.", "timeout"));
    }, REQUEST_TIMEOUT_MS);

    socket.on(ServerEvent.RoomCreated, onSuccess);
    socket.on(ServerEvent.RoomError, onError);
    socket.emit(ClientEvent.CreateRoom, identity);
  });
}

export function requestJoinRoom(roomCode: string, identity: Identity): void {
  getSocket().emit(ClientEvent.JoinRoom, { roomCode, ...identity });
}

export function joinRoom(roomCode: string, identity: Identity): Promise<RoomJoinedPayload> {
  const socket = getSocket();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      socket.off(ServerEvent.RoomJoined, onSuccess);
      socket.off(ServerEvent.RoomError, onError);
    };
    const onSuccess = (payload: RoomJoinedPayload) => {
      cleanup();
      resolve(payload);
    };
    const onError = (payload: RoomErrorPayload) => {
      cleanup();
      reject(new RoomRequestError(payload.message, payload.code));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new RoomRequestError("Could not reach the game server.", "timeout"));
    }, REQUEST_TIMEOUT_MS);

    socket.on(ServerEvent.RoomJoined, onSuccess);
    socket.on(ServerEvent.RoomError, onError);
    socket.emit(ClientEvent.JoinRoom, { roomCode, ...identity });
  });
}

export function leaveRoom(): void {
  getSocket().emit(ClientEvent.LeaveRoom);
}

export function setReady(isReady: boolean): void {
  getSocket().emit(ClientEvent.PlayerReady, { isReady });
}

export function updateRoomSettings(settings: Partial<RoomSettings>): void {
  getSocket().emit(ClientEvent.UpdateRoomSettings, { settings });
}

export function startGame(): void {
  getSocket().emit(ClientEvent.StartGame);
}

export interface LobbyHandlers {
  onConnect: () => void;
  onJoined: (payload: RoomJoinedPayload) => void;
  onUpdated: (payload: RoomUpdatedPayload) => void;
  onStarting: (payload: GameStartingPayload) => void;
  onError: (payload: RoomErrorPayload) => void;
}

/** Subscribes to lobby events on the shared socket. Returns an unsubscribe function. */
export function subscribeLobby(handlers: LobbyHandlers): () => void {
  const socket = getSocket();
  socket.on("connect", handlers.onConnect);
  socket.on(ServerEvent.RoomJoined, handlers.onJoined);
  socket.on(ServerEvent.RoomUpdated, handlers.onUpdated);
  socket.on(ServerEvent.GameStarting, handlers.onStarting);
  socket.on(ServerEvent.RoomError, handlers.onError);
  return () => {
    socket.off("connect", handlers.onConnect);
    socket.off(ServerEvent.RoomJoined, handlers.onJoined);
    socket.off(ServerEvent.RoomUpdated, handlers.onUpdated);
    socket.off(ServerEvent.GameStarting, handlers.onStarting);
    socket.off(ServerEvent.RoomError, handlers.onError);
  };
}
