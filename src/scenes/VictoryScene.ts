import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { logger } from '../utils/logger';

export class VictoryScene extends Phaser.Scene {
  private finalScore = 0;
  private tokensCollected = 0;
  private totalTokens = 0;

  constructor() {
    super({ key: 'VictoryScene' });
  }

  init(data: { score?: number; tokensCollected?: number; totalTokens?: number }) {
    this.finalScore = data.score ?? 0;
    this.tokensCollected = data.tokensCollected ?? 0;
    this.totalTokens = data.totalTokens ?? 0;
  }

  create(): void {
    logger.info('VictoryScene create, score:', this.finalScore);
    const cfg = GameConfig.transition.victory;
    const { width, height } = this.cameras.main;

    // Celebration background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a2a, 1);
    bg.fillRect(0, 0, width, height);

    // Golden particles
    const particleGfx = this.add.graphics().setDepth(5);
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Phaser.Math.Between(0, width),
        y: Phaser.Math.Between(-height, 0),
        vx: Phaser.Math.FloatBetween(-0.5, 0.5),
        vy: Phaser.Math.FloatBetween(0.3, 1.5),
        size: Phaser.Math.FloatBetween(1, 4),
        alpha: Phaser.Math.FloatBetween(0.3, 0.8),
      });
    }

    // Victory text
    const victoryText = this.add.text(width / 2, height / 2 - 80, 'VICTORY!', {
      fontFamily: cfg.textFontFamily,
      fontSize: cfg.textFontSize,
      color: cfg.textColor,
      fontStyle: 'bold',
      stroke: '#5a2d00',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    // Subtitle
    const subtitle = this.add.text(width / 2, height / 2 - 20, 'The darkness has been vanquished!', {
      fontFamily: cfg.textFontFamily,
      fontSize: cfg.subtitleFontSize,
      color: cfg.subtitleColor,
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    // Score display
    const scoreText = this.add.text(width / 2, height / 2 + 30, `Final Score: ${this.finalScore}`, {
      fontFamily: cfg.textFontFamily,
      fontSize: '24px',
      color: '#ffdd44',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    // Token display
    const tokenText = this.add.text(width / 2, height / 2 + 65, `Tokens: ${this.tokensCollected} / ${this.totalTokens}`, {
      fontFamily: cfg.textFontFamily,
      fontSize: '18px',
      color: '#aaccff',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    // Continue prompt
    const continueText = this.add.text(width / 2, height / 2 + 120, 'Press any key to return to menu', {
      fontFamily: cfg.textFontFamily,
      fontSize: '16px',
      color: '#888899',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    // Fade in elements sequentially
    this.tweens.add({
      targets: victoryText,
      alpha: 1,
      duration: cfg.fadeInDuration,
      ease: 'Power2',
    });

    this.time.delayedCall(300, () => {
      this.tweens.add({ targets: subtitle, alpha: 1, duration: 500 });
    });
    this.time.delayedCall(600, () => {
      this.tweens.add({ targets: scoreText, alpha: 1, duration: 500 });
    });
    this.time.delayedCall(900, () => {
      this.tweens.add({ targets: tokenText, alpha: 1, duration: 500 });
    });
    this.time.delayedCall(1500, () => {
      this.tweens.add({ targets: continueText, alpha: 1, duration: 500 });
    });

    // Scaling animation on victory text
    this.tweens.add({
      targets: victoryText,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Update particles each frame
    this.events.on('update', () => {
      particleGfx.clear();
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > height) {
          p.y = -10;
          p.x = Phaser.Math.Between(0, width);
        }
        particleGfx.fillStyle(0xf0c060, p.alpha);
        particleGfx.fillCircle(p.x, p.y, p.size);
      }
    });

    // Input to return to menu
    const goToMenu = () => {
      this.cameras.main.fadeOut(GameConfig.transition.fadeDuration, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    };

    this.time.delayedCall(cfg.celebrationDuration, () => {
      this.input.keyboard!.on('keydown', goToMenu);
      this.input.on('pointerdown', goToMenu);
    });
  }
}
