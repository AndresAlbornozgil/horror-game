export interface Player {
  /** Public, server-assigned identifier. */
  id: string;
  socketId: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  x: number;
  y: number;
}
