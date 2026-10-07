import { GAME_CONFIG } from "../../src/config/game.config";
import { clamp } from "../../src/lib/utils";
import type { GameSession } from "../../src/types/game";
import type { Player } from "../../src/types/player";
import type { Room } from "../../src/types/room";
import type { GameStatePayload } from "../../src/types/socket";
import { RoomError } from "../rooms/room-manager";
import { assignSpawnPositions, createSession } from "./game-state";

/** Owns game sessions and in-game shared state (currently only player positions). */
export class GameServer {
  private readonly sessions = new Map<string, GameSession>();

  startGame(room: Room, requester: Player): GameSession {
    if (requester.id !== room.hostId) throw new RoomError("not-host", "Only the host can start the game.");
    if (room.status !== "lobby") throw new RoomError("game-in-progress", "The game has already started.");
    if (room.players.some((p) => p.id !== room.hostId && !p.isReady)) {
      throw new RoomError("players-not-ready", "Every player must be ready.");
    }

    assignSpawnPositions(room.players);
    const session = createSession(room.code);
    this.sessions.set(room.code, session);
    room.status = "starting";
    return session;
  }

  /** Returns the state a client needs to build the world. Marks the game active on first join. */
  joinGame(room: Room, player: Player): { state: GameStatePayload; statusChanged: boolean } {
    const session = this.sessions.get(room.code);
    if (!session || room.status === "lobby") {
      throw new RoomError("game-not-started", "The game has not started yet.");
    }

    const statusChanged = room.status === "starting";
    if (statusChanged) {
      room.status = "active";
      session.status = "active";
    }
    return {
      state: { session: { ...session }, players: room.players, playerId: player.id },
      statusChanged,
    };
  }

  movePlayer(room: Room, player: Player, x: unknown, y: unknown): boolean {
    if (room.status !== "active") return false;
    if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    player.x = clamp(x, 0, GAME_CONFIG.world.width);
    player.y = clamp(y, 0, GAME_CONFIG.world.height);
    return true;
  }

  removeSession(roomCode: string): void {
    this.sessions.delete(roomCode);
  }
}
