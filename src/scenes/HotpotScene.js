import { HOTPOT, HOTPOT_DIALOGUE, HOTPOT_SICK_DIALOGUE, FONT } from '../config.js';
import { createHotpotArt, HOTPOT_PROPS } from '../art/hotpotArt.js';
import { potSteam, rainbowVomit } from '../systems/effects.js';
import GameScene from './GameScene.js';

/**
 * 双季红火锅店：松鸭湖右上角走进来。
 * 走到中间那桌按 E → 三个人坐下开吃 → 锅冒热气 → 潘尔赛和黄姐一起吐彩虹 →
 * 潘尔赛喊「这是僵尸肉！！！」。
 */
export default class HotpotScene extends GameScene {
  constructor() {
    super('HotpotScene');
  }

  preload() {
    this.preloadSharedAssets();
  }

  create(data) {
    createHotpotArt(this);
    this.add.image(0, 0, 'hotpot-bg').setOrigin(0).setDepth(-1000);

    const w = HOTPOT.walk;
    this.physics.world.setBounds(w.left, w.top, w.right - w.left, w.bottom - w.top);
    this.obstacles = this.physics.add.staticGroup();
    this.buildRoom();
    this.addDoorSign();

    this.mealStarted = false;
    this.eatingTimer = null;

    const joined = this.registry.get('huangJoined') === true;
    const yangJoined = this.registry.get('yangJoined') === true;
    const fromLake = data?.from === 'lake';
    const px = fromLake ? HOTPOT.spawn.x : 420;
    const py = fromLake ? HOTPOT.spawn.y : 470;

    this.setupCommon({
      playerX: px,
      playerY: py,
      // 从左边门口进来，人朝着店里
      playerFacing: 'right',
      huangX: joined ? HOTPOT.huangSpawn.x : null,
      huangY: joined ? HOTPOT.huangSpawn.y : null,
      huangJoined: joined,
      yangX: yangJoined ? HOTPOT.yangSpawn.x : null,
      yangY: yangJoined ? HOTPOT.yangSpawn.y : null,
      hint: 'WASD / 方向键 移动　·　E / 空格 互动　·　走到中间那桌坐下吃火锅',
      interactables: [
        {
          x: HOTPOT.table.x,
          y: HOTPOT.table.y - 40,
          radius: HOTPOT.table.radius,
          label: '中间那桌火锅',
          hint: '按 E / 空格 坐下吃火锅',
          // 桌子这么大一片，站哪边都能坐下
          ignoreFacing: true,
          meal: true,
          action: () => this.startMeal(),
        },
      ],
    });
  }

  /** 店里的桌椅：桌子画在人物前面，坐下的人正好被桌面挡住下半身 */
  buildRoom() {
    const decor = (key, x, y, scale = 1) => {
      const img = this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale);
      img.setDepth(y);
      return img;
    };

    // 左边吧台 + 饮料柜
    decor(HOTPOT_PROPS.counter.key, 214, 452);
    this.addObstacle(214, 402, 320, 96);

    // 右边和左下角的小桌（带椅子）
    decor(HOTPOT_PROPS.smallTable.key, 1046, 596);
    this.addObstacle(1046, 556, 190, 80);
    decor(HOTPOT_PROPS.chair.key, 952, 596, 0.92);
    decor(HOTPOT_PROPS.chair.key, 1140, 604, 0.92);

    // 绿植
    decor(HOTPOT_PROPS.plant.key, 92, 470, 0.95);
    decor(HOTPOT_PROPS.plant.key, 1224, 470, 0.95);

    // 挂灯（补两盏在近处，增加纵深）
    decor(HOTPOT_PROPS.lantern.key, 486, 176, 0.8);
    decor(HOTPOT_PROPS.lantern.key, 796, 176, 0.8);

