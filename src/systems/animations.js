import { SPRITE, HUANG, YANGFAN } from '../config.js';

/** 按角色配置建出四个方向的行走 / 站立动画 */
export function createDirectionAnims(scene, cfg, prefix) {
  Object.entries(cfg.directions).forEach(([dir, c]) => {
    const walkKey = `${prefix}-walk-${dir}`;
    if (!scene.anims.exists(walkKey)) {
      scene.anims.create({
        key: walkKey,
        frames: c.frames.map((i) => ({ key: cfg.key, frame: i })),
        frameRate: c.fps,
        repeat: -1,
      });
    }
    const idleKey = `${prefix}-idle-${dir}`;
    if (!scene.anims.exists(idleKey)) {
      scene.anims.create({
        key: idleKey,
        frames: [{ key: cfg.key, frame: cfg.idleFrames[dir] }],
        frameRate: 1,
        repeat: -1,
      });
    }
  });
}

export function createAllCharacterAnims(scene) {
  createDirectionAnims(scene, SPRITE, 'pan');
  createDirectionAnims(scene, HUANG, HUANG.animPrefix);
  createDirectionAnims(scene, YANGFAN, YANGFAN.animPrefix);
}
