import { GameTitle } from "@/components/layout/GameTitle";
import { Button } from "@/components/ui/Button";

interface LobbyHeaderProps {
  connected: boolean;
  onLeave: () => void;
}

export function LobbyHeader({ connected, onLeave }: LobbyHeaderProps) {
  return (
    <header className="relative flex flex-col items-center gap-6 border-b border-steel pb-6 pt-2">
      <div className="self-end sm:absolute sm:right-0 sm:top-0">
        <Button variant="ghost" onClick={onLeave}>
          Leave Room
        </Button>
      </div>
      <GameTitle size="md" />
      <p className="label">Lobby · {connected ? "Connection stable" : "Reconnecting…"}</p>
    </header>
  );
}
