import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { logger } from '../utils/logger';
import type { TokenType } from '../config/GameConfig';

interface TokenConfig {
  scoreValue: number;
  healthValue: number;
  scale: number;
  tint: number;
  glowColor: number;
  glowAlpha: number;
  bounceHeight: number;
  bounceDuration: number;
  floatAmplitude: number;
  floatDuration: number;
}

export interface TokenSprite {
  sprite: Phaser.GameObjects.Sprite;
  glow: Phaser.GameObjects.Ellipse;
  gfx: Phaser.GameObjects.Graphics | null;
  type: TokenType;
  collected: boolean;
  baseY: number;
}

export class TokenSystem {
  private scene: Phaser.Scene;
  private tokens: TokenSprite[] = [];
  private totalCount = 0;
  private collectedCount = 0;
  private scoreFromTokens = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Generate token positions for a level */
  spawnTokens(groundY: number, worldWidth: number, count: number, platforms: { x: number; y: number; w: number }[]): void {
    const tokenTypes: TokenType[] = ['coin', 'coin', 'coin', 'crystal', 'heart'];

    const positions: { x: number; y: number }[] = [];
    for (let x = 200; x < worldWidth - 400 && positions.length < count * 0.6; x += Phaser.Math.Between(150, 350)) {
      positions.push({ x, y: groundY - 30 });
    }
    for (const plat of platforms) {
      if (positions.length >= count) break;
      positions.push({ x: plat.x, y: plat.y - 30 });
    }
    while (positions.length < count) {
      const x = Phaser.Math.Between(150, worldWidth - 400);
      const y = groundY - Phaser.Math.Between(20, 120);
      positions.push({ x, y });
    }

    for (let i = 0; i < Math.min(count, positions.length); i++) {
      const pos = positions[i];
      const type = tokenTypes[i % tokenTypes.length];
      const config = this.getTokenConfig(type);
      this.createToken(pos.x, pos.y, type, config);
    }

    this.totalCount = this.tokens.length;
    logger.info('Spawned', this.totalCount, 'tokens');
  }

  private getTokenConfig(type: TokenType): TokenConfig {
    const cfg = GameConfig.token.types[type];
    return {
      scoreValue: cfg.scoreValue as number,
      healthValue: cfg.healthValue as number,
      scale: cfg.scale as number,
      tint: cfg.tint as number,
      glowColor: cfg.glowColor as number,
      glowAlpha: cfg.glowAlpha as number,
      bounceHeight: cfg.bounceHeight as number,
      bounceDuration: cfg.bounceDuration as number,
      floatAmplitude: cfg.floatAmplitude as number,
      floatDuration: cfg.floatDuration as number,
    };
  }

