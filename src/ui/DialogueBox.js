import { GAME_WIDTH, GAME_HEIGHT, FONT, AVATARS } from '../config.js';

const PANEL_W = 1000;
const PANEL_H = 176;
const PANEL_X = (GAME_WIDTH - PANEL_W) / 2;
const PANEL_Y = GAME_HEIGHT - PANEL_H - 24;

/**
 * 底部对话框：头像 + 说话人 + 台词，空格 / E 翻页。
 * 说话人换边显示，方便一眼看出谁在说话。
 */
export default class DialogueBox {
  constructor(scene) {
    const s = scene;
    this.scene = s;
    this.lines = [];
    this.index = 0;
    this.onFinish = null;
    this.visible = false;

    this.plate = s.add.graphics().setDepth(9600).setVisible(false);

    this.avatar = s.add
      .image(PANEL_X + 92, PANEL_Y + PANEL_H / 2, AVATARS.huang.key)
      .setDisplaySize(140, 140)
      .setDepth(9601)
      .setVisible(false);

    this.nameBg = s.add.graphics().setDepth(9601).setVisible(false);

    this.nameText = s.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#f7ead0',
        fontStyle: 'bold',
      })
      .setDepth(9602)
      .setVisible(false);

    this.bodyText = s.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#f4ead6',
        lineSpacing: 10,
        wordWrap: { width: 700 },
      })
      .setDepth(9602)
      .setVisible(false);

    this.hintText = s.add
      .text(PANEL_X + PANEL_W - 26, PANEL_Y + PANEL_H - 16, '空格 / E 继续 ▼', {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#cbb894',
      })
      .setOrigin(1, 1)
      .setDepth(9602)
      .setVisible(false);

    s.tweens.add({
      targets: this.hintText,
      alpha: { from: 1, to: 0.3 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  get isOpen() {
    return this.visible;
  }

  start(lines, onFinish) {
    this.lines = lines;
    this.index = 0;
    this.onFinish = onFinish || null;
    this.visible = true;
    this.plate.setVisible(true);
    this.render();
  }

  /** 下一句；已经是最后一句就结束对话 */
  next() {
    if (!this.visible) return;
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.close();
      const done = this.onFinish;
      this.onFinish = null;
      if (done) done();
      return;
    }
    this.render();
  }

  close() {
    this.visible = false;
    [this.avatar, this.nameBg, this.nameText, this.bodyText, this.hintText].forEach((o) =>
      o.setVisible(false)
    );
    this.plate.setVisible(false);
  }

  render() {
    const line = this.lines[this.index];
    const speaker = AVATARS[line.who] || AVATARS.pan;
    const mine = line.who === 'pan';

    const avatarX = mine ? PANEL_X + PANEL_W - 92 : PANEL_X + 92;
    const textX = mine ? PANEL_X + 28 : PANEL_X + 180;

    this.avatar.setTexture(speaker.key).setPosition(avatarX, PANEL_Y + PANEL_H / 2).setVisible(true);
    this.nameText.setText(speaker.name).setPosition(textX, PANEL_Y + 24).setVisible(true);
    this.bodyText.setText(line.text).setPosition(textX, PANEL_Y + 68).setVisible(true);
    this.hintText.setVisible(true);

    // 说话人名牌
    const nameW = this.nameText.width + 28;
    this.nameBg.clear();
    this.nameBg.fillStyle(0x2c2016, 0.9);
    this.nameBg.fillRoundedRect(textX - 14, PANEL_Y + 18, nameW, 38, 8);
    this.nameBg.lineStyle(2, 0xc9a44c, 0.85);
    this.nameBg.strokeRoundedRect(textX - 14, PANEL_Y + 18, nameW, 38, 8);
    this.nameBg.setVisible(true);

    this.plate.clear();
    this.plate.fillStyle(0x1a1310, 0.94);
    this.plate.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 18);
    this.plate.lineStyle(3, 0xc9a44c, 0.95);
    this.plate.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 18);
  }
}
