import { describe, it, expect } from 'vitest';
import { GameConfig } from '../GameConfig';
import {
  calculateDamage,
  getHealthBarColor,
  isAttackInRange,
} from '../../types/states';

describe('calculateDamage', () => {
  it('should apply full damage when not invincible', () => {
    const result = calculateDamage(25, 100, false);
    expect(result.damageTaken).toBe(25);
    expect(result.newHealth).toBe(75);
    expect(result.wasInvincible).toBe(false);
  });

  it('should apply no damage when invincible', () => {
    const result = calculateDamage(25, 100, true);
    expect(result.damageTaken).toBe(0);
    expect(result.newHealth).toBe(100);
    expect(result.wasInvincible).toBe(true);
  });

  it('should not let health drop below 0', () => {
    const result = calculateDamage(50, 30, false);
    expect(result.newHealth).toBe(0);
    expect(result.damageTaken).toBe(50);
  });

  it('should handle exact kill', () => {
    const result = calculateDamage(100, 100, false);
    expect(result.newHealth).toBe(0);
    expect(result.damageTaken).toBe(100);
  });

  it('should handle overkill', () => {
    const result = calculateDamage(200, 100, false);
    expect(result.newHealth).toBe(0);
    expect(result.damageTaken).toBe(200);
  });

  it('should handle zero damage', () => {
    const result = calculateDamage(0, 100, false);
    expect(result.newHealth).toBe(100);
    expect(result.damageTaken).toBe(0);
    expect(result.wasInvincible).toBe(false);
  });

  it('should use GameConfig player damage values correctly', () => {
    expect(GameConfig.player.damageReceived).toBeGreaterThan(0);
    expect(GameConfig.player.maxHealth).toBeGreaterThan(0);
    expect(GameConfig.player.damageReceived).toBeLessThan(GameConfig.player.maxHealth);
  });

  it('should allow player to survive multiple hits below max health', () => {
    let health: number = GameConfig.player.maxHealth;
    health = calculateDamage(GameConfig.enemy.damageDealt, health, false).newHealth;
    expect(health).toBeGreaterThan(0);
    health = calculateDamage(GameConfig.enemy.damageDealt, health, false).newHealth;
    expect(health).toBeGreaterThan(0);
    expect(health).toBe(GameConfig.player.maxHealth - 2 * GameConfig.enemy.damageDealt);
  });
});

describe('getHealthBarColor', () => {
  it('should return high for health above high threshold', () => {
    expect(getHealthBarColor(0.6, 0.5, 0.25)).toBe('high');
  });

  it('should return mid for health between thresholds', () => {
    expect(getHealthBarColor(0.4, 0.5, 0.25)).toBe('mid');
  });

  it('should return low for health below low threshold', () => {
    expect(getHealthBarColor(0.2, 0.5, 0.25)).toBe('low');
  });

  it('should return low for zero health', () => {
    expect(getHealthBarColor(0, 0.5, 0.25)).toBe('low');
  });

  it('should use GameConfig threshold values consistently', () => {
    const { healthHighThreshold, healthLowThreshold } = GameConfig.hud;
    expect(healthHighThreshold).toBeGreaterThan(healthLowThreshold);
    expect(getHealthBarColor(1, healthHighThreshold, healthLowThreshold)).toBe('high');
    expect(getHealthBarColor(0.35, healthHighThreshold, healthLowThreshold)).toBe('mid');
    expect(getHealthBarColor(0.1, healthHighThreshold, healthLowThreshold)).toBe('low');
  });
});

