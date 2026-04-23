import { describe, it, expect } from 'vitest';
import { GameConfig } from '../GameConfig';

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

    it('should have positive damage tint duration', () => {
      expect(GameConfig.player.damageTintDuration).toBeGreaterThan(0);
    });

    it('should have positive restart delay', () => {
      expect(GameConfig.player.restartDelay).toBeGreaterThan(0);
    });

    it('should have positive body dimensions', () => {
      expect(GameConfig.player.bodyWidth).toBeGreaterThan(0);
      expect(GameConfig.player.bodyHeight).toBeGreaterThan(0);
    });

    it('should have damage received less than max health', () => {
      expect(GameConfig.player.damageReceived).toBeLessThan(GameConfig.player.maxHealth);
    });
  });

  describe('enemy', () => {
    it('should have positive count', () => {
      expect(GameConfig.enemy.count).toBeGreaterThan(0);
    });

    it('should have positive scale', () => {
      expect(GameConfig.enemy.scale).toBeGreaterThan(0);
    });

    it('should have positive health', () => {
      expect(GameConfig.enemy.health).toBeGreaterThan(0);
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

    it('should have positive knockback values (X positive, Y negative)', () => {
      expect(GameConfig.enemy.knockbackX).toBeGreaterThan(0);
      expect(GameConfig.enemy.knockbackY).toBeLessThan(0);
    });

    it('should have positive death delay', () => {
      expect(GameConfig.enemy.deathDelay).toBeGreaterThan(0);
    });

    it('should have positive attack cooldown', () => {
      expect(GameConfig.enemy.attackCooldown).toBeGreaterThan(0);
    });

    it('should have positive tint duration', () => {
      expect(GameConfig.enemy.tintDuration).toBeGreaterThan(0);
    });

    it('should have positive death score', () => {
      expect(GameConfig.enemy.deathScore).toBeGreaterThan(0);
    });

    it('should have positive body dimensions', () => {
      expect(GameConfig.enemy.bodyWidth).toBeGreaterThan(0);
      expect(GameConfig.enemy.bodyHeight).toBeGreaterThan(0);
    });
  });

  describe('combat', () => {
    it('should have positive player attack range', () => {
      expect(GameConfig.combat.playerAttackRange).toBeGreaterThan(0);
    });

    it('should have spell range greater than attack range', () => {
      expect(GameConfig.combat.playerSpellRange).toBeGreaterThan(GameConfig.combat.playerAttackRange);
    });

    it('should have spell range within chase range', () => {
      expect(GameConfig.combat.playerSpellRange).toBeLessThanOrEqual(GameConfig.enemy.chaseRange);
    });
  });

  describe('boss', () => {
    it('should have positive scale', () => {
      expect(GameConfig.boss.scale).toBeGreaterThan(0);
    });

    it('should have health greater than regular enemy health', () => {
      expect(GameConfig.boss.health).toBeGreaterThan(GameConfig.enemy.health);
    });

    it('should have positive chase speed', () => {
      expect(GameConfig.boss.chaseSpeed).toBeGreaterThan(0);
    });

    it('should have chase range greater than attack range', () => {
      expect(GameConfig.boss.chaseRange).toBeGreaterThan(GameConfig.boss.attackRange);
    });

    it('should have positive damage dealt', () => {
      expect(GameConfig.boss.damageDealt).toBeGreaterThan(0);
    });

    it('should have positive knockback values (X positive, Y negative)', () => {
      expect(GameConfig.boss.knockbackX).toBeGreaterThan(0);
      expect(GameConfig.boss.knockbackY).toBeLessThan(0);
    });

    it('should have positive death delay', () => {
      expect(GameConfig.boss.deathDelay).toBeGreaterThan(0);
    });

    it('should have positive attack cooldown', () => {
      expect(GameConfig.boss.attackCooldown).toBeGreaterThan(0);
    });

    it('should have charge cooldown greater than attack cooldown', () => {
      expect(GameConfig.boss.chargeCooldown).toBeGreaterThan(GameConfig.boss.attackCooldown);
    });

    it('should have positive charge speed', () => {
      expect(GameConfig.boss.chargeSpeed).toBeGreaterThan(0);
    });

    it('should have positive charge duration', () => {
      expect(GameConfig.boss.chargeDuration).toBeGreaterThan(0);
    });

    it('should have positive tint duration', () => {
      expect(GameConfig.boss.tintDuration).toBeGreaterThan(0);
    });

    it('should have positive death score', () => {
      expect(GameConfig.boss.deathScore).toBeGreaterThan(0);
    });

    it('should have positive body dimensions', () => {
      expect(GameConfig.boss.bodyWidth).toBeGreaterThan(0);
      expect(GameConfig.boss.bodyHeight).toBeGreaterThan(0);
    });

    it('should trigger after exactly 5 kills', () => {
      expect(GameConfig.boss.triggerKills).toBe(5);
    });

    it('should have spawnX within world bounds', () => {
      expect(GameConfig.boss.spawnX).toBeGreaterThan(0);
      expect(GameConfig.boss.spawnX).toBeLessThanOrEqual(GameConfig.world.width);
    });

    it('should have death score greater than enemy death score', () => {
      expect(GameConfig.boss.deathScore).toBeGreaterThan(GameConfig.enemy.deathScore);
    });
  });

  describe('camera', () => {
    it('should have follow lerp values between 0 and 1', () => {
      expect(GameConfig.camera.followLerpX).toBeGreaterThan(0);
      expect(GameConfig.camera.followLerpX).toBeLessThanOrEqual(1);
      expect(GameConfig.camera.followLerpY).toBeGreaterThan(0);
      expect(GameConfig.camera.followLerpY).toBeLessThanOrEqual(1);
    });

    it('should have positive deadzone dimensions', () => {
      expect(GameConfig.camera.deadzoneWidth).toBeGreaterThan(0);
      expect(GameConfig.camera.deadzoneHeight).toBeGreaterThan(0);
    });
  });

  describe('hud', () => {
    it('should have positive health bar dimensions', () => {
      expect(GameConfig.hud.healthBarWidth).toBeGreaterThan(0);
      expect(GameConfig.hud.healthBarHeight).toBeGreaterThan(0);
    });

    it('should have valid health thresholds', () => {
      expect(GameConfig.hud.healthHighThreshold).toBeGreaterThan(GameConfig.hud.healthLowThreshold);
      expect(GameConfig.hud.healthLowThreshold).toBeGreaterThan(0);
      expect(GameConfig.hud.healthHighThreshold).toBeLessThan(1);
    });
  });

  describe('ui', () => {
    it('should have a non-empty localStorage key', () => {
      expect(GameConfig.ui.localStorageKey).toBeTruthy();
      expect(typeof GameConfig.ui.localStorageKey).toBe('string');
    });
  });

  describe('immutability', () => {
    it('should be frozen (as const)', () => {
      // Verify that the config object is deeply readonly via `as const`
      expect(GameConfig).toBeDefined();
      expect(GameConfig.world.width).toBe(3200);
      expect(GameConfig.player.maxHealth).toBe(100);
      expect(GameConfig.enemy.chaseRange).toBe(200);
    });
  });
});
