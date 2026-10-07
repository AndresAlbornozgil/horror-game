"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ambientMusic } from "@/lib/ambient-music";
import { audioEngine } from "@/lib/audio-engine";
import { STORAGE_KEYS } from "@/lib/constants";
import { sfx } from "@/lib/sfx";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const readMuted = () => window.localStorage.getItem(STORAGE_KEYS.musicMuted) === "1";

function writeMuted(muted: boolean) {
  window.localStorage.setItem(STORAGE_KEYS.musicMuted, muted ? "1" : "0");
  listeners.forEach((listener) => listener());
}

/** Ambient music (home screen and lobby only), interface sounds, and a persistent mute toggle. */
export function MusicPlayer() {
  const pathname = usePathname();
  const inMenus = pathname === "/" || pathname.startsWith("/lobby");
  const muted = useSyncExternalStore(subscribe, readMuted, () => false);
  const [unlocked, setUnlocked] = useState(false);

  // Browsers only allow audio after a user gesture, so wait for the first click or key press.
  useEffect(() => {
    if (unlocked) return;
    const unlock = () => {
      ambientMusic.prime();
      setUnlocked(true);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [unlocked]);

  useEffect(() => {
    ambientMusic.setMuted(muted);
  }, [muted]);

  // Interface sounds for anything clickable.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>("button, a[href], select, [role='button']");
      if (!target) return;
      audioEngine.prime();
      if (target.matches(":disabled, [aria-disabled='true']")) sfx.denied();
      else if (target.dataset.sfx === "confirm") sfx.confirm();
      else sfx.click();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  useEffect(() => {
    if (inMenus && unlocked) ambientMusic.play();
    else ambientMusic.fadeOut();
  }, [inMenus, unlocked]);

  if (!inMenus) return null;

  return (
    <button
      type="button"
      aria-pressed={!muted}
      onClick={() => writeMuted(!muted)}
      className="label fixed bottom-4 right-4 z-50 cursor-pointer border border-steel bg-void/80 px-3 py-2 transition-colors hover:border-ash hover:text-bone focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-parchment"
    >
      Sound {muted ? "off" : "on"}
    </button>
  );
}
