import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../config.js';

/** 左下摇杆 / 右下互动键的布局（游戏坐标，1280x720） */
const STICK = {
  x: 176, // 底盘中心
  y: 534,
  base: 118, // 底盘半径
  knob: 50, // 摇杆头半径
  max: 78, // 摇杆头能离开中心的最大距离
  hit: 168, // 触摸判定半径（比底盘大一圈，手指不用瞄那么准）
  dead: 14, // 死区：推得比这个还浅就不动
};
const ACTION = { x: 1114, y: 546, r: 66 };
/** 右半屏整片都算 E 交互（最上面留一条给右上角的音效开关） */
const INTERACT_ZONE = { x0: 648, y0: 96 };

/**
 * 手机模式的虚拟按键：左下**摇杆**（可以斜着推、推多少走多快）+ 右下互动键。
 * 只负责记录状态，真正的读取在 GameScene.readInput / interactJustPressed 里。
 */
export default class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.vec = { x: 0, y: 0 };
    this.interact = false;
    this.pointerId = null;
    this.build();
  }

  /** 归一化方向向量，长度 0~1（键盘是 ±1） */
  get vector() {
    return this.vec;
  }

  /** 互动键：取一次就清掉（模拟"刚按下"） */
  takeInteract() {
    if (!this.interact) return false;
    this.interact = false;
    return true;
  }

  build() {
    const s = this.scene;
    // 一边推摇杆一边点互动键需要多点触控
    s.input.addPointer(2);

    // 底盘
    const base = s.add
      .circle(STICK.x, STICK.y, STICK.base, 0x1a1310, 0.34)
      .setDepth(9400)
      .setStrokeStyle(3, 0xf2e6cc, 0.32)
      .setInteractive(
        new Phaser.Geom.Circle(STICK.base, STICK.base, STICK.hit),
        Phaser.Geom.Circle.Contains
      );
    // 底盘上的十字提示
    const cross = s.add.graphics().setDepth(9401);
    cross.lineStyle(2, 0xf2e6cc, 0.18);
    cross.beginPath();
    cross.moveTo(STICK.x - STICK.max, STICK.y);
    cross.lineTo(STICK.x + STICK.max, STICK.y);
    cross.moveTo(STICK.x, STICK.y - STICK.max);
    cross.lineTo(STICK.x, STICK.y + STICK.max);
    cross.strokePath();

    // 摇杆头
    this.knob = s.add
      .circle(STICK.x, STICK.y, STICK.knob, 0xf2e6cc, 0.32)
      .setDepth(9402)
      .setStrokeStyle(3, 0xf2e6cc, 0.5);

    const start = (pointer) => {
      if (this.pointerId !== null) return; // 已经有一根手指在推了
      this.pointerId = pointer.id;
      this.update(pointer);
      this.knob.setFillStyle(0xc9a44c, 0.45);
    };
    const move = (pointer) => {
      if (this.pointerId !== pointer.id) return;
      this.update(pointer);
    };
    const end = (pointer) => {
      if (this.pointerId !== pointer.id) return;
      this.pointerId = null;
      this.vec.x = 0;
      this.vec.y = 0;
      this.knob.setPosition(STICK.x, STICK.y).setFillStyle(0xf2e6cc, 0.32);
    };

    base.on('pointerdown', start);
    s.input.on('pointermove', move);
    s.input.on('pointerup', end);
    s.input.on('pointerupoutside', end);

    // 右下角：互动键
    this.makeActionButton();

    // 右半屏整片也能当 E 用：手指点在右边任何地方都算互动
    const zw = GAME_WIDTH - INTERACT_ZONE.x0;
    const zh = GAME_HEIGHT - INTERACT_ZONE.y0;
    this.interactZone = s.add
      .zone(INTERACT_ZONE.x0 + zw / 2, INTERACT_ZONE.y0 + zh / 2, zw, zh)
      .setDepth(9398) // 比 E 按钮低一层，点按钮本身时优先给按钮
      .setInteractive();
    this.interactZone.on('pointerdown', () => this.fireInteract());

    // 提示文字（只有刚进手机模式时露个脸）
    this.tip = s.add
      .text(STICK.x + 4, STICK.y - STICK.base - 26, '左边摇杆移动　·　右下 E 互动', {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#f2e6cc',
        backgroundColor: 'rgba(26,19,16,0.6)',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(9402);
    s.tweens.add({ targets: this.tip, alpha: 0, delay: 3200, duration: 900 });
  }

  /** 按手指位置算方向和深浅 */
  update(pointer) {
    let dx = pointer.x - STICK.x;
    let dy = pointer.y - STICK.y;
    const len = Math.hypot(dx, dy);
    if (len > STICK.max) {
      dx = (dx / len) * STICK.max;
      dy = (dy / len) * STICK.max;
    }
    this.knob.setPosition(STICK.x + dx, STICK.y + dy);
    if (len < STICK.dead) {
      this.vec.x = 0;
      this.vec.y = 0;
    } else {
      this.vec.x = dx / STICK.max;
      this.vec.y = dy / STICK.max;
    }
  }

  makeActionButton() {
    const s = this.scene;
    const circle = s.add
      .circle(ACTION.x, ACTION.y, ACTION.r, 0xf2e6cc, 0.2)
      .setDepth(9401)
      .setStrokeStyle(3, 0xf2e6cc, 0.4)
      .setInteractive({ useHandCursor: true });
    s.add
      .text(ACTION.x, ACTION.y - 6, 'E', {
        fontFamily: FONT,
        fontSize: '34px',
        color: '#f7ead0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(9402);
    s.add
      .text(ACTION.x, ACTION.y + ACTION.r + 4, '互动', {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#f2e6cc',
      })
      .setOrigin(0.5, 0)
      .setDepth(9402);

    this.actionCircle = circle;
    const press = () => this.fireInteract();
    const release = () => circle.setFillStyle(0xf2e6cc, 0.2);
    circle.on('pointerdown', press);
    circle.on('pointerup', release);
    circle.on('pointerout', release);
    circle.on('pointerupoutside', release);
  }

  /** 触发一次 E：闪一下右下角那个按钮，让玩家知道点到了 */
  fireInteract() {
    this.interact = true;
    if (this.actionCircle) {
      this.actionCircle.setFillStyle(0xc9a44c, 0.55);
      this.scene.time.delayedCall(140, () => {
        if (this.actionCircle) this.actionCircle.setFillStyle(0xf2e6cc, 0.2);
      });
    }
  }
}
