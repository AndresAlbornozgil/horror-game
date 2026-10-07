import { randomUUID } from "node:crypto";
import { GAME_CONFIG } from "../../src/config/game.config";
import type { GameSession } from "../../src/types/game";
import type { Player } from "../../src/types/player";

export function createSession(roomCode: string): GameSession {
  return { id: randomUUID(), roomCode, status: "starting" };
}

/** Places players evenly on a circle around the world centre. */
export function assignSpawnPositions(players: Player[]): void {
  const { width, height } = GAME_CONFIG.world;
  const { radius } = GAME_CONFIG.spawn;
  players.forEach((player, index) => {
    const angle = (index / Math.max(players.length, 1)) * Math.PI * 2;
    player.x = Math.round(width / 2 + Math.cos(angle) * radius);
    player.y = Math.round(height / 2 + Math.sin(angle) * radius);
  });
}
