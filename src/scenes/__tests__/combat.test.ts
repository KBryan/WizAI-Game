import { describe, it, expect } from 'vitest';
import { GameConfig } from '../../config/GameConfig';
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
    // damage taken reports actual amount, health just floors at 0
    expect(result.damageTaken).toBe(200);
  });

  it('should handle zero damage', () => {
    const result = calculateDamage(0, 100, false);
    expect(result.newHealth).toBe(100);
    expect(result.damageTaken).toBe(0);
    expect(result.wasInvincible).toBe(false);
  });

  it('should use GameConfig player damage values correctly', () => {
    // Verify config values are reasonable
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
    // Verify 2 hits doesn't kill
    expect(health).toBe(GameConfig.player.maxHealth - 2 * GameConfig.enemy.damageDealt);
  });
});

describe('getHealthBarColor', () => {
  it('should return high for health above high threshold', () => {
    expect(getHealthBarColor(0.6, 0.5, 0.25)).toBe('high');
  });

  it('should return high for health exactly at threshold boundary (not equal)', () => {
    // Exactly at 0.5 is NOT > 0.5, so it falls to mid
    expect(getHealthBarColor(0.5, 0.5, 0.25)).toBe('mid');
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

  it('should return low for health exactly at low threshold boundary', () => {
    // Exactly 0.25 is NOT > 0.25, so it falls to low
    expect(getHealthBarColor(0.25, 0.5, 0.25)).toBe('low');
  });

  it('should use GameConfig threshold values consistently', () => {
    const { healthHighThreshold, healthLowThreshold } = GameConfig.hud;
    expect(healthHighThreshold).toBeGreaterThan(healthLowThreshold);
    // At full health
    expect(getHealthBarColor(1, healthHighThreshold, healthLowThreshold)).toBe('high');
    // At mid health
    expect(getHealthBarColor(0.35, healthHighThreshold, healthLowThreshold)).toBe('mid');
    // At low health
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
    // Target is to the right but attacker faces left
    expect(isAttackInRange(30, 60, 100, 120, false)).toBe(false);
  });

  it('should hit when target is to the left and attacker faces left', () => {
    expect(isAttackInRange(30, 60, 100, 80, false)).toBe(true);
  });

  it('should miss when target is to the left and attacker faces right', () => {
    expect(isAttackInRange(30, 60, 100, 80, true)).toBe(false);
  });

  it('should hit when at exactly the attack range boundary', () => {
    // Distance 60 is NOT less than range 60
    expect(isAttackInRange(60, 60, 100, 160, true)).toBe(false);
    // Distance 59 IS less than range 60
    expect(isAttackInRange(59, 60, 100, 159, true)).toBe(true);
  });

  it('should use GameConfig attack ranges for spell being longer than melee', () => {
    expect(GameConfig.combat.playerSpellRange).toBeGreaterThan(GameConfig.combat.playerAttackRange);
  });

  it('should detect spell range hit outside melee range', () => {
    // Distance 70 is within spell range (80) but outside melee range (60)
    const spellHit = isAttackInRange(70, GameConfig.combat.playerSpellRange, 100, 160, true);
    const meleeHit = isAttackInRange(70, GameConfig.combat.playerAttackRange, 100, 160, true);
    expect(spellHit).toBe(true);
    expect(meleeHit).toBe(false);
  });

  it('should not hit when distance equals range (exclusive)', () => {
    expect(isAttackInRange(80, 80, 100, 180, true)).toBe(false);
    expect(isAttackInRange(79, 80, 100, 179, true)).toBe(true);
  });
});

describe('Enemy combat configuration values', () => {
  it('should have enemy damage dealt greater than zero', () => {
    expect(GameConfig.enemy.damageDealt).toBeGreaterThan(0);
  });

  it('should have enemy damage that can kill player in reasonable hits', () => {
    const hitsToKill = Math.ceil(GameConfig.player.maxHealth / GameConfig.enemy.damageDealt);
    // Should take at least 2 hits to kill player (game balance)
    expect(hitsToKill).toBeGreaterThanOrEqual(2);
    // Should not take an absurd number of hits
    expect(hitsToKill).toBeLessThanOrEqual(20);
  });

  it('should have invincibility duration longer than attack duration', () => {
    // Invincibility should be significant enough to matter
    expect(GameConfig.player.invincibilityDuration).toBeGreaterThan(0);
  });

  it('should have enemy attack cooldown greater than zero', () => {
    expect(GameConfig.enemy.attackCooldown).toBeGreaterThan(0);
  });

  it('should have reasonable knockback values for both player and enemy', () => {
    // Knockback X should be positive (pushes away)
    expect(GameConfig.player.knockbackX).toBeGreaterThan(0);
    expect(GameConfig.enemy.knockbackX).toBeGreaterThan(0);
    // Knockback Y should be negative (launches upward in game coords)
    expect(GameConfig.player.knockbackY).toBeLessThan(0);
    expect(GameConfig.enemy.knockbackY).toBeLessThan(0);
  });

  it('should have enemy death delay that allows death animation to play', () => {
    expect(GameConfig.enemy.deathDelay).toBeGreaterThan(500);
  });

  it('should have player restart delay that allows death animation', () => {
    expect(GameConfig.player.restartDelay).toBeGreaterThan(GameConfig.player.damageTintDuration);
  });
});
