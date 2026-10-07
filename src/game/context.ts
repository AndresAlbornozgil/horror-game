import type { Identity } from "@/multiplayer/room-client";

/** Registry key under which React hands the room context to Phaser. */
export const GAME_CONTEXT_KEY = "game-context";

/** Events Phaser emits on `game.events` for React to consume. */
export const GAME_EVENTS = {
  ready: "game:ready",
  rosterChanged: "game:roster-changed",
} as const;

export interface GameContext {
  roomCode: string;
  identity: Identity;
}

export interface RosterEntry {
  id: string;
  name: string;
}

export interface Roster {
  players: RosterEntry[];
  localId: string | null;
}
