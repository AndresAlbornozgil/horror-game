import type { DIFFICULTIES } from "@/lib/constants";
import type { GameStatus } from "./game";
import type { Player } from "./player";

export type Difficulty = (typeof DIFFICULTIES)[number];

export interface RoomSettings {
  difficulty: Difficulty;
  maxPlayers: number;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  settings: RoomSettings;
  status: GameStatus;
}
