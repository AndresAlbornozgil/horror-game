import { randomUUID } from "node:crypto";
import {
  DEFAULT_ROOM_SETTINGS,
  DIFFICULTIES,
  MAPS,
  MAX_PLAYERS_LIMIT,
  MIN_PLAYERS,
} from "../../src/lib/constants";
import { normalizeRoomCode, sanitizePlayerName } from "../../src/lib/utils";
import type { Player } from "../../src/types/player";
import type { Room, RoomSettings } from "../../src/types/room";
import type { RoomErrorCode } from "../../src/types/socket";
import { generateRoomCode } from "./room-code";

export class RoomError extends Error {
  constructor(
    public readonly code: RoomErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RoomError";
  }
}

interface RoomRecord {
  room: Room;
  /** Private session token -> public player id. Never leaves the server. */
  tokens: Map<string, string>;
}

export interface Membership {
  room: Room;
  player: Player;
}

export interface JoinResult extends Membership {
  isNewMember: boolean;
  previousSocketId: string | null;
  /** Set when the socket had to leave another room to make this join. */
  departed: LeaveResult | null;
}

export interface LeaveResult {
  roomCode: string;
  /** Null when the room became empty and was deleted. */
  room: Room | null;
  player: Player;
  newHostId: string | null;
}

function parseIdentity(name: unknown, sessionToken: unknown): { name: string; sessionToken: string } {
  const cleanName = sanitizePlayerName(name);
  if (!cleanName) throw new RoomError("invalid-request", "Enter a valid player name.");
  if (typeof sessionToken !== "string" || sessionToken.length < 8 || sessionToken.length > 128) {
    throw new RoomError("invalid-request", "Invalid session.");
  }
  return { name: cleanName, sessionToken };
}

/** Owns all shared room state. Pure logic: no sockets are touched here. */
export class RoomManager {
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly socketMemberships = new Map<string, { roomCode: string; playerId: string }>();
  private readonly graceTimers = new Map<string, NodeJS.Timeout>();

  getRoom(code: string): Room | null {
    return this.rooms.get(normalizeRoomCode(code))?.room ?? null;
  }

  getMembership(socketId: string): Membership | null {
    const ref = this.socketMemberships.get(socketId);
    if (!ref) return null;
    const room = this.rooms.get(ref.roomCode)?.room;
    const player = room?.players.find((p) => p.id === ref.playerId);
    return room && player ? { room, player } : null;
  }

  requireMembership(socketId: string): Membership {
    const membership = this.getMembership(socketId);
    if (!membership) throw new RoomError("not-in-room", "You are not in a room.");
    return membership;
  }

  createRoom(socketId: string, name: unknown, sessionToken: unknown): JoinResult {
    const identity = parseIdentity(name, sessionToken);
    const code = generateRoomCode((candidate) => this.rooms.has(candidate));
    const departed = this.leaveOtherRoom(socketId, code);
    const player = this.createPlayer(socketId, identity.name, true);
    const room: Room = {
      code,
      hostId: player.id,
      players: [player],
      settings: { ...DEFAULT_ROOM_SETTINGS },
      status: "lobby",
    };
    this.rooms.set(code, { room, tokens: new Map([[identity.sessionToken, player.id]]) });
    this.socketMemberships.set(socketId, { roomCode: code, playerId: player.id });
    return { room, player, isNewMember: true, previousSocketId: null, departed };
  }

  /** Joins as a new member (lobby only) or reclaims an existing seat via the session token. */
  joinRoom(socketId: string, roomCode: unknown, name: unknown, sessionToken: unknown): JoinResult {
    const identity = parseIdentity(name, sessionToken);
    const code = normalizeRoomCode(roomCode);
    const record = this.rooms.get(code);
    if (!record) throw new RoomError("room-not-found", "That room does not exist.");
    const { room } = record;

    const existingId = record.tokens.get(identity.sessionToken);
    const existing = existingId ? room.players.find((p) => p.id === existingId) : undefined;
    if (existing) {
      const departed = this.leaveOtherRoom(socketId, code);
      const previousSocketId = existing.socketId !== socketId ? existing.socketId : null;
      if (previousSocketId) this.socketMemberships.delete(previousSocketId);
      this.clearGraceTimer(existing.id);
      existing.socketId = socketId;
      this.socketMemberships.set(socketId, { roomCode: code, playerId: existing.id });
      return { room, player: existing, isNewMember: false, previousSocketId, departed };
    }

    if (room.status !== "lobby") throw new RoomError("game-in-progress", "That game has already started.");
    if (room.players.length >= room.settings.maxPlayers) throw new RoomError("room-full", "That room is full.");

    const departed = this.leaveOtherRoom(socketId, code);
    const player = this.createPlayer(socketId, identity.name, false);
    room.players.push(player);
    record.tokens.set(identity.sessionToken, player.id);
    this.socketMemberships.set(socketId, { roomCode: code, playerId: player.id });
    return { room, player, isNewMember: true, previousSocketId: null, departed };
  }

