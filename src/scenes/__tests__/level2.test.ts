import { describe, it, expect } from 'vitest';
import { GameConfig } from '../../config/GameConfig';
import { Level2Config } from '../../config/Level2Config';

describe('Level2Config', () => {
  it('should have exactly 10 enemy spawn points', () => {
    expect(Level2Config.enemySpawnPoints).toHaveLength(10);
  });

  it('should have platform positions spanning the full world width', () => {
    const maxX = Math.max(...Level2Config.platformPositions.map(p => p.x + p.w / 2));
    expect(maxX).toBeGreaterThan(Level2Config.worldWidth * 0.8);
    const minX = Math.min(...Level2Config.platformPositions.map(p => p.x - p.w / 2));
    expect(minX).toBeGreaterThanOrEqual(0);
  });

  it('should have final boss spawn near the end of the world', () => {
    expect(Level2Config.finalBossSpawn.x).toBeGreaterThan(Level2Config.worldWidth * 0.9);
  });

  it('should have world width of 4800', () => {
    expect(Level2Config.worldWidth).toBe(4800);
  });

  it('should have player spawn at the start', () => {
    expect(Level2Config.playerSpawn.x).toBe(100);
  });

  it('should have a dark background tint', () => {
    expect(Level2Config.backgroundTint).toBe(0x1a0a2e);
  });
});

describe('GameConfig level settings', () => {
  it('should have level1 enemyCount of 6', () => {
    expect(GameConfig.levels.level1.enemyCount).toBe(6);
  });

  it('should have level2 enemyCount of 10', () => {
    expect(GameConfig.levels.level2.enemyCount).toBe(10);
  });

  it('should have level2 worldWidth greater than level1', () => {
    expect(GameConfig.levels.level2.worldWidth).toBeGreaterThan(GameConfig.levels.level1.worldWidth);
  });

  it('should have level1 bossName as FOREST GUARDIAN', () => {
    expect(GameConfig.levels.level1.bossName).toBe('FOREST GUARDIAN');
  });

  it('should have level2 bossName as SHADOW LORD', () => {
    expect(GameConfig.levels.level2.bossName).toBe('SHADOW LORD');
  });
});

describe('Final Boss stats', () => {
  it('should have health greater than regular boss', () => {
    expect(GameConfig.finalBoss.health).toBeGreaterThan(GameConfig.boss.health);
  });

  it('should have damageDealt greater than regular boss', () => {
    expect(GameConfig.finalBoss.damageDealt).toBeGreaterThan(GameConfig.boss.damageDealt);
  });

  it('should have scale greater than regular boss', () => {
    expect(GameConfig.finalBoss.scale).toBeGreaterThan(GameConfig.boss.scale);
  });

  it('should have chargeSpeed greater than regular boss', () => {
    expect(GameConfig.finalBoss.chargeSpeed).toBeGreaterThan(GameConfig.boss.chargeSpeed);
  });

  it('should have deathScore greater than regular boss', () => {
    expect(GameConfig.finalBoss.deathScore).toBeGreaterThan(GameConfig.boss.deathScore);
  });

  it('should have positive rage threshold', () => {
    expect(GameConfig.finalBoss.rageThreshold).toBeGreaterThan(0);
    expect(GameConfig.finalBoss.rageThreshold).toBeLessThanOrEqual(1);
  });

  it('should have rage speed multiplier greater than 1', () => {
    expect(GameConfig.finalBoss.rageSpeedMultiplier).toBeGreaterThan(1);
  });
});

describe('Level 2 enemy stats', () => {
  it('should have health greater than level 1 enemy', () => {
    expect(GameConfig.level2Enemy.health).toBeGreaterThan(GameConfig.enemy.health);
  });

  it('should have speed greater than level 1 enemy', () => {
    expect(GameConfig.level2Enemy.speed).toBeGreaterThan(GameConfig.enemy.speed);
  });

  it('should have chaseSpeed greater than level 1 enemy', () => {
    expect(GameConfig.level2Enemy.chaseSpeed).toBeGreaterThan(GameConfig.enemy.chaseSpeed);
  });

  it('should have damageDealt greater than level 1 enemy', () => {
    expect(GameConfig.level2Enemy.damageDealt).toBeGreaterThan(GameConfig.enemy.damageDealt);
  });

  it('should have deathScore greater than level 1 enemy', () => {
    expect(GameConfig.level2Enemy.deathScore).toBeGreaterThan(GameConfig.enemy.deathScore);
  });

  it('should have count of 10', () => {
    expect(GameConfig.level2Enemy.count).toBe(10);
  });
});
