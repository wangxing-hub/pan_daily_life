/** 双季红火锅店的贴图：和银行、街道一样全部用 Canvas 代码画 */

import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../config.js';
import { seeded, roundRect, radialEllipse, linear, makeTexture } from './canvasKit.js';

/** 墙脚线（下面是地板，上面是墙） */
const FLOOR_Y = 336;

const C = {
  wall: '#7c3b2f',
  wallDark: '#5c2a22',
  wallLight: '#9c4f3c',
  wainscot: '#3d2116',
  wainscotLight: '#57301f',
  wood: '#6d4126',
  woodDark: '#3f2413',
  woodLight: '#8f5a34',
  floor: '#8a5733',
  floorDark: '#6f4426',
  floorLine: '#5d381f',
  brass: '#d9a94c',
  brassLight: '#f2dda4',
  lantern: '#c8362c',
  lanternLight: '#e8564a',
  cloth: '#b03030',
  clothDark: '#7d1f1f',
  steel: '#b9c1c9',
  steelDark: '#6f7a84',
  soup: '#c0392b',
  soupLight: '#e0574a',
  soupWhite: '#e8dfc8',
  leaf: '#3f7a4a',
};

/* ------------------------------------------------------------------ 背景 */

function drawWall(ctx) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, FLOOR_Y, [
    [0, C.wallDark],
    [0.45, C.wall],
    [1, C.wallLight],
  ]);
  ctx.fillRect(0, 0, GAME_WIDTH, FLOOR_Y);

  // 竖向木格子护墙板
  const rand = seeded(20240);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#2a150d';
  ctx.lineWidth = 3;
  for (let x = 0; x <= GAME_WIDTH; x += 74) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FLOOR_Y);
    ctx.stroke();
  }
  ctx.restore();

  // 墙上暖光
  radialEllipse(ctx, GAME_WIDTH / 2, 150, 620, 260, [
    [0, 'rgba(255, 214, 150, 0.22)'],
    [1, 'rgba(255, 214, 150, 0)'],
  ]);
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 340 + rand() * 40;
    radialEllipse(ctx, x, 210, 180, 130, [
      [0, 'rgba(255, 196, 120, 0.14)'],
      [1, 'rgba(255, 196, 120, 0)'],
    ]);
  }

  // 墙裙
  ctx.fillStyle = C.wainscot;
  ctx.fillRect(0, FLOOR_Y - 46, GAME_WIDTH, 46);
  ctx.fillStyle = C.wainscotLight;
  ctx.fillRect(0, FLOOR_Y - 46, GAME_WIDTH, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(0, FLOOR_Y - 6, GAME_WIDTH, 6);
}

function drawFloor(ctx) {
  ctx.fillStyle = linear(ctx, 0, FLOOR_Y, 0, GAME_HEIGHT, [
    [0, C.floorDark],
    [0.35, C.floor],
    [1, C.floorDark],
  ]);
  ctx.fillRect(0, FLOOR_Y, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y);

  // 地板缝：越靠下越疏，假装透视
  ctx.strokeStyle = C.floorLine;
  ctx.lineWidth = 3;
  let y = FLOOR_Y + 26;
  let gap = 26;
  while (y < GAME_HEIGHT) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_WIDTH, y);
    ctx.stroke();
    gap *= 1.16;
    y += gap;
  }
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 2;
  for (let x = -200; x < GAME_WIDTH + 400; x += 150) {
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2 + (x - GAME_WIDTH / 2) * 0.5, FLOOR_Y);
    ctx.lineTo(x, GAME_HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  // 地面反光
  radialEllipse(ctx, GAME_WIDTH / 2, 470, 520, 200, [
    [0, 'rgba(255, 210, 150, 0.10)'],
    [1, 'rgba(255, 210, 150, 0)'],
  ]);
}

