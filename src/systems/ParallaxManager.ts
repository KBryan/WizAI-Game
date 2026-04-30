import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import type { LevelTheme } from '../config/GameConfig';
import { logger } from '../utils/logger';


interface ThemeColors {
  skyColors: readonly number[];
  mountainFarColor: number;
  mountainNearColor: number;
  treeFarColor: number;
  treeNearColor: number;
  groundColor: number;
  groundTopColor: number;
  fogColor: number;
}
interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
}

// Map of theme -> background layer keys (top to bottom)
const THEME_BG_KEYS: Record<string, string[]> = {
  forest: ['grassland-bg-1', 'grassland-bg-2', 'grassland-bg-3', 'grassland-bg-4', 'grassland-bg-5'],
  cavern: ['bg-layer1', 'bg-layer2', 'bg-layer3'],
  mountain: ['bg-layer1', 'bg-layer2', 'bg-layer3'],
};

// Prop decoration configs for each theme
const THEME_PROPS: Record<string, { key: string; offsetX: number; offsetY: number; frequency: number; scale: number }[]> = {
  forest: [
    { key: 'prop-tree', offsetX: 0, offsetY: -80, frequency: 0.03, scale: 2 },
    { key: 'prop-bush', offsetX: 0, offsetY: -14, frequency: 0.08, scale: 1.5 },
    { key: 'prop-flower-1', offsetX: 0, offsetY: -10, frequency: 0.1, scale: 1.5 },
    { key: 'prop-flower-2', offsetX: 0, offsetY: -10, frequency: 0.1, scale: 1.5 },
    { key: 'prop-flower-3', offsetX: 0, offsetY: -10, frequency: 0.1, scale: 1.5 },
    { key: 'prop-stone-1', offsetX: 0, offsetY: -8, frequency: 0.05, scale: 1.5 },
    { key: 'prop-stone-2', offsetX: 0, offsetY: -8, frequency: 0.05, scale: 1.5 },
    { key: 'prop-tall-grass-1', offsetX: 0, offsetY: -12, frequency: 0.12, scale: 1.5 },
    { key: 'prop-tall-grass-2', offsetX: 0, offsetY: -12, frequency: 0.12, scale: 1.5 },
    { key: 'prop-lone-trunk', offsetX: 0, offsetY: -16, frequency: 0.02, scale: 1.5 },
  ],
  cavern: [
    { key: 'prop-stone-3', offsetX: 0, offsetY: -8, frequency: 0.06, scale: 1.5 },
    { key: 'prop-stone-2', offsetX: 0, offsetY: -8, frequency: 0.06, scale: 1.5 },
    { key: 'prop-lone-trunk', offsetX: 0, offsetY: -16, frequency: 0.02, scale: 1.5 },
  ],
  mountain: [
    { key: 'prop-stone-1', offsetX: 0, offsetY: -8, frequency: 0.04, scale: 1.5 },
    { key: 'prop-stone-3', offsetX: 0, offsetY: -8, frequency: 0.04, scale: 1.5 },
    { key: 'prop-lone-trunk', offsetX: 0, offsetY: -16, frequency: 0.02, scale: 1.5 },
    { key: 'prop-tall-grass-1', offsetX: 0, offsetY: -12, frequency: 0.06, scale: 1.5 },
  ],
};

