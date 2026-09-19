import {
  GAME_WIDTH,
  GAME_HEIGHT,
  LAKE,
  LAKE_DIALOGUE,
  LAKE_FAREWELL,
  LAKE_FAREWELL_DIALOGUE,
  YANG_DIALOGUE_LEFT,
  YANG_LEAVE_TEXT,
  YANGFAN,
  FONT,
} from '../config.js';
import GameScene from './GameScene.js';

/**
 * 松鸭湖：从街道右边「松鸭湖」路牌进来。
 * 背景用处理过的 assets/lake_bg.png（见 tools/build_assets.py），
 * 人从场景最左边的路口进来，杨凡站在路中间等着；黄姐入队了会一路跟着过来。
 */
export default class LakeScene extends GameScene {
  constructor() {
    super('LakeScene');
  }

  preload() {
    this.preloadSharedAssets();
    if (!this.textures.exists(LAKE.bgKey)) this.load.image(LAKE.bgKey, LAKE.bgPath);
  }

  create(data) {
    this.addLakeBackground();

    const w = LAKE.walk;
    this.physics.world.setBounds(w.left, w.top, w.right - w.left, w.bottom - w.top);

    // 湖边整条路面都能走；只用几块看不见的挡板把左边的水面拦掉
    this.obstacles = this.physics.add.staticGroup();
    LAKE.shore.forEach(({ y0, y1, x }) =>
      this.addObstacle(x / 2, (y0 + y1) / 2, x, y1 - y0 + 2)
    );

    this.addRoadSign(LAKE.leftEnd, '◀');
    this.addRoadSign(LAKE.rightEnd, '▶');

    const joined = this.registry.get('huangJoined') === true;
    const yangJoined = this.registry.get('yangJoined') === true;
    // 从火锅店出来：站在最右边，而不是从左边路口进场
    const fromHotpot = data?.from === 'hotpot';
    const here = fromHotpot ? LAKE.fromHotpotSpawn : LAKE.spawn;
    const huangHere = fromHotpot
      ? { x: here.x + 68, y: here.y + 14 }
      : LAKE.huangSpawn;
    const yangHere = fromHotpot ? { x: here.x + 136, y: here.y - 6 } : LAKE.yangSpawn;
    // 已经道别过的杨凡：留在湖边原地（位置存在 registry 里），不再是"等人组队"的状态
    const yangGone = this.registry.get('yangLeftTeam') === true;
    const stay = this.registry.get('yangStay');
    const yangNpcPos = yangGone && stay ? stay : LAKE.yang;
    this.farewellDone = yangGone;
    this.setupCommon({
      playerX: here.x,
      playerY: here.y,
      // 从街上的路口走进来朝右，从火锅店出来朝左
      playerFacing: fromHotpot ? 'left' : 'right',
      huangX: joined ? huangHere.x : null,
      huangY: joined ? huangHere.y : null,
      huangJoined: joined,
      // 杨凡已经入队的话，他来松鸭湖也是跟队来的，不再站在路中间
      yangX: yangJoined ? yangHere.x : null,
      yangY: yangJoined ? yangHere.y : null,
      hint: 'WASD / 方向键 移动　·　Shift 快走　·　E / 空格 互动　·　右上角去双季红　·　左边尽头回马路',
      // 两个路口都是"走到就触发/提示"，不用按 E，所以没有交互点
      interactables: [],
      npcs: yangJoined
        ? []
        : [
            {
              config: YANGFAN,
              x: yangNpcPos.x,
              y: yangNpcPos.y,
              radius: LAKE.yang.radius,
              dialogue: yangGone ? YANG_DIALOGUE_LEFT : LAKE_DIALOGUE,
              idle: 'down',
            },
          ],
    });

    // 还没入队的杨凡：说完这段就加入队伍（joinNpcTeam 里会把他转成队友）
    this.yangNpc = this.npcs.find((entry) => entry.config === YANGFAN) || null;
    // 只有还没告别过才触发"加入队伍"
    if (this.yangNpc && !yangGone) {
      this.yangNpc.onFinish = () => this.joinNpcTeam(this.yangNpc);
    }
    if (this.yangNpc && yangGone) this.yangNpc.dialogue = YANG_DIALOGUE_LEFT;
  }

