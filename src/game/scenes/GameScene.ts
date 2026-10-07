import Phaser from "phaser";
import { GAME_CONFIG } from "@/config/game.config";
import { joinGame, sendMove, subscribeGame } from "@/multiplayer/game-client";
import { getSocket } from "@/multiplayer/socket";
import type { Player as PlayerData } from "@/types/player";
import { SCENE_KEYS } from "../config/scene-keys";
import { GAME_CONTEXT_KEY, GAME_EVENTS } from "../context";
import type { GameContext, Roster } from "../context";
import { Player } from "../player/Player";

const { world, player: playerConfig, network } = GAME_CONFIG;
const GRID_SIZE = 64;

/** Placeholder world: dark floor, a player you can move, and other connected players. */
export class GameScene extends Phaser.Scene {
  private context!: GameContext;
  private localPlayer: Player | null = null;
  private localId: string | null = null;
  private readonly remotePlayers = new Map<string, Player>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private lastSentAt = 0;
  private lastSent = { x: Number.NaN, y: Number.NaN };
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super(SCENE_KEYS.game);
  }

  create(): void {
    this.context = this.registry.get(GAME_CONTEXT_KEY) as GameContext;

    this.drawWorld();
    this.physics.world.setBounds(0, 0, world.width, world.height);
    this.cameras.main.setBounds(0, 0, world.width, world.height);

    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys("W,A,S,D") as typeof this.wasd;

    this.unsubscribe = subscribeGame({
      onConnect: this.requestJoin,
      onState: ({ players, playerId }) => this.applyState(players, playerId),
      onPlayerJoined: ({ player }) => this.upsertRemote(player),
      onPlayerLeft: ({ playerId }) => this.removeRemote(playerId),
      onPlayerMoved: ({ playerId, x, y }) => this.remotePlayers.get(playerId)?.setTarget(x, y),
    });
    if (getSocket().connected) this.requestJoin();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  update(time: number): void {
    const local = this.localPlayer;
    if (!local) return;

    this.moveLocalPlayer(local);
    local.update();
    this.remotePlayers.forEach((player) => player.update());
    this.broadcastPosition(local, time);
  }

  private readonly requestJoin = (): void => {
    joinGame(this.context.roomCode, this.context.identity);
  };

  private moveLocalPlayer(local: Player): void {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    const direction = new Phaser.Math.Vector2(Number(right) - Number(left), Number(down) - Number(up));
    direction.normalize().scale(playerConfig.speed);
    local.setVelocity(direction.x, direction.y);
  }

  private broadcastPosition(local: Player, time: number): void {
    if (time - this.lastSentAt < network.moveSendIntervalMs) return;
    const x = Math.round(local.x);
    const y = Math.round(local.y);
    if (x === this.lastSent.x && y === this.lastSent.y) return;
    this.lastSentAt = time;
    this.lastSent = { x, y };
    sendMove(x, y);
  }

  /** Reconciles the scene with the server's player list (first join and every reconnect). */
  private applyState(players: PlayerData[], localId: string): void {
    this.localId = localId;
    const ids = new Set(players.map((p) => p.id));
    this.remotePlayers.forEach((_, id) => {
      if (!ids.has(id)) this.removeRemote(id, false);
    });

    for (const data of players) {
      if (data.id === localId) {
        if (!this.localPlayer) {
          this.localPlayer = new Player(this, data, true);
          this.cameras.main.startFollow(this.localPlayer.body, true, 0.12, 0.12);
        }
      } else {
        this.upsertRemote(data, false);
      }
    }
    this.publishRoster();
    this.game.events.emit(GAME_EVENTS.ready);
  }

  private upsertRemote(data: PlayerData, publish = true): void {
    if (data.id === this.localId) return;
    const existing = this.remotePlayers.get(data.id);
    if (existing) {
      existing.setTarget(data.x, data.y);
    } else {
      this.remotePlayers.set(data.id, new Player(this, data, false));
    }
    if (publish) this.publishRoster();
  }

  private removeRemote(id: string, publish = true): void {
    this.remotePlayers.get(id)?.destroy();
    this.remotePlayers.delete(id);
    if (publish) this.publishRoster();
  }

  private publishRoster(): void {
    const players = [
      ...(this.localPlayer ? [{ id: this.localPlayer.id, name: this.context.identity.name }] : []),
      ...[...this.remotePlayers.values()].map((p) => ({ id: p.id, name: p.name })),
    ];
    const roster: Roster = { players, localId: this.localId };
    this.game.events.emit(GAME_EVENTS.rosterChanged, roster);
  }

  private drawWorld(): void {
    this.cameras.main.setBackgroundColor("#050505");
    const floor = this.add.graphics().setDepth(0);

    floor.lineStyle(1, 0x2b2a27, 0.35);
    for (let x = 0; x <= world.width; x += GRID_SIZE) floor.lineBetween(x, 0, x, world.height);
    for (let y = 0; y <= world.height; y += GRID_SIZE) floor.lineBetween(0, y, world.width, y);

    // A few fixed landmarks so movement is visible against the empty floor.
    floor.fillStyle(0x161614, 1);
    floor.lineStyle(2, 0x2b2a27, 1);
    const landmarks: Array<[number, number, number, number]> = [
      [700, 600, 320, 160],
      [2100, 500, 160, 360],
      [900, 1700, 420, 140],
      [2200, 1650, 240, 240],
      [1500, 1200, 120, 120],
    ];
    for (const [x, y, w, h] of landmarks) {
      floor.fillRect(x, y, w, h);
      floor.strokeRect(x, y, w, h);
    }

    floor.lineStyle(6, 0x8c1f1f, 0.6);
    floor.strokeRect(0, 0, world.width, world.height);
  }

  private cleanup(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
