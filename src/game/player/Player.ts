import Phaser from "phaser";
import { GAME_CONFIG } from "@/config/game.config";
import type { PlayerSnapshot } from "./player.types";

const LOCAL_COLOR = 0xd9d3c3;
const REMOTE_COLOR = 0x8c1f1f;
const REMOTE_SMOOTHING = 0.35;

/** Placeholder player: a square with a name tag. Local players are driven by physics, remote ones by the network. */
export class Player {
  readonly id: string;
  readonly name: string;
  readonly body: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private target: Phaser.Math.Vector2;

  constructor(
    scene: Phaser.Scene,
    snapshot: PlayerSnapshot,
    readonly isLocal: boolean,
  ) {
    const size = GAME_CONFIG.player.size;
    this.id = snapshot.id;
    this.name = snapshot.name;
    this.target = new Phaser.Math.Vector2(snapshot.x, snapshot.y);
    this.body = scene.add
      .rectangle(snapshot.x, snapshot.y, size, size, isLocal ? LOCAL_COLOR : REMOTE_COLOR)
      .setStrokeStyle(2, 0x050505)
      .setDepth(10);
    this.label = scene.add
      .text(snapshot.x, snapshot.y - size, snapshot.name, {
        fontFamily: '"Courier New", monospace',
        fontSize: "14px",
        color: isLocal ? "#d9d3c3" : "#b4ad98",
      })
      .setOrigin(0.5, 1)
      .setDepth(11);

    if (isLocal) {
      scene.physics.add.existing(this.body);
      const arcadeBody = this.body.body as Phaser.Physics.Arcade.Body;
      arcadeBody.setCollideWorldBounds(true);
    }
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  setVelocity(vx: number, vy: number): void {
    (this.body.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
  }

  setTarget(x: number, y: number): void {
    this.target.set(x, y);
  }

  update(): void {
    if (!this.isLocal) {
      this.body.x = Phaser.Math.Linear(this.body.x, this.target.x, REMOTE_SMOOTHING);
      this.body.y = Phaser.Math.Linear(this.body.y, this.target.y, REMOTE_SMOOTHING);
    }
    this.label.setPosition(this.body.x, this.body.y - GAME_CONFIG.player.size);
  }

  destroy(): void {
    this.label.destroy();
    this.body.destroy();
  }
}
