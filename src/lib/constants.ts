export const MAPS = [
  "Mansion",
  "Woods",
  "Asylum",
  "School",
  "Hospital",
  "Mall",
  "Castle",
  "Lab",
  "Prison",
  "Hotel",
  "Carnival",
] as const;

export const DIFFICULTIES = ["Easy", "Normal", "Hard", "Nightmare"] as const;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS_LIMIT = 8;

export const DEFAULT_ROOM_SETTINGS = {
  map: "Mansion",
  difficulty: "Normal",
  maxPlayers: 4,
} as const;

// No I, O, 0 or 1 to avoid look-alike characters.
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

export const PLAYER_NAME_MAX_LENGTH = 16;

export const STORAGE_KEYS = {
  playerName: "horror-game:player-name",
  sessionToken: "horror-game:session-token",
  musicMuted: "horror-game:music-muted",
} as const;
