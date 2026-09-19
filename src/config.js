/**
 * 全局配置：尺寸、配色、人物精灵参数。
 * 想调手感或改风格，优先改这里。
 */

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** 后墙高度：y < 178 是墙，下面是地面 */
export const WALL_H = 178;

/**
 * 人物精灵表参数，由 tools/build_assets.py 生成。
 * 网页加载的是缩过的小图 assets/small/pan_ersai.webp（单帧 109x174，共 9 帧），
 * assets/pan_ersai.png 那张原图只作为"原图"留在仓库里；
 * 重新生成素材（改了 SMALL_JOBS 里的 scale）后请同步这里的尺寸 / scale / body。
 */
export const SPRITE = {
  key: 'pan',
  path: 'assets/small/pan_ersai.webp',
  animPrefix: 'pan',
  /** 嘴在人物高度上的位置（从脚底往上算），吐东西 / 说话气泡都用它定位 */
  mouthRatio: 0.71,
  frameWidth: 109,
  frameHeight: 174,
  frameCount: 9,
  /** 屏幕上人物高度还是约 133px（小图缩到 0.55 倍，scale 相应放大） */
  scale: 0.764,
  /**
   * 9 帧其实是 4 组朝向的姿势，不是一条步态循环（按帧顺序播放会看起来像在原地转圈）：
   *   0、1  = 正面（脸在正中间）
   *   4     = 背面（完全看不到脸）
   *   3、7  = 左侧面（脸在头部左边缘，一帧对应一个步伐）
   *   6、8  = 右侧面（脸在头部右边缘）
   *   2、5  = 介于正/侧之间的过渡角度，用了会看出"转身"，所以不参与动画
   * 每组里姿态更接近的两帧配成两步的循环，走起来脑袋不会晃。
   */
  directions: {
    down: { frames: [0, 1], fps: 4.5 },
    up: { frames: [4], fps: 4.5 }, // 背面素材只有一帧，靠步伐起伏表现走动
    left: { frames: [3, 7], fps: 4.5 },
    right: { frames: [6, 8], fps: 4.5 },
  },
  /** 停下来时保持最后一个朝向 */
  idleFrames: { down: 0, up: 4, left: 3, right: 6 },
};

export const PLAYER = {
  name: '潘尔赛',
  title: '银行职员 · 大堂服务',
  walkSpeed: 235,
  runSpeed: 360,
  /** 碰撞体（以精灵表原始像素为单位，会自动乘以 scale） */
  body: { width: 53, height: 31, offsetBottom: 4 },
  startX: 640,
  startY: 560,
};

/**
 * 黄姐：走动素材同样是 9 帧一行（单帧 240x286）。
 * 逐帧比对头部区域差异后分组：
 *   0、1 = 正面（脸在头部正中）
 *   2、4 = 右侧面（脸贴在头部右边缘，两帧头部几乎一致、腿部不同 → 一步一拍）
 *   5、8 = 左侧面（同上，脸贴左边缘）
 *   3、6、7 = 介于正面和侧面之间的过渡角度，用进动画会看出"转头"，不用
 * 注意：这组素材里没有背影帧，所以向上走暂时复用正面（补图后改这里即可）。
 */
export const HUANG = {
  key: 'huang',
  path: 'assets/small/huang_jie.webp',
  animPrefix: 'huang',
  frameWidth: 132,
  frameHeight: 157,
  frameCount: 9,
  scale: 0.764,
  directions: {
    down: { frames: [0, 1], fps: 4.5 },
    up: { frames: [0, 1], fps: 4.5 },
    left: { frames: [5, 8], fps: 4.5 },
    right: { frames: [2, 4], fps: 4.5 },
  },
  idleFrames: { down: 0, up: 0, left: 5, right: 2 },
  body: { width: 57, height: 33, offsetBottom: 4 },

  name: '黄姐',
  /** 嘴的位置（见 SPRITE.mouthRatio） */
  mouthRatio: 0.73,
  /** 一开始站在大厅左边的花盆旁边 */
  startX: 322,
  startY: 656,
  /** 队伍跟随参数 */
  follow: {
    distance: 78,         // 跟在身后多远
    speed: 250,           // 平时跟走速度（略快于潘尔赛的 235）
    catchUpDistance: 260, // 掉队超过这个距离就加速
    catchUpSpeed: 430,
    crumb: 5,             // 轨迹采样间距
  },
};

