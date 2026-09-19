import { GAME_WIDTH, GAME_HEIGHT, AVATARS, FONT } from '../config.js';
import { linear, radialEllipse, makeTexture } from '../art/canvasKit.js';
import { requestLandscape, applyLayout } from '../systems/orientation.js';
import { startBgm } from '../systems/bgm.js';

/** 开场界面上的三个人 */
const ROLES = [
  { who: 'pan', title: '银行职员 · 大堂服务', desc: '今天也要好好上班' },
  { who: 'huang', title: '潘先生的太太', desc: '来接老公下班' },
  { who: 'yang', title: '老朋友', desc: '约好一起去吃饭' },
];

const CARD = { w: 292, h: 296, y: 336, gap: 40 };
const MODE_BTN = { w: 392, h: 86, y: 546 };

/**
 * 开场界面：三个角色的卡通头像 + 必选的模式（手机 / 电脑）+ 开始游戏。
 * 选手机模式会尽量切横屏，进游戏后用左下方向盘、右下互动键；
 * 选电脑模式则完全是原来那套键盘操作。
 */
export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  preload() {
    Object.values(AVATARS).forEach((a) => {
      if (!this.textures.exists(a.key)) this.load.image(a.key, a.path);
    });
  }

  create() {
    this.mode = this.registry.get('inputMode') || (this.game.device.input.touch ? 'mobile' : 'desktop');
    this.modeButtons = [];

    this.add.image(0, 0, this.startBackground()).setOrigin(0).setDepth(-1000);
    this.drawTitle();
    this.drawCards();
    this.drawModePicker();
    this.drawStartButton();

    this.cameras.main.fadeIn(360, 12, 8, 6);
    document.getElementById('loading')?.remove();

    // 浏览器要求先有用户手势才能出声：第一次点屏幕就把 BGM 开起来
    this.input.once('pointerdown', () => startBgm());
  }

  /** 开场背景：暖色渐变 + 一圈灯光 */
  startBackground() {
    const key = 'start-bg';
    if (!this.textures.exists(key)) {
      makeTexture(this, key, GAME_WIDTH, GAME_HEIGHT, (ctx, w, h) => {
        ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
          [0, '#2c2320'],
          [0.55, '#1d1512'],
          [1, '#100c0a'],
        ]);
        ctx.fillRect(0, 0, w, h);
        radialEllipse(ctx, w / 2, h * 0.36, 620, 320, [
          [0, 'rgba(255, 200, 130, 0.16)'],
          [1, 'rgba(255, 200, 130, 0)'],
        ]);
        // 顶部一抹金线
        ctx.fillStyle = 'rgba(201, 164, 76, 0.35)';
        ctx.fillRect(0, 108, w, 2);
      });
    }
    return key;
  }

  drawTitle() {
    this.add
      .text(GAME_WIDTH / 2, 54, '桂圆潘尔赛的日常', {
        fontFamily: FONT,
        fontSize: '46px',
        color: '#f7ead0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 4, 'rgba(0,0,0,0.6)', 6);
    this.add
      .text(GAME_WIDTH / 2, 156, '银行大厅  ·  水星街道  ·  松鸭湖  ·  双季红火锅', {
        fontFamily: FONT,
        fontSize: '17px',
        color: '#c9a44c',
      })
      .setOrigin(0.5);
  }

  drawCards() {
    const total = CARD.w * ROLES.length + CARD.gap * (ROLES.length - 1);
    ROLES.forEach((role, i) => {
      const cx = (GAME_WIDTH - total) / 2 + CARD.w / 2 + i * (CARD.w + CARD.gap);
      const avatar = AVATARS[role.who];

      const panel = this.add.graphics().setDepth(10);
      panel.fillStyle(0x241a13, 0.86);
      panel.fillRoundedRect(cx - CARD.w / 2, CARD.y - CARD.h / 2, CARD.w, CARD.h, 18);
      panel.lineStyle(3, 0xc9a44c, 0.7);
      panel.strokeRoundedRect(cx - CARD.w / 2, CARD.y - CARD.h / 2, CARD.w, CARD.h, 18);

      this.add.image(cx, CARD.y - 56, avatar.key).setDisplaySize(150, 150).setDepth(11);
      this.add
        .text(cx, CARD.y + 34, avatar.name, {
          fontFamily: FONT,
          fontSize: '26px',
          color: '#f7ead0',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(11);
      this.add
        .text(cx, CARD.y + 70, role.title, {
          fontFamily: FONT,
          fontSize: '15px',
          color: '#cbb894',
        })
        .setOrigin(0.5)
        .setDepth(11);
      this.add
        .text(cx, CARD.y + 100, role.desc, {
          fontFamily: FONT,
          fontSize: '14px',
          color: '#8f7f68',
        })
        .setOrigin(0.5)
        .setDepth(11);
    });
  }

  drawModePicker() {
    this.add
      .text(GAME_WIDTH / 2, MODE_BTN.y - 76, '请选择操作模式（必选）', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#cbb894',
      })
      .setOrigin(0.5)
      .setDepth(11);

    const options = [
      { mode: 'desktop', icon: '💻', label: '电脑模式', sub: '键盘 WASD 移动 · E 互动' },
      { mode: 'mobile', icon: '📱', label: '手机模式', sub: '自动横屏 · 左手方向 · 右手互动' },
    ];
    const centers = [GAME_WIDTH / 2 - MODE_BTN.w / 2 - 24, GAME_WIDTH / 2 + MODE_BTN.w / 2 + 24];

    options.forEach((opt, i) => {
      const cx = centers[i];
      const g = this.add.graphics().setDepth(11);
      const glow = this.add
        .rectangle(cx, MODE_BTN.y, MODE_BTN.w, MODE_BTN.h, 0xc9a44c, 0.08)
        .setDepth(10)
        .setVisible(false);
      const icon = this.add
        .text(cx - MODE_BTN.w / 2 + 44, MODE_BTN.y, opt.icon, { fontSize: '30px' })
        .setOrigin(0.5)
        .setDepth(12);
      const label = this.add
        .text(cx - MODE_BTN.w / 2 + 82, MODE_BTN.y - 12, opt.label, {
          fontFamily: FONT,
          fontSize: '24px',
          color: '#f7ead0',
          fontStyle: 'bold',
        })
        .setDepth(12);
      const sub = this.add
        .text(cx - MODE_BTN.w / 2 + 82, MODE_BTN.y + 18, opt.sub, {
          fontFamily: FONT,
          fontSize: '14px',
          color: '#cbb894',
        })
        .setDepth(12);

      const draw = (selected) => {
        g.clear();
        g.fillStyle(0x241a13, selected ? 0.95 : 0.7);
        g.fillRoundedRect(
          cx - MODE_BTN.w / 2,
          MODE_BTN.y - MODE_BTN.h / 2,
          MODE_BTN.w,
          MODE_BTN.h,
          14
        );
        g.lineStyle(selected ? 4 : 2, 0xc9a44c, selected ? 1 : 0.45);
        g.strokeRoundedRect(
          cx - MODE_BTN.w / 2,
          MODE_BTN.y - MODE_BTN.h / 2,
          MODE_BTN.w,
          MODE_BTN.h,
          14
        );
        glow.setVisible(selected);
        icon.setAlpha(selected ? 1 : 0.7);
        label.setAlpha(selected ? 1 : 0.8);
        sub.setAlpha(selected ? 1 : 0.7);
      };

      const zone = this.add
        .zone(cx, MODE_BTN.y, MODE_BTN.w, MODE_BTN.h)
        .setInteractive({ useHandCursor: true })
        .setDepth(13);
      zone.on('pointerdown', () => this.pickMode(opt.mode));
      this.modeButtons.push({ mode: opt.mode, draw });
      draw(this.mode === opt.mode);
    });
  }

  pickMode(mode) {
    this.mode = mode;
    this.modeButtons.forEach((b) => b.draw(b.mode === mode));
    this.cameras.main.flash(120, 40, 30, 20);
  }

  drawStartButton() {
    const w = 430;
    const h = 80;
    const x = GAME_WIDTH / 2;
    const y = 664;
    const g = this.add.graphics().setDepth(11);
    g.fillStyle(0xc9a44c, 0.92);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    g.lineStyle(3, 0xf2dda4, 0.9);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);

    this.add
      .text(x, y, '开始游戏', {
        fontFamily: FONT,
        fontSize: '30px',
        color: '#2b1d10',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(12);

    const zone = this.add
      .zone(x, y, w, h)
      .setInteractive({ useHandCursor: true })
      .setDepth(13);
    zone.on('pointerdown', () => this.startGame());

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 12,
        '电脑模式：WASD / 方向键移动，E / 空格 互动　·　手机模式：左边方向键，右下 E 互动',
        { fontFamily: FONT, fontSize: '14px', color: '#8f7f68' }
      )
      .setOrigin(0.5, 1)
      .setDepth(12);
  }

  async startGame() {
    this.registry.set('inputMode', this.mode);
    applyLayout(); // 立刻按新模式排版（竖屏 + 手机模式会马上转过来）
    if (this.mode === 'mobile') await requestLandscape();
    this.cameras.main.fadeOut(320, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('BankScene'));
  }
}
