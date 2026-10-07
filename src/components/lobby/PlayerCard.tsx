import type { Player } from "@/types/player";

interface PlayerCardProps {
  player: Player;
  isMe: boolean;
}

export function PlayerCard({ player, isMe }: PlayerCardProps) {
  const status = player.isHost ? "Host" : player.isReady ? "Ready" : "Not ready";
  const lit = player.isHost || player.isReady;

  return (
    <li className="flex items-center gap-4 border border-steel bg-void/50 px-4 py-3">
      <span
        aria-hidden
        className={`h-2.5 w-2.5 shrink-0 border ${lit ? "border-bone bg-bone" : "border-ash"}`}
      />
      <span className="min-w-0 flex-1 truncate text-lg tracking-wide">
        {player.name}
        {isMe && <span className="label ml-3 text-parchment">You</span>}
      </span>
      <span className={`label ${player.isHost ? "text-blood-bright" : lit ? "text-bone" : ""}`}>{status}</span>
    </li>
  );
}
