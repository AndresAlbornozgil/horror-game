"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Game } from "phaser";
import { GameHUD } from "@/components/game/GameHUD";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { GAME_EVENTS } from "@/game/context";
import type { Roster } from "@/game/context";
import { usePlayer } from "@/hooks/usePlayer";
import { subscribeGame } from "@/multiplayer/game-client";
import { leaveRoom } from "@/multiplayer/room-client";
import type { RoomErrorPayload } from "@/types/socket";

interface GameContainerProps {
  roomCode: string;
}

const EMPTY_ROSTER: Roster = { players: [], localId: null };

/** Hosts the Phaser canvas. Phaser is imported dynamically so it never runs during server rendering. */
export function GameContainer({ roomCode }: GameContainerProps) {
  const router = useRouter();
  const { cleanName, sessionToken, isReady } = usePlayer();
  const parentRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [roster, setRoster] = useState<Roster>(EMPTY_ROSTER);
  const [error, setError] = useState<RoomErrorPayload | null>(null);

  const needsName = isReady && !cleanName;
  useEffect(() => {
    // Opened the game URL directly without a name: the lobby page asks for one.
    if (needsName) router.replace(`/lobby/${roomCode}`);
  }, [needsName, roomCode, router]);

  useEffect(() => {
    const parent = parentRef.current;
    if (!isReady || !cleanName || !parent) return;

    let cancelled = false;
    let game: Game | undefined;

    const unsubscribe = subscribeGame({
      onError: (payload) => {
        if (payload.code === "game-not-started") router.replace(`/lobby/${roomCode}`);
        else setError(payload);
      },
    });

    void import("@/game/config/phaser.config").then(({ createPhaserGame }) => {
      if (cancelled) return;
      game = createPhaserGame(parent, { roomCode, identity: { name: cleanName, sessionToken } });
      game.events.on(GAME_EVENTS.ready, () => setLoaded(true));
      game.events.on(GAME_EVENTS.rosterChanged, setRoster);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      game?.destroy(true);
    };
  }, [roomCode, cleanName, sessionToken, isReady, router]);

  const leave = () => {
    leaveRoom();
    router.push("/");
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-void">
      <div ref={parentRef} className="absolute inset-0" />
      {loaded && !error && <GameHUD roomCode={roomCode} roster={roster} onLeave={leave} />}
      {!loaded && !error && <LoadingScreen />}
      {error && (
        <Modal title="Lost in the dark">
          <p className="mb-6 text-lg">{error.message}</p>
          <Button variant="primary" className="w-full" onClick={() => router.push("/")}>
            Back to start
          </Button>
        </Modal>
      )}
    </div>
  );
}
