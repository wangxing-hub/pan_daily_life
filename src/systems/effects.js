/** 剧情演出用的小特效：火锅冒的热气、彩虹色呕吐物 */

/** 彩虹：红橙黄绿蓝紫粉 */
export const RAINBOW = [0xff4d4d, 0xff9f1a, 0xffd43b, 0x51cf66, 0x4dabf7, 0x9775fa, 0xf06595];

/**
 * 锅里冒的热气：白色小团子往上飘、放大、淡出。
 * 调用方每 250ms 左右叫一次就行。
 */
export function potSteam(scene, x, y, depth = 600) {
  for (let i = 0; i < 3; i++) {
    const puff = scene.add
      .ellipse(
        x + (Math.random() - 0.5) * 96,
        y + (Math.random() - 0.5) * 16,
        26 + Math.random() * 26,
        15 + Math.random() * 12,
        0xffffff,
        0.42
      )
      .setDepth(depth);
    scene.tweens.add({
      targets: puff,
      y: puff.y - 90 - Math.random() * 80,
      x: puff.x + (Math.random() - 0.5) * 60,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 1300 + Math.random() * 900,
      ease: 'Sine.out',
      onComplete: () => puff.destroy(),
    });
  }
}

/**
 * 彩虹色呕吐物：从角色嘴边喷出一串彩色小球，先往上再落下，落地后淡掉。
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Sprite} sprite 吐的那个角色
 * @param {object} opts { delay, dir, count, depth }
 */
export function rainbowVomit(scene, sprite, opts = {}) {
  const { delay = 0, count = 24 } = opts;
  // 默认画在桌子和人物前面，不然坐下时吐出来的东西会被桌面挡住
  const depth = opts.depth ?? 7000;
  const dir = opts.dir ?? (sprite.facing === 'left' ? -1 : 1);
  // 每个角色的嘴在身高上的位置不一样（见 config 里的 mouthRatio）
  const ratio = opts.ratio ?? sprite.mouthRatio ?? 0.7;
  const mouthX = sprite.x + dir * 4;
  // 再往下挪几像素：正好卡在嘴唇上，不会看着像从鼻子出来
  const mouthY = sprite.y - sprite.displayHeight * ratio + 5;

  for (let i = 0; i < count; i++) {
    const color = RAINBOW[i % RAINBOW.length];
    const r = 4 + Math.random() * 5;
    const dot = scene.add.circle(mouthX, mouthY, r, color, 0.96).setDepth(depth);
    const dx = dir * (50 + Math.random() * 110);
    // 只往上飘一点点，主要往前往下，不然会糊在脸上 / 头顶
    const up = Math.random() * 12;
    const fall = 170 + Math.random() * 120;

    scene.tweens.add({
      targets: dot,
      x: mouthX + dx,
      y: mouthY + up,
      duration: 220 + i * 10,
      delay: delay + i * 24,
      ease: 'Quad.out',
      onComplete: () => {
        scene.tweens.add({
          targets: dot,
          x: mouthX + dx * 1.25,
          y: mouthY + up + fall,
          alpha: 0.2,
          scale: 0.7,
          duration: 420,
          ease: 'Quad.in',
          onComplete: () => dot.destroy(),
        });
      },
    });
  }
}
