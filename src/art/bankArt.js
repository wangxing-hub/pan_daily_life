/**
 * 用 Canvas 2D 直接画出银行大厅的贴图（不依赖外部美术资源）。
 * 好处：分辨率无损、配色统一、随时可调，文件体积几乎为 0。
 */

import { GAME_WIDTH, GAME_HEIGHT, WALL_H, PALETTE as P } from '../config.js';
import { seeded, roundRect, radialEllipse, linear, makeTexture, createSoftShadow } from './canvasKit.js';

/* ------------------------------------------------------------------ 背景大厅 */

function drawBackground(ctx, W, H) {
  const rand = seeded(20240919);

  // 地面：暖色大理石
  ctx.fillStyle = linear(ctx, 0, WALL_H, 0, H, [
    [0, '#f6eeda'],
    [0.35, P.floor],
    [1, '#ded0b4'],
  ]);
  ctx.fillRect(0, WALL_H, W, H - WALL_H);

  // 石材斜纹
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, WALL_H, W, H - WALL_H);
  ctx.clip();
  ctx.globalAlpha = 0.07;
  ctx.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    const x = -200 + rand() * (W + 400);
    const y = WALL_H + rand() * (H - WALL_H);
    ctx.strokeStyle = rand() > 0.5 ? '#8d7a5f' : '#ffffff';
    ctx.lineWidth = 1 + rand() * 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 90, y - 30 - rand() * 40, x + 190, y + 30 + rand() * 40, x + 320, y - 10);
    ctx.stroke();
  }
  ctx.restore();

  // 地砖缝
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = P.floorLine;
  ctx.lineWidth = 2;
  const tile = 96;
  for (let x = 0; x <= W; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, WALL_H);
    ctx.lineTo(x + 0.5, H);
    ctx.stroke();
  }
  for (let y = WALL_H; y <= H; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();

  // 顶灯光斑
  [
    [240, 300, 260, 210],
    [640, 250, 300, 240],
    [1040, 300, 260, 210],
    [640, 620, 380, 260],
  ].forEach(([cx, cy, rx, ry]) => {
    radialEllipse(ctx, cx, cy, rx, ry, [
      [0, 'rgba(255, 241, 205, 0.22)'],
      [1, 'rgba(255, 241, 205, 0)'],
    ]);
  });

  // 进门处的地面光
  radialEllipse(ctx, W / 2, H - 40, 300, 210, [
    [0, 'rgba(255, 236, 190, 0.26)'],
    [1, 'rgba(255, 236, 190, 0)'],
  ]);

  // 中央红地毯（通往柜台）
  const rugX = 470;
  const rugW = 340;
  ctx.fillStyle = linear(ctx, rugX, 0, rugX + rugW, 0, [
    [0, P.carpetDark],
    [0.5, P.carpet],
    [1, P.carpetDark],
  ]);
  ctx.fillRect(rugX, WALL_H + 12, rugW, H - WALL_H - 12);
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = P.brass;
  ctx.lineWidth = 3;
  ctx.strokeRect(rugX + 14, WALL_H + 26, rugW - 28, H - WALL_H - 46);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let y = WALL_H + 40; y < H; y += 46) {
    ctx.beginPath();
    ctx.moveTo(rugX + 26, y);
    ctx.lineTo(rugX + rugW / 2, y + 16);
    ctx.lineTo(rugX + rugW - 26, y);
    ctx.stroke();
  }
  ctx.restore();

  // 自动门（画面底部，纯装饰）
  const doorX = 512;
  const doorW = 256;
  const doorTop = H - 62;
  ctx.fillStyle = 'rgba(214, 238, 244, 0.35)';
  ctx.fillRect(doorX, doorTop, doorW, H - doorTop);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(doorX + 20, H);
  ctx.lineTo(doorX + 96, doorTop);
  ctx.lineTo(doorX + 140, doorTop);
  ctx.lineTo(doorX + 64, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = P.brass;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(doorX, doorTop);
  ctx.lineTo(doorX + doorW, doorTop);
  ctx.stroke();
  [doorX, doorX + doorW / 2, doorX + doorW].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, doorTop);
    ctx.lineTo(x, H);
    ctx.stroke();
  });

  // 后墙
  ctx.fillStyle = linear(ctx, 0, 0, 0, WALL_H, [
    [0, '#7d6553'],
    [0.45, P.wall],
    [1, '#d9c6ab'],
  ]);
  ctx.fillRect(0, 0, W, WALL_H);

  // 墙面分格线
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#5a4536';
  ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, 26);
    ctx.lineTo(x, 118);
    ctx.stroke();
  }
  ctx.restore();

  // 黄铜装饰线
  ctx.fillStyle = linear(ctx, 0, 116, 0, 126, [
    [0, P.brassLight],
    [0.5, P.brass],
    [1, '#8c6d29'],
  ]);
  ctx.fillRect(0, 116, W, 8);

  // 墙裙
  ctx.fillStyle = linear(ctx, 0, 124, 0, WALL_H, [
    [0, P.wainscotLight],
    [0.4, P.wainscot],
    [1, '#362315'],
  ]);
  ctx.fillRect(0, 124, W, WALL_H - 124);
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#c8a996';
  ctx.lineWidth = 2;
  for (let x = 12; x < W - 12; x += 132) {
    roundRect(ctx, x, 134, 108, WALL_H - 148, 4);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 233, 180, 0.5)';
  ctx.fillRect(0, WALL_H - 6, W, 6);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.fillRect(0, WALL_H, W, 10);

  // 墙上挂画
  [
    [170, 44, 132, 62],
    [1110, 44, 132, 62],
  ].forEach(([x, y, w, h]) => {
    ctx.fillStyle = P.brass;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#2f3f4d';
    ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#6d8ea3';
    ctx.beginPath();
    ctx.moveTo(x + 12, y + h - 12);
    ctx.lineTo(x + w * 0.42, y + 16);
    ctx.lineTo(x + w * 0.66, y + h - 12);
    ctx.closePath();
    ctx.fill();
    radialEllipse(ctx, x + w * 0.72, y + 20, 16, 16, [
      [0, 'rgba(255, 226, 168, 0.9)'],
      [1, 'rgba(255, 226, 168, 0)'],
    ]);
    ctx.restore();
  });

  // 时钟
  const clockX = 900;
  const clockY = 66;
  ctx.fillStyle = P.brass;
  ctx.beginPath();
  ctx.arc(clockX, clockY, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fdf7e6';
  ctx.beginPath();
  ctx.arc(clockX, clockY, 27, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a2b1c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(clockX, clockY);
  ctx.lineTo(clockX + 12, clockY - 5);
  ctx.moveTo(clockX, clockY);
  ctx.lineTo(clockX - 3, clockY - 16);
  ctx.stroke();

  // 招牌底板
  const plateW = 460;
  const plateH = 104;
  const plateX = W / 2 - plateW / 2;
  const plateY = 18;
  ctx.fillStyle = linear(ctx, plateX, plateY, plateX, plateY + plateH, [
    [0, '#2a1d13'],
    [0.5, '#3f2c1c'],
    [1, '#241812'],
  ]);
  roundRect(ctx, plateX, plateY, plateW, plateH, 12);
  ctx.fill();
  ctx.strokeStyle = linear(ctx, plateX, plateY, plateX + plateW, plateY + plateH, [
    [0, '#8c6d29'],
    [0.5, P.brassLight],
    [1, '#8c6d29'],
  ]);
  ctx.lineWidth = 4;
  roundRect(ctx, plateX + 6, plateY + 6, plateW - 12, plateH - 12, 9);
  ctx.stroke();

  // 整体暗角
  radialEllipse(ctx, W / 2, H / 2, Math.max(W, H) * 0.78, Math.max(W, H) * 0.62, [
    [0, 'rgba(0,0,0,0)'],
    [0.72, 'rgba(0,0,0,0)'],
    [1, 'rgba(30, 18, 12, 0.42)'],
  ]);
}

/* ------------------------------------------------------------------ 道具 */

function drawCounter(ctx, w, h) {
  // 玻璃隔断
  ctx.fillStyle = P.glass;
  roundRect(ctx, 4, 4, w - 8, 42, 6);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  for (let x = 18; x < w - 20; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 46);
    ctx.lineTo(x + 16, 4);
    ctx.lineTo(x + 30, 4);
    ctx.lineTo(x + 14, 46);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = P.brass;
  ctx.lineWidth = 5;
  roundRect(ctx, 4, 4, w - 8, 42, 6);
  ctx.stroke();

  // 台面
  ctx.fillStyle = linear(ctx, 0, 46, 0, 82, [
    [0, P.woodLight],
    [0.35, P.wood],
    [1, P.woodDark],
  ]);
  roundRect(ctx, 0, 46, w, 38, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 236, 190, 0.35)';
  ctx.fillRect(4, 48, w - 8, 3);

  // 前脸
  ctx.fillStyle = linear(ctx, 0, 80, 0, h, [
    [0, P.marble],
    [0.7, P.marbleShade],
    [1, '#c3b394'],
  ]);
  roundRect(ctx, 6, 80, w - 12, h - 84, 6);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = P.brass;
  ctx.lineWidth = 3;
  roundRect(ctx, 22, 92, w - 44, h - 116, 4);
  ctx.stroke();
  ctx.restore();

  // 铜踢脚
  ctx.fillStyle = linear(ctx, 0, h - 18, 0, h - 4, [
    [0, P.brassLight],
    [1, '#96762c'],
  ]);
  roundRect(ctx, 10, h - 18, w - 20, 14, 3);
  ctx.fill();

  // 底部阴影
  radialEllipse(ctx, w / 2, h - 2, w * 0.55, 12, [
    [0, 'rgba(60, 40, 25, 0.4)'],
    [1, 'rgba(60, 40, 25, 0)'],
  ]);
}

function drawAtm(ctx, w, h) {
  ctx.fillStyle = linear(ctx, 0, 0, w, h, [
    [0, '#546274'],
    [0.5, P.slate],
    [1, '#28313c'],
  ]);
  roundRect(ctx, 2, 2, w - 4, h - 4, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  roundRect(ctx, 6, 6, w - 12, h - 12, 8);
  ctx.stroke();

  // 品牌条
  ctx.fillStyle = P.brass;
  roundRect(ctx, 12, 14, w - 24, 20, 5);
  ctx.fill();

  // 屏幕
  ctx.fillStyle = linear(ctx, 0, 44, 0, 108, [
    [0, '#cdf3ff'],
    [1, '#5fb4cf'],
  ]);
  roundRect(ctx, 14, 44, w - 28, 64, 6);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = '#1e5b73';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(24, 58 + i * 12);
    ctx.lineTo(w - 24 - (i % 2) * 22, 58 + i * 12);
    ctx.stroke();
  }
  ctx.restore();

  // 键盘
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  roundRect(ctx, 16, 118, w - 32, 44, 6);
  ctx.fill();
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = 'rgba(240, 226, 196, 0.75)';
      roundRect(ctx, 24 + c * 24, 124 + r * 13, 18, 9, 2);
      ctx.fill();
    }
  }

  // 出钞口
  ctx.fillStyle = '#161c23';
  roundRect(ctx, 16, h - 32, w - 32, 14, 4);
  ctx.fill();
  ctx.fillStyle = P.brass;
  ctx.fillRect(20, h - 16, w - 40, 5);
}