/**
 * 杨凡：约好在松鸭湖碰头的老朋友，素材同样是 9 帧一行（单帧 180x321）。
 * 逐帧比对头部后分组：
 *   0、1   = 正面（脸在正中，两只眼睛都能看到）
 *   2、7   = 左侧面（脸贴在左边缘，只露出一只眼睛，两帧头部几乎一致）
 *   4、5   = 更偏左的侧身，5 几乎看不到五官（同组素材里最像背影的一帧）
 *   3      = 接近正面（介于正面和左侧之间）
 *   6      = 左侧面（和 7 同角度、不同步伐）
 *   8      = 右侧面（这组素材里唯一朝右的一帧）
 * 所以向左走用 2、7 两步循环，向右只有一张，用单帧 + 步伐起伏表现。
 */
export const YANGFAN = {
  key: 'yang',
  path: 'assets/small/yang_fan.webp',
  animPrefix: 'yang',
  frameWidth: 99,
  frameHeight: 177,
  frameCount: 9,
  scale: 0.764,
  directions: {
    down: { frames: [0, 1], fps: 4.5 },
    up: { frames: [5], fps: 4.5 },
    left: { frames: [2, 7], fps: 4.5 },
    right: { frames: [8], fps: 4.5 },
  },
  idleFrames: { down: 0, up: 5, left: 2, right: 8 },
  body: { width: 55, height: 30, offsetBottom: 4 },

  name: '杨凡',
  /** 嘴的位置（见 SPRITE.mouthRatio） */
  mouthRatio: 0.66,
  /** 入队后的跟随参数：跟在黄姐（distance 78）后面，所以站得更远一点 */
  follow: {
    distance: 150,
    speed: 252,
    catchUpDistance: 300,
    catchUpSpeed: 440,
    crumb: 5,
  },
};

/** 对话头像（由 tools/build_assets.py 从卡通图裁成圆形） */
export const AVATARS = {
  pan: { key: 'avatar-pan', path: 'assets/small/avatar_pan.webp', name: '潘尔赛' },
  huang: { key: 'avatar-huang', path: 'assets/small/avatar_huang.webp', name: '黄姐' },
  yang: { key: 'avatar-yang', path: 'assets/small/avatar_yang.webp', name: '杨凡' },
};

/** 下班对话：说完黄姐入队 */
export const DIALOGUE = [
  { who: 'huang', text: '老公～，我来接你下班了' },
  { who: 'pan', text: '老婆最好了，等会回家我下厨做海鲜大餐' },
  { who: 'huang', text: '潘先生真好' },
];

/** 入队后再搭话 */
export const DIALOGUE_AFTER = [{ who: 'huang', text: '走吧走吧，回家做饭去～' }];

export const TEAM_JOIN_TEXT = '黄姐加入队伍';

/**
 * 银行外面的街道。竖向分层：
 *   0-130 天空 / 130-300 沿街建筑（中间是银行） / 300-430 人行道（可走动）
 *   430-444 路缘 / 444-620 马路 / 620-632 对面路缘 / 632-720 对面人行道（种树、路灯）
 */
export const STREET = {
  skyH: 130,
  buildTop: 130,
  buildBottom: 300,
  walkTop: 300,
  walkBottom: 432,
  curbTop: 430,
  roadTop: 444,
  roadBottom: 620,
  /** 两块路牌（只是画面上的牌子，不挡路） */
  signLeft: { x: 120, y: 404, text: '水星街道' },
  signRight: { x: 1155, y: 404, text: '松鸭湖' },
  /** 路左边的尽头：整条人行道的上下都能触发（判定点在可行走区域的中间高度） */
  leftEnd: { x: 54, y: 364, radius: 150 },
  /** 走过这块路牌的范围就自动想起要去松鸭湖 */
  signPassX: 178,
  /** 路右边的尽头：整条人行道的上下都能按 E 去松鸭湖（判定点取中间高度） */
  rightEnd: { x: 1218, y: 364, radius: 150 },
  /** 走到这个位置就自动切到松鸭湖（每次走到尽头都会触发） */
  rightEndPassX: 1192,
  /** 从松鸭湖回到街道时站的位置：离右侧自动切换点远一点，免得来回弹 */
  fromLakeX: 1048,
  bankDoor: { x: 640, y: 306, radius: 78 },
  /**
   * 往上走到人行道最上面、银行大门正下方，就自动进银行。
   * 人行道最靠上只能走到 y≈335（碰撞体顶到边界），所以阈值给到 344 才够得着。
   */
  bankDoorPass: { x: 640, halfW: 92, y: 344 },
  spawn: { x: 640, y: 372 },
  huangSpawn: { x: 726, y: 412 },
};

