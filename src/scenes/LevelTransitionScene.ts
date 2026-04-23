import Phaser from 'phaser';
import { logger } from '../utils/logger';

interface TransitionData {
  playerHealth: number;
  score: number;
  level: number;
}

export class LevelTransitionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelTransitionScene' });
  }

  create(data: TransitionData): void {
    logger.info('LevelTransitionScene started with data:', data);

    const { width, height } = this.cameras.main;
    const health = data.playerHealth ?? 100;
    const score = data.score ?? 0;
    const level = data.level ?? 2;

    // Dark atmospheric background
    this.cameras.main.setBackgroundColor('#0d0d1a');

    // Background particles (stars/dust)
    const particleGfx = this.add.graphics().setDepth(0);
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.FloatBetween(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.8);
      particleGfx.fillStyle(0xaaaaff, alpha);
      particleGfx.fillCircle(x, y, size);
    }

    // Level title
    const levelTitle = this.add.text(width / 2, height * 0.35, `LEVEL ${level}`, {
      fontSize: '28px',
      color: '#ffaa44',
      fontStyle: 'bold',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    const subtitle = this.add.text(width / 2, height * 0.45, '— The Shadow Realm —', {
      fontSize: '18px',
      color: '#aa88cc',
      fontStyle: 'italic',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    // Player stats
    const statsText = this.add.text(width / 2, height * 0.6, `Health: ${health}  |  Score: ${score}`, {
      fontSize: '16px',
      color: '#cccccc',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    const hintText = this.add.text(width / 2, height * 0.72, 'Prepare yourself...', {
      fontSize: '14px',
      color: '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    // Fade in sequence
    this.tweens.add({
      targets: levelTitle,
      alpha: 1,
      duration: 800,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 800,
      delay: 300,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: statsText,
      alpha: 1,
      duration: 800,
      delay: 600,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: hintText,
      alpha: 1,
      duration: 800,
      delay: 900,
      ease: 'Power2',
    });

    // Auto-transition after 3 seconds
    this.time.delayedCall(3000, () => {
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        logger.info('Transitioning from LevelTransitionScene to Level2Scene');
        this.scene.start('Level2Scene', { playerHealth: health, score });
      });
    });

    // Fade in camera at start
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }
}