function drawSignboard(ctx) {
  const w = 460;
  const h = 118;
  const x = GAME_WIDTH / 2 - w / 2;
  const y = 34;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, x + 8, y + 10, w, h, 16);
  ctx.fill();

  ctx.fillStyle = linear(ctx, x, y, x, y + h, [
    [0, '#3a1c12'],
    [1, '#24100a'],
  ]);
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = C.brass;
  ctx.lineWidth = 5;
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 12);
  ctx.stroke();

  ctx.fillStyle = C.brass;
  ctx.font = `bold 58px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('双季红火锅', GAME_WIDTH / 2, y + h / 2 - 6);
  ctx.fillStyle = 'rgba(217, 169, 76, 0.75)';
  ctx.font = `14px ${FONT}`;
  ctx.fillText('S H U A N G   J I   H O N G', GAME_WIDTH / 2, y + h - 24);
}

function drawLanterns(ctx) {
  [148, 332, 948, 1132].forEach((x, i) => {
    const top = 12 + (i % 2) * 26;
    // 挂绳
    ctx.strokeStyle = '#2b1a10';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, top + 14);
    ctx.stroke();
    // 灯身
    const r = 42;
    ctx.fillStyle = linear(ctx, x - r, 0, x + r, 0, [
      [0, C.clothDark],
      [0.45, C.lanternLight],
      [1, C.lantern],
    ]);
    ctx.beginPath();
    ctx.ellipse(x, top + 58, r, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    // 上下箍
    ctx.fillStyle = C.brass;
    roundRect(ctx, x - 20, top + 8, 40, 12, 4);
    ctx.fill();
    roundRect(ctx, x - 20, top + 98, 40, 12, 4);
    ctx.fill();
    // 金黄竖纹
    ctx.strokeStyle = 'rgba(255, 214, 130, 0.55)';
    ctx.lineWidth = 3;
    [-22, 0, 22].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(x + dx, top + 20);
      ctx.ellipse(x, top + 58, Math.abs(dx) + 4, 44, 0, -Math.PI / 2, Math.PI / 2, dx < 0);
      ctx.stroke();
    });
    // 穗子
    ctx.strokeStyle = C.brass;
    ctx.lineWidth = 4;
    [-10, 0, 10].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(x + dx, top + 108);
      ctx.lineTo(x + dx * 1.4, top + 140);
      ctx.stroke();
    });
  });
}

function drawMenu(ctx) {
  const x = 1010;
  const y = 150;
  const w = 214;
  const h = 150;
  ctx.fillStyle = '#2a150d';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = C.brass;
  ctx.lineWidth = 3;
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 8);
  ctx.stroke();

  ctx.fillStyle = C.brassLight;
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('锅 底', x + 18, y + 18);

  ctx.fillStyle = 'rgba(244, 234, 214, 0.85)';
  ctx.font = `15px ${FONT}`;
  ['鸳鸯锅  ¥38', '牛油辣锅  ¥42', '菌汤锅  ¥36', '番茄锅  ¥36'].forEach((line, i) => {
    ctx.fillText(line, x + 18, y + 50 + i * 24);
  });
}

/* ------------------------------------------------------------------ 道具 */

function drawRoundTable(ctx, w, h) {
  const cx = w / 2;
  const topY = h * 0.5;
  const rx = w * 0.44;
  const ry = h * 0.16;

  // 桌腿 / 底座
  ctx.fillStyle = linear(ctx, cx - 26, 0, cx + 26, 0, [
    [0, C.woodDark],
    [0.5, C.wood],
    [1, C.woodDark],
  ]);
  roundRect(ctx, cx - 24, topY + ry - 14, 48, h - topY - ry + 10, 10);
  ctx.fill();
  ctx.fillStyle = C.woodDark;
  ctx.beginPath();
  ctx.ellipse(cx, h - 12, 74, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.wood;
  ctx.beginPath();
  ctx.ellipse(cx, h - 16, 66, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // 桌面侧沿
  ctx.fillStyle = C.woodDark;
  ctx.beginPath();
  ctx.ellipse(cx, topY + 14, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - rx, topY, rx * 2, 14);

  // 桌面
  ctx.fillStyle = linear(ctx, 0, topY - ry, 0, topY + ry, [
    [0, C.woodLight],
    [1, C.wood],
  ]);
  ctx.beginPath();
  ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40, 20, 10, 0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 铜色嵌圈
  ctx.strokeStyle = C.brass;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(cx, topY, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 鸳鸯锅：外圈钢锅
  const prx = rx * 0.46;
  const pry = ry * 0.62;
  ctx.fillStyle = C.steelDark;
  ctx.beginPath();
  ctx.ellipse(cx, topY + 8, prx, pry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.steel;
  ctx.beginPath();
  ctx.ellipse(cx, topY - 2, prx, pry, 0, 0, Math.PI * 2);
  ctx.fill();
  // 汤底：左白汤右红汤
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, topY - 2, prx - 6, pry - 4, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = C.soupWhite;
  ctx.fillRect(cx - prx, topY - pry - 6, prx, pry * 2 + 12);
  ctx.fillStyle = linear(ctx, cx, topY - pry, cx, topY + pry, [
    [0, C.soupLight],
    [1, C.soup],
  ]);
  ctx.fillRect(cx, topY - pry - 6, prx, pry * 2 + 12);
  // 辣油上的辣椒
  const rand = seeded(77);
  for (let i = 0; i < 9; i++) {
    const x = cx + 6 + rand() * (prx - 16);
    const y = topY - pry * 0.7 + rand() * (pry * 1.4);
    ctx.fillStyle = i % 3 === 0 ? '#6b8f3a' : '#8e1f14';
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 3.2, rand(), 0, Math.PI * 2);
    ctx.fill();
  }
  // 白汤里的菌菇
  for (let i = 0; i < 6; i++) {
    const x = cx - prx + 12 + rand() * (prx - 22);
    const y = topY - pry * 0.6 + rand() * (pry * 1.2);
    ctx.fillStyle = '#c9a37a';
    ctx.beginPath();
    ctx.ellipse(x, y, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // 中间的 S 形隔片
  ctx.strokeStyle = C.steel;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx, topY - pry + 2);
  ctx.quadraticCurveTo(cx - prx * 0.5, topY, cx, topY + pry - 2);
  ctx.quadraticCurveTo(cx + prx * 0.5, topY, cx, topY - pry + 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, topY - 2, prx - 6, pry - 4, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 桌上一角：碗筷、漏勺
  ctx.fillStyle = '#f4ead8';
  [[-1, -0.72], [1, 0.78]].forEach(([sx, sy]) => {
    const bx = cx + sx * rx * 0.68;
    const by = topY + sy * ry * 0.62;
    ctx.beginPath();
    ctx.ellipse(bx, by, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f6f9b';
    ctx.beginPath();
    ctx.ellipse(bx, by - 2, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4ead8';
  });
  // 漏勺
  ctx.strokeStyle = C.steel;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx + rx * 0.86, topY + ry * 0.2);
  ctx.lineTo(cx + rx * 0.52, topY - ry * 0.1);
  ctx.stroke();
  ctx.fillStyle = C.steelDark;
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.5, topY - ry * 0.14, 16, 10, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawSmallTable(ctx, w, h) {
  const cx = w / 2;
  const topY = h * 0.42;
  const rx = w * 0.46;
  const ry = h * 0.16;
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(cx - 10, topY, 20, h - topY - 10);
  ctx.fillStyle = C.woodDark;
  ctx.beginPath();
  ctx.ellipse(cx, h - 8, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.woodDark;
  ctx.beginPath();
  ctx.ellipse(cx, topY + 12, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = linear(ctx, 0, topY - ry, 0, topY + ry, [
    [0, C.woodLight],
    [1, C.wood],
  ]);
  ctx.beginPath();
  ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // 桌上放个小锅
  ctx.fillStyle = C.steelDark;
  ctx.beginPath();
  ctx.ellipse(cx, topY + 4, rx * 0.42, ry * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.steel;
  ctx.beginPath();
  ctx.ellipse(cx, topY - 2, rx * 0.42, ry * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.soup;
  ctx.beginPath();
  ctx.ellipse(cx, topY - 3, rx * 0.34, ry * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawChair(ctx, w, h) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, C.cloth],
    [1, C.clothDark],
  ]);
  // 靠背
  roundRect(ctx, w * 0.14, 0, w * 0.72, h * 0.52, 8);
  ctx.fill();
  // 坐垫
  roundRect(ctx, w * 0.06, h * 0.5, w * 0.88, h * 0.2, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(ctx, w * 0.06, h * 0.64, w * 0.88, 6, 3);
  ctx.fill();
  // 腿
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(w * 0.14, h * 0.7, 9, h * 0.3);
  ctx.fillRect(w * 0.78, h * 0.7, 9, h * 0.3);
}

function drawLantern(ctx, w, h) {
  const cx = w / 2;
  ctx.strokeStyle = '#2b1a10';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, 14);
  ctx.stroke();
  ctx.fillStyle = linear(ctx, 0, 0, w, 0, [
    [0, C.clothDark],
    [0.45, C.lanternLight],
    [1, C.lantern],
  ]);
  ctx.beginPath();
  ctx.ellipse(cx, h * 0.5, w * 0.46, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.brass;
  roundRect(ctx, cx - w * 0.22, h * 0.06, w * 0.44, 10, 3);
  ctx.fill();
  roundRect(ctx, cx - w * 0.22, h * 0.86, w * 0.44, 10, 3);
  ctx.fill();
  ctx.strokeStyle = C.brass;
  ctx.lineWidth = 4;
  [-6, 0, 6].forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(cx + dx, h * 0.94);
    ctx.lineTo(cx + dx * 1.6, h);
    ctx.stroke();
  });
}

function drawPlant(ctx, w, h) {
  const rand = seeded(9182);
  // 花盆
  ctx.fillStyle = linear(ctx, w * 0.2, 0, w * 0.8, 0, [
    [0, '#7d4a2a'],
    [1, '#5a3319'],
  ]);
  ctx.beginPath();
  ctx.moveTo(w * 0.24, h * 0.7);
  ctx.lineTo(w * 0.76, h * 0.7);
  ctx.lineTo(w * 0.68, h);
  ctx.lineTo(w * 0.32, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(ctx, w * 0.22, h * 0.68, w * 0.56, 8, 4);
  ctx.fill();
  // 叶子
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI / 2 + (rand() - 0.5) * 2.4;
    const len = h * (0.3 + rand() * 0.36);
    const x0 = w * 0.5;
    const y0 = h * 0.7;
    ctx.fillStyle = rand() > 0.5 ? C.leaf : '#2f5b38';
    ctx.beginPath();
    ctx.ellipse(x0 + Math.cos(a) * len * 0.5, y0 + Math.sin(a) * len * 0.5, len * 0.32, len * 0.13, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCounter(ctx, w, h) {
  // 柜体
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, C.wood],
    [1, C.woodDark],
  ]);
  roundRect(ctx, 0, h * 0.16, w, h * 0.84, 8);
  ctx.fill();
  // 台面
  ctx.fillStyle = linear(ctx, 0, 0, 0, h * 0.2, [
    [0, '#cbb998'],
    [1, '#a08e6e'],
  ]);
  roundRect(ctx, -6, h * 0.1, w + 12, h * 0.12, 6);
  ctx.fill();
  // 饮料柜：玻璃门 + 瓶子
  ctx.fillStyle = '#22343d';
  roundRect(ctx, w * 0.12, h * 0.24, w * 0.76, h * 0.56, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(178, 222, 236, 0.5)';
  roundRect(ctx, w * 0.16, h * 0.28, w * 0.68, h * 0.48, 4);
  ctx.fill();
  const rand = seeded(4242);
  for (let i = 0; i < 9; i++) {
    const bx = w * 0.2 + (i % 5) * w * 0.14;
    const by = h * 0.42 + Math.floor(i / 5) * h * 0.18;
    ctx.fillStyle = ['#b03030', '#2f6f9b', '#c9a44c'][i % 3];
    roundRect(ctx, bx, by, w * 0.1, h * 0.2, 4);
    ctx.fill();
  }
}

export const HOTPOT_PROPS = {
  table: { key: 'hotpot-table', w: 360, h: 300, draw: drawRoundTable },
  smallTable: { key: 'hotpot-table-small', w: 210, h: 170, draw: drawSmallTable },
  chair: { key: 'hotpot-chair', w: 96, h: 118, draw: drawChair },
  lantern: { key: 'hotpot-lantern', w: 96, h: 132, draw: drawLantern },
  plant: { key: 'hotpot-plant', w: 130, h: 160, draw: drawPlant },
  counter: { key: 'hotpot-counter', w: 330, h: 230, draw: drawCounter },
};

function drawBackground(ctx) {
  drawWall(ctx);
  drawFloor(ctx);
  drawSignboard(ctx);
  drawLanterns(ctx);
  drawMenu(ctx);

  // 中间那桌后面的卡座靠背
  ctx.fillStyle = linear(ctx, 470, 0, 810, 0, [
    [0, C.clothDark],
    [0.5, C.cloth],
    [1, C.clothDark],
  ]);
  roundRect(ctx, 486, 288, 308, 150, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 220, 180, 0.25)';
  ctx.lineWidth = 3;
  roundRect(ctx, 494, 296, 292, 134, 14);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 4;
  [0.25, 0.5, 0.75].forEach((t) => {
    ctx.beginPath();
    ctx.moveTo(486 + 308 * t, 296);
    ctx.lineTo(486 + 308 * t, 430);
    ctx.stroke();
  });

  // 暗角，让人物更跳
  radialEllipse(ctx, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 0.78, GAME_HEIGHT * 0.66, [
    [0, 'rgba(0,0,0,0)'],
    [0.66, 'rgba(0,0,0,0)'],
    [1, 'rgba(28, 12, 6, 0.5)'],
  ]);
}

export function createHotpotArt(scene) {
  makeTexture(scene, 'hotpot-bg', GAME_WIDTH, GAME_HEIGHT, drawBackground);
  Object.values(HOTPOT_PROPS).forEach(({ key, w, h, draw }) => makeTexture(scene, key, w, h, draw));
  return HOTPOT_PROPS;
}
