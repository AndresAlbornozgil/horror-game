"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { leaveRoom, requestJoinRoom, subscribeLobby } from "@/multiplayer/room-client";
import { getSocket } from "@/multiplayer/socket";
import type { Room } from "@/types/room";
import type { RoomErrorPayload } from "@/types/socket";
import { usePlayer } from "./usePlayer";

export type RoomStatus = "needs-name" | "joining" | "joined" | "failed";

/** Joins `roomCode` as the local player and mirrors the server's room state. */
export function useRoom(roomCode: string) {
  const router = useRouter();
  const { cleanName, sessionToken, isReady } = usePlayer();
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<RoomErrorPayload | null>(null);

  useEffect(() => {
    if (!isReady || !cleanName) return;
    const identity = { name: cleanName, sessionToken };
    const socket = getSocket();

    const unsubscribe = subscribeLobby({
      onConnect: () => requestJoinRoom(roomCode, identity),
      onJoined: (payload) => {
        if (payload.room.code !== roomCode) return;
        setRoom(payload.room);
        setPlayerId(payload.playerId);
        setError(null);
        if (payload.room.status !== "lobby") router.replace(`/game/${roomCode}`);
      },
      onUpdated: (payload) => {
        if (payload.room.code === roomCode) setRoom(payload.room);
      },
      onStarting: (payload) => {
        if (payload.roomCode === roomCode) router.push(`/game/${roomCode}`);
      },
      onError: setError,
    });

    if (socket.connected) requestJoinRoom(roomCode, identity);
    return unsubscribe;
  }, [roomCode, cleanName, sessionToken, isReady, router]);

  const me = room?.players.find((player) => player.id === playerId) ?? null;

  let status: RoomStatus;
  if (room) status = "joined";
  else if (error) status = "failed";
  else if (isReady && !cleanName) status = "needs-name";
  else status = "joining";

  return {
    room,
    me,
    isHost: !!room && !!me && room.hostId === me.id,
    status,
    error,
    clearError: () => setError(null),
    leave: () => {
      leaveRoom();
      router.push("/");
    },
  };
}