  /** Create a single token at a position */
  private createToken(x: number, y: number, type: TokenType, config: TokenConfig): void {
    const glow = this.scene.add.ellipse(
      x, y,
      24 * config.scale, 20 * config.scale,
      config.glowColor, config.glowAlpha
    ).setDepth(8);

    const tokenGfx = this.scene.add.graphics().setDepth(9);
    const sprite = this.scene.add.sprite(x, y, 'char-blue-1', 0).setVisible(false);

    if (type === 'heart') {
      this.drawHeart(tokenGfx, x, y, config.scale, config.tint);
    } else if (type === 'crystal') {
      this.drawCrystal(tokenGfx, x, y, config.scale, config.tint);
    } else {
      this.drawCoin(tokenGfx, x, y, config.scale, config.tint);
    }

    this.scene.tweens.add({
      targets: [tokenGfx, glow],
      y: y - config.floatAmplitude,
      duration: config.floatDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const token: TokenSprite = {
      sprite,
      glow,
      gfx: tokenGfx,
      type,
      collected: false,
      baseY: y,
    };
    this.tokens.push(token);
  }

  private drawHeart(gfx: Phaser.GameObjects.Graphics, x: number, y: number, scale: number, color: number): void {
    gfx.fillStyle(color, 1);
    const s = scale * 4;
    gfx.fillCircle(x - s * 0.3, y - s * 0.2, s * 0.5);
    gfx.fillCircle(x + s * 0.3, y - s * 0.2, s * 0.5);
    gfx.fillTriangle(x - s * 0.8, y, x + s * 0.8, y, x, y + s * 0.9);
    gfx.fillStyle(0xffffff, 0.4);
    gfx.fillCircle(x - s * 0.2, y - s * 0.4, s * 0.15);
  }

  private drawCrystal(gfx: Phaser.GameObjects.Graphics, x: number, y: number, scale: number, color: number): void {
    gfx.fillStyle(color, 1);
    const s = scale * 3;
    gfx.fillTriangle(x, y - s, x - s * 0.6, y, x + s * 0.6, y);
    gfx.fillTriangle(x, y + s * 0.8, x - s * 0.6, y, x + s * 0.6, y);
    gfx.fillStyle(0xffffff, 0.5);
    gfx.fillTriangle(x, y - s * 0.8, x - s * 0.15, y - s * 0.2, x + s * 0.15, y - s * 0.2);
    gfx.lineStyle(1, 0xffffff, 0.3);
    gfx.beginPath();
    gfx.moveTo(x, y - s);
    gfx.lineTo(x, y + s * 0.8);
    gfx.strokePath();
  }

  private drawCoin(gfx: Phaser.GameObjects.Graphics, x: number, y: number, scale: number, color: number): void {
    gfx.fillStyle(color, 1);
    const r = scale * 5;
    gfx.fillCircle(x, y, r);
    gfx.fillStyle(0xffffff, 0.3);
    gfx.fillCircle(x, y, r * 0.6);
    gfx.fillStyle(0xffffff, 0.5);
    gfx.fillCircle(x - r * 0.2, y - r * 0.2, r * 0.25);
    gfx.lineStyle(2, color, 0.8);
    gfx.strokeCircle(x, y, r);
  }

  /** Check token collection each frame */
  update(time: number, playerX: number, playerY: number): { scoreGained: number; healthGained: number } {
    let totalScore = 0;
    let totalHealth = 0;
    const cfg = GameConfig.token;

    for (const token of this.tokens) {
      if (token.collected) continue;

      const dist = Phaser.Math.Distance.Between(playerX, playerY, token.glow.x, token.glow.y);

      if (dist < cfg.magnetRadius) {
        const angle = Phaser.Math.Angle.Between(token.glow.x, token.glow.y, playerX, playerY);
        const speed = cfg.magnetSpeed as number * (1 - dist / (cfg.magnetRadius as number));
        token.glow.x += Math.cos(angle) * speed * 0.016;
        token.glow.y += Math.sin(angle) * speed * 0.016;
      }

      if (dist < (cfg.collectRadius as number)) {
        const typeCfg = this.getTokenConfig(token.type);
        totalScore += typeCfg.scoreValue;
        totalHealth += typeCfg.healthValue;
        token.collected = true;
        this.collectedCount++;
        this.scoreFromTokens += typeCfg.scoreValue;

        this.playCollectEffect(token.glow.x, token.glow.y, typeCfg, token.type);
        token.glow.destroy();
        token.sprite.destroy();
        if (token.gfx) token.gfx.destroy();
        logger.debug('Collected', token.type, 'at', token.glow.x, token.glow.y);
      }
    }

    return { scoreGained: totalScore, healthGained: totalHealth };
  }

  private playCollectEffect(
    x: number, y: number,
    config: TokenConfig,
    type: TokenType
  ): void {
    const cfg = GameConfig.token;

    const label = type === 'heart' ? `+${config.healthValue} HP`
      : `+${config.scoreValue}`;
    const color = type === 'heart' ? '#ff4466' : type === 'crystal' ? '#44ddff' : '#ffdd44';

    const text = this.scene.add.text(x, y - 10, label, {
      fontSize: cfg.collectTextFontSize as string,
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50).setScrollFactor(1);

    this.scene.tweens.add({
      targets: text,
      y: y - (cfg.collectTextRiseSpeed as number),
      alpha: 0,
      duration: cfg.collectTextDuration as number,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });

    for (let i = 0; i < (cfg.particleCount as number); i++) {
      const p = this.scene.add.graphics().setDepth(49);
      const angle = (i / (cfg.particleCount as number)) * Math.PI * 2;
      p.fillStyle(config.glowColor, 0.8);
      p.fillCircle(0, 0, 2);
      p.setPosition(x, y);

      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * (cfg.particleSpeed as number),
        y: y + Math.sin(angle) * (cfg.particleSpeed as number) - 20,
        alpha: 0,
        duration: cfg.particleLifespan as number,
        onComplete: () => p.destroy(),
      });
    }
  }

  private updateCollectEffects(): void {
    // Effects are self-managing via tweens
  }

  getStats(): { total: number; collected: number; score: number } {
    return {
      total: this.totalCount,
      collected: this.collectedCount,
      score: this.scoreFromTokens,
    };
  }

  destroy(): void {
    for (const token of this.tokens) {
      token.glow.destroy();
      token.sprite.destroy();
      if (token.gfx) token.gfx.destroy();
    }
    this.tokens = [];
  }
}
