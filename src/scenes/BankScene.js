import { GAME_WIDTH, GAME_HEIGHT, WALL_H, PLAYER, HUANG, FONT } from '../config.js';
import { createBankArt, PROPS } from '../art/bankArt.js';
import GameScene from './GameScene.js';

/** 标牌统一挂在这一高度（墙裙上，柜台上方） */
const SIGN_Y = WALL_H - 26;
/** 窗口标牌深度：高于柜台(318)低于人物，人物走到前面时自然会遮住它 */
const SIGN_DEPTH = 320;
/** 机器标牌与机器之间留的缝（"正上方一点"） */
const SIGN_GAP = 8;
/** 标牌高度 */
const SIGN_H = 38;
/** 出口（自动门）位置：范围收得比较小，免得抢掉站在门边的黄姐 */
const DOOR = { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 16, radius: 92 };
/** 走到门口这块（黄姐入队后）就自动出门，不用按 E */
const DOOR_PASS = { x: DOOR.x, halfW: 78, yFrom: DOOR.y - 92 };

/** 标牌中心 y：机器顶部再往上一点 */
function signYAboveProp(prop, baseY) {
  return baseY - prop.h - SIGN_GAP - SIGN_H / 2;
}

export default class BankScene extends GameScene {
  constructor() {
    super('BankScene');
  }

  preload() {
    this.preloadSharedAssets();
  }

  create(data) {
    createBankArt(this);

    this.physics.world.setBounds(24, WALL_H + 12, GAME_WIDTH - 48, GAME_HEIGHT - WALL_H - 8);
    this.add.image(0, 0, 'bank-bg').setOrigin(0).setDepth(-1000);

    this.obstacles = this.physics.add.staticGroup();
    this.buildRoom();

    // 从街上回到银行时，黄姐已经在队伍里了
    const joined = this.registry.get('huangJoined') === true;
    const yangJoined = this.registry.get('yangJoined') === true;
    // 从大门进来就站在门口，直接开局则站在大堂中间
    const fromStreet = data?.from === 'street';
    const px = fromStreet ? DOOR.x : PLAYER.startX;
    const py = fromStreet ? DOOR.y - 26 : PLAYER.startY;
    this.setupCommon({
      playerX: px,
      playerY: py,
      // 开局面朝下方（柜台 2 前面站着）；从大门进来则朝着大堂里
      playerFacing: fromStreet ? 'up' : 'down',
      huangX: joined ? px + 34 : HUANG.startX,
      huangY: joined ? py + 58 : HUANG.startY,
      huangJoined: joined,
      // 杨凡入队后也会跟进来，站在黄姐另一边
      yangX: yangJoined ? px - 34 : null,
      yangY: yangJoined ? py + 58 : null,
      hint: 'WASD / 方向键 移动　·　Shift 快走　·　E / 空格 互动　·　B 显示碰撞体',
      interactables: [
        { x: 300, y: 318, radius: 150, label: '1号窗口', line: '您好，请问要办理什么业务？' },
        {
          x: 640,
          y: 318,
          radius: 150,
          label: '2号窗口',
          line: '今天办业务的人有点多，辛苦您稍等一下。',
        },
        { x: 980, y: 318, radius: 150, label: '3号窗口', line: '存钱、取钱、开卡，这边都可以办。' },
        {
          x: 110,
          y: 430,
          radius: 130,
          label: 'ATM',
          line: 'ATM 24 小时开放，不过这台机器偶尔会吞卡……',
        },
        {
          x: 1150,
          y: 392,
          radius: 120,
          label: '取号机',
          line: '记得先取号哦，A 开头的号马上就到。',
        },
        {
          x: 1010,
          y: 596,
          radius: 150,
          label: '等候区',
          line: '等候区的沙发挺舒服的，坐一会儿吧。',
        },
        {
          x: DOOR.x,
          y: DOOR.y,
          radius: DOOR.radius,
          label: '大门',
          // 门是"走过去"的，不要求正面朝向
          ignoreFacing: true,
          hint: () => (this.huang.joined ? '走到门口就出门' : '先和黄姐打个招呼'),
          action: () => {
            if (this.huang.joined) this.leaveBank();
            else this.showBubble('先跟黄姐说句话再走吧。');
          },
        },
      ],
    });

    // 出生点如果本来就在门口（从街上进来），先记为"已经在里面"，
    // 这样站着不动不会被立刻弹回街上，得先走开再走回来才算"走到门口"
    this.wasInDoorZone = this.inDoorZone();
  }