function drawTicketMachine(ctx, w, h) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, '#f4efe2'],
    [0.6, '#ddd2bd'],
    [1, '#beb098'],
  ]);
  roundRect(ctx, 4, 4, w - 8, h - 4, 8);
  ctx.fill();

  ctx.fillStyle = '#2f7fb5';
  roundRect(ctx, 4, 4, w - 8, 26, 8);
  ctx.fill();
  ctx.fillStyle = '#8fd8e8';
  roundRect(ctx, 12, 38, w - 24, 34, 5);
  ctx.fill();

  ctx.fillStyle = '#1d5091';
  roundRect(ctx, 14, 80, w - 28, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#c9a44c';
  ctx.fillRect(14, 100, w - 28, 8);
  ctx.fillStyle = '#2b2b2b';
  roundRect(ctx, 18, h - 24, w - 36, 12, 3);
  ctx.fill();
}

function drawSofa(ctx, w, h) {
  // 靠背
  ctx.fillStyle = linear(ctx, 0, 0, 0, h * 0.6, [
    [0, '#61728c'],
    [1, P.sofa],
  ]);
  roundRect(ctx, 0, 0, w, h * 0.62, 14);
  ctx.fill();
  // 坐垫
  ctx.fillStyle = linear(ctx, 0, h * 0.4, 0, h, [
    [0, '#5b6b85'],
    [1, P.sofaDark],
  ]);
  roundRect(ctx, 6, h * 0.42, w - 12, h * 0.5, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.46);
  ctx.lineTo(w / 2, h * 0.88);
  ctx.stroke();
  // 扶手
  [4, w - 26].forEach((x) => {
    ctx.fillStyle = linear(ctx, 0, h * 0.3, 0, h, [
      [0, '#6a7b95'],
      [1, '#37435a'],
    ]);
    roundRect(ctx, x, h * 0.3, 22, h * 0.66, 9);
    ctx.fill();
  });
  // 铜脚
  ctx.fillStyle = P.brass;
  [18, w - 30].forEach((x) => ctx.fillRect(x, h - 6, 12, 6));
  radialEllipse(ctx, w / 2, h - 2, w * 0.5, 10, [
    [0, 'rgba(50, 35, 20, 0.4)'],
    [1, 'rgba(50, 35, 20, 0)'],
  ]);
}

