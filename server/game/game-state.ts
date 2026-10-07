import { randomInt, randomUUID } from "node:crypto";
import { GAME_CONFIG } from "../../src/config/game.config";
import type { GameSession } from "../../src/types/game";
import type { Player } from "../../src/types/player";

export function createSession(roomCode: string): GameSession {
  // A fresh seed per game: every game gets a newly generated map, identical for all players in it.
  return { id: randomUUID(), roomCode, status: "starting", seed: randomInt(1, 2 ** 31) };
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
