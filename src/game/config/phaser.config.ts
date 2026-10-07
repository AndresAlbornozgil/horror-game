import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { GameScene } from "../scenes/GameScene";
import { PreloadScene } from "../scenes/PreloadScene";
import { GAME_CONTEXT_KEY } from "../context";
import type { GameContext } from "../context";

/**
 * Creates the Phaser game. Imports Phaser at module level, so only load this
 * file on the client (via dynamic import inside an effect).
 */
export function createPhaserGame(parent: HTMLElement, context: GameContext): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#050505",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: "100%",
      height: "100%",
    },
    physics: {
      default: "arcade",
      arcade: { debug: false },
    },
    scene: [BootScene, PreloadScene, GameScene],
    disableContextMenu: true,
    banner: false,
    callbacks: {
      // Runs before any scene starts, so scenes can rely on the context in create().
      preBoot: (game) => game.registry.set(GAME_CONTEXT_KEY, context),
    },
  });
}
