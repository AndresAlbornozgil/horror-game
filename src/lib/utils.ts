import {
  PLAYER_NAME_MAX_LENGTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
} from "./constants";

// Shared by the browser and the Socket.IO server: keep this file dependency-free.

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Trims, collapses whitespace and strips control characters. Returns null when unusable. */
export function sanitizePlayerName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const cleaned = input
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PLAYER_NAME_MAX_LENGTH)
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Uppercases and strips anything that cannot appear in a room code. */
export function normalizeRoomCode(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .toUpperCase()
    .split("")
    .filter((char) => ROOM_CODE_ALPHABET.includes(char))
    .join("")
    .slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: unknown): code is string {
  return typeof code === "string" && code.length === ROOM_CODE_LENGTH && normalizeRoomCode(code) === code;
}

/** Random opaque string; works on insecure origins where crypto.randomUUID is unavailable. */
export function generateToken(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
