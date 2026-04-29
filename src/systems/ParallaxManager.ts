import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import type { LevelTheme } from '../config/GameConfig';
import { logger } from '../utils/logger';

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
}

export class ParallaxManager {
  private scene: Phaser.Scene;
  private layers: Phaser.GameObjects.TileSprite[] = [];
  private theme: LevelTheme;
  private particleGfx: Phaser.GameObjects.Graphics | null = null;
  private particles: Particle[] = [];
  private fogGfx: Phaser.GameObjects.Graphics | null = null;
  private fogOffset = 0;
  private generatedTextures: string[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.theme = 'forest';
  }

  /** Generate all parallax textures for the given theme */
  generateTextures(theme: LevelTheme): void {
    this.theme = theme;
    const { width, height } = this.scene.cameras.main;
    const cfg = GameConfig.parallax;
    const themeColors = cfg.themes[theme];
    logger.info('Generating parallax textures for theme:', theme);

    // Sky gradient
    this.generateSkyTexture(width, height, themeColors.skyColors);
    // Far mountains
    this.generateMountainTexture('parallax-mountains-far', width, height, themeColors.mountainFarColor, 0.6, 0.35);
    // Near mountains
    this.generateMountainTexture('parallax-mountains-near', width, height, themeColors.mountainNearColor, 0.7, 0.45);
    // Far trees
    this.generateTreeTexture('parallax-trees-far', width, height, themeColors.treeFarColor, 0.2);
    // Near trees
    this.generateTreeTexture('parallax-trees-near', width, height, themeColors.treeNearColor, 0.35);
    // Ground foreground
    this.generateGroundTexture('parallax-ground-fg', width, 60, themeColors.groundColor);
  }

  /** Create parallax layer sprites */
  createLayers(): void {
    const { width, height } = this.scene.cameras.main;
    const cfg = GameConfig.parallax;

    for (const layerCfg of cfg.layers) {
      const key = 'parallax-' + layerCfg.key;
      const layer = this.scene.add.tileSprite(0, 0, width, height, key)
        .setOrigin(0, 0)
        .setScrollFactor(layerCfg.scrollFactor)
        .setDepth(layerCfg.key === 'sky' ? -30 : layerCfg.key === 'ground-fg' ? 5 : -20 + cfg.layers.indexOf(layerCfg))
        .setAlpha(layerCfg.alpha);
      this.layers.push(layer);
    }

    // Fog layer
    if (cfg.fog.enabled) {
      this.fogGfx = this.scene.add.graphics().setDepth(-5).setScrollFactor(0);
    }

    // Particles
    const particleCfg = cfg.particles;
    this.particleGfx = this.scene.add.graphics().setDepth(11);
    for (let i = 0; i < particleCfg.count; i++) {
      this.particles.push({
        x: Phaser.Math.Between(0, width),
        y: Phaser.Math.Between(0, height + particleCfg.yLimitOffset),
        speed: Phaser.Math.FloatBetween(particleCfg.speedMin, particleCfg.speedMax),
        size: Phaser.Math.FloatBetween(particleCfg.sizeMin, particleCfg.sizeMax),
        alpha: Phaser.Math.FloatBetween(particleCfg.alphaMin, particleCfg.alphaMax),
      });
    }
  }

  /** Update parallax scrolling each frame */
  update(): void {
    const camX = this.scene.cameras.main.scrollX;
    const cfg = GameConfig.parallax;
    const themeColors = cfg.themes[this.theme];

    // Update tile positions based on camera scroll
    for (let i = 0; i < this.layers.length; i++) {
      const layerCfg = cfg.layers[i];
      if (this.layers[i]) {
        this.layers[i].tilePositionX = camX * layerCfg.scrollFactor;
      }
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
  }

  /** Generate sky gradient texture */
  private generateSkyTexture(width: number, height: number, colors: readonly number[]): void {
    const key = 'parallax-sky';
    const gfx = this.scene.add.graphics();

    // Vertical gradient using multiple fills
    const steps = 64;
    const stepH = height / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const color = this.lerpColors(colors, t);
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, i * stepH, width * 2, stepH + 1);
    }

