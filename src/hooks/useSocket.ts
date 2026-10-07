"use client";

import { useSyncExternalStore } from "react";
import { getSocket } from "@/multiplayer/socket";

function subscribe(onChange: () => void) {
  const socket = getSocket();
  socket.on("connect", onChange);
  socket.on("disconnect", onChange);
  return () => {
    socket.off("connect", onChange);
    socket.off("disconnect", onChange);
  };
}

/** Connection status of the shared socket; also makes sure it is connecting. */
export function useSocket() {
  const connected = useSyncExternalStore(
    subscribe,
    () => getSocket().connected,
    () => false,
  );
  return { connected };
}
