/**
 * 跟随型 NPC（黄姐）：沿着玩家走过的路线跟在后面。
 * 朝向、动画、深度排序的规则和主角一致，速度由调用方给。
 */
export default class Companion extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, config, x, y) {
    super(scene, x, y, config.key, config.idleFrames.down);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.config = config;
    this.setOrigin(0.5, 1);
    this.setScale(config.scale);
    /** 动画前缀（过场里按名字播动作时用，比如 yang-walk-down） */
    this.animPrefix = config.animPrefix;
    /** 嘴在人物高度上的位置，喷东西时从这里出来 */
    this.mouthRatio = config.mouthRatio ?? 0.7;

    const { width, height, offsetBottom } = config.body;
    this.body.setSize(width, height);
    this.body.setOffset(
      (config.frameWidth - width) / 2,
      config.frameHeight - height - offsetBottom
    );
    this.body.setCollideWorldBounds(true);

    this.facing = 'down';
    this.bobPhase = 0;
    this.setDepth(this.y);
  }

  /** 站定并朝向某点（对话时用） */
  face(targetX, targetY) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    this.facing =
      Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    this.setVelocity(0, 0);
    this.setScale(this.config.scale, this.config.scale);
    this.play(`${this.config.animPrefix}-idle-${this.facing}`, true);
    this.setDepth(this.y);
  }

  /** 朝目标点走；返回是否还在移动 */
  walkTo(targetX, targetY, speed, delta) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);
    const prefix = this.config.animPrefix;

    if (dist < 4) {
      this.setVelocity(0, 0);
      this.bobPhase = 0;
      this.setScale(this.config.scale, this.config.scale);
      this.play(`${prefix}-idle-${this.facing}`, true);
      this.setDepth(this.y);
      return false;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    this.setVelocity(nx * speed, ny * speed);
    this.facing =
      Math.abs(nx) > Math.abs(ny) ? (nx < 0 ? 'left' : 'right') : ny < 0 ? 'up' : 'down';
    this.play(`${prefix}-walk-${this.facing}`, true);
    this.anims.timeScale = speed > 300 ? 1.35 : 1;

    this.bobPhase += delta * 0.016;
    const bob = 1 - 0.012 * Math.abs(Math.sin(this.bobPhase));
    this.setScale(this.config.scale, this.config.scale * bob);
    this.setDepth(this.y);
    return true;
  }
}
