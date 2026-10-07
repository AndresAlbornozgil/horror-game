import Phaser from "phaser";
import { SCENE_KEYS } from "../config/scene-keys";

/** Initialises global game settings, then hands off to preloading. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#050505");
    this.scene.start(SCENE_KEYS.preload);
  }
}
