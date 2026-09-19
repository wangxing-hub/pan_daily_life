import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../config.js';

/** 左下方向盘 / 右下互动键的布局（游戏坐标，1280x720） */
const PAD = { x: 168, y: 544, r: 118, btn: 74, off: 62 };
const ACTION = { x: 1114, y: 546, r: 66 };

const DIRS = [
  { dir: 'up', dx: 0, dy: -1, arrow: '▲' },
  { dir: 'down', dx: 0, dy: 1, arrow: '▼' },
  { dir: 'left', dx: -1, dy: 0, arrow: '◀' },
  { dir: 'right', dx: 1, dy: 0, arrow: '▶' },
];

/**
 * 手机模式的虚拟按键：左边一个方向盘，右边一个互动键（相当于 E）。
 * 只负责记录状态，真正的读取在 GameScene.readInput / interactJustPressed 里。
 */
export default class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.state = { up: false, down: false, left: false, right: false };
    this.interact = false;
    this.build();
  }

  /** 归一化的方向向量（和键盘输入同一套用法） */
  get vector() {
    const s = this.state;
    return { x: (s.right ? 1 : 0) - (s.left ? 1 : 0), y: (s.down ? 1 : 0) - (s.up ? 1 : 0) };
  }

  /** 互动键：取一次就清掉（模拟"刚按下"） */
  takeInteract() {
    if (!this.interact) return false;
    this.interact = false;
    return true;
  }

  build() {
    const s = this.scene;
    // 同时按住方向键和互动键需要多点触控
    s.input.addPointer(2);

    const base = s.add.graphics().setDepth(9400);
    base.fillStyle(0x1a1310, 0.34);
    base.fillCircle(PAD.x, PAD.y, PAD.r);
    base.lineStyle(3, 0xf2e6cc, 0.28);
    base.strokeCircle(PAD.x, PAD.y, PAD.r);

    DIRS.forEach(({ dir, dx, dy, arrow }) => {
      const x = PAD.x + dx * PAD.off;
      const y = PAD.y + dy * PAD.off;
      this.makeButton({
        x,
        y,
        r: PAD.btn / 2,
        label: arrow,
        fontSize: 26,
        onDown: () => {
          this.state[dir] = true;
        },
        onUp: () => {
          this.state[dir] = false;
        },
      });
    });

    // 中间的"方向"小圆点，纯装饰
    const dot = s.add.circle(PAD.x, PAD.y, 16, 0xf2e6cc, 0.22).setDepth(9401);
    dot.setStrokeStyle(2, 0xf2e6cc, 0.3);

    // 右下角：互动键
    this.makeButton({
      x: ACTION.x,
      y: ACTION.y,
      r: ACTION.r,
      label: 'E',
      sub: '互动',
      fontSize: 34,
      onDown: () => {
        this.interact = true;
      },
      onUp: () => {},
    });
    s.add
      .text(ACTION.x, ACTION.y + ACTION.r + 4, '互动', {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#f2e6cc',
      })
      .setOrigin(0.5, 0)
      .setDepth(9402);

    // 提示文字（只有第一次进手机模式时露个脸）
    this.tip = s.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 74, '左边方向键移动　·　右下 E 互动', {
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

  makeButton({ x, y, r, label, sub, fontSize, onDown, onUp }) {
    const s = this.scene;
    const circle = s.add
      .circle(x, y, r, 0xf2e6cc, 0.2)
      .setDepth(9401)
      .setStrokeStyle(3, 0xf2e6cc, 0.4)
      .setInteractive({ useHandCursor: true });

    const text = s.add
      .text(x, y, label, {
        fontFamily: FONT,
        fontSize: `${fontSize}px`,
        color: '#f7ead0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(9402);
    if (sub) text.setY(y - 6);

    const press = () => {
      circle.setFillStyle(0xc9a44c, 0.5);
      onDown();
    };
    const release = () => {
      circle.setFillStyle(0xf2e6cc, 0.2);
      onUp();
    };
    circle.on('pointerdown', press);
    circle.on('pointerup', release);
    circle.on('pointerout', release);
    circle.on('pointerupoutside', release);
    return circle;
  }
}
