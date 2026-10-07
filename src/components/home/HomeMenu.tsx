"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateRoomButton } from "@/components/home/CreateRoomButton";
import { JoinRoomForm } from "@/components/home/JoinRoomForm";
import { PlayerNameInput } from "@/components/home/PlayerNameInput";
import { GameTitle } from "@/components/layout/GameTitle";
import { Panel } from "@/components/ui/Panel";
import { usePlayer } from "@/hooks/usePlayer";
import { isValidRoomCode } from "@/lib/utils";
import { createRoom, joinRoom } from "@/multiplayer/room-client";

type Busy = "create" | "join" | null;

export function HomeMenu() {
  const router = useRouter();
  const { name, setName, cleanName, sessionToken, isReady } = usePlayer();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const fail = (reason: unknown) => {
    setError(reason instanceof Error ? reason.message : "Something went wrong.");
    setBusy(null);
  };

  const handleCreate = async () => {
    if (!cleanName) return setError("Enter a name first.");
    setError(null);
    setBusy("create");
    try {
      const { room } = await createRoom({ name: cleanName, sessionToken });
      router.push(`/lobby/${room.code}`);
    } catch (reason) {
      fail(reason);
    }
  };

  const handleJoin = async (roomCode: string) => {
    if (!cleanName) return setError("Enter a name first.");
    if (!isValidRoomCode(roomCode)) return setError("Room codes are 6 characters long.");
    setError(null);
    setBusy("join");
    try {
      await joinRoom(roomCode, { name: cleanName, sessionToken });
      router.push(`/lobby/${roomCode}`);
    } catch (reason) {
      fail(reason);
    }
  };

  const disabled = !isReady || busy !== null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-4 py-12">
      <GameTitle />

      <Panel className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <PlayerNameInput value={name} onChange={setName} disabled={!isReady} autoFocus />
          <CreateRoomButton onClick={handleCreate} disabled={disabled} loading={busy === "create"} />

          <div className="flex items-center gap-4" aria-hidden>
            <span className="h-px flex-1 bg-steel" />
            <span className="label">or</span>
            <span className="h-px flex-1 bg-steel" />
          </div>

          <JoinRoomForm onJoin={handleJoin} disabled={disabled} loading={busy === "join"} />

          {error && (
            <p role="alert" className="border-l-2 border-blood-bright pl-3 font-typewriter text-sm text-blood-bright">
              {error}
            </p>
          )}
        </div>
      </Panel>
    </main>
  );
}
