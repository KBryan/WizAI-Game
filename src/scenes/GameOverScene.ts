import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { logger } from '../utils/logger';

export class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  private levelName = '';

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score?: number; levelName?: string }) {
    this.finalScore = data.score ?? 0;
    this.levelName = data.levelName ?? '';
  }

  create(): void {
    logger.info('GameOverScene create, score:', this.finalScore);
    const cfg = GameConfig.transition.gameOver;
    const { width, height } = this.cameras.main;

    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);

    // Game Over text
    const gameOverText = this.add.text(width / 2, height / 2 - 40, 'GAME OVER', {
      fontFamily: cfg.textFontFamily,
      fontSize: cfg.textFontSize,
      color: cfg.textColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    // Score text
    const scoreText = this.add.text(width / 2, height / 2 + 30, `Score: ${this.finalScore}`, {
      fontFamily: cfg.textFontFamily,
      fontSize: cfg.subtitleFontSize,
      color: cfg.subtitleColor,
    }).setOrigin(0.5).setAlpha(0);

    // Level name
    if (this.levelName) {
      this.add.text(width / 2, height / 2 + 60, this.levelName, {
        fontFamily: cfg.textFontFamily,
        fontSize: '14px',
        color: '#888888',
      }).setOrigin(0.5).setAlpha(0);
    }

    // Restart prompt
    const restartText = this.add.text(width / 2, height / 2 + 100, 'Press any key to retry', {
      fontFamily: cfg.textFontFamily,
      fontSize: '16px',
      color: '#aaaacc',
    }).setOrigin(0.5).setAlpha(0);

    // Fade in
    this.tweens.add({
      targets: [gameOverText, scoreText, restartText],
      alpha: 1,
      duration: cfg.fadeInDuration,
      ease: 'Power2',
    });

    // Pulse game over text
    this.tweens.add({
      targets: gameOverText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: cfg.textPulseDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Input to restart
    this.input.keyboard!.on('keydown', () => {
      this.cameras.main.fadeOut(GameConfig.transition.fadeDuration, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { levelIndex: 0 });
      });
    });

    this.input.on('pointerdown', () => {
      this.cameras.main.fadeOut(GameConfig.transition.fadeDuration, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { levelIndex: 0 });
      });
    });
  }
}
