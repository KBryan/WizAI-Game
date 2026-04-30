import Phaser from 'phaser';
import { logger } from '../utils/logger';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    logger.info('BootScene preload started');

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

    // ── Old parallax backgrounds (fallback) ──
    this.load.image('bg-layer1', 'assets/bg/bg_layer1.png');
    this.load.image('bg-layer2', 'assets/bg/bg_layer2.png');
    this.load.image('bg-layer3', 'assets/bg/bg_layer3.png');

    // ── GrassLand Backgrounds ──
    this.load.image('grassland-bg-1', 'assets/Background/GrassLand_Background_1.png');
    this.load.image('grassland-bg-2', 'assets/Background/GrassLand_Background_2.png');
    this.load.image('grassland-bg-3', 'assets/Background/GrassLand_Background_3.png');
    this.load.image('grassland-bg-4', 'assets/Background/GrassLand_Background_4.png');
    this.load.image('grassland-bg-5', 'assets/Background/GrassLand_Background_5.png');

    // ── Clouds ──
    this.load.image('grassland-cloud-1', 'assets/Background/GrassLand_Cloud_1.png');
    this.load.image('grassland-cloud-2', 'assets/Background/GrassLand_Cloud_2.png');
    this.load.image('grassland-cloud-3', 'assets/Background/GrassLand_Cloud_3.png');

    // ── Terrain Tiles ──
    this.load.image('terrain-main', 'assets/Terrain/Grassland_Terrain_47Tiles.png');
    this.load.image('terrain-bg', 'assets/Terrain/Grassland_Terrain_BgdTiles.png');
    this.load.image('terrain-extra', 'assets/Terrain/Grassland_Terrain_ExtraTiles.png');

    // ── Static Props ──
    this.load.image('prop-tree', 'assets/Props/GrassLand_Tree.png');
    this.load.image('prop-bush', 'assets/Props/GrassLand_Bush.png');
    this.load.image('prop-chopped-tree', 'assets/Props/GrassLand_ChoppedTree.png');
    this.load.image('prop-details', 'assets/Props/GrassLand_Details.png');
    this.load.image('prop-flower-1', 'assets/Props/GrassLand_Flower_1.png');
    this.load.image('prop-flower-2', 'assets/Props/GrassLand_Flower_2.png');
    this.load.image('prop-flower-3', 'assets/Props/GrassLand_Flower_3.png');
    this.load.image('prop-grass-up', 'assets/Props/GrassLand_GrassUp.png');
    this.load.image('prop-stone-1', 'assets/Props/GrassLand_Stone_1.png');
    this.load.image('prop-stone-2', 'assets/Props/GrassLand_Stone_2.png');
    this.load.image('prop-stone-3', 'assets/Props/GrassLand_Stone_3.png');
    this.load.image('prop-tall-grass-1', 'assets/Props/GrassLand_TallGrass_1.png');
    this.load.image('prop-tall-grass-2', 'assets/Props/GrassLand_TallGrass_2.png');
    this.load.image('prop-lone-trunk', 'assets/Props/GrassLand_LoneTrunk.png');
    this.load.image('prop-trunk-left', 'assets/Props/GrassLand_Trunk_Left.png');
    this.load.image('prop-trunk-center1', 'assets/Props/GrassLand_Trunk_Center1.png');
    this.load.image('prop-trunk-center2', 'assets/Props/GrassLand_Trunk_Center2.png');
    this.load.image('prop-trunk-right', 'assets/Props/GrassLand_Trunk_Right.png');

    // ── Animated Props (sprite sheets) ──
    this.load.spritesheet('anim-butterfly', 'assets/Props/Animated/GrassLand_Butterfly.png', {
      frameWidth: 16, frameHeight: 16,
    });
    this.load.spritesheet('anim-water-bubbles', 'assets/Props/Animated/GrassLand_WaterBubbles.png', {
      frameWidth: 16, frameHeight: 16,
    });
    this.load.spritesheet('anim-water-surface', 'assets/Props/Animated/GrassLand_WaterSurfaceAnim.png', {
      frameWidth: 16, frameHeight: 16,
    });

    // ── Terrain Tile Sprites ──
    this.load.spritesheet('terrain-main-tiles', 'assets/Terrain/Grassland_Terrain_47Tiles.png', {
      frameWidth: 16, frameHeight: 16,
    });
    this.load.spritesheet('terrain-extra-tiles', 'assets/Terrain/Grassland_Terrain_ExtraTiles.png', {
      frameWidth: 16, frameHeight: 16,
    });

    // ── Details Spritesheet (mushrooms, flowers, etc.) ──
    this.load.spritesheet('prop-details-sheet', 'assets/Props/GrassLand_Details.png', {
      frameWidth: 16, frameHeight: 16,
    });

    // ── Character sprite sheets ──
    this.load.spritesheet('char-blue-1', 'assets/characters/blue/char_blue_1.png', {
      frameWidth: 56, frameHeight: 56,
    });
    this.load.spritesheet('char-blue-2', 'assets/characters/blue/char_blue_2.png', {
      frameWidth: 56, frameHeight: 56,
    });
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
    this.createAnimations('boss', 'char-red-1', 'char-red-2');
    this.createPropAnimations();
    logger.info('BootScene animations created, starting MenuScene');
    this.scene.start('MenuScene');
  }

  private createPropAnimations(): void {
    // Butterfly
    this.anims.create({
      key: 'butterfly-fly',
      frames: this.anims.generateFrameNumbers('anim-butterfly', { start: 0, end: 3 }),
      frameRate: 8, repeat: -1,
    });
    // Water effects
    this.anims.create({
      key: 'water-bubbles',
      frames: this.anims.generateFrameNumbers('anim-water-bubbles', { start: 0, end: 4 }),
      frameRate: 6, repeat: -1,
    });
    this.anims.create({
      key: 'water-surface',
      frames: this.anims.generateFrameNumbers('anim-water-surface', { start: 0, end: 9 }),
      frameRate: 8, repeat: -1,
    });
    // Terrain tile animations (waterfall, water drip)
    this.anims.create({
      key: 'terrain-waterfall',
      frames: this.anims.generateFrameNumbers('terrain-main-tiles', { start: 9, end: 12 }),
      frameRate: 8, repeat: -1,
    });
  }

  private createAnimations(prefix: string, sheet1Key: string, sheet2Key: string): void {
    const sheet1Anims = [
      { key: `${prefix}_idle`, start: 0, end: 5, frameRate: 10, repeat: -1 },
      { key: `${prefix}_attack`, start: 8, end: 13, frameRate: 12, repeat: 0 },
      { key: `${prefix}_attack_combo`, start: 8, end: 15, frameRate: 12, repeat: 0 },
      { key: `${prefix}_run`, start: 16, end: 23, frameRate: 10, repeat: -1 },
      { key: `${prefix}_jump_fly`, start: 25, end: 25, frameRate: 10, repeat: -1 },
      { key: `${prefix}_fall`, start: 27, end: 28, frameRate: 10, repeat: -1 },
      { key: `${prefix}_land`, start: 29, end: 29, frameRate: 10, repeat: 0 },
      { key: `${prefix}_damage`, start: 32, end: 39, frameRate: 10, repeat: 0 },
      { key: `${prefix}_death`, start: 40, end: 43, frameRate: 10, repeat: 0 },
      { key: `${prefix}_spell`, start: 48, end: 55, frameRate: 10, repeat: 0 },
      { key: `${prefix}_crouch`, start: 56, end: 59, frameRate: 10, repeat: 0 },
      { key: `${prefix}_shield`, start: 64, end: 71, frameRate: 5, repeat: -1 },
    ];

    for (const anim of sheet1Anims) {
      this.anims.create({
        key: anim.key,
        frames: this.anims.generateFrameNumbers(sheet1Key, { start: anim.start, end: anim.end }),
        frameRate: anim.frameRate,
        repeat: anim.repeat,
      });
    }

    const sheet2Anims = [
      { key: `${prefix}_walk`, start: 0, end: 7, frameRate: 10, repeat: -1 },
      { key: `${prefix}_wall_slide`, start: 24, end: 27, frameRate: 10, repeat: -1 },
      { key: `${prefix}_critical`, start: 32, end: 39, frameRate: 10, repeat: 0 },
      { key: `${prefix}_ladder_climb`, start: 40, end: 47, frameRate: 10, repeat: -1 },
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