  leave(socketId: string): LeaveResult | null {
    const membership = this.getMembership(socketId);
    if (!membership) {
      this.socketMemberships.delete(socketId);
      return null;
    }
    return this.removePlayer(membership.room.code, membership.player);
  }

  /**
   * Keeps the seat for a grace period so a page refresh or brief network drop
   * does not remove the player. `onRemoved` fires only if the seat expires.
   */
  handleDisconnect(socketId: string, graceMs: number, onRemoved: (result: LeaveResult) => void): void {
    const membership = this.getMembership(socketId);
    this.socketMemberships.delete(socketId);
    if (!membership) return;

    const { room, player } = membership;
    this.clearGraceTimer(player.id);
    const timer = setTimeout(() => {
      this.graceTimers.delete(player.id);
      const current = this.rooms.get(room.code)?.room.players.find((p) => p.id === player.id);
      if (!current || current.socketId !== socketId) return;
      onRemoved(this.removePlayer(room.code, current));
    }, graceMs);
    this.graceTimers.set(player.id, timer);
  }

  setReady(socketId: string, isReady: unknown): Membership {
    const membership = this.requireMembership(socketId);
    if (typeof isReady !== "boolean") throw new RoomError("invalid-request", "Invalid ready state.");
    if (membership.room.status !== "lobby") throw new RoomError("game-in-progress", "The game has already started.");
    membership.player.isReady = isReady;
    return membership;
  }

  updateSettings(socketId: string, patch: unknown): Room {
    const { room, player } = this.requireMembership(socketId);
    if (player.id !== room.hostId) throw new RoomError("not-host", "Only the host can change settings.");
    if (room.status !== "lobby") throw new RoomError("game-in-progress", "The game has already started.");
    if (typeof patch !== "object" || patch === null) throw new RoomError("invalid-request", "Invalid settings.");

    const input = patch as Partial<Record<keyof RoomSettings, unknown>>;
    const next: RoomSettings = { ...room.settings };

    if (input.map !== undefined) {
      const map = MAPS.find((m) => m === input.map);
      if (!map) throw new RoomError("invalid-request", "Unknown map.");
      next.map = map;
    }
    if (input.difficulty !== undefined) {
      const difficulty = DIFFICULTIES.find((d) => d === input.difficulty);
      if (!difficulty) throw new RoomError("invalid-request", "Unknown difficulty.");
      next.difficulty = difficulty;
    }
    if (input.maxPlayers !== undefined) {
      const value = input.maxPlayers;
      const lowest = Math.max(MIN_PLAYERS, room.players.length);
      if (typeof value !== "number" || !Number.isInteger(value) || value < lowest || value > MAX_PLAYERS_LIMIT) {
        throw new RoomError("invalid-request", `Max players must be between ${lowest} and ${MAX_PLAYERS_LIMIT}.`);
      }
      next.maxPlayers = value;
    }

    room.settings = next;
    return room;
  }

  private leaveOtherRoom(socketId: string, targetCode: string): LeaveResult | null {
    const current = this.getMembership(socketId);
    if (!current || current.room.code === targetCode) return null;
    return this.removePlayer(current.room.code, current.player);
  }

  private createPlayer(socketId: string, name: string, isHost: boolean): Player {
    return { id: randomUUID(), socketId, name, isHost, isReady: false, x: 0, y: 0 };
  }

  private removePlayer(roomCode: string, player: Player): LeaveResult {
    const record = this.rooms.get(roomCode);
    if (!record) throw new RoomError("room-not-found", "That room does not exist.");
    const { room } = record;

    this.clearGraceTimer(player.id);
    this.socketMemberships.delete(player.socketId);
    room.players = room.players.filter((p) => p.id !== player.id);
    for (const [token, playerId] of record.tokens) {
      if (playerId === player.id) record.tokens.delete(token);
    }

    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
      return { roomCode, room: null, player, newHostId: null };
    }

    let newHostId: string | null = null;
    if (room.hostId === player.id) {
      const nextHost = room.players[0]!;
      room.hostId = nextHost.id;
      room.players.forEach((p) => {
        p.isHost = p.id === nextHost.id;
      });
      newHostId = nextHost.id;
    }
    return { roomCode, room, player, newHostId };
  }

  private clearGraceTimer(playerId: string): void {
    const timer = this.graceTimers.get(playerId);
    if (timer) clearTimeout(timer);
    this.graceTimers.delete(playerId);
  }
}
