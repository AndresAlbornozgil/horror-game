"use client";

import { Panel } from "@/components/ui/Panel";
import { Select } from "@/components/ui/Input";
import { DIFFICULTIES, MAPS, MAX_PLAYERS_LIMIT, MIN_PLAYERS } from "@/lib/constants";
import { updateRoomSettings } from "@/multiplayer/room-client";
import type { Difficulty, GameMap, RoomSettings as RoomSettingsType } from "@/types/room";

interface RoomSettingsProps {
  settings: RoomSettingsType;
  isHost: boolean;
  playerCount: number;
}

export function RoomSettings({ settings, isHost, playerCount }: RoomSettingsProps) {
  const lowestMax = Math.max(MIN_PLAYERS, playerCount);
  const maxOptions = Array.from({ length: MAX_PLAYERS_LIMIT - lowestMax + 1 }, (_, i) => lowestMax + i);

  return (
    <Panel title="Settings">
      <div className="flex flex-col gap-5">
        <Select
          label="Map"
          value={settings.map}
          disabled={!isHost}
          onChange={(event) => updateRoomSettings({ map: event.target.value as GameMap })}
        >
          {MAPS.map((map) => (
            <option key={map} value={map}>
              {map}
            </option>
          ))}
        </Select>

        <Select
          label="Difficulty"
          value={settings.difficulty}
          disabled={!isHost}
          onChange={(event) => updateRoomSettings({ difficulty: event.target.value as Difficulty })}
        >
          {DIFFICULTIES.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {difficulty}
            </option>
          ))}
        </Select>

        <Select
          label="Max Players"
          value={settings.maxPlayers}
          disabled={!isHost}
          onChange={(event) => updateRoomSettings({ maxPlayers: Number(event.target.value) })}
        >
          {maxOptions.map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </Select>

        {!isHost && <p className="label">Only the host can change settings</p>}
      </div>
    </Panel>
  );
}
