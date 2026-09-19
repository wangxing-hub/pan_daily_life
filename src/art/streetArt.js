/** 街道场景的贴图：全部用 Canvas 代码画，风格和银行保持一致 */

import { GAME_WIDTH, GAME_HEIGHT, STREET, FONT } from '../config.js';
import { seeded, roundRect, radialEllipse, linear, makeTexture } from './canvasKit.js';

const SKY_H = STREET.skyH;
const BUILD_BOTTOM = STREET.buildBottom;
const WALK_BOTTOM = STREET.curbTop;
const ROAD_TOP = STREET.roadTop;
const ROAD_BOTTOM = STREET.roadBottom;
const BANK = { x0: 432, x1: 848, doorX0: 600, doorX1: 680 };

function drawSky(ctx) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, SKY_H, [
    [0, '#7fb0d6'],
    [0.55, '#b6d4e4'],
    [1, '#e2ecec'],
  ]);
  ctx.fillRect(0, 0, GAME_WIDTH, SKY_H);

  // 云
  const rand = seeded(9911);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 5; i++) {
    const cx = 80 + rand() * (GAME_WIDTH - 160);
    const cy = 26 + rand() * 62;
    const s = 0.7 + rand() * 0.7;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 62 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 34 * s, cy + 6 * s, 34 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 38 * s, cy + 4 * s, 40 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 远处屋顶剪影
  ctx.fillStyle = 'rgba(120, 140, 160, 0.55)';
  const rand2 = seeded(4242);
  let x = -20;
  while (x < GAME_WIDTH + 20) {
    const w = 60 + rand2() * 90;
    const h = 26 + rand2() * 44;
    ctx.fillRect(x, SKY_H - h, w, h);
    x += w + 6;
  }
}

