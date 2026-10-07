export type GameStatus = "lobby" | "starting" | "active" | "finished";

export interface GameSession {
  id: string;
  roomCode: string;
  status: GameStatus;
}
