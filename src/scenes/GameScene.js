import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SPRITE,
  HUANG,
  YANGFAN,
  AVATARS,
  DIALOGUE,
  DIALOGUE_AFTER,
  TEAM_JOIN_TEXT,
  YANG_DIALOGUE_AFTER,
  TEAM_JOIN_YANG_TEXT,
  FONT,
} from '../config.js';
import Player from '../objects/Player.js';
import Companion from '../objects/Companion.js';
import DialogueBox from '../ui/DialogueBox.js';
import FollowTrail from '../systems/FollowTrail.js';
import { createAllCharacterAnims } from '../systems/animations.js';
import { createSoftShadow } from '../art/canvasKit.js';

/** 四方向的单位向量：把「朝向」换算成"再往前走一点会到哪儿" */
const DIR_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/**
 * 场景基类：两个场景都要用的东西都在这里
 * —— 共用素材、角色与动画、HUD、操控（键盘 + 触屏摇杆）、
 *    对话推进、跟随、互动判定、提示条。
 * 子类只管搭自己的场景（背景 + 道具 + 碰撞 + 交互点）。
 */
export default class GameScene extends Phaser.Scene {
  /** 子类 preload() 里调用：精灵表和头像全局只加载一次 */
  preloadSharedAssets() {
    [SPRITE, HUANG, YANGFAN].forEach((c) => {
      if (!this.textures.exists(c.key)) {
        this.load.spritesheet(c.key, c.path, {
          frameWidth: c.frameWidth,
          frameHeight: c.frameHeight,
        });
      }
    });
    Object.values(AVATARS).forEach((a) => {
      if (!this.textures.exists(a.key)) this.load.image(a.key, a.path);
    });
  }

  /**
   * 子类建好背景和 obstacles 之后调用
   * @param {object} opts {
   *   playerX, playerY,                 // 潘尔赛站哪儿
   *   huangX, huangY, huangJoined,      // 黄姐站哪儿、是不是已经入队（null = 这场戏没有她）
   *   yangX, yangY,                     // 杨凡已经入队时才用：他跟在队伍后面
   *   hint, interactables, npcs
   * }
   */
  setupCommon(opts) {
    createSoftShadow(this);
    this.defaultHint = opts.hint;
    this.interactables = opts.interactables || [];
    /** 场景里的固定 NPC（见 createNpcAt），和"跟队的黄姐"是两回事 */
    this.npcs = [];
    /** 正在对话的对象（说话时会和他对视） */
    this.talkingPartner = null;
    /** 已入队的杨凡：和场景 NPC 是同一个精灵，入队后转为队友 */
    this.yang = null;
    this.yangShadow = null;
    this.yangTrail = null;

    // 场景是复用同一个实例重启的，这些临时状态必须清掉，
    // 否则从街上回到银行时 leaving 还是 true，人物就动不了了
    this.leaving = false;
    /** 过场（坐下吃饭这类）：锁住玩家输入，走位交给剧情自己 tween */
    this.cinematic = false;
    this.bubble = null;
    this.target = null;
    this.debugOn = false;
    this.debugGfx = null;

    createAllCharacterAnims(this);
    this.createPlayerAt(opts.playerX, opts.playerY);
    // 有的场景是"从左边走进来"的，出生时就朝着场景里站
    if (opts.playerFacing) {
      const [dx, dy] = DIR_VEC[opts.playerFacing] || DIR_VEC.down;
      this.player.face(this.player.x + dx, this.player.y + dy);
    }
    // 黄姐没入队、又不在这个场景里时（比如没打招呼就自己跑来松鸭湖），huangX 传 null 就不会建她
    if (opts.huangX == null) {
      this.huang = null;
      this.huangShadow = null;
    } else {
      this.createHuangAt(opts.huangX, opts.huangY, opts.huangJoined);
    }
    if (opts.yangX != null) this.createYangAt(opts.yangX, opts.yangY);
    (opts.npcs || []).forEach((npc) => this.createNpcAt(npc));
    this.createHud();
    this.createControls();
    this.dialogue = new DialogueBox(this);

    this.physics.add.collider(this.player, this.obstacles);
    // 黄姐只挡场景，不挡人：和她重叠也能走过去，交互靠"面对面 / 重叠 + 按 E"
    if (this.huang) this.physics.add.collider(this.huang, this.obstacles);
    if (this.yang) this.physics.add.collider(this.yang, this.obstacles);

    this.cameras.main.setBackgroundColor('#1b1512');
    this.cameras.main.fadeIn(420, 12, 8, 6);
    document.getElementById('loading')?.remove();
  }

