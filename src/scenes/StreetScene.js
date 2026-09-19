import {
  GAME_WIDTH,
  GAME_HEIGHT,
  STREET,
  STREET_DIALOGUE_LEFT,
  FINALE,
  FONT,
} from '../config.js';
import { createStreetArt, STREET_PROPS } from '../art/streetArt.js';
import GameScene from './GameScene.js';

/**
 * 银行外面：一条横着的马路。
 * 左边路牌「水星街道」，右边路牌「松鸭湖」，玩家在靠银行这一侧的人行道上活动。
 */
export default class StreetScene extends GameScene {
  constructor() {
    super('StreetScene');
  }

  preload() {
    this.preloadSharedAssets();
  }

  create(data) {
    createStreetArt(this);

    // 可走动范围：银行门口这一侧的人行道
    this.physics.world.setBounds(
      24,
      STREET.walkTop + 8,
      GAME_WIDTH - 48,
      STREET.walkBottom - STREET.walkTop - 12
    );
    this.add.image(0, 0, 'street-bg').setOrigin(0).setDepth(-1000);

    this.obstacles = this.physics.add.staticGroup();
    this.buildStreet();

    // 走过路牌的自动提示只触发一次
    this.leftTalked = this.registry.get('streetLeftTalked') === true;
    // 已经通关（看过结局）就别再触发一次
    this.finaleDone = this.registry.get('gameOver') === true;

    const joined = this.registry.get('huangJoined') === true;
    const yangJoined = this.registry.get('yangJoined') === true;
    // 从松鸭湖回来：站在右边路口，而不是回到银行门口
    const fromLake = data?.from === 'lake';
    const px = fromLake ? STREET.fromLakeX : STREET.spawn.x;
    const py = STREET.spawn.y;
    this.setupCommon({
      playerX: px,
      playerY: py,
      huangX: fromLake && joined ? px - 34 : STREET.huangSpawn.x,
      huangY: fromLake && joined ? py + 58 : STREET.huangSpawn.y,
      huangJoined: joined,
      // 杨凡入队后也跟在队伍里，站位和黄姐错开
      yangX: yangJoined ? px - 68 : null,
      yangY: yangJoined ? py + 58 : null,
      hint: 'WASD / 方向键 移动　·　Shift 快走　·　E / 空格 互动　·　B 显示碰撞体',
      interactables: [
        {
          x: STREET.bankDoor.x,
          y: STREET.bankDoor.y,
          radius: STREET.bankDoor.radius,
          label: '银行大门',
          hint: '往上走到银行门口就进去',
          // 门口是"走过去"的，不要求正面朝向
          ignoreFacing: true,
          action: () => this.backToBank(),
        },
        {
          x: STREET.leftEnd.x,
          y: STREET.leftEnd.y,
          radius: STREET.leftEnd.radius,
          label: STREET.signLeft.text,
          hint: '按 E / 空格 看看路牌',
          // 尽头整片区域都能交互，不受面朝方向限制（站着往上往左都能按）
          ignoreFacing: true,
          action: () => this.talkAtLeftSign(),
        },
        {
          x: STREET.rightEnd.x,
          y: STREET.rightEnd.y,
          radius: STREET.rightEnd.radius,
          label: STREET.signRight.text,
          hint: `按 E / 空格 去${STREET.signRight.text}`,
          // 整片尽头区域都能触发，不要求正面朝向（上下都算）
          ignoreFacing: true,
          action: () => this.goToLake(),
        },
      ],
    });

    // 出生点如果在门口（从银行出来），先记为"已经在门口"，免得站着不动就来回弹
    this.wasInBankDoor = this.inBankDoorZone();
  }

  /* ------------------------------------------------------------- 街景 */

  buildStreet() {
    const decor = (key, x, y, scale = 1) => {
      const img = this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale);
      img.setDepth(y);
      return img;
    };

