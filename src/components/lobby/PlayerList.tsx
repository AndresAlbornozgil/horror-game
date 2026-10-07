import { Panel } from "@/components/ui/Panel";
import type { Player } from "@/types/player";
import { PlayerCard } from "./PlayerCard";

interface PlayerListProps {
  players: Player[];
  meId: string | null;
  maxPlayers: number;
}

export function PlayerList({ players, meId, maxPlayers }: PlayerListProps) {
  const emptySlots = Math.max(0, maxPlayers - players.length);

  return (
    <Panel title={`Survivors ${players.length}/${maxPlayers}`}>
      <ul className="flex flex-col gap-2">
        {players.map((player) => (
          <PlayerCard key={player.id} player={player} isMe={player.id === meId} />
        ))}
        {Array.from({ length: emptySlots }, (_, index) => (
          <li
            key={`empty-${index}`}
            className="border border-dashed border-steel px-4 py-3 text-ash/60"
            aria-label="Empty slot"
          >
            <span className="label">Waiting…</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
