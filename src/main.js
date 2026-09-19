import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { watchOrientation } from './systems/orientation.js';
import StartScene from './scenes/StartScene.js';
import BankScene from './scenes/BankScene.js';
import StreetScene from './scenes/StreetScene.js';
import LakeScene from './scenes/LakeScene.js';
import HotpotScene from './scenes/HotpotScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1b1512',
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [StartScene, BankScene, StreetScene, LakeScene, HotpotScene],
};

// 方便在控制台里调试：game.scene.getScene('BankScene')
window.game = new Phaser.Game(config);

// 手机模式 + 竖屏时提示玩家把手机横过来
watchOrientation();
