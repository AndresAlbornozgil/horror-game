import type { ClientEvent, ServerEvent } from "@/multiplayer/events";
import type { GameSession } from "./game";
import type { Player } from "./player";
import type { Room, RoomSettings } from "./room";

/**
 * `sessionToken` is a private, client-generated secret that lets a player reclaim
 * their seat after a refresh. It is never broadcast to other players.
 */
export interface CreateRoomPayload {
  name: string;
  sessionToken: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  name: string;
  sessionToken: string;
}

export type JoinGamePayload = JoinRoomPayload;

export interface PlayerReadyPayload {
  isReady: boolean;
}

export interface UpdateRoomSettingsPayload {
  settings: Partial<RoomSettings>;
}

export interface PlayerMovePayload {
  x: number;
  y: number;
}

export interface RoomCreatedPayload {
  room: Room;
  playerId: string;
}

export type RoomJoinedPayload = RoomCreatedPayload;

export interface RoomUpdatedPayload {
  room: Room;
}

export interface PlayerJoinedPayload {
  player: Player;
}

export interface PlayerLeftPayload {
  playerId: string;
}

export interface HostChangedPayload {
  hostId: string;
}

export interface GameStartingPayload {
  roomCode: string;
}

export interface GameStatePayload {
  session: GameSession;
  players: Player[];
  /** The receiving player's own id. */
  playerId: string;
}

export interface PlayerMovedPayload {
  playerId: string;
  x: number;
  y: number;
}

export type RoomErrorCode =
  | "invalid-request"
  | "room-not-found"
  | "room-full"
  | "game-in-progress"
  | "game-not-started"
  | "not-in-room"
  | "not-host"
  | "players-not-ready"
  | "internal";

export interface RoomErrorPayload {
  code: RoomErrorCode;
  message: string;
}

export interface ClientToServerEvents {
  [ClientEvent.CreateRoom]: (payload: CreateRoomPayload) => void;
  [ClientEvent.JoinRoom]: (payload: JoinRoomPayload) => void;
  [ClientEvent.LeaveRoom]: () => void;
  [ClientEvent.PlayerReady]: (payload: PlayerReadyPayload) => void;
  [ClientEvent.UpdateRoomSettings]: (payload: UpdateRoomSettingsPayload) => void;
  [ClientEvent.StartGame]: () => void;
  [ClientEvent.JoinGame]: (payload: JoinGamePayload) => void;
  [ClientEvent.PlayerMove]: (payload: PlayerMovePayload) => void;
}

export interface ServerToClientEvents {
  [ServerEvent.RoomCreated]: (payload: RoomCreatedPayload) => void;
  [ServerEvent.RoomJoined]: (payload: RoomJoinedPayload) => void;
  [ServerEvent.RoomUpdated]: (payload: RoomUpdatedPayload) => void;
  [ServerEvent.PlayerJoined]: (payload: PlayerJoinedPayload) => void;
  [ServerEvent.PlayerLeft]: (payload: PlayerLeftPayload) => void;
  [ServerEvent.HostChanged]: (payload: HostChangedPayload) => void;
  [ServerEvent.GameStarting]: (payload: GameStartingPayload) => void;
  [ServerEvent.GameState]: (payload: GameStatePayload) => void;
  [ServerEvent.PlayerMoved]: (payload: PlayerMovedPayload) => void;
  [ServerEvent.RoomError]: (payload: RoomErrorPayload) => void;
}