function drawTable(ctx, w, h) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [
    [0, '#8a6242'],
    [1, '#4a3020'],
  ]);
  roundRect(ctx, 2, 8, w - 4, h - 26, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 236, 190, 0.28)';
  roundRect(ctx, 10, 14, w - 20, 10, 5);
  ctx.fill();
  // 杂志
  ctx.fillStyle = '#f6f1e2';
  roundRect(ctx, w * 0.24, 26, w * 0.44, 24, 3);
  ctx.fill();
  ctx.fillStyle = '#c8452f';
  ctx.fillRect(w * 0.24, 26, w * 0.44, 6);
  ctx.fillStyle = P.brass;
  [14, w - 26].forEach((x) => ctx.fillRect(x, h - 16, 12, 16));
  radialEllipse(ctx, w / 2, h - 2, w * 0.5, 10, [
    [0, 'rgba(50, 35, 20, 0.38)'],
    [1, 'rgba(50, 35, 20, 0)'],
  ]);
}

function drawPlant(ctx, w, h) {
  const cx = w / 2;
  const rand = seeded(77);
  // 叶子
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (i - 7.5) * 0.19 + (rand() - 0.5) * 0.1;
    const len = 46 + rand() * 52;
    const ex = cx + Math.cos(a) * len;
    const ey = h - 52 + Math.sin(a) * len;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = rand() > 0.45 ? P.plant : P.plantDark;
    ctx.beginPath();
    ctx.ellipse((cx + ex) / 2, (h - 52 + ey) / 2, len * 0.34, len * 0.17, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 花盆
  ctx.fillStyle = linear(ctx, 0, h - 52, 0, h, [
    [0, '#b9794e'],
    [1, P.pot],
  ]);
  ctx.beginPath();
  ctx.moveTo(cx - 30, h - 54);
  ctx.lineTo(cx + 30, h - 54);
  ctx.lineTo(cx + 22, h - 4);
  ctx.lineTo(cx - 22, h - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a5a3b';
  roundRect(ctx, cx - 34, h - 62, 68, 12, 4);
  ctx.fill();
  radialEllipse(ctx, cx, h - 2, 40, 10, [
    [0, 'rgba(50, 35, 20, 0.45)'],
    [1, 'rgba(50, 35, 20, 0)'],
  ]);
}

/* ------------------------------------------------------------------ 入口 */

export const PROPS = {
  counter: { key: 'prop-counter', w: 300, h: 126, draw: drawCounter },
  atm: { key: 'prop-atm', w: 130, h: 190, draw: drawAtm },
  ticket: { key: 'prop-ticket', w: 92, h: 136, draw: drawTicketMachine },
  sofa: { key: 'prop-sofa', w: 250, h: 112, draw: drawSofa },
  table: { key: 'prop-table', w: 150, h: 92, draw: drawTable },
  plant: { key: 'prop-plant', w: 130, h: 168, draw: drawPlant },
};

export function createBankArt(scene) {
  makeTexture(scene, 'bank-bg', GAME_WIDTH, GAME_HEIGHT, drawBackground);
  Object.values(PROPS).forEach(({ key, w, h, draw }) => makeTexture(scene, key, w, h, draw));
  createSoftShadow(scene);
  return PROPS;
}
