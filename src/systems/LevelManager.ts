import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import type { LevelTheme, LevelData } from '../config/GameConfig';
import { logger } from '../utils/logger';

export interface PlatformData {
  x: number;
  y: number;
  w: number;
}

export interface EnemySpawnData {
  x: number;
  patrolLeft: number;
  patrolRight: number;
}

export interface TokenSpawnData {
  x: number;
  y: number;
  type: 'crystal' | 'coin' | 'heart';
}

export class LevelManager {
  private currentLevel = 0;
  private levelData: LevelData;
  private platforms: PlatformData[] = [];
  private enemySpawns: EnemySpawnData[] = [];
  private tokenSpawns: TokenSpawnData[] = [];
  private worldWidth: number;
  private groundY: number;

  constructor(levelIndex: number) {
    this.currentLevel = levelIndex;
    this.levelData = GameConfig.level.levels[levelIndex] ?? GameConfig.level.levels[0];
    this.worldWidth = this.levelData.worldWidth;
    this.groundY = 0; // Set later by GameScene
    logger.info('LevelManager initialized for:', this.levelData.name);
  }

  /** Generate all level data based on config and screen dimensions */
  generateLevel(screenHeight: number): void {
    this.groundY = screenHeight - GameConfig.world.groundYOffset;

    this.generatePlatforms();
    this.generateEnemySpawns();
    this.generateTokenSpawns();

    logger.info('Level generated:', {
      platforms: this.platforms.length,
      enemies: this.enemySpawns.length,
      tokens: this.tokenSpawns.length,
    });
  }

  /** Generate floating platform positions */
  private generatePlatforms(): void {
    this.platforms = [];
    const count = this.levelData.platformCount;
    const sectionWidth = this.worldWidth / (count + 1);

    for (let i = 0; i < count; i++) {
      const x = sectionWidth * (i + 1) + Phaser.Math.Between(-50, 50);
      const y = this.groundY - Phaser.Math.Between(60, 140);
      const w = Phaser.Math.Between(80, 160);
      this.platforms.push({ x, y, w });
    }
  }

  /** Generate enemy spawn points spread across the map */
  private generateEnemySpawns(): void {
    this.enemySpawns = [];
    const count = this.levelData.enemyCount;
    const sectionWidth = this.worldWidth / (count + 1);

    for (let i = 0; i < count; i++) {
      const x = sectionWidth * (i + 1) + Phaser.Math.Between(-30, 30);
      const patrolWidth = Phaser.Math.Between(80, 150);
      this.enemySpawns.push({
        x,
        patrolLeft: x - patrolWidth,
        patrolRight: x + patrolWidth,
      });
    }
  }

  /** Generate token spawn positions */
  private generateTokenSpawns(): void {
    this.tokenSpawns = [];
    const count = this.levelData.tokenCount;
    const tokenTypes: Array<'crystal' | 'coin' | 'heart'> = ['coin', 'coin', 'coin', 'crystal', 'heart'];

    // Spread tokens across the map
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(150, this.worldWidth - 400);
      // Some on ground, some on platforms
      const usePlatform = this.platforms.length > 0 && Phaser.Math.Between(0, 3) > 1;
      let y: number;
      if (usePlatform) {
        const plat = this.platforms[i % this.platforms.length];
        y = plat.y - 30;
      } else {
        y = this.groundY - Phaser.Math.Between(15, 100);
      }

      this.tokenSpawns.push({
        x,
        y,
        type: tokenTypes[i % tokenTypes.length],
      });
    }
  }

  /** Get the current level data */
  getLevelData(): LevelData {
    return this.levelData;
  }

  /** Get the current level index */
  getLevelIndex(): number {
    return this.currentLevel;
  }

  /** Get generated platforms */
  getPlatforms(): PlatformData[] {
    return this.platforms;
  }

  /** Get enemy spawn points */
  getEnemySpawns(): EnemySpawnData[] {
    return this.enemySpawns;
  }

  /** Get token spawn points */
  getTokenSpawns(): TokenSpawnData[] {
    return this.tokenSpawns;
  }

  /** Get the world width for this level */
  getWorldWidth(): number {
    return this.worldWidth;
  }

  /** Get the ground Y position */
  getGroundY(): number {
    return this.groundY;
  }

  /** Get boss spawn X position */
  getBossX(): number {
    return this.levelData.bossX;
  }

  /** Get the theme for this level */
  getTheme(): LevelTheme {
    return this.levelData.backgroundTheme;
  }

  /** Get the level name for display */
  getLevelName(): string {
    return this.levelData.name;
  }

  /** Check if there is a next level */
  hasNextLevel(): boolean {
    return this.currentLevel < GameConfig.level.levels.length - 1;
  }

  /** Get total number of levels */
  getTotalLevels(): number {
    return GameConfig.level.levels.length;
  }

  /** Advance to the next level and regenerate */
  nextLevel(): LevelManager | null {
    if (!this.hasNextLevel()) return null;
    return new LevelManager(this.currentLevel + 1);
  }
}