    // 中间那桌：depth 取桌脚位置，所以坐下的人（y 更小）会被桌面挡住
    this.table = this.add
      .image(HOTPOT.table.x, HOTPOT.table.y, HOTPOT_PROPS.table.key)
      .setOrigin(0.5, 1)
      .setDepth(HOTPOT.tableDepth);
    this.addObstacle(HOTPOT.table.x, HOTPOT.table.y - 46, 290, 92);
  }

  /** 左边门口的牌子 */
  addDoorSign() {
    this.add
      .text(HOTPOT.leftEnd.x, HOTPOT.leftEnd.y, `◀ ${HOTPOT.leftEnd.label}`, {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#3a2216',
        backgroundColor: 'rgba(255,246,226,0.72)',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setDepth(HOTPOT.leftEnd.y);
  }

  /* ------------------------------------------------------------- 每帧 */

  onUpdate() {
    // 走到最左边门口：回松鸭湖
    if (this.player.x <= HOTPOT.leftEndPassX) this.backToLake();
  }

  /* ------------------------------------------------------------- 吃火锅 */

  /** 场上三个人（潘尔赛 + 已入队的黄姐 / 杨凡） */
  cast() {
    return [
      { sprite: this.player, who: 'pan' },
      { sprite: this.huang, who: 'huang' },
      { sprite: this.yang, who: 'yang' },
    ].filter((c) => c.sprite);
  }

  startMeal() {
    if (this.mealStarted || this.leaving) return;
    this.mealStarted = true;
    this.setCinematic(true);

    this.sitDown();
    this.time.delayedCall(760, () => {
      // 坐下那句；玩家按空格 / E 翻完就开始吃
      this.dialogue.start(HOTPOT_DIALOGUE, () => this.startEating());
    });
  }

  sitDown() {
    this.cast().forEach(({ sprite, who }, i) => {
      const seat = HOTPOT.seats[who];
      if (!seat) return;
      sprite.setVelocity?.(0, 0);
      sprite.play(`${sprite.animPrefix}-walk-down`, true);
      this.tweens.add({
        targets: sprite,
        x: seat.x,
        y: seat.y,
        duration: 600,
        delay: i * 90,
        ease: 'Sine.inOut',
        onUpdate: () => sprite.setDepth(sprite.y),
        onComplete: () => sprite.face(seat.x, seat.y + 60),
      });
    });
  }

  startEating() {
    this.showToast('开吃！', '双季红 · 鸳鸯锅');
    // 锅里咕嘟冒热气
    this.eatingTimer = this.time.addEvent({
      delay: 260,
      repeat: -1,
      callback: () => potSteam(this, HOTPOT.table.x, HOTPOT.table.y - 150, HOTPOT.tableDepth + 2),
    });
    this.time.delayedCall(HOTPOT.eatMs, () => {
      this.eatingTimer?.remove();
      this.eatingTimer = null;
      this.barfAll();
    });
  }

  barfAll() {
    const sick = [
      { sprite: this.player, delay: 0 },
      { sprite: this.huang, delay: 180 },
    ].filter((c) => c.sprite);
    sick.forEach(({ sprite, delay }) => rainbowVomit(this, sprite, { delay, count: 26 }));
    if (sick.length) this.cameras.main.shake(340, 0.006);

    this.time.delayedCall(1500, () => {
      // 潘尔赛那句台词
      this.dialogue.start(HOTPOT_SICK_DIALOGUE, () => this.standUp());
    });
  }

  standUp() {
    const stand = HOTPOT.standUp;
    this.cast().forEach(({ sprite, who }, i) => {
      const spot = stand[who];
      if (!spot) return;
      sprite.play(`${sprite.animPrefix}-walk-down`, true);
      this.tweens.add({
        targets: sprite,
        x: spot.x,
        y: spot.y,
        duration: 520,
        delay: i * 70,
        ease: 'Sine.inOut',
        onUpdate: () => sprite.setDepth(sprite.y),
        onComplete: () => {
          sprite.face(sprite.x, sprite.y + 60);
          if (sprite === this.player) {
            // 火锅这顿吃完了：回松鸭湖就会触发和杨凡告别
            this.registry.set('hotpotDone', true);
            this.interactables = this.interactables.filter((item) => !item.meal);
            this.setCinematic(false);
            this.defaultHint = '吃都吃了……　WASD 移动　·　左边门口回松鸭湖';
            this.setHint(this.defaultHint);
          }
        },
      });
    });
  }

  /* ------------------------------------------------------------- 互动 */

  backToLake() {
    if (this.leaving) return;
    this.leaving = true;
    this.eatingTimer?.remove();
    this.hint.setVisible(false);
    this.bubble?.destroy();
    this.bubble = null;
    this.cameras.main.fadeOut(420, 12, 8, 6);
    this.cameras.main.once('camerafadeoutcomplete', () =>
      this.scene.start('LakeScene', { from: 'hotpot' })
    );
  }
}
