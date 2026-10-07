import type { DIFFICULTIES, MAPS } from "@/lib/constants";
import type { GameStatus } from "./game";
import type { Player } from "./player";

export type GameMap = (typeof MAPS)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface RoomSettings {
  map: GameMap;
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