export class ParallaxManager {
  private scene: Phaser.Scene;
  private layers: Phaser.GameObjects.TileSprite[] = [];
  private cloudSprites: Phaser.GameObjects.Image[] = [];
  private groundDecorations: Phaser.GameObjects.Sprite[] = [];
  private animatedProps: { sprite: Phaser.GameObjects.Sprite; baseY: number; floatOffset: number; floatSpeed: number }[] = [];
  private theme: LevelTheme;
  private particleGfx: Phaser.GameObjects.Graphics | null = null;
  private particles: Particle[] = [];
  private fogGfx: Phaser.GameObjects.Graphics | null = null;
  private fogOffset = 0;
  private useRealImages = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.theme = 'forest';
  }

  /** Check if real GrassLand images are available for the given theme */
  canUseRealImages(theme: LevelTheme): boolean {
    if (theme !== 'forest') return false;
    return this.scene.textures.exists('grassland-bg-1');
  }

  /** Create parallax layers - uses real images if available, falls back to procedural */
  createLayers(theme: LevelTheme): void {
    this.theme = theme;
    this.useRealImages = this.canUseRealImages(theme);
    const { width, height } = this.scene.cameras.main;
    const cfg = GameConfig.parallax;
    const themeColors = cfg.themes[theme];

    if (this.useRealImages) {
      this.createRealImageLayers(width, height, theme as 'forest');
    } else {
      this.generateAndCreateProceduralLayers(width, height, themeColors ?? (cfg.themes[this.theme] as unknown as ThemeColors));
    }

    // Fog
    if (cfg.fog.enabled) {
      this.fogGfx = this.scene.add.graphics().setDepth(-5).setScrollFactor(0);
    }

    // Particles
    const pcfg = cfg.particles;
    this.particleGfx = this.scene.add.graphics().setDepth(11);
    for (let i = 0; i < pcfg.count; i++) {
      this.particles.push({
        x: Phaser.Math.Between(0, width),
        y: Phaser.Math.Between(0, height + pcfg.yLimitOffset),
        speed: Phaser.Math.FloatBetween(pcfg.speedMin, pcfg.speedMax),
        size: Phaser.Math.FloatBetween(pcfg.sizeMin, pcfg.sizeMax),
        alpha: Phaser.Math.FloatBetween(pcfg.alphaMin, pcfg.alphaMax),
      });
    }
  }

  /** Create layers using real GrassLand background images */
  private createRealImageLayers(width: number, height: number, _theme: 'forest'): void {
    const bgKeys = THEME_BG_KEYS.forest;
    const scrollFactors = [0.02, 0.08, 0.2, 0.45, 0.75];
    const scales = [2.16, 2.16, 2.16, 2.0, 2.16]; // Scale to fill height
    const depths = [-30, -25, -20, -15, -10];

    for (let i = 0; i < bgKeys.length; i++) {
      const key = bgKeys[i];
      const texture = this.scene.textures.get(key);
      const texW = texture.getSourceImage().width as number;
      const texH = texture.getSourceImage().height as number;
      const layer = this.scene.add.tileSprite(0, 0, width, height, key)
        .setOrigin(0, 0)
        .setScrollFactor(scrollFactors[i] || 0.1)
        .setDepth(depths[i] || -15)
        .setScale(scales[i] || 2.16);

      // Position vertically - background layers sit above ground
      const targetH = height * 0.92; // Use most of the height
      const currentH = texH * (scales[i] || 2.16);
      if (currentH < targetH) {
        layer.setScale(scales[i] * (targetH / currentH));
      }

      this.layers.push(layer);
    }

    // Add floating clouds
    this.createClouds(width, height);

    logger.info('Using real GrassLand background images for parallax');
  }

  /** Create floating cloud sprites */
  private createClouds(width: number, height: number): void {
    const cloudKeys = ['grassland-cloud-1', 'grassland-cloud-2', 'grassland-cloud-3'];
    const count = Phaser.Math.Between(4, 7);

    for (let i = 0; i < count; i++) {
      const key = cloudKeys[i % cloudKeys.length];
      const x = Phaser.Math.Between(0, width * 2);
      const y = Phaser.Math.Between(20, height * 0.25);
      const cloud = this.scene.add.image(x, y, key)
        .setDepth(-28)
        .setScrollFactor(0.04)
        .setAlpha(Phaser.Math.FloatBetween(0.5, 0.9))
        .setScale(Phaser.Math.FloatBetween(1.5, 3.0));
      this.cloudSprites.push(cloud);
    }
  }

  /** Fallback: generate procedural layers */
  private generateAndCreateProceduralLayers(width: number, height: number, themeColors: ThemeColors): void {
    this.generateTextures(this.theme, width, height, themeColors);
    const cfg = GameConfig.parallax;
    for (let i = 0; i < cfg.layers.length; i++) {
      const layerCfg = cfg.layers[i];
      const key = 'parallax-' + layerCfg.key;
      const layer = this.scene.add.tileSprite(0, 0, width, height, key)
        .setOrigin(0, 0)
        .setScrollFactor(layerCfg.scrollFactor)
        .setDepth(layerCfg.key === 'sky' ? -30 : layerCfg.key === 'ground-fg' ? 5 : -20 + i)
        .setAlpha(layerCfg.alpha);
      this.layers.push(layer);
    }
    logger.info('Using procedural parallax backgrounds');
  }

  /** Generate procedural textures (for cavern/mountain themes) */
  generateTextures(theme: LevelTheme, width: number, height: number, themeColors?: ThemeColors): void {
    this.theme = theme;
    const cfg = GameConfig.parallax;
    const colors: ThemeColors = (themeColors ?? cfg.themes[theme]) as unknown as ThemeColors;

    this.generateSkyTexture(width, height, colors.skyColors);
    this.generateMountainTexture('parallax-mountains-far', width, height, colors.mountainFarColor as number, 0.6, 0.35);
    this.generateMountainTexture('parallax-mountains-near', width, height, colors.mountainNearColor as number, 0.7, 0.45);
    this.generateTreeTexture('parallax-trees-far', width, height, colors.treeFarColor as number, 0.2);
    this.generateTreeTexture('parallax-trees-near', width, height, colors.treeNearColor as number, 0.35);
    this.generateGroundTexture('parallax-ground-fg', width, 60, colors.groundColor as number);
  }

  private generateSkyTexture(width: number, height: number, colors: readonly number[]): void {
    const key = 'parallax-sky';
    const gfx = this.scene.add.graphics();
    const steps = 64;
    const stepH = height / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const color = this.lerpColors(colors, t);
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, i * stepH, width * 2, stepH + 1);
    }
    gfx.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, width * 2);
      const sy = Phaser.Math.Between(0, height * 0.5);
      const sr = Phaser.Math.FloatBetween(0.5, 1.5);
      gfx.fillCircle(sx, sy, sr);
    }
    gfx.fillStyle(0xeeeeff, 0.8);
    gfx.fillCircle(width * 1.5, height * 0.15, 30);
    gfx.fillStyle(this.theme === 'cavern' ? 0x0a0a1a : this.theme === 'mountain' ? 0x2a1a3a : 0x1a1a3a, 0.9);
    gfx.fillCircle(width * 1.5 + 8, height * 0.15 - 4, 26);
    gfx.generateTexture(key, width * 2, height);
    gfx.destroy();
  }

  private generateMountainTexture(key: string, width: number, height: number, color: number, peakRatio: number, baseRatio: number): void {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(color, 0.9);
    gfx.beginPath();
    gfx.moveTo(0, height);
    const numPeaks = Phaser.Math.Between(5, 9);
    const segmentW = (width * 2) / numPeaks;
    for (let i = 0; i <= numPeaks; i++) {
      const x = i * segmentW;
      const peakH = height * (peakRatio + Phaser.Math.FloatBetween(-0.08, 0.08));
      const baseH = height * baseRatio;
      if (i === 0) { gfx.lineTo(x, baseH); }
      else if (i < numPeaks) {
        const midX = x - segmentW * 0.5;
        gfx.lineTo(midX + Phaser.Math.FloatBetween(-20, 20), peakH);
        gfx.lineTo(x, baseH + Phaser.Math.FloatBetween(-10, 10));
      } else { gfx.lineTo(x, baseH); }
    }
    gfx.lineTo(width * 2, height);
    gfx.closePath();
    gfx.fillPath();
    if (peakRatio > 0.5) {
      gfx.fillStyle(0xdddddd, 0.3);
      for (let i = 1; i < numPeaks; i++) {
        const px = i * segmentW - segmentW * 0.5 + Phaser.Math.FloatBetween(-20, 20);
        const py = height * peakRatio - 5;
        gfx.fillTriangle(px - 15, py + 10, px, py, px + 15, py + 10);
      }
    }
    gfx.generateTexture(key, width * 2, height);
    gfx.destroy();
  }

  private generateTreeTexture(key: string, width: number, height: number, color: number, density: number): void {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(color, 0.95);
    gfx.fillRect(0, height * 0.65, width * 2, height * 0.35);
    const treeCount = Math.floor(60 * density);
    for (let i = 0; i < treeCount; i++) {
      const tx = Phaser.Math.Between(0, width * 2);
      const treeH = Phaser.Math.Between(40, 120);
      const treeW = treeH * Phaser.Math.FloatBetween(0.3, 0.6);
      const ty = height * Phaser.Math.FloatBetween(0.55, 0.7);
      const darkerColor = ((color >> 16) & 0xff) > 0x20 ? color - 0x101010 : color;
      gfx.fillStyle(darkerColor, 0.9);
      gfx.fillRect(tx - 3, ty, 6, treeH * 0.3);
      gfx.fillStyle(color, 0.95);
      gfx.fillTriangle(tx, ty - treeH * 0.5, tx - treeW, ty + 5, tx + treeW, ty + 5);
      gfx.fillStyle(color + 0x0a0a0a, 0.3);
      gfx.fillTriangle(tx, ty - treeH * 0.4, tx - treeW * 0.3, ty, tx, ty + 2);
    }
    gfx.generateTexture(key, width * 2, height);
    gfx.destroy();
  }

  private generateGroundTexture(key: string, width: number, groundH: number, color: number): void {
    const gfx = this.scene.add.graphics();
    const lighterColor = ((color >> 16) & 0xff) + 0x20 > 0xff ? color : color + 0x202020;
    gfx.fillStyle(color, 0.6);
    gfx.fillRect(0, 0, width * 2, groundH);
    gfx.fillStyle(lighterColor, 0.7);
    for (let x = 0; x < width * 2; x += 4) {
      const h = Phaser.Math.Between(3, 10);
      gfx.fillTriangle(x, 0, x + 2, -h, x + 4, 0);
    }
    gfx.generateTexture(key, width * 2, groundH);
    gfx.destroy();
  }

  private lerpColors(colors: readonly number[], t: number): number {
    if (colors.length === 1) return colors[0];
    const segment = t * (colors.length - 1);
    const i = Math.floor(segment);
    const frac = segment - i;
    const c1 = colors[Math.min(i, colors.length - 1)];
    const c2 = colors[Math.min(i + 1, colors.length - 1)];
    return Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(c1),
      Phaser.Display.Color.IntegerToColor(c2),
      1, frac
    ).color;
  }

  /** Place ground decorations along the ground line */
  placeGroundDecorations(groundY: number, worldWidth: number, theme: LevelTheme): void {
    this.theme = theme;
    const props = THEME_PROPS[theme] ?? THEME_PROPS.forest;
    const tileWidth = 16; // All props are 16x16 or based on 16px grid
   
    for (let x = 80; x < worldWidth - 100; x += Phaser.Math.Between(40, 120)) {
      // Randomly pick which props to place
      for (const prop of props) {
        if (Math.random() < prop.frequency) {
          const px = x + Phaser.Math.Between(-20, 20);
          const py = groundY + (prop.offsetY || 0);
          try {
            const sprite = this.scene.add.sprite(px, py, prop.key)
              .setScale(prop.scale || 1.5)
              .setDepth(7) // Just behind player
              .setAlpha(Phaser.Math.FloatBetween(0.85, 1.0));
            this.groundDecorations.push(sprite);
          } catch {
            // Prop image might not be available for this theme
          }
        }
      }
    }

    // Place animated butterflies
    if (theme === 'forest') {
      const numButterflies = Phaser.Math.Between(3, 6);
      for (let i = 0; i < numButterflies; i++) {
        try {
          const bx = Phaser.Math.Between(100, worldWidth - 100);
          const by = groundY - Phaser.Math.Between(40, 180);
          const butterfly = this.scene.add.sprite(bx, by, 'anim-butterfly')
            .setScale(1.5)
            .setDepth(12)
            .play('butterfly-fly');

          this.animatedProps.push({
            sprite: butterfly,
            baseY: by,
            floatOffset: Phaser.Math.FloatBetween(10, 30),
            floatSpeed: Phaser.Math.FloatBetween(0.3, 0.8),
          });
        } catch { /* butterfly animation not available */ }
      }
    }
  }

  /** Update parallax and animated props each frame */
  update(): void {
    const camX = this.scene.cameras.main.scrollX;
    const cfg = GameConfig.parallax;

    // Update tile positions
    for (let i = 0; i < this.layers.length; i++) {
      const layerCfg = cfg.layers[i];
      if (this.layers[i]) {
        this.layers[i].tilePositionX = camX * (layerCfg?.scrollFactor ?? (0.05 + i * 0.1));
      }
    }

    // Update clouds (drift slowly)
    const time = this.scene.time.now;
    for (let i = 0; i < this.cloudSprites.length; i++) {
      this.cloudSprites[i].x += 0.02;
    }

    // Update fog
    if (this.fogGfx && cfg.fog.enabled) {
      this.fogOffset += cfg.fog.speed;
      this.drawFog();
    }

    // Update particles
    if (this.particleGfx) {
      const { width, height } = this.scene.cameras.main;
      this.particleGfx.clear();
      for (const p of this.particles) {
        p.y -= p.speed;
        p.x += Math.sin(p.y * cfg.particles.sineFactor) * cfg.particles.sineAmplitude;
        if (p.y < cfg.particles.yLimitOffset) {
          p.y = height + cfg.particles.spawnYOffset;
          p.x = Phaser.Math.Between(camX, camX + width);
        }
        this.particleGfx.fillStyle(cfg.particles.color, p.alpha);
        this.particleGfx.fillCircle(p.x, p.y, p.size);
      }
    }

    // Animate butterflies (gentle floating)
    for (const prop of this.animatedProps) {
      prop.sprite.y = prop.baseY + Math.sin(time * 0.001 * prop.floatSpeed) * prop.floatOffset;
    }
  }

  private drawFog(): void {
    if (!this.fogGfx) return;
    const cfg = GameConfig.parallax.fog;
    const { width, height } = this.scene.cameras.main;
    this.fogGfx.clear();
    this.fogGfx.setScrollFactor(0);
    const strips = 6;
    for (let i = 0; i < strips; i++) {
      const yBase = (height / strips) * i;
      const offset = Math.sin(this.fogOffset + i * 0.5) * 20;
      this.fogGfx.fillStyle(cfg.color, cfg.alpha * (0.5 + (i / strips) * 0.5));
      this.fogGfx.fillRect(-50 + offset, yBase - 10, width + 100, height / strips + 20);
    }
  }

  setTheme(theme: LevelTheme): void {
    this.theme = theme;
  }

  destroy(): void {
    for (const layer of this.layers) { layer.destroy(); }
    this.layers = [];
    for (const cloud of this.cloudSprites) { cloud.destroy(); }
    this.cloudSprites = [];
    for (const decor of this.groundDecorations) { decor.destroy(); }
    this.groundDecorations = [];
    for (const prop of this.animatedProps) { prop.sprite.destroy(); }
    this.animatedProps = [];
    this.particleGfx?.destroy();
    this.fogGfx?.destroy();
  }
}