  /* ------------------------------------------------------------- 角色 */

  createPlayerAt(x, y) {
    this.shadow = this.add.image(x, y, 'soft-shadow').setAlpha(0.55).setScale(0.62, 0.5);
    this.player = new Player(this, x, y);
  }

  createHuangAt(x, y, joined) {
    this.huangShadow = this.add
      .image(x, y, 'soft-shadow')
      .setAlpha(0.55)
      .setScale(0.66, 0.52);
    this.huang = new Companion(this, HUANG, x, y);
    this.huang.joined = !!joined;
    this.huang.play(`${HUANG.animPrefix}-idle-down`);
    if (joined) {
      this.followTrail = new FollowTrail(this.huang, HUANG.follow);
      this.followTrail.reset(this.player);
    }
  }

  /**
   * 场景里的固定 NPC：一个会转身的精灵 + 脚下阴影。
   * 子类在 setupCommon 的 npcs 里传
   * { config, x, y, name, dialogue, radius, idle, onFinish }。
   */
  createNpcAt({ config, x, y, name, dialogue, radius = 130, idle = 'down', onFinish }) {
    const shadow = this.add.image(x, y, 'soft-shadow').setAlpha(0.55).setScale(0.64, 0.5);
    const npc = new Companion(this, config, x, y);
    npc.facing = idle;
    npc.play(`${config.animPrefix}-idle-${idle}`);
    // 等人时是推不动的实体，走过去会停在面前；入队时再解除（见 joinNpcTeam）
    npc.body.setImmovable(true);

    const entry = {
      npc,
      shadow,
      config,
      name: name || config.name,
      dialogue,
      radius,
      onFinish,
      /** 挡住玩家/黄姐的碰撞体，入队后要关掉 */
      colliders: [
        this.physics.add.collider(npc, this.obstacles),
        this.physics.add.collider(this.player, npc),
      ],
    };
    if (this.huang) entry.colliders.push(this.physics.add.collider(this.huang, npc));
    this.npcs.push(entry);
    return entry;
  }

  /** 已经入队的杨凡：队友一个，走到哪个场景都跟着 */
  createYangAt(x, y) {
    this.yangShadow = this.add.image(x, y, 'soft-shadow').setAlpha(0.55).setScale(0.64, 0.5);
    this.yang = new Companion(this, YANGFAN, x, y);
    this.yang.joined = true;
    this.yang.play(`${YANGFAN.animPrefix}-idle-down`);
    this.yangTrail = new FollowTrail(this.yang, YANGFAN.follow);
    this.yangTrail.reset(this.player);
  }

  /**
   * 场景 NPC 入队：原地从"站在那儿的 NPC"变成"跟在队伍后面的队友"。
   * 精灵不重建，只是解除实体碰撞、挂上跟随轨迹。
   */
  joinNpcTeam(entry) {
    const { npc } = entry;
    npc.joined = true;
    npc.body.setImmovable(false);
    entry.colliders.forEach((c) => {
      c.active = false;
    });

    // 从场景 NPC 名单里摘出去，改由队友那一套逻辑接管
    this.npcs = this.npcs.filter((e) => e !== entry);
    if (entry.config === YANGFAN) {
      this.registry.set('yangJoined', true);
      this.yang = npc;
      this.yangShadow = entry.shadow;
      this.yangTrail = new FollowTrail(npc, YANGFAN.follow);
      this.yangTrail.reset(this.player);
      this.showToast(TEAM_JOIN_YANG_TEXT, '现在跟在队伍后面啦');
    }
  }

  /* ------------------------------------------------------------- 界面 */