/** 走到街道左侧尽头触发 */
export const STREET_DIALOGUE_LEFT = [
  { who: 'pan', text: '差点忘了，我约了杨凡一起吃饭' },
  { who: 'huang', text: '那我们去松鸭湖吧' },
];

/**
 * 松鸭湖：马路右侧尽头「松鸭湖」路牌按 E 进来。
 * 背景图由 tools/build_assets.py 从 松鸭湖背景图.png 处理而来，
 * 网页加载的是 assets/small/lake_bg.webp（有损 webp，1.8MB -> 90KB 左右）：
 * 先抹掉右下角「豆包AI生成」的水印，再缩到 1280x960（正好 1:1 铺满画布宽度）。
 * 多出来的 240 高度把天空往上裁掉，下半部分的水面和湖边路面正好当可行走区。
 * 下面这些坐标都是"游戏画面"坐标，直接用截图调到合适即可。
 */
export const LAKE = {
  bgKey: 'lake-bg',
  bgPath: 'assets/small/lake_bg.webp',
  /**
   * 可行走范围：红色的湖边马路 + 灰褐色路面，整片都能走。
   * 左上角是湖水，岸边的栏杆就是边界——shore 里这些看不见的"台阶"挡板沿着栏杆
   * 那条斜线拦掉水面（每条：y 区间 → 陆地左边界 x，数值是从背景图逐行量出来的）。
   * 右边界留出人物宽度，底边留出对话提示条。
   */
  walk: { left: 0, right: 1250, top: 400, bottom: 692 },
  /** 栏杆（水岸）线：左边全是水，台阶挡板拼出这条斜线 */
  shore: [
    { y0: 400, y1: 420, x: 620 },
    { y0: 420, y1: 440, x: 596 },
    { y0: 440, y1: 460, x: 424 },
    { y0: 460, y1: 480, x: 336 },
    { y0: 480, y1: 500, x: 360 },
    { y0: 500, y1: 520, x: 152 },
    { y0: 520, y1: 540, x: 92 },
    { y0: 560, y1: 580, x: 100 },
    { y0: 600, y1: 620, x: 16 },
  ],
  /** 从街上走过来：人从地图最左边出来（也就是「回银行路口」那儿） */
  spawn: { x: 150, y: 664 },
  /** 黄姐入队后跟着来的位置 */
  huangSpawn: { x: 246, y: 674 },
  /** 杨凡也已经入队时，跟着来的位置 */
  yangSpawn: { x: 320, y: 668 },
  /** 杨凡站在上面靠近湖边栏杆的红马路上等着 */
  yang: { x: 560, y: 466, radius: 122 },
  /** 左边路口：路牌「回银行路口」立在地图最左边，走到尽头就直接切回马路（不用按键） */
  leftEnd: { x: 88, y: 640, label: '回银行路口' },
  /**
   * 走到这个 x 以内就自动回街道。栏杆挡板在 y<530 那几段拦得比较靠右，
   * 所以只有左下角能走到 x<80——出生点（150）不会误触发，想回去得往左顶到最边上。
   */
  leftEndPassX: 80,
  /** 右上角：路牌写「去双季红」，火锅店的门脸在这儿 */
  rightEnd: { x: 1188, y: 452, label: '去双季红' },
  /**
   * 走到右上角这块（x 够右、y 够靠上）就直接进火锅店。
   * 只看 x 不行——那样沿着最下边往右走也会被吸进去。
   */
  rightEndPass: { x: 1150, y: 505 },
  /** 从火锅店出来时站的位置：在触发区下面一点，免得来回弹 */
  fromHotpotSpawn: { x: 1118, y: 574 },
};

/** 在松鸭湖找杨凡说话（说完一起去双季红吃火锅，杨凡入队） */
export const LAKE_DIALOGUE = [
  { who: 'yang', text: '你们可算来了，我在这儿站了好一会儿了' },
  { who: 'pan', text: '路上耽搁了一下，等急了吧' },
  { who: 'huang', text: '杨凡你想吃什么？今天潘先生请客' },
  { who: 'yang', text: '那就去双季红吃火锅吧' },
  { who: 'pan', text: '好啊好啊，出发' },
];

