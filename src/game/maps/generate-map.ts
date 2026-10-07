export interface MapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Small, fast seeded random number generator: the same seed always gives the same sequence. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Placeholder procedural map: scatters blocks across the world, keeping the spawn area clear.
 * Every game uses a new seed, so every game is a new layout; all players share the seed.
 */
export function generateMap(seed: number, world: { width: number; height: number }, clearRadius: number): MapRect[] {
  const random = mulberry32(seed);
  const between = (min: number, max: number) => min + random() * (max - min);
  const centerX = world.width / 2;
  const centerY = world.height / 2;
  const rects: MapRect[] = [];

  const overlaps = (a: MapRect, b: MapRect, margin: number) =>
    a.x < b.x + b.width + margin &&
    a.x + a.width + margin > b.x &&
    a.y < b.y + b.height + margin &&
    a.y + a.height + margin > b.y;

  const target = Math.floor(between(14, 22));
  for (let attempt = 0; attempt < 400 && rects.length < target; attempt++) {
    const width = Math.round(between(100, 460) / 32) * 32;
    const height = Math.round(between(100, 460) / 32) * 32;
    const candidate: MapRect = {
      x: Math.round(between(64, world.width - width - 64) / 32) * 32,
      y: Math.round(between(64, world.height - height - 64) / 32) * 32,
      width,
      height,
    };
    const spawnArea: MapRect = {
      x: centerX - clearRadius,
      y: centerY - clearRadius,
      width: clearRadius * 2,
      height: clearRadius * 2,
    };
    if (overlaps(candidate, spawnArea, 0)) continue;
    if (rects.some((existing) => overlaps(candidate, existing, 96))) continue;
    rects.push(candidate);
  }
  return rects;
}