function drawShop(ctx, x0, x1, top, bodyColor, roofColor) {
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x0, top, x1 - x0, BUILD_BOTTOM - top);
  // 房檐
  ctx.fillStyle = roofColor;
  ctx.fillRect(x0 - 6, top - 14, x1 - x0 + 12, 18);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(x0 - 6, top + 2, x1 - x0 + 12, 4);

  // 窗户
  const winW = 76;
  const gap = 26;
  for (let wx = x0 + 28; wx + winW < x1 - 20; wx += winW + gap) {
    const wy = top + 46;
    ctx.fillStyle = '#3d5568';
    roundRect(ctx, wx, wy, winW, 68, 5);
    ctx.fill();
    ctx.fillStyle = linear(ctx, wx, wy, wx, wy + 68, [
      [0, 'rgba(210,232,240,0.85)'],
      [1, 'rgba(120,160,180,0.7)'],
    ]);
    roundRect(ctx, wx + 3, wy + 3, winW - 6, 62, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wx + 12, wy + 62);
    ctx.lineTo(wx + 40, wy + 8);
    ctx.stroke();
  }
  // 空调外机
  ctx.fillStyle = '#9aa5ad';
  roundRect(ctx, x1 - 74, top + 24, 52, 34, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(x1 - 48, top + 41, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawBankFacade(ctx) {
  const { x0, x1 } = BANK;
  // 主体
  ctx.fillStyle = linear(ctx, 0, 96, 0, BUILD_BOTTOM, [
    [0, '#efe6d2'],
    [0.6, '#e2d6bd'],
    [1, '#cdbfa4'],
  ]);
  ctx.fillRect(x0, 96, x1 - x0, BUILD_BOTTOM - 96);
  // 屋顶
  ctx.fillStyle = '#c9b79b';
  ctx.fillRect(x0 - 10, 84, x1 - x0 + 20, 26);
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(x0 - 10, 106, x1 - x0 + 20, 5);
  // 三角山花
  ctx.fillStyle = '#e6dac2';
  ctx.beginPath();
  ctx.moveTo(x0 + 20, 84);
  ctx.lineTo((x0 + x1) / 2, 30);
  ctx.lineTo(x1 - 20, 84);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c9a44c';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 柱子
  [x0 + 26, x1 - 60].forEach((px) => {
    ctx.fillStyle = linear(ctx, px, 0, px + 34, 0, [
      [0, '#f3ead8'],
      [0.5, '#ded1b6'],
      [1, '#bfae90'],
    ]);
    ctx.fillRect(px, 130, 34, BUILD_BOTTOM - 130);
    ctx.fillStyle = '#cbb998';
    ctx.fillRect(px - 4, 122, 42, 12);
    ctx.fillRect(px - 4, BUILD_BOTTOM - 12, 42, 12);
  });

  // 招牌带
  ctx.fillStyle = '#2a1d13';
  roundRect(ctx, x0 + 92, 118, x1 - x0 - 184, 56, 8);
  ctx.fill();
  ctx.strokeStyle = '#c9a44c';
  ctx.lineWidth = 3;
  roundRect(ctx, x0 + 98, 124, x1 - x0 - 196, 44, 6);
  ctx.stroke();

  // 玻璃门
  ctx.fillStyle = '#2f4658';
  roundRect(ctx, BANK.doorX0 - 8, 186, BANK.doorX1 - BANK.doorX0 + 16, BUILD_BOTTOM - 186, 6);
  ctx.fill();
  ctx.fillStyle = linear(ctx, 0, 186, 0, BUILD_BOTTOM, [
    [0, 'rgba(206,232,240,0.9)'],
    [1, 'rgba(140,180,196,0.85)'],
  ]);
  roundRect(ctx, BANK.doorX0, 192, BANK.doorX1 - BANK.doorX0, BUILD_BOTTOM - 198, 4);
  ctx.fill();
  ctx.strokeStyle = '#c9a44c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo((BANK.doorX0 + BANK.doorX1) / 2, 192);
  ctx.lineTo((BANK.doorX0 + BANK.doorX1) / 2, BUILD_BOTTOM - 6);
  ctx.stroke();
  ctx.fillStyle = '#c9a44c';
  ctx.fillRect(BANK.doorX0 - 10, BUILD_BOTTOM - 8, BANK.doorX1 - BANK.doorX0 + 20, 8);

  // 台阶
  ctx.fillStyle = '#d8ccb2';
  ctx.fillRect(BANK.doorX0 - 26, BUILD_BOTTOM, BANK.doorX1 - BANK.doorX0 + 52, 10);
  ctx.fillStyle = '#c8bb9e';
  ctx.fillRect(BANK.doorX0 - 14, BUILD_BOTTOM + 10, BANK.doorX1 - BANK.doorX0 + 28, 8);
}

function drawSidewalk(ctx) {
  // 人行道
  ctx.fillStyle = linear(ctx, 0, BUILD_BOTTOM, 0, WALK_BOTTOM, [
    [0, '#d9d4c8'],
    [1, '#c6c1b4'],
  ]);
  ctx.fillRect(0, BUILD_BOTTOM, GAME_WIDTH, WALK_BOTTOM - BUILD_BOTTOM);

  const tile = 62;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#a9a396';
  ctx.lineWidth = 2;
  for (let x = 0; x <= GAME_WIDTH; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, BUILD_BOTTOM);
    ctx.lineTo(x, WALK_BOTTOM);
    ctx.stroke();
  }
  for (let y = BUILD_BOTTOM; y <= WALK_BOTTOM; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();

  // 盲道
  ctx.fillStyle = '#d8b95e';
  ctx.fillRect(0, WALK_BOTTOM - 22, GAME_WIDTH, 16);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#b99a3f';
  for (let x = 6; x < GAME_WIDTH; x += 18) ctx.fillRect(x, WALK_BOTTOM - 20, 8, 12);
  ctx.restore();

  // 路缘石
  ctx.fillStyle = '#efeae0';
  ctx.fillRect(0, WALK_BOTTOM, GAME_WIDTH, 12);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, ROAD_TOP - 4, GAME_WIDTH, 4);
}

function drawRoad(ctx) {
  ctx.fillStyle = linear(ctx, 0, ROAD_TOP, 0, ROAD_BOTTOM, [
    [0, '#4c5058'],
    [0.5, '#43474e'],
    [1, '#383c42'],
  ]);
  ctx.fillRect(0, ROAD_TOP, GAME_WIDTH, ROAD_BOTTOM - ROAD_TOP);

  // 边线
  ctx.fillStyle = 'rgba(240,238,225,0.75)';
  ctx.fillRect(0, ROAD_TOP + 12, GAME_WIDTH, 5);
  ctx.fillRect(0, ROAD_BOTTOM - 18, GAME_WIDTH, 5);

  // 中央虚线
  const midY = (ROAD_TOP + ROAD_BOTTOM) / 2;
  ctx.fillStyle = 'rgba(233,205,120,0.85)';
  for (let x = -20; x < GAME_WIDTH + 40; x += 96) ctx.fillRect(x, midY - 4, 54, 8);

  // 斑马线
  ctx.fillStyle = 'rgba(240,238,225,0.8)';
  for (let x = 150; x < 360; x += 44) {
    ctx.fillRect(x, ROAD_TOP + 24, 26, ROAD_BOTTOM - ROAD_TOP - 48);
  }

  // 井盖
  ctx.fillStyle = '#33373d';
  ctx.beginPath();
  ctx.ellipse(1010, ROAD_BOTTOM - 46, 34, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,180,180,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(1010, ROAD_BOTTOM - 46, 24, 9, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 补丁 / 裂纹
  const rand = seeded(31337);
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#2f3338';
  for (let i = 0; i < 6; i++) {
    const x = rand() * GAME_WIDTH;
    const y = ROAD_TOP + 30 + rand() * (ROAD_BOTTOM - ROAD_TOP - 60);
    ctx.beginPath();
    ctx.ellipse(x, y, 24 + rand() * 40, 8 + rand() * 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawNearSide(ctx) {
  // 对面人行道
  ctx.fillStyle = linear(ctx, 0, ROAD_BOTTOM, 0, GAME_HEIGHT, [
    [0, '#cfcabd'],
    [1, '#b9b4a7'],
  ]);
  ctx.fillRect(0, ROAD_BOTTOM, GAME_WIDTH, GAME_HEIGHT - ROAD_BOTTOM);
  ctx.fillStyle = '#efeae0';
  ctx.fillRect(0, ROAD_BOTTOM, GAME_WIDTH, 10);
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = '#9d988b';
  ctx.lineWidth = 2;
  for (let x = 0; x <= GAME_WIDTH; x += 62) {
    ctx.beginPath();
    ctx.moveTo(x, ROAD_BOTTOM + 10);
    ctx.lineTo(x, GAME_HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  // 远处的树影和栏杆
  ctx.fillStyle = 'rgba(90,110,80,0.35)';
  for (let x = 40; x < GAME_WIDTH; x += 210) {
    ctx.beginPath();
    ctx.ellipse(x, GAME_HEIGHT - 26, 74, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(120,116,104,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, GAME_HEIGHT - 16);
  ctx.lineTo(GAME_WIDTH, GAME_HEIGHT - 16);
  ctx.stroke();
}

function drawBackground(ctx) {
  drawSky(ctx);
  drawShop(ctx, -10, 424, 152, '#e9d9bd', '#c9a17a');
  drawShop(ctx, 856, GAME_WIDTH + 10, 146, '#dfd2c4', '#a98d7a');
  drawBankFacade(ctx);
  drawSidewalk(ctx);
  drawRoad(ctx);
  drawNearSide(ctx);

  // 午后暖光 + 暗角
  radialEllipse(ctx, GAME_WIDTH * 0.32, 250, 520, 300, [
    [0, 'rgba(255, 232, 176, 0.18)'],
    [1, 'rgba(255, 232, 176, 0)'],
  ]);
  radialEllipse(ctx, GAME_WIDTH / 2, GAME_HEIGHT / 2, Math.max(GAME_WIDTH, GAME_HEIGHT) * 0.78, Math.max(GAME_WIDTH, GAME_HEIGHT) * 0.62, [
    [0, 'rgba(0,0,0,0)'],
    [0.72, 'rgba(0,0,0,0)'],
    [1, 'rgba(20, 16, 12, 0.4)'],
  ]);
}

/* ------------------------------------------------------------------ 道具 */

function drawSign(ctx, w, h, text, arrow) {
  // 立杆
  ctx.fillStyle = linear(ctx, w / 2 - 9, 0, w / 2 + 9, 0, [
    [0, '#8d8b86'],
    [0.5, '#c9c7c1'],
    [1, '#7d7b76'],
  ]);
  roundRect(ctx, w / 2 - 9, 60, 18, h - 60, 4);
  ctx.fill();

  // 牌面
  ctx.fillStyle = linear(ctx, 0, 0, 0, 96, [
    [0, '#2f6f4f'],
    [1, '#1f4d37'],
  ]);
  roundRect(ctx, 4, 4, w - 8, 92, 10);
  ctx.fill();
  ctx.strokeStyle = '#e8e3d3';
  ctx.lineWidth = 5;
  roundRect(ctx, 10, 10, w - 20, 80, 8);
  ctx.stroke();

  // 箭头
  ctx.fillStyle = '#e8e3d3';
  const ay = 50;
  ctx.beginPath();
  if (arrow === 'left') {
    ctx.moveTo(26, ay);
    ctx.lineTo(52, ay - 16);
    ctx.lineTo(52, ay - 6);
    ctx.lineTo(74, ay - 6);
    ctx.lineTo(74, ay + 6);
    ctx.lineTo(52, ay + 6);
    ctx.lineTo(52, ay + 16);
  } else {
    ctx.moveTo(w - 26, ay);
    ctx.lineTo(w - 52, ay - 16);
    ctx.lineTo(w - 52, ay - 6);
    ctx.lineTo(w - 74, ay - 6);
    ctx.lineTo(w - 74, ay + 6);
    ctx.lineTo(w - 52, ay + 6);
    ctx.lineTo(w - 52, ay + 16);
  }
  ctx.closePath();
  ctx.fill();

  // 文字
  ctx.fillStyle = '#f6f2e6';
  ctx.font = `bold 30px ${FONT}`;
  ctx.textAlign = arrow === 'left' ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, arrow === 'left' ? w - 26 : 26, ay);
}

function drawTree(ctx, w, h) {
  const rand = seeded(515);
  // 树干
  ctx.fillStyle = linear(ctx, w / 2 - 12, 0, w / 2 + 12, 0, [
    [0, '#6b4a2f'],
    [0.5, '#8f6a45'],
    [1, '#5d3f27'],
  ]);
  roundRect(ctx, w / 2 - 12, h - 84, 24, 84, 6);
  ctx.fill();
  // 树冠
  for (let i = 0; i < 26; i++) {
    const cx = w / 2 + (rand() - 0.5) * (w * 0.78);
    const cy = h - 96 - rand() * (h * 0.45);
    const r = 22 + rand() * 26;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(63,122,74,0.95)' : 'rgba(44,92,56,0.95)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  radialEllipse(ctx, w / 2, h - 4, 44, 12, [
    [0, 'rgba(30, 24, 16, 0.4)'],
    [1, 'rgba(30, 24, 16, 0)'],
  ]);
}

function drawLamp(ctx, w, h) {
  ctx.fillStyle = linear(ctx, w / 2 - 7, 0, w / 2 + 7, 0, [
    [0, '#4a4f56'],
    [0.5, '#8b929b'],
    [1, '#3c4147'],
  ]);
  roundRect(ctx, w / 2 - 7, 26, 14, h - 26, 5);
  ctx.fill();
  ctx.fillStyle = '#3c4147';
  roundRect(ctx, w / 2 - 22, h - 12, 44, 12, 5);
  ctx.fill();
  // 灯头
  ctx.fillStyle = '#2f343a';
  roundRect(ctx, w / 2 - 30, 6, 60, 26, 8);
  ctx.fill();
  radialEllipse(ctx, w / 2, 26, 30, 18, [
    [0, 'rgba(255, 236, 178, 0.95)'],
    [1, 'rgba(255, 236, 178, 0)'],
  ]);
}

function drawBench(ctx, w, h) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, '#a97c4e'],
    [1, '#7a5533'],
  ]);
  roundRect(ctx, 6, 8, w - 12, 20, 6);
  ctx.fill();
  roundRect(ctx, 0, h - 34, w, 18, 6);
  ctx.fill();
  ctx.fillStyle = '#4a4f56';
  ctx.fillRect(14, h - 16, 10, 16);
  ctx.fillRect(w - 24, h - 16, 10, 16);
  radialEllipse(ctx, w / 2, h - 2, w * 0.5, 10, [
    [0, 'rgba(30, 24, 16, 0.4)'],
    [1, 'rgba(30, 24, 16, 0)'],
  ]);
}

function drawHydrant(ctx, w, h) {
  ctx.fillStyle = '#c0392b';
  roundRect(ctx, w / 2 - 14, 16, 28, h - 20, 8);
  ctx.fill();
  roundRect(ctx, w / 2 - 22, 8, 44, 14, 6);
  ctx.fill();
  ctx.fillStyle = '#8e2419';
  ctx.fillRect(w / 2 - 20, 40, 12, 8);
  ctx.fillRect(w / 2 + 8, 40, 12, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(w / 2 - 10, 24, 5, h - 34);
}

function drawCar(ctx, w, h, bodyColor, roofColor) {
  // 车身
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, bodyColor],
    [1, '#1f242a'],
  ]);
  roundRect(ctx, 6, h * 0.42, w - 12, h * 0.42, 14);
  ctx.fill();
  // 车顶
  ctx.fillStyle = roofColor;
  roundRect(ctx, w * 0.26, h * 0.16, w * 0.44, h * 0.34, 12);
  ctx.fill();
  // 车窗
  ctx.fillStyle = 'rgba(190, 224, 235, 0.9)';
  roundRect(ctx, w * 0.29, h * 0.2, w * 0.17, h * 0.24, 6);
  ctx.fill();
  roundRect(ctx, w * 0.5, h * 0.2, w * 0.17, h * 0.24, 6);
  ctx.fill();
  // 灯
  ctx.fillStyle = '#ffe9a8';
  roundRect(ctx, w - 22, h * 0.5, 14, 10, 4);
  ctx.fill();
  ctx.fillStyle = '#ff8a7a';
  roundRect(ctx, 8, h * 0.5, 12, 10, 4);
  ctx.fill();
  // 轮子
  ctx.fillStyle = '#20242a';
  [w * 0.28, w * 0.74].forEach((cx) => {
    ctx.beginPath();
    ctx.arc(cx, h * 0.84, h * 0.16, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#9aa0a8';
  [w * 0.28, w * 0.74].forEach((cx) => {
    ctx.beginPath();
    ctx.arc(cx, h * 0.84, h * 0.07, 0, Math.PI * 2);
    ctx.fill();
  });
  radialEllipse(ctx, w / 2, h - 3, w * 0.48, 9, [
    [0, 'rgba(0,0,0,0.45)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
}

export const STREET_PROPS = {
  tree: { key: 'street-tree', w: 200, h: 240, draw: drawTree },
  lamp: { key: 'street-lamp', w: 80, h: 200, draw: drawLamp },
  bench: { key: 'street-bench', w: 150, h: 76, draw: drawBench },
  hydrant: { key: 'street-hydrant', w: 52, h: 76, draw: drawHydrant },
  carA: {
    key: 'street-car-a',
    w: 210,
    h: 96,
    draw: (ctx, w, h) => drawCar(ctx, w, h, '#c0533f', '#e07a5f'),
  },
  carB: {
    key: 'street-car-b',
    w: 210,
    h: 96,
    draw: (ctx, w, h) => drawCar(ctx, w, h, '#2f6f9b', '#5aa0c8'),
  },
};

export function createStreetArt(scene) {
  makeTexture(scene, 'street-bg', GAME_WIDTH, GAME_HEIGHT, drawBackground);
  makeTexture(scene, 'street-sign-left', 250, 210, (ctx, w, h) =>
    drawSign(ctx, w, h, STREET.signLeft.text, 'left')
  );
  makeTexture(scene, 'street-sign-right', 250, 210, (ctx, w, h) =>
    drawSign(ctx, w, h, STREET.signRight.text, 'right')
  );
  Object.values(STREET_PROPS).forEach(({ key, w, h, draw }) =>
    makeTexture(scene, key, w, h, draw)
  );
  return STREET_PROPS;
}
