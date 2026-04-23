import Phaser from 'phaser';
import { logger } from '../utils/logger';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  create(data: { score?: number }): void {
    logger.info('VictoryScene started with score:', data.score);

    const { width, height } = this.cameras.main;
    const finalScore = data.score ?? 0;

    // Celebration background
    this.cameras.main.setBackgroundColor('#0a1a0a');

    // Floating particles
    const particleGfx = this.add.graphics().setDepth(0);
    const particles: { x: number; y: number; speed: number; size: number; alpha: number; color: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Phaser.Math.Between(0, width),
        y: Phaser.Math.Between(0, height),
        speed: Phaser.Math.FloatBetween(0.3, 1.2),
        size: Phaser.Math.FloatBetween(1, 4),
        alpha: Phaser.Math.FloatBetween(0.3, 1),
        color: Math.random() > 0.5 ? 0x44ff44 : 0xffdd44,
      });
    }

    // Title
    const title = this.add.text(width / 2, height * 0.25, 'VICTORY!', {
      fontSize: '48px',
      color: '#44ff44',
      fontStyle: 'bold',
      fontFamily: 'monospace',
      stroke: '#228822',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    const subtitle = this.add.text(width / 2, height * 0.38, 'You have saved the realm!', {
      fontSize: '20px',
      color: '#aaffaa',
      fontStyle: 'italic',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    const scoreText = this.add.text(width / 2, height * 0.52, `Final Score: ${finalScore}`, {
      fontSize: '24px',
      color: '#ffdd44',
      fontStyle: 'bold',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    // Play Again button
    const btnContainer = this.add.container(width / 2, height * 0.72).setDepth(10).setAlpha(0);

    const btnW = 200;
    const btnH = 50;
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x228822, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    btnBg.lineStyle(2, 0x44ff44, 1);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    btnContainer.add(btnBg);

    const btnText = this.add.text(0, 0, 'PLAY AGAIN', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    btnContainer.add(btnText);

    const hitZone = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
    hitZone.on('pointerover', () => {
      btnContainer.setScale(1.05);
      btnText.setColor('#ffff88');
    });
    hitZone.on('pointerout', () => {
      btnContainer.setScale(1);
      btnText.setColor('#ffffff');
    });
    hitZone.on('pointerdown', () => {
      logger.info('Play Again clicked, returning to MenuScene');
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    });
    btnContainer.add(hitZone);

    // Fade in sequence
    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 1000,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 1000,
      delay: 400,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: scoreText,
      alpha: 1,
      duration: 1000,
      delay: 800,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: btnContainer,
      alpha: 1,
      duration: 1000,
      delay: 1200,
      ease: 'Power2',
    });

    // Title pulse
    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Update particles
    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        particleGfx.clear();
        for (const p of particles) {
          p.y -= p.speed;
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Phaser.Math.Between(0, width);
          }
          particleGfx.fillStyle(p.color, p.alpha);
          particleGfx.fillCircle(p.x, p.y, p.size);
        }
      },
    });

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }
}