  /** 背景图 2304x1728 比画布高：按宽度铺满，再把多余的天空从上面裁掉 */
  addLakeBackground() {
    const img = this.add.image(0, 0, LAKE.bgKey).setOrigin(0, 0).setDepth(-1000);
    img.setScale(GAME_WIDTH / img.width);
    img.y = GAME_HEIGHT - img.displayHeight;

    this.add
      .text(GAME_WIDTH / 2, 46, '松鸭湖', {
        fontFamily: FONT,
        fontSize: '34px',
        color: '#2b4a55',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 3, 'rgba(255,255,255,0.75)', 6)
      .setDepth(-900);
  }

  /** 路口路牌：白底小牌子，箭头 + 文字，深度跟着 y 走，人物走到前面会挡住它 */
  addRoadSign({ x, y, label }, arrow) {
    return this.add
      .text(x, y, `${arrow} ${label}`, {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#2f4a52',
        backgroundColor: 'rgba(255,255,255,0.55)',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setDepth(y);
  }

  /* ------------------------------------------------------------- 每帧 */

  /** 杨凡站定等着：玩家走近就转过来看着他 */
  onUpdate() {
    // 走到最左边路牌底下：直接回马路（银行门口那条街）
    if (this.player.x <= LAKE.leftEndPassX) {
      this.backToStreet();
      return;
    }
    // 走到右上角：直接进双季红火锅店
    if (
      this.player.x >= LAKE.rightEndPass.x &&
      this.player.y <= LAKE.rightEndPass.y
    ) {
      this.goToHotpot();
      return;
    }

    // 吃完火锅回到湖中央：和杨凡告别
    this.checkFarewell();

    // 入队之后他就是队友了，朝向交给跟随逻辑
    if (!this.yangNpc || this.yangNpc.npc.joined) return;
    const { npc } = this.yangNpc;
    if (this.talkingPartner === npc) return;
    const d = Phaser.Math.Distance.Between(npc.x, npc.y, this.player.x, this.player.y);
    if (d > 420) return;

    const dx = this.player.x - npc.x;
    const dy = this.player.y - npc.y;
    const facing =
      Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    if (npc.facing !== facing) npc.face(this.player.x, this.player.y);
  }

  /** 吃完火锅、又带着杨凡走回湖心 → 触发和杨凡告别 */
  checkFarewell() {
    if (this.farewellDone) return;
    if (this.registry.get('hotpotDone') !== true) return;
    const c = LAKE_FAREWELL.center;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y) > c.radius) {
      return;
    }
    // 杨凡还在队里就好好告别；万一没带他（跳过了组队），也直接放行回街道
    if (this.yang && this.yang.joined) {
      this.startFarewell();
    } else {
      this.farewellDone = true;
      this.registry.set('finaleArmed', true);
      this.defaultHint = '和黄姐一起回水星街道吧　·　走到左边尽头回马路';
      this.setHint(this.defaultHint);
    }
  }

  startFarewell() {
    this.farewellDone = true;
    this.setCinematic(true);
    // 三个人转过来面对面
    this.yang.face(this.player.x, this.player.y);
    this.player.face(this.yang.x, this.yang.y);
    this.huang?.face(this.yang.x, this.yang.y);
    this.dialogue.start(LAKE_FAREWELL_DIALOGUE, () => this.finishFarewell());
  }

  finishFarewell() {
    // 杨凡留在原地、退出队伍；接下来和黄姐回水星街道
    this.leaveTeam(this.yang);
    this.registry.set('yangLeftTeam', true);
    this.registry.set('finaleArmed', true);
    this.yang?.face(this.player.x, this.player.y);
    this.showToast(YANG_LEAVE_TEXT, '他留在松鸭湖了');
    this.setCinematic(false);
    this.defaultHint = '和黄姐一起回水星街道吧　·　走到左边尽头回马路';
    this.setHint(this.defaultHint);
  }

  /* ------------------------------------------------------------- 互动 */

  backToStreet() {
    if (this.leaving) return;
    this.leaving = true;
    this.hint.setVisible(false);
    this.bubble?.destroy();
    this.bubble = null;
    this.cameras.main.fadeOut(420, 12, 8, 6);
    this.cameras.main.once('camerafadeoutcomplete', () =>
      this.scene.start('StreetScene', { from: 'lake' })
    );
  }

  /** 走到最右边：进双季红火锅店 */
  goToHotpot() {
    if (this.leaving) return;
    this.leaving = true;
    this.hint.setVisible(false);
    this.bubble?.destroy();
    this.bubble = null;
    this.cameras.main.fadeOut(420, 12, 8, 6);
    this.cameras.main.once('camerafadeoutcomplete', () =>
      this.scene.start('HotpotScene', { from: 'lake' })
    );
  }
}
