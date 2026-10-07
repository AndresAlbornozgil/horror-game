export const GAME_CONFIG = {
  world: {
    width: 3200,
    height: 2400,
  },
  player: {
    size: 28,
    speed: 220,
  },
  network: {
    // Minimum delay between position updates sent to the server.
    moveSendIntervalMs: 50,
  },
  spawn: {
    radius: 90,
  },
  // How long a disconnected player keeps their seat (page refresh / brief drop).
  reconnectGraceMs: 10_000,
} as const;
