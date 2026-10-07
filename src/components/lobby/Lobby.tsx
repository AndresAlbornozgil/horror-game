"use client";

import Link from "next/link";
import { InvitePanel } from "@/components/lobby/InvitePanel";
import { LobbyHeader } from "@/components/lobby/LobbyHeader";
import { NamePrompt } from "@/components/lobby/NamePrompt";
import { PlayerList } from "@/components/lobby/PlayerList";
import { ReadyButton } from "@/components/lobby/ReadyButton";
import { RoomSettings } from "@/components/lobby/RoomSettings";
import { StartGameButton } from "@/components/lobby/StartGameButton";
import { Panel } from "@/components/ui/Panel";
import { usePlayer } from "@/hooks/usePlayer";
import { useRoom } from "@/hooks/useRoom";
import { useSocket } from "@/hooks/useSocket";
import { setReady, startGame } from "@/multiplayer/room-client";

interface LobbyProps {
  roomCode: string;
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Panel className="w-full max-w-md text-center">{children}</Panel>
    </main>
  );
}

export function Lobby({ roomCode }: LobbyProps) {
  const { setName } = usePlayer();
  const { connected } = useSocket();
  const { room, me, isHost, status, error, clearError, leave } = useRoom(roomCode);

  if (status === "needs-name") {
    return <NamePrompt onSubmit={setName} />;
  }

  if (status === "failed") {
    return (
      <Message>
        <p className="label mb-3">Cannot enter room {roomCode}</p>
        <p className="mb-6 text-lg">{error?.message}</p>
        <Link href="/" className="label text-parchment underline underline-offset-4 hover:text-bone">
          Back to start
        </Link>
      </Message>
    );
  }

  if (status === "joining" || !room) {
    return (
      <Message>
        <p className="label animate-flicker">{connected ? "Entering the room…" : "Reaching the server…"}</p>
      </Message>
    );
  }

  const waitingOn = room.players.filter((player) => !player.isHost && !player.isReady).length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <LobbyHeader connected={connected} onLeave={leave} />

      {error && (
        <p
          role="alert"
          className="flex items-center justify-between border-l-2 border-blood-bright pl-3 font-typewriter text-sm text-blood-bright"
        >
          {error.message}
          <button type="button" className="label cursor-pointer px-2 hover:text-bone" onClick={clearError}>
            Dismiss
          </button>
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
        <PlayerList players={room.players} meId={me?.id ?? null} maxPlayers={room.settings.maxPlayers} />
        <div className="flex flex-col gap-6">
          <InvitePanel roomCode={room.code} />
          <RoomSettings settings={room.settings} isHost={isHost} playerCount={room.players.length} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm">
        {isHost ? (
          <StartGameButton onStart={startGame} waitingOn={waitingOn} />
        ) : (
          <ReadyButton isReady={me?.isReady ?? false} onToggle={() => setReady(!me?.isReady)} />
        )}
      </div>
    </main>
  );
}