  /* ------------------------------------------------------------- 每帧 */

  inDoorZone() {
    return (
      Math.abs(this.player.x - DOOR_PASS.x) <= DOOR_PASS.halfW &&
      this.player.y >= DOOR_PASS.yFrom
    );
  }

  /** 走到大门口：黄姐入队了就直接出门，没入队就提醒一句 */
  onUpdate() {
    const inside = this.inDoorZone();
    const entered = inside && !this.wasInDoorZone;
    this.wasInDoorZone = inside;
    if (!entered || this.leaving) return;

    if (this.huang?.joined) this.leaveBank();
    else if (this.time.now > (this.leaveHintAt || 0)) {
      this.leaveHintAt = this.time.now + 3200;
      this.showBubble('先跟黄姐说句话再走吧。');
    }
  }

  /* ------------------------------------------------------------- 场景搭建 */

  buildRoom() {
    const decor = (key, x, y, scale = 1) => {
      const img = this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale);
      img.setDepth(y);
      return img;
    };

    // 三个柜台，沿后墙排列
    const counters = [
      { x: 300, label: '1 号窗口' },
      { x: 640, label: '2 号窗口' },
      { x: 980, label: '3 号窗口' },
    ];
    counters.forEach(({ x, label }) => {
      decor(PROPS.counter.key, x, WALL_H + 140);
      this.addSign(x, SIGN_Y, label);
      this.addObstacle(x, WALL_H + 140 - 62, 292, 116);
    });

    // 大堂招牌
    this.add
      .text(GAME_WIDTH / 2, 46, '潘尔赛银行', {
        fontFamily: FONT,
        fontSize: '42px',
        color: '#f7ead0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 3, 'rgba(0,0,0,0.6)', 5)
      .setDepth(-900);
    this.add
      .text(GAME_WIDTH / 2, 92, 'PAN  BANK  ·  大 堂 服 务 区', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#d8c193',
      })
      .setOrigin(0.5)
      .setDepth(-900);

    // ATM
    decor(PROPS.atm.key, 110, 432);
    // 标牌贴着机器顶部，深度跟机器一致：机器在前时标牌也在前，不会被吞掉
    this.addSign(110, signYAboveProp(PROPS.atm, 432), 'ATM', 432 + 1);
    this.addObstacle(110, 432 - 34, 120, 68);

    // 取号机
    decor(PROPS.ticket.key, 1150, 396);
    this.addSign(1150, signYAboveProp(PROPS.ticket, 396), '取号机', 396 + 1);
    this.addObstacle(1150, 396 - 26, 86, 52);

    // 等候区：沙发 + 茶几 + 绿植
    decor(PROPS.sofa.key, 1010, 600);
    this.addObstacle(1010, 600 - 46, 244, 92);
    decor(PROPS.plant.key, 60, 700);
    this.addObstacle(60, 700 - 30, 76, 58);
    decor(PROPS.plant.key, 1225, 520, 0.9);
    this.addObstacle(1225, 520 - 26, 68, 52);
    decor(PROPS.plant.key, 250, 646, 0.88);
    this.addObstacle(250, 646 - 26, 68, 52);
  }

  /**
   * 场景标牌：深色底 + 黄铜描边 + 奶白字。
   * 之前窗口文字是直接画在柜台上的，奶白色压在大理石台面上几乎看不见，
   * 看着就像被台子挡掉了一半，所以统一改成挂墙的标牌。
   */
  addSign(x, y, text, depth = SIGN_DEPTH) {
    const label = this.add
      .text(0, 0, text, {
        fontFamily: FONT,
        fontSize: '17px',
        color: '#f8eed6',
      })
      .setOrigin(0.5);

    const w = label.width + 40;
    const h = SIGN_H;
    const plate = this.add.graphics();
    plate.fillStyle(0x241a12, 0.95);
    plate.fillRoundedRect(-w / 2, -h / 2, w, h, 9);
    plate.lineStyle(2, 0xc9a44c, 0.95);
    plate.strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
    plate.fillStyle(0xc9a44c, 0.18);
    plate.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h / 2 - 4, 7);

    return this.add.container(x, y, [plate, label]).setDepth(depth);
  }

  /* ------------------------------------------------------------- 出门去街上 */

  leaveBank() {
    if (this.leaving) return;
    this.leaving = true;
    this.hint.setVisible(false);
    this.bubble?.destroy();
    this.bubble = null;
    this.cameras.main.fadeOut(420, 12, 8, 6);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('StreetScene', { from: 'bank' });
    });
  }
}
