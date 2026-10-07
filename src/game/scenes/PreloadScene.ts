import Phaser from "phaser";
import { SCENE_KEYS } from "../config/scene-keys";

/** Loads assets from /assets (tilemaps, tilesets, sprites, audio). Nothing to load yet. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.preload);
  }

  preload(): void {
    this.load.setPath("assets");
    // Future: this.load.tilemapTiledJSON(...), this.load.spritesheet(...), this.load.audio(...)
  }

  create(): void {
    this.scene.start(SCENE_KEYS.game);
  }
}
