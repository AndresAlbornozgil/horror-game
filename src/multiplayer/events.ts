/** Central registry of every Socket.IO event name. Never use string literals elsewhere. */

export const ClientEvent = {
  CreateRoom: "create-room",
  JoinRoom: "join-room",
  LeaveRoom: "leave-room",
  PlayerReady: "player-ready",
  UpdateRoomSettings: "update-room-settings",
  StartGame: "start-game",
  JoinGame: "join-game",
  PlayerMove: "player-move",
} as const;

export const ServerEvent = {
  RoomCreated: "room-created",
  RoomJoined: "room-joined",
  RoomUpdated: "room-updated",
  PlayerJoined: "player-joined",
  PlayerLeft: "player-left",
  HostChanged: "host-changed",
  GameStarting: "game-starting",
  GameState: "game-state",
  PlayerMoved: "player-moved",
  RoomError: "room-error",
} as const;