/** 杨凡入队后再搭话 */
export const YANG_DIALOGUE_AFTER = [{ who: 'yang', text: '走啊走啊，双季红等我好久了' }];

export const TEAM_JOIN_YANG_TEXT = '杨凡加入队伍';

/**
 * 双季红火锅店：松鸭湖最右边走过去就是。
 * 进门走到中间那桌按 E 坐下开吃，吃完潘尔赛和黄姐一起吐彩虹，最后潘尔赛喊那句台词。
 */
export const HOTPOT = {
  /** 店面（代码画的，见 src/art/hotpotArt.js） */
  name: '双季红火锅',
  /** 可走动范围：店里地面 */
  walk: { left: 90, right: 1190, top: 372, bottom: 664 },
  /** 从松鸭湖进来：站在左边的门口 */
  spawn: { x: 190, y: 600 },
  huangSpawn: { x: 250, y: 612 },
  yangSpawn: { x: 306, y: 592 },
  /** 左边是门口：走到最左边就回松鸭湖 */
  leftEnd: { x: 150, y: 500, label: '回松鸭湖' },
  leftEndPassX: 114,
  /** 中间那张圆桌：交互点 / 桌子画在人物前面 */
  table: { x: 640, y: 560, radius: 168 },
  /** 桌子在场景里的位置（depth = y，坐下的人正好被桌面挡住下半身） */
  tableDepth: 560,
  /** 三个人坐下的位置：桌子后边一排 */
  seats: {
    huang: { x: 552, y: 402 },
    pan: { x: 640, y: 392 },
    yang: { x: 728, y: 402 },
  },
  /** 坐下之后先吃这么久（毫秒），然后开始吐 */
  eatMs: 2600,
  /** 吃完站起来时站的位置 */
  standUp: {
    pan: { x: 640, y: 632 },
    huang: { x: 536, y: 646 },
    yang: { x: 744, y: 646 },
  },
};

/** 坐下开吃时的一句 */
export const HOTPOT_DIALOGUE = [
  { who: 'pan', text: '开吃开吃，双季红的锅底看着就香' },
];

/** 吃完之后的台词 */
export const HOTPOT_SICK_DIALOGUE = [{ who: 'pan', text: '这是僵尸肉！！！' }];

/**
 * 结尾：吃完火锅回到松鸭湖中央，和杨凡告别（他留在湖边），
 * 然后潘尔赛和黄姐一路走回水星街道，游戏结束。
 */
export const LAKE_FAREWELL = {
  /** 湖心这块圆里触发告别 */
  center: { x: 660, y: 506, radius: 175 },
};

export const LAKE_FAREWELL_DIALOGUE = [
  { who: 'pan', text: '杨凡，我们回水星街道了' },
  { who: 'huang', text: '下次别点僵尸肉了，太吓人了' },
  { who: 'yang', text: '哈哈好，你们路上慢点，我再待会儿' },
];

export const YANG_LEAVE_TEXT = '杨凡离开队伍';

/** 杨凡留在湖边之后，再和他搭话 */
export const YANG_DIALOGUE_LEFT = [{ who: 'yang', text: '路上慢点，我再坐会儿' }];

/** 走到街道左边尽头「水星街道」= 结尾 */
export const FINALE = {
  passX: 140,
  place: '水 星 街 道',
  title: '游戏结束',
  line: '潘尔赛和黄姐沿着水星街道回家了',
  hint: '按 R 重新开始',
};

/** 银行场景配色：暖木 + 大理石 + 黄铜 */
export const PALETTE = {
  wall: '#c9b49a',
  wallShade: '#8a7260',
  wainscot: '#4a3327',
  wainscotLight: '#63452f',
  wood: '#5b3d2b',
  woodDark: '#33200f',
  woodLight: '#7d5a3c',
  brass: '#c9a44c',
  brassLight: '#efdca0',
  marble: '#f2ebdd',
  marbleShade: '#d6c8ae',
  floor: '#e9dfc9',
  floorLine: '#cdbb9d',
  carpet: '#7d2f3a',
  carpetDark: '#5a1f28',
  glass: 'rgba(200, 228, 238, 0.45)',
  plant: '#3f7a4a',
  plantDark: '#27502f',
  pot: '#9a6440',
  sofa: '#4b5a70',
  sofaDark: '#333f52',
  slate: '#3a4653',
  console: '#8fd8e8',
};

export const FONT =
  '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';