  createHud() {
    const panel = this.add.graphics().setDepth(9000);
    panel.fillStyle(0x1a1310, 0.72);
    panel.fillRoundedRect(22, 20, 250, 74, 12);
    panel.lineStyle(2, 0xc9a44c, 0.65);
    panel.strokeRoundedRect(22, 20, 250, 74, 12);

    this.add
      .text(44, 34, '潘尔赛', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#f7ead0',
        fontStyle: 'bold',
      })
      .setDepth(9001);
    this.add
      .text(44, 66, '银行职员 · 大堂服务', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#cbb894',
      })
      .setDepth(9001);

    this.hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 14, '', {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#f2e6cc',
        backgroundColor: 'rgba(26,19,16,0.62)',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5, 1)
      .setDepth(9001);
    this.setHint(this.defaultHint);
  }

  setHint(text) {
    if (this.hint.text !== text) this.hint.setText(text);
  }

  /** 开关过场：过场里玩家不能走动，底部提示条也收起来 */
  setCinematic(on) {
    this.cinematic = !!on;
    this.hint.setVisible(!on);
  }

  createControls() {
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,B,SHIFT,SPACE');
    this.cursors = this.input.keyboard.createCursorKeys();

    /** 触屏 / 鼠标拖拽摇杆 */
    this.touch = { active: false, ox: 0, oy: 0, x: 0, y: 0 };
    this.stick = this.add.graphics().setDepth(9500).setVisible(false);

    this.input.on('pointerdown', (p) => {
      this.touch.active = true;
      this.touch.ox = p.worldX;
      this.touch.oy = p.worldY;
      this.touch.x = 0;
      this.touch.y = 0;
    });
    this.input.on('pointermove', (p) => {
      if (!this.touch.active) return;
      const dx = p.worldX - this.touch.ox;
      const dy = p.worldY - this.touch.oy;
      const len = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(len, 70);
      this.touch.x = (dx / len) * (clamped / 70);
      this.touch.y = (dy / len) * (clamped / 70);
      this.drawStick();
    });
    this.input.on('pointerup', () => {
      this.touch.active = false;
      this.touch.x = 0;
      this.touch.y = 0;
      this.stick.setVisible(false);
    });
  }

  drawStick() {
    const { ox, oy, x, y } = this.touch;
    this.stick.setVisible(true).clear();
    this.stick.fillStyle(0xf2e6cc, 0.16);
    this.stick.fillCircle(ox, oy, 62);
    this.stick.lineStyle(3, 0xf2e6cc, 0.35);
    this.stick.strokeCircle(ox, oy, 62);
    this.stick.fillStyle(0xf2e6cc, 0.5);
    this.stick.fillCircle(ox + x * 58, oy + y * 58, 26);
  }

  readInput() {
    const k = this.keys;
    const c = this.cursors;
    let x = 0;
    let y = 0;
    if (k.A.isDown || c.left.isDown) x -= 1;
    if (k.D.isDown || c.right.isDown) x += 1;
    if (k.W.isDown || c.up.isDown) y -= 1;
    if (k.S.isDown || c.down.isDown) y += 1;
    if (x === 0 && y === 0 && this.touch.active) {
      x = this.touch.x;
      y = this.touch.y;
    }
    return { x, y, run: k.SHIFT.isDown };
  }

  /* ------------------------------------------------------------- 每帧 */

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.B)) this.toggleDebug();

    // 切换场景的过程中不接受输入
    if (this.leaving) {
      this.player.move({ x: 0, y: 0, run: false }, delta);
      this.updateShadows();
      return;
    }

    // 过场里玩家站着不动，跟随 / 互动都停，但对话还能翻页
    if (this.cinematic) {
      this.player.setVelocity(0, 0);
      this.player.setDepth(this.player.y);
      this.updateShadows();
      if (
        this.dialogue.isOpen &&
        (Phaser.Input.Keyboard.JustDown(this.keys.E) ||
          Phaser.Input.Keyboard.JustDown(this.keys.SPACE))
      ) {
        this.dialogue.next();
      }
      return;
    }

    // 对话中：两人站定对视，空格 / E 翻页
    if (this.dialogue.isOpen) {
      this.player.move({ x: 0, y: 0, run: false }, delta);
      // 和谁说话就和谁对视，其余情况是和黄姐
      const partner = this.talkingPartner || this.huang;
      if (partner) {
        this.player.face(partner.x, partner.y);
        partner.face(this.player.x, this.player.y);
      }
      this.updateShadows();
      this.hint.setVisible(false);
      if (
        Phaser.Input.Keyboard.JustDown(this.keys.E) ||
        Phaser.Input.Keyboard.JustDown(this.keys.SPACE)
      ) {
        this.dialogue.next();
      }
      return;
    }

    this.hint.setVisible(true);
    this.player.move(this.readInput(), delta);
    this.updateShadows();
    if (this.huang && this.huang.joined && this.followTrail) {
      this.followTrail.update(this.player, delta);
    }
    if (this.yang && this.yangTrail) {
      this.yangTrail.update(this.player, delta);
    }
    if (this.onUpdate) this.onUpdate(delta);
    if (this.dialogue.isOpen) this.hint.setVisible(false);
    else this.updateInteraction();
  }

  updateShadows() {
    this.shadow.setPosition(this.player.x, this.player.y - 4).setDepth(this.player.y - 1);
    if (this.huang) {
      this.huangShadow
        .setPosition(this.huang.x, this.huang.y - 4)
        .setDepth(this.huang.y - 1);
    }
    if (this.yang) {
      this.yangShadow.setPosition(this.yang.x, this.yang.y - 4).setDepth(this.yang.y - 1);
    }
    this.npcs.forEach(({ npc, shadow }) =>
      shadow.setPosition(npc.x, npc.y - 4).setDepth(npc.y - 1)
    );
  }

  /* ------------------------------------------------------------- 互动 */

  /** 用不可见的长方形作为碰撞体 */
  addObstacle(x, y, width, height) {
    const zone = this.add.zone(x, y, width, height);
    this.obstacles.add(zone);
    zone.body.setSize(width, height);
    zone.body.updateFromGameObject();
    return zone;
  }

  updateInteraction() {
    if (this.bubble) this.bubble.setPosition(this.player.x, this.player.headY - 10);

    const target = this.nearestInteractable();
    this.target = target;
    const hint =
      target &&
      (typeof target.hint === 'function' ? target.hint() : target.hint) ||
      (target ? `按 E / 空格 互动：${target.label}` : this.defaultHint);
    this.setHint(hint);

    const talk =
      Phaser.Input.Keyboard.JustDown(this.keys.E) ||
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    if (!target || !talk) return;

    if (target.huang) this.talkToHuang();
    else if (target.action) target.action();
    else if (target.line) this.showBubble(target.line);
  }

  nearestInteractable() {
    // 场景里的固定 NPC 也算交互点（位置每帧取，NPC 转身/移动都能跟上）
    const list = this.interactables.concat(
      this.npcs.map((entry) => ({
        x: entry.npc.x,
        y: entry.npc.y,
        radius: entry.radius,
        label: entry.name,
        hint: `按 E / 空格 和${entry.name}说话`,
        action: () => this.talkTo(entry.npc, entry.dialogue, entry.onFinish),
      })),
      this.yang
        ? [
            {
              x: this.yang.x,
              y: this.yang.y,
              radius: 118,
              label: YANGFAN.name,
              hint: `按 E / 空格 和${YANGFAN.name}说话`,
              action: () => this.talkTo(this.yang, YANG_DIALOGUE_AFTER),
            },
          ]
        : []
    );
    const huangItem = this.huang
      ? {
          x: this.huang.x,
          y: this.huang.y,
          radius: 118,
          label: HUANG.name,
          hint: '按 E / 空格 和黄姐说话',
          huang: true,
        }
      : null;

    // 第一次见面（还没入队）时黄姐优先：她就站在门口等人搭话
    if (huangItem && !this.huang.joined && this.canTalkToHuang(huangItem)) return huangItem;

    // 1) 场景里的交互点（柜台、路牌、大门…）优先级最高
    let best = null;
    let bestDist = Infinity;
    list.forEach((item) => {
      if (!item.ignoreFacing && !this.isInFront(item)) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
      if (d <= item.radius && d < bestDist) {
        best = item;
        bestDist = d;
      }
    });
    if (best) return best;

    // 2) 都没有，才轮到黄姐：面对面 或 两人重叠时才能搭话
    if (huangItem && this.canTalkToHuang(huangItem)) return huangItem;
    return null;
  }

  /** 黄姐可以被搭话的条件：距离够近，并且是面对面或者两人重叠 */
  canTalkToHuang(item) {
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
    return d <= item.radius && (d < 44 || this.isInFront(item));
  }

  /** 目标是否在潘尔赛正面 ±75° 的扇形里（贴脸时不做限制） */
  isInFront(item) {
    const [fx, fy] = DIR_VEC[this.player.facing] || DIR_VEC.down;
    const dx = item.x - this.player.x;
    const dy = item.y - this.player.y;
    const len = Math.hypot(dx, dy);
    if (len < 34) return true;
    return (dx * fx + dy * fy) / len > 0.25;
  }

  /** 和黄姐对话；第一次说完她就入队 */
  talkToHuang() {
    const firstTime = !this.huang.joined;
    this.talkTo(this.huang, firstTime ? DIALOGUE : DIALOGUE_AFTER, firstTime
      ? () => this.joinTeam()
      : null);
  }

  /**
   * 和某个角色说话：两人先转过来面对面，说完（翻到最后一页）再执行 onFinish。
   * onFinish 用来做"说完这句就入队"这类剧情钩子。
   */
  talkTo(partner, lines, onFinish) {
    this.talkingPartner = partner;
    this.player.face(partner.x, partner.y);
    partner.face(this.player.x, this.player.y);
    this.dialogue.start(lines, () => {
      this.talkingPartner = null;
      if (onFinish) onFinish();
    });
  }

  joinTeam() {
    this.huang.joined = true;
    this.registry.set('huangJoined', true);
    this.followTrail = new FollowTrail(this.huang, HUANG.follow);
    this.followTrail.reset(this.player);
    this.showToast(TEAM_JOIN_TEXT, '现在会跟在你后面啦');
  }

  showBubble(text) {
    this.bubble?.destroy();

    const label = this.add
      .text(0, 0, text, {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#2b2118',
        wordWrap: { width: 320 },
        align: 'center',
      })
      .setOrigin(0.5);

    const padX = 18;
    const padY = 12;
    const w = label.width + padX * 2;
    const h = label.height + padY * 2;

    const g = this.add.graphics();
    g.fillStyle(0xfdf6e6, 0.97);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    g.lineStyle(3, 0xc9a44c, 0.9);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    g.fillStyle(0xfdf6e6, 0.97);
    g.fillTriangle(-10, h / 2 - 1, 10, h / 2 - 1, 0, h / 2 + 12);

    this.bubble = this.add
      .container(this.player.x, this.player.headY - 10, [g, label])
      .setDepth(9002)
      .setAlpha(0);

    this.tweens.add({
      targets: this.bubble,
      alpha: 1,
      y: this.bubble.y - 8,
      duration: 160,
      ease: 'Quad.out',
    });
    this.time.delayedCall(2600, () => {
      if (!this.bubble) return;
      this.tweens.add({
        targets: this.bubble,
        alpha: 0,
        duration: 260,
        onComplete: () => {
          this.bubble?.destroy();
          this.bubble = null;
        },
      });
    });
  }

  showToast(title, sub) {
    const c = this.add.container(GAME_WIDTH / 2, 176).setDepth(9700).setAlpha(0);
    const w = 340;
    const h = sub ? 96 : 72;
    const g = this.add.graphics();
    g.fillStyle(0x1a1310, 0.93);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.lineStyle(3, 0xc9a44c, 0.95);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    const t = this.add
      .text(0, sub ? -14 : 0, title, {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#f7ead0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    c.add([g, t]);
    if (sub) {
      c.add(
        this.add
          .text(0, 22, sub, { fontFamily: FONT, fontSize: '14px', color: '#cbb894' })
          .setOrigin(0.5)
      );
    }

    this.tweens.add({ targets: c, alpha: 1, y: 160, duration: 320, ease: 'Back.out' });
    this.time.delayedCall(2400, () =>
      this.tweens.add({ targets: c, alpha: 0, duration: 420, onComplete: () => c.destroy() })
    );
  }

  /** B 键：把碰撞体画出来，方便调场景 */
  toggleDebug() {
    this.debugOn = !this.debugOn;
    if (!this.debugGfx) this.debugGfx = this.add.graphics().setDepth(9500);
    this.debugGfx.clear();
    if (!this.debugOn) return;
    this.debugGfx.lineStyle(2, 0x36e08a, 0.9);
    this.obstacles.getChildren().forEach((o) => {
      const b = o.body;
      if (b) this.debugGfx.strokeRect(b.x, b.y, b.width, b.height);
    });
    const pb = this.player.body;
    this.debugGfx.lineStyle(2, 0xff5f6d, 0.95);
    this.debugGfx.strokeRect(pb.x, pb.y, pb.width, pb.height);
  }
}