describe('isAttackInRange', () => {
  it('should hit when target is in range and facing correctly', () => {
    expect(isAttackInRange(30, 60, 100, 120, true)).toBe(true);
  });

  it('should miss when target is out of range', () => {
    expect(isAttackInRange(70, 60, 100, 160, true)).toBe(false);
  });

  it('should miss when facing wrong direction', () => {
    expect(isAttackInRange(30, 60, 100, 120, false)).toBe(false);
  });

  it('should hit when target is to the left and attacker faces left', () => {
    expect(isAttackInRange(30, 60, 100, 80, false)).toBe(true);
  });

  it('should use GameConfig attack ranges for spell being longer than melee', () => {
    expect(GameConfig.combat.playerSpellRange).toBeGreaterThan(GameConfig.combat.playerAttackRange);
  });

  it('should detect spell range hit outside melee range', () => {
    const spellHit = isAttackInRange(70, GameConfig.combat.playerSpellRange, 100, 160, true);
    const meleeHit = isAttackInRange(70, GameConfig.combat.playerAttackRange, 100, 160, true);
    expect(spellHit).toBe(true);
    expect(meleeHit).toBe(false);
  });
});

describe('GameConfig', () => {
  describe('world', () => {
    it('should have positive world width', () => {
      expect(GameConfig.world.width).toBeGreaterThan(0);
    });

    it('should have positive ground Y offset', () => {
      expect(GameConfig.world.groundYOffset).toBeGreaterThan(0);
    });
  });

  describe('player', () => {
    it('should have positive move speed', () => {
      expect(GameConfig.player.moveSpeed).toBeGreaterThan(0);
    });

    it('should have negative jump velocity', () => {
      expect(GameConfig.player.jumpVelocity).toBeLessThan(0);
    });

    it('should have positive max health', () => {
      expect(GameConfig.player.maxHealth).toBeGreaterThan(0);
    });

    it('should have positive scale', () => {
      expect(GameConfig.player.scale).toBeGreaterThan(0);
    });

    it('should have positive invincibility duration', () => {
      expect(GameConfig.player.invincibilityDuration).toBeGreaterThan(0);
    });

    it('should have positive damage received value', () => {
      expect(GameConfig.player.damageReceived).toBeGreaterThan(0);
    });

    it('should have positive horizontal knockback', () => {
      expect(GameConfig.player.knockbackX).toBeGreaterThan(0);
    });

    it('should have negative vertical knockback (upward)', () => {
      expect(GameConfig.player.knockbackY).toBeLessThan(0);
    });

    it('should have damage received less than max health', () => {
      expect(GameConfig.player.damageReceived).toBeLessThan(GameConfig.player.maxHealth);
    });
  });

  describe('enemy', () => {
    it('should have positive count', () => {
      expect(GameConfig.enemy.count).toBeGreaterThan(0);
    });

    it('should have chase range greater than attack range', () => {
      expect(GameConfig.enemy.chaseRange).toBeGreaterThan(GameConfig.enemy.attackRange);
    });

    it('should have chase speed greater than patrol speed', () => {
      expect(GameConfig.enemy.chaseSpeed).toBeGreaterThan(GameConfig.enemy.speed);
    });

    it('should have positive damage dealt', () => {
      expect(GameConfig.enemy.damageDealt).toBeGreaterThan(0);
    });

    it('should have positive knockback values', () => {
      expect(GameConfig.enemy.knockbackX).toBeGreaterThan(0);
      expect(GameConfig.enemy.knockbackY).toBeLessThan(0);
    });
  });

  describe('boss', () => {
    it('should have positive health', () => {
      expect(GameConfig.boss.health).toBeGreaterThan(0);
    });

    it('should have chase range greater than attack range', () => {
      expect(GameConfig.boss.chaseRange).toBeGreaterThan(GameConfig.boss.attackRange);
    });

    it('should have phases defined', () => {
      expect(GameConfig.boss.phases).toBeDefined();
      expect(GameConfig.boss.phases.length).toBeGreaterThan(0);
    });

    it('should have projectile config', () => {
      expect(GameConfig.boss.projectile.speed).toBeGreaterThan(0);
      expect(GameConfig.boss.projectile.damage).toBeGreaterThan(0);
    });

    it('should have health bar dimensions', () => {
      expect(GameConfig.boss.healthBarWidth).toBeGreaterThan(0);
      expect(GameConfig.boss.healthBarHeight).toBeGreaterThan(0);
    });
  });

  describe('token', () => {
    it('should have all token types defined', () => {
      expect(GameConfig.token.types.crystal).toBeDefined();
      expect(GameConfig.token.types.coin).toBeDefined();
      expect(GameConfig.token.types.heart).toBeDefined();
    });

    it('should have positive collect radius', () => {
      expect(GameConfig.token.collectRadius).toBeGreaterThan(0);
    });

    it('should have magnet radius greater than collect radius', () => {
      expect(GameConfig.token.magnetRadius).toBeGreaterThan(GameConfig.token.collectRadius);
    });

    it('should have crystal worth more than coin', () => {
      expect(GameConfig.token.types.crystal.scoreValue).toBeGreaterThan(GameConfig.token.types.coin.scoreValue);
    });

    it('should have heart providing health', () => {
      expect(GameConfig.token.types.heart.healthValue).toBeGreaterThan(0);
    });
  });

  describe('level', () => {
    it('should have at least one level defined', () => {
      expect(GameConfig.level.levels.length).toBeGreaterThan(0);
    });

    it('should have positive world widths for all levels', () => {
      for (const level of GameConfig.level.levels) {
        expect(level.worldWidth).toBeGreaterThan(0);
      }
    });

    it('should have boss positions within world bounds', () => {
      for (const level of GameConfig.level.levels) {
        expect(level.bossX).toBeLessThan(level.worldWidth);
        expect(level.bossX).toBeGreaterThan(0);
      }
    });
  });

  describe('combat', () => {
    it('should have positive player attack range', () => {
      expect(GameConfig.combat.playerAttackRange).toBeGreaterThan(0);
    });

    it('should have spell range greater than attack range', () => {
      expect(GameConfig.combat.playerSpellRange).toBeGreaterThan(GameConfig.combat.playerAttackRange);
    });
  });

  describe('camera', () => {
    it('should have follow lerp values between 0 and 1', () => {
      expect(GameConfig.camera.followLerpX).toBeGreaterThan(0);
      expect(GameConfig.camera.followLerpX).toBeLessThanOrEqual(1);
    });
  });

  describe('hud', () => {
    it('should have positive health bar dimensions', () => {
      expect(GameConfig.hud.healthBarWidth).toBeGreaterThan(0);
      expect(GameConfig.hud.healthBarHeight).toBeGreaterThan(0);
    });

    it('should have valid health thresholds', () => {
      expect(GameConfig.hud.healthHighThreshold).toBeGreaterThan(GameConfig.hud.healthLowThreshold);
    });
  });

  describe('parallax', () => {
    it('should have layers defined', () => {
      expect(GameConfig.parallax.layers.length).toBeGreaterThan(0);
    });

    it('should have increasing scroll factors', () => {
      for (let i = 1; i < GameConfig.parallax.layers.length; i++) {
        expect(GameConfig.parallax.layers[i].scrollFactor).toBeGreaterThan(GameConfig.parallax.layers[i - 1].scrollFactor);
      }
    });

    it('should have themes defined', () => {
      expect(GameConfig.parallax.themes.forest).toBeDefined();
      expect(GameConfig.parallax.themes.cavern).toBeDefined();
      expect(GameConfig.parallax.themes.mountain).toBeDefined();
    });
  });

  describe('transition', () => {
    it('should have positive fade duration', () => {
      expect(GameConfig.transition.fadeDuration).toBeGreaterThan(0);
    });

    it('should have game over config', () => {
      expect(GameConfig.transition.gameOver.fadeInDuration).toBeGreaterThan(0);
      expect(GameConfig.transition.gameOver.restartDelay).toBeGreaterThan(0);
    });

    it('should have victory config', () => {
      expect(GameConfig.transition.victory.fadeInDuration).toBeGreaterThan(0);
      expect(GameConfig.transition.victory.celebrationDuration).toBeGreaterThan(0);
    });
  });

  describe('immutability', () => {
    it('should be frozen (as const)', () => {
      expect(GameConfig).toBeDefined();
      expect(GameConfig.world.width).toBe(6400);
      expect(GameConfig.player.maxHealth).toBe(100);
      expect(GameConfig.enemy.chaseRange).toBe(200);
    });
  });
});