    // 银行招牌（画在门头上）
    this.add
      .text(640, 146, '潘尔赛银行', {
        fontFamily: FONT,
        fontSize: '32px',
        color: '#f4e2b4',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(-900);

    // 两块路牌（纯装饰，不挡路）
    decor('street-sign-left', STREET.signLeft.x, STREET.signLeft.y);
    decor('street-sign-right', STREET.signRight.x, STREET.signRight.y);

    // 对面人行道上的绿化与街具
    [140, 390, 900, 1150].forEach((x) => decor(STREET_PROPS.tree.key, x, 704, 0.72));
    [260, 760, 1210].forEach((x) => decor(STREET_PROPS.lamp.key, x, 698, 0.78));
    decor(STREET_PROPS.bench.key, 520, 684, 0.9);
    decor(STREET_PROPS.hydrant.key, 1010, 668);

    // 马路上的车（纯装饰，来回开）
    const carA = this.add.image(-240, 566, STREET_PROPS.carA.key).setDepth(566);
    this.tweens.add({
      targets: carA,
      x: GAME_WIDTH + 260,
      duration: 11000,
      repeat: -1,
      delay: 900,
    });
    const carB = this.add
      .image(GAME_WIDTH + 260, 492, STREET_PROPS.carB.key)
      .setDepth(492)
      .setFlipX(true);
    this.tweens.add({
      targets: carB,
      x: -260,
      duration: 13000,
      repeat: -1,
      delay: 3200,
    });
  }

  /* ------------------------------------------------------------- 互动 */

  /** 走过水星街道路牌：想起约了杨凡，自动触发对话 */
  onUpdate() {
    // 往上走到银行大门下面：直接进银行
    const atBankDoor = this.inBankDoorZone();
    const enteredBankDoor = atBankDoor && !this.wasInBankDoor;
    this.wasInBankDoor = atBankDoor;
    if (enteredBankDoor && !this.leaving) {
      this.backToBank();
      return;
    }

    // 结局：和杨凡告别之后，走到左边尽头「水星街道」就结束
    const finaleArmed = this.registry.get('finaleArmed') === true;
    if (finaleArmed && !this.finaleDone && this.player.x <= FINALE.passX) {
      this.showEnding();
      return;
    }
    // 左侧尽头：自动想起约了杨凡（只触发一次）
    if (!this.leftTalked && !finaleArmed && this.player.x <= STREET.signPassX) {
      this.leftTalked = true;
      this.registry.set('streetLeftTalked', true);
      this.talkAtLeftSign();
      return;
    }
    // 右侧尽头：自动切到松鸭湖
    if (this.player.x >= STREET.rightEndPassX) this.goToLake();
  }

  /** 站到人行道最上面、大门正下方这一块 */
  inBankDoorZone() {
    const z = STREET.bankDoorPass;
    return Math.abs(this.player.x - z.x) <= z.halfW && this.player.y <= z.y;
  }

  /* ------------------------------------------------------------- 结局 */

  /** 走到水星街道尽头：黑幕 + 游戏结束 */
  showEnding() {
    this.finaleDone = true;
    this.registry.set('gameOver', true);
    this.setCinematic(true);
    this.hint.setVisible(false);
    this.bubble?.destroy();
    this.bubble = null;

    const veil = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1)
      .setAlpha(0)
      .setDepth(9800);
    this.tweens.add({
      targets: veil,
      alpha: 0.9,
      duration: 1200,
      onComplete: () => this.showEndCard(),
    });
  }

  showEndCard() {
    const center = GAME_WIDTH / 2;
    const card = this.add.container(0, 0).setDepth(9801).setAlpha(0);

    const place = this.add
      .text(center, 250, FINALE.place, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#c9a44c',
      })
      .setOrigin(0.5);
    const title = this.add
      .text(center, 320, FINALE.title, {
        fontFamily: FONT,
        fontSize: '64px',
        color: '#f7ead0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const line = this.add
      .text(center, 400, FINALE.line, {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#d9c39a',
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(center, 500, FINALE.hint, {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#b9a884',
      })
      .setOrigin(0.5);

    card.add([place, title, line, hint]);
    this.tweens.add({ targets: card, alpha: 1, duration: 900 });
    this.tweens.add({ targets: hint, alpha: 0.35, duration: 800, yoyo: true, repeat: -1 });

    this.input.keyboard.once('keydown-R', () => this.restartGame());
  }

  /** 按 R：清掉剧情进度，从头再来 */
  restartGame() {
    ['huangJoined', 'yangJoined', 'yangLeftTeam', 'hotpotDone', 'finaleArmed', 'gameOver'].forEach(
      (k) => this.registry.set(k, false)
    );
    this.registry.set('yangStay', null);
    this.registry.set('streetLeftTalked', false);
    this.scene.start('StartScene');
  }

  /** 左侧路牌：约了杨凡，改去松鸭湖 */
  talkAtLeftSign() {
    const joined = this.registry.get('huangJoined') === true;
    this.dialogue.start(joined ? STREET_DIALOGUE_LEFT : [STREET_DIALOGUE_LEFT[0]], () => {
      // 说完回头：朝右边的松鸭湖方向站好
      this.player.face(this.player.x + 120, this.player.y);
    });
  }

  backToBank() {
    if (this.leaving) return;
    this.leaving = true;
    this.hint.setVisible(false);
    this.bubble?.destroy();
    this.bubble = null;
    this.cameras.main.fadeOut(420, 12, 8, 6);
    this.cameras.main.once('camerafadeoutcomplete', () =>
      this.scene.start('BankScene', { from: 'street' })
    );
  }

  /** 右侧路牌「松鸭湖」：走到路口按 E 就去湖边 */
  goToLake() {
    if (this.leaving) return;
    this.leaving = true;
    this.hint.setVisible(false);
    this.bubble?.destroy();
    this.bubble = null;
    this.cameras.main.fadeOut(420, 12, 8, 6);
    this.cameras.main.once('camerafadeoutcomplete', () =>
      this.scene.start('LakeScene', { from: 'street' })
    );
  }
}
