import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
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
      progressBar.clear();
      progressBar.fillStyle(0x3a86ff, 1);
      progressBar.fillRect(barX + 4, barY + 4, (barW - 8) * value, barH - 8);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load character sprite sheets - blue (primary player)
    this.load.spritesheet('char-blue-1', 'assets/characters/blue/char_blue_1.png', {
      frameWidth: 56,
      frameHeight: 56,
    });
    this.load.spritesheet('char-blue-2', 'assets/characters/blue/char_blue_2.png', {
      frameWidth: 56,
      frameHeight: 56,
    });
  }

  create(): void {
    this.createAnimations();
    this.scene.start('GameScene');
  }

  private createAnimations(): void {
    // Sheet 1 animations (char-blue-1: 8 cols × 11 rows = 88 frames)
    const sheet1Anims: { key: string; start: number; end: number; frameRate: number; repeat: number }[] = [
      { key: 'idle',         start: 0,  end: 7,  frameRate: 10, repeat: -1 },
      { key: 'attack',       start: 8,  end: 13, frameRate: 10, repeat: 0 },
      { key: 'attack_combo', start: 8,  end: 15, frameRate: 10, repeat: 0 },
      { key: 'run',          start: 16, end: 23, frameRate: 10, repeat: -1 },
      { key: 'jump_prep',    start: 24, end: 24, frameRate: 10, repeat: 0 },
      { key: 'jump_fly',     start: 25, end: 25, frameRate: 10, repeat: -1 },
      { key: 'jump_reload',  start: 26, end: 26, frameRate: 10, repeat: 0 },
      { key: 'fall',         start: 27, end: 28, frameRate: 10, repeat: -1 },
      { key: 'land',         start: 29, end: 29, frameRate: 10, repeat: 0 },
      { key: 'damage',       start: 32, end: 35, frameRate: 10, repeat: 0 },
      { key: 'death',        start: 40, end: 47, frameRate: 10, repeat: 0 },
      { key: 'spell',        start: 48, end: 55, frameRate: 10, repeat: 0 },
      { key: 'crouch',       start: 56, end: 58, frameRate: 10, repeat: 0 },
      { key: 'shield',       start: 64, end: 65, frameRate: 5,  repeat: -1 },
    ];

    for (const anim of sheet1Anims) {
      this.anims.create({
        key: anim.key,
        frames: this.anims.generateFrameNumbers('char-blue-1', {
          start: anim.start,
          end: anim.end,
        }),
        frameRate: anim.frameRate,
        repeat: anim.repeat,
      });
    }

    // Sheet 2 animations (char-blue-2: 8 cols × 7 rows = 56 frames)
    const sheet2Anims: { key: string; start: number; end: number; frameRate: number; repeat: number }[] = [
      { key: 'walk',          start: 0,  end: 7,  frameRate: 10, repeat: -1 },
      { key: 'slide_start',   start: 8,  end: 9,  frameRate: 10, repeat: 0 },
      { key: 'slide_loop',    start: 16, end: 19, frameRate: 10, repeat: -1 },
      { key: 'slide_end',     start: 20, end: 21, frameRate: 10, repeat: 0 },
      { key: 'wall_slide',    start: 24, end: 26, frameRate: 10, repeat: -1 },
      { key: 'critical',      start: 32, end: 39, frameRate: 10, repeat: 0 },
      { key: 'ladder_climb',  start: 40, end: 47, frameRate: 10, repeat: -1 },
      { key: 'ladder_idle',   start: 48, end: 49, frameRate: 5,  repeat: -1 },
    ];

    for (const anim of sheet2Anims) {
      this.anims.create({
        key: anim.key,
        frames: this.anims.generateFrameNumbers('char-blue-2', {
          start: anim.start,
          end: anim.end,
        }),
        frameRate: anim.frameRate,
        repeat: anim.repeat,
      });
    }
  }
}
