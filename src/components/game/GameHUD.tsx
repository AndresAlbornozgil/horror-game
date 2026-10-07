import { Button } from "@/components/ui/Button";
import type { Roster } from "@/game/context";

interface GameHUDProps {
  roomCode: string;
  roster: Roster;
  onLeave: () => void;
}

/** React overlay on top of the Phaser canvas. Presentation only; the world lives in Phaser. */
export function GameHUD({ roomCode, roster, onLeave }: GameHUDProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4">
      <div className="flex items-start justify-between">
        <div className="paper pointer-events-auto min-w-44 border border-steel px-4 py-3">
          <p className="label mb-2">Room {roomCode}</p>
          <ul className="flex flex-col gap-1">
            {roster.players.map((player) => (
              <li key={player.id} className="truncate text-sm tracking-wide">
                {player.name}
                {player.id === roster.localId && <span className="label ml-2 text-parchment">You</span>}
              </li>
            ))}
          </ul>
        </div>
        <Button variant="secondary" className="pointer-events-auto" onClick={onLeave}>
          Leave
        </Button>
      </div>
      <p className="label text-center">WASD or arrow keys to move</p>
    </div>
  );
}
