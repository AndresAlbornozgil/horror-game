export type GameStatus = "lobby" | "starting" | "active" | "finished";

export interface GameSession {
  id: string;
  roomCode: string;
  status: GameStatus;
  /** Seed for the randomly generated map. New every game; shared so all players get the same world. */
  seed: number;
}
