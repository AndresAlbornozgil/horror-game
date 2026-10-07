"use client";

import { useCallback, useSyncExternalStore } from "react";
import { PLAYER_NAME_MAX_LENGTH, STORAGE_KEYS } from "@/lib/constants";
import { generateToken, sanitizePlayerName } from "@/lib/utils";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readName(): string {
  return window.localStorage.getItem(STORAGE_KEYS.playerName) ?? "";
}

/** Per-tab secret used to reclaim a seat after a refresh. Different tabs are different players. */
function readSessionToken(): string {
  let token = window.sessionStorage.getItem(STORAGE_KEYS.sessionToken);
  if (!token) {
    token = generateToken();
    window.sessionStorage.setItem(STORAGE_KEYS.sessionToken, token);
  }
  return token;
}

/** Local player identity. No account: just a remembered name and a per-tab session token. */
export function usePlayer() {
  const name = useSyncExternalStore(subscribe, readName, () => "");
  const sessionToken = useSyncExternalStore(subscribe, readSessionToken, () => "");

  const setName = useCallback((value: string) => {
    window.localStorage.setItem(STORAGE_KEYS.playerName, value.slice(0, PLAYER_NAME_MAX_LENGTH));
    listeners.forEach((listener) => listener());
  }, []);

  return {
    name,
    setName,
    /** Sanitised name, or null when the player has not entered a usable one. */
    cleanName: sanitizePlayerName(name),
    sessionToken,
    /** False during server render and hydration, when browser storage is unavailable. */
    isReady: sessionToken !== "",
  };
}
