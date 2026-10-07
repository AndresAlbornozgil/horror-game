import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/types/socket";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

let socket: GameSocket | null = null;

/** Returns the shared client socket, creating and connecting it on first use. Browser only. */
export function getSocket(): GameSocket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false });
  }
  if (!socket.active) socket.connect();
  return socket;
}