    // Stars (small dots for atmosphere)
    gfx.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, width * 2);
      const sy = Phaser.Math.Between(0, height * 0.5);
      const sr = Phaser.Math.FloatBetween(0.5, 1.5);
      gfx.fillCircle(sx, sy, sr);
    }

    // Moon
    gfx.fillStyle(0xeeeeff, 0.8);
    gfx.fillCircle(width * 1.5, height * 0.15, 30);
    gfx.fillStyle(this.theme === 'cavern' ? 0x0a0a1a : this.theme === 'mountain' ? 0x2a1a3a : 0x1a1a3a, 0.9);
    gfx.fillCircle(width * 1.5 + 8, height * 0.15 - 4, 26);

    gfx.generateTexture(key, width * 2, height);
    gfx.destroy();
    this.generatedTextures.push(key);
  }

  /** Generate mountain silhouette texture */
  private generateMountainTexture(key: string, width: number, height: number, color: number, peakRatio: number, baseRatio: number): void {
    const gfx = this.scene.add.graphics();
    const h = height;

    // Draw mountain silhouettes using procedural ridges
    gfx.fillStyle(color, 0.9);
    gfx.beginPath();
    gfx.moveTo(0, h);

    // Generate multiple peaks across the width
    const numPeaks = Phaser.Math.Between(5, 9);
    const segmentW = (width * 2) / numPeaks;
    for (let i = 0; i <= numPeaks; i++) {
      const x = i * segmentW;
      const peakH = h * (peakRatio + Phaser.Math.FloatBetween(-0.08, 0.08));
      const baseH = h * baseRatio;

      if (i === 0) {
        gfx.lineTo(x, baseH);
      } else if (i < numPeaks) {
        // Sawtooth peak
        const midX = x - segmentW * 0.5;
        gfx.lineTo(midX + Phaser.Math.FloatBetween(-20, 20), peakH);
        gfx.lineTo(x, baseH + Phaser.Math.FloatBetween(-10, 10));
      } else {
        gfx.lineTo(x, baseH);
      }
    }
    gfx.lineTo(width * 2, h);
    gfx.closePath();
    gfx.fillPath();

    // Snow caps for high mountains
    if (peakRatio > 0.5) {
      gfx.fillStyle(0xdddddd, 0.3);
      for (let i = 1; i < numPeaks; i++) {
        const px = i * segmentW - segmentW * 0.5 + Phaser.Math.FloatBetween(-20, 20);
        const py = h * peakRatio - 5;
        gfx.fillTriangle(px - 15, py + 10, px, py, px + 15, py + 10);
      }
    }

    gfx.generateTexture(key, width * 2, h);
    gfx.destroy();
    this.generatedTextures.push(key);
  }

  /** Generate tree line texture */
  private generateTreeTexture(key: string, width: number, height: number, color: number, density: number): void {
    const gfx = this.scene.add.graphics();
    const h = height;

    // Ground strip
    gfx.fillStyle(color, 0.95);
    gfx.fillRect(0, h * 0.65, width * 2, h * 0.35);

    // Trees (triangles + trunks)
    const treeCount = Math.floor(60 * density);
    for (let i = 0; i < treeCount; i++) {
      const tx = Phaser.Math.Between(0, width * 2);
      const treeH = Phaser.Math.Between(40, 120);
      const treeW = treeH * Phaser.Math.FloatBetween(0.3, 0.6);
      const ty = h * Phaser.Math.FloatBetween(0.55, 0.7);

      // Trunk
      const darkerColor = ((color >> 16) & 0xff) > 0x20 ? color - 0x101010 : color;
      gfx.fillStyle(darkerColor, 0.9);
      gfx.fillRect(tx - 3, ty, 6, treeH * 0.3);

      // Canopy (triangle)
      gfx.fillStyle(color, 0.95);
      gfx.fillTriangle(
        tx, ty - treeH * 0.5,
        tx - treeW, ty + 5,
        tx + treeW, ty + 5
      );

      // Lighter highlight on one side
      gfx.fillStyle(color + 0x0a0a0a, 0.3);
      gfx.fillTriangle(
        tx, ty - treeH * 0.4,
        tx - treeW * 0.3, ty,
        tx, ty + 2
      );
    }

    gfx.generateTexture(key, width * 2, h);
    gfx.destroy();
    this.generatedTextures.push(key);
  }

  /** Generate ground foreground overlay texture */
  private generateGroundTexture(key: string, width: number, groundH: number, color: number): void {
    const gfx = this.scene.add.graphics();

    // Grass tufts
    const lighterColor = ((color >> 16) & 0xff) + 0x20 > 0xff ? color : color + 0x202020;
    gfx.fillStyle(color, 0.6);
    gfx.fillRect(0, 0, width * 2, groundH);

    // Grass blades on top
    gfx.fillStyle(lighterColor, 0.7);
    for (let x = 0; x < width * 2; x += 4) {
      const h = Phaser.Math.Between(3, 10);
      gfx.fillTriangle(x, 0, x + 2, -h, x + 4, 0);
    }

    gfx.generateTexture(key, width * 2, groundH);
    gfx.destroy();
    this.generatedTextures.push(key);
  }

  /** Draw fog overlay */
  private drawFog(): void {
    if (!this.fogGfx) return;
    const cfg = GameConfig.parallax.fog;
    const { width, height } = this.scene.cameras.main;

    this.fogGfx.clear();
    this.fogGfx.setScrollFactor(0);

    // Layered fog strips
    const strips = 6;
    for (let i = 0; i < strips; i++) {
      const yBase = (height / strips) * i;
      const offset = Math.sin(this.fogOffset + i * 0.5) * 20;
      this.fogGfx.fillStyle(cfg.color, cfg.alpha * (0.5 + (i / strips) * 0.5));
      this.fogGfx.fillRect(
        -50 + offset,
        yBase - 10,
        width + 100,
        height / strips + 20
      );
    }
  }

  /** Interpolate between an array of colors */
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

  /** Change theme (for level transitions) */
  setTheme(theme: LevelTheme): void {
    this.theme = theme;
    // Would need to regenerate textures and update layers
    // For now, this is called during scene transitions
  }

  /** Clean up all resources */
  destroy(): void {
    for (const layer of this.layers) {
      layer.destroy();
    }
    this.layers = [];
    this.particleGfx?.destroy();
    this.fogGfx?.destroy();
    // Remove generated textures
    for (const key of this.generatedTextures) {
      this.scene.textures.remove(key);
    }
    this.generatedTextures = [];
  }
}
