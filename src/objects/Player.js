import { SPRITE, PLAYER } from '../config.js';

/**
 * 潘尔赛：八方向移动的角色。
 * 精灵表里 9 帧分成 4 组朝向，按「上=背影 / 下=正面 / 左=左侧面 / 右=右侧面」播放对应动画。
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, SPRITE.key, SPRITE.idleFrames.down);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1); // 锚点在脚底，方便做深度排序和阴影
    this.setScale(SPRITE.scale);
    /** 动画前缀（过场里按名字播动作时用，比如 pan-walk-down） */
    this.animPrefix = SPRITE.animPrefix;
    /** 嘴在人物高度上的位置，喷东西时从这里出来 */
    this.mouthRatio = SPRITE.mouthRatio;

    const { width, height, offsetBottom } = PLAYER.body;
    this.body.setSize(width, height);
    this.body.setOffset(
      (SPRITE.frameWidth - width) / 2,
      SPRITE.frameHeight - height - offsetBottom
    );
    this.body.setCollideWorldBounds(true);

    /** 最后一次的移动方向，后续做交互朝向时会用到 */
    this.facing = 'down';
    /** 走路起伏的相位 */
    this.bobPhase = 0;
  }

  /**
   * @param {object} input  { x, y, run, active } 归一化后的输入
   * @param {number} delta  距上一帧的毫秒数
   */
  move(input, delta) {
    const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const len = Math.hypot(input.x, input.y);
    const moving = len > 0.01;

    if (moving) {
      const nx = input.x / len;
      const ny = input.y / len;
      this.setVelocity(nx * speed, ny * speed);

      // 四方向判定：斜着走时按更"主导"的轴显示，不会出现转向动画
      this.facing =
        Math.abs(nx) > Math.abs(ny) ? (nx < 0 ? 'left' : 'right') : ny < 0 ? 'up' : 'down';

      this.play(`pan-walk-${this.facing}`, true);
      this.anims.timeScale = input.run ? 1.45 : 1;
      this.bobPhase += delta * (input.run ? 0.022 : 0.015);
    } else {
      this.setVelocity(0, 0);
      this.anims.timeScale = 1;
      this.bobPhase = 0;
      this.play(`pan-idle-${this.facing}`, true);
    }

    // 走路时身体轻微起伏（锚点在脚底，所以是上半身轻轻弹动，不会飘）
    const bob = moving ? 1 - 0.013 * Math.abs(Math.sin(this.bobPhase)) : 1;
    this.setScale(SPRITE.scale, SPRITE.scale * bob);
    this.setDepth(this.y);
  }

  /** 头顶位置，用于对话气泡定位 */
  get headY() {
    return this.y - this.displayHeight - 12;
  }

  /** 站定并朝向某点（对话时用） */
  face(targetX, targetY) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    this.facing =
      Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    this.setVelocity(0, 0);
    this.anims.timeScale = 1;
    this.bobPhase = 0;
    this.setScale(SPRITE.scale, SPRITE.scale);
    this.play(`pan-idle-${this.facing}`, true);
    this.setDepth(this.y);
  }
}
