import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
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
  scene: [BankScene, StreetScene, LakeScene, HotpotScene],
};

// 方便在控制台里调试：game.scene.getScene('BankScene')
window.game = new Phaser.Game(config);
