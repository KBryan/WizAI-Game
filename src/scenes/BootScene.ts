import Phaser from 'phaser';
import { logger } from '../utils/logger';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    logger.info('BootScene preload started');

    // Progress bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const barW = 320;
    const barH = 20;
    const barX = (width - barW) / 2;
    const barY = height / 2;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(barX, barY, barW, barH);

    const progressBar = this.add.graphics();
    const loadingText = this.add.text(width / 2, barY - 30, 'Loading...', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      logger.debug('Asset loading progress:', value);
      progressBar.clear();
      progressBar.fillStyle(0x3a86ff, 1);
      progressBar.fillRect(barX + 4, barY + 4, (barW - 8) * value, barH - 8);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Parallax background layers
    this.load.image('bg-layer1', 'assets/bg/bg_layer1.png');
    this.load.image('bg-layer2', 'assets/bg/bg_layer2.png');
    this.load.image('bg-layer3', 'assets/bg/bg_layer3.png');

    // Player sprite sheets (blue)
    this.load.spritesheet('char-blue-1', 'assets/characters/blue/char_blue_1.png', {
      frameWidth: 56, frameHeight: 56,
    });
    this.load.spritesheet('char-blue-2', 'assets/characters/blue/char_blue_2.png', {
      frameWidth: 56, frameHeight: 56,
    });

    // Enemy sprite sheets (red)
    this.load.spritesheet('char-red-1', 'assets/characters/red/char_red_1.png', {
      frameWidth: 56, frameHeight: 56,
    });
    this.load.spritesheet('char-red-2', 'assets/characters/red/char_red_2.png', {
      frameWidth: 56, frameHeight: 56,
    });
  }

  create(): void {
    this.createAnimations('player', 'char-blue-1', 'char-blue-2');
    this.createAnimations('enemy', 'char-red-1', 'char-red-2');
    // Boss uses the same red enemy sprites but scaled larger
    this.createAnimations('boss', 'char-red-1', 'char-red-2');
    logger.info('BootScene animations created, starting MenuScene');
    this.scene.start('MenuScene');
  }

  private createAnimations(prefix: string, sheet1Key: string, sheet2Key: string): void {
    // Sheet 1 animations
    const sheet1Anims = [
      { key: `${prefix}_idle`,         start: 0,  end: 5,  frameRate: 10, repeat: -1 },
      { key: `${prefix}_attack`,       start: 8,  end: 13, frameRate: 12, repeat: 0 },
      { key: `${prefix}_attack_combo`, start: 8,  end: 15, frameRate: 12, repeat: 0 },
      { key: `${prefix}_run`,          start: 16, end: 23, frameRate: 10, repeat: -1 },
      { key: `${prefix}_jump_fly`,     start: 25, end: 25, frameRate: 10, repeat: -1 },
      { key: `${prefix}_fall`,         start: 27, end: 28, frameRate: 10, repeat: -1 },
      { key: `${prefix}_land`,         start: 29, end: 29, frameRate: 10, repeat: 0 },
      { key: `${prefix}_damage`,       start: 32, end: 39, frameRate: 10, repeat: 0 },
      { key: `${prefix}_death`,        start: 40, end: 43, frameRate: 10, repeat: 0 },
      { key: `${prefix}_spell`,        start: 48, end: 55, frameRate: 10, repeat: 0 },
      { key: `${prefix}_crouch`,       start: 56, end: 59, frameRate: 10, repeat: 0 },
      { key: `${prefix}_shield`,       start: 64, end: 71, frameRate: 5,  repeat: -1 },
    ];
    for (const anim of sheet1Anims) {
      this.anims.create({
        key: anim.key,
        frames: this.anims.generateFrameNumbers(sheet1Key, { start: anim.start, end: anim.end }),
        frameRate: anim.frameRate,
        repeat: anim.repeat,
      });
    }

    // Sheet 2 animations
    const sheet2Anims = [
      { key: `${prefix}_walk`,          start: 0,  end: 7,  frameRate: 10, repeat: -1 },
      { key: `${prefix}_wall_slide`,    start: 24, end: 27, frameRate: 10, repeat: -1 },
      { key: `${prefix}_critical`,      start: 32, end: 39, frameRate: 10, repeat: 0 },
      { key: `${prefix}_ladder_climb`,  start: 40, end: 47, frameRate: 10, repeat: -1 },
    ];

    for (const anim of sheet2Anims) {
      this.anims.create({
        key: anim.key,
        frames: this.anims.generateFrameNumbers(sheet2Key, { start: anim.start, end: anim.end }),
        frameRate: anim.frameRate,
        repeat: anim.repeat,
      });
    }
  }
}
