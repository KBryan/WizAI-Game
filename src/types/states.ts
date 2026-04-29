import { logger } from '../utils/logger';
import type { LevelTheme } from '../config/GameConfig';

export type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'attack' | 'crouch' | 'damage' | 'death' | 'spell' | 'shield';
export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'damage' | 'death';
export type BossState = 'idle' | 'chase' | 'attack' | 'projectile' | 'damage' | 'death' | 'enrage';
export type BossPhase = 1 | 2 | 3;

export const PlayerStates: readonly PlayerState[] = ['idle', 'run', 'jump', 'fall', 'attack', 'crouch', 'damage', 'death', 'spell', 'shield'] as const;
export const EnemyStates: readonly EnemyState[] = ['idle', 'patrol', 'chase', 'attack', 'damage', 'death'] as const;
export const BossStates: readonly BossState[] = ['idle', 'chase', 'attack', 'projectile', 'damage', 'death', 'enrage'] as const;

/** Valid transitions for PlayerState: from -> set of valid target states */
export const PlayerStateTransitions: Record<PlayerState, PlayerState[]> = {
  idle: ['run', 'jump', 'attack', 'crouch', 'damage', 'spell', 'shield', 'fall'],
  run: ['idle', 'jump', 'attack', 'crouch', 'damage', 'spell', 'fall'],
  jump: ['fall', 'damage', 'attack'],
  fall: ['idle', 'damage', 'attack'],
  attack: ['idle', 'damage', 'run', 'fall'],
  crouch: ['idle', 'damage', 'attack'],
  damage: ['idle', 'death'],
  death: [],
  spell: ['idle', 'damage', 'fall'],
  shield: ['idle', 'damage', 'jump', 'fall'],
};

/** Valid transitions for EnemyState */
export const EnemyStateTransitions: Record<EnemyState, EnemyState[]> = {
  idle: ['patrol', 'chase', 'attack', 'damage', 'death'],
  patrol: ['idle', 'chase', 'attack', 'damage', 'death'],
  chase: ['patrol', 'attack', 'damage', 'death'],
  attack: ['patrol', 'damage', 'death'],
  damage: ['patrol', 'idle', 'death'],
  death: [],
};

/** Valid transitions for BossState */
export const BossStateTransitions: Record<BossState, BossState[]> = {
  idle: ['chase', 'attack', 'projectile', 'damage', 'death', 'enrage'],
  chase: ['attack', 'projectile', 'damage', 'death', 'enrage'],
  attack: ['idle', 'chase', 'projectile', 'damage', 'death', 'enrage'],
  projectile: ['idle', 'chase', 'damage', 'death', 'enrage'],
  damage: ['idle', 'chase', 'attack', 'death', 'enrage'],
  death: [],
  enrage: ['chase', 'attack', 'projectile', 'damage', 'death'],
};

/** Check if a state transition is valid */
export function isValidPlayerTransition(from: PlayerState, to: PlayerState): boolean {
  const valid = PlayerStateTransitions[from].includes(to);
  if (!valid) {
    logger.warn('Invalid player state transition:', from, '->', to);
  }
  return valid;
}

/** Check if an enemy state transition is valid */
export function isValidEnemyTransition(from: EnemyState, to: EnemyState): boolean {
  const valid = EnemyStateTransitions[from].includes(to);
  if (!valid) {
    logger.warn('Invalid enemy state transition:', from, '->', to);
  }
  return valid;
}

/** Check if a boss state transition is valid */
export function isValidBossTransition(from: BossState, to: BossState): boolean {
  const valid = BossStateTransitions[from].includes(to);
  if (!valid) {
    logger.warn('Invalid boss state transition:', from, '->', to);
  }
  return valid;
}

/**
 * Determine the next enemy state based on distance to player and current state.
 */
export function getNextEnemyState(
  current: EnemyState,
  distance: number,
  lastAttackTime: number,
  currentTime: number,
  isAttacking: boolean,
): EnemyState {
  if (isAttacking) return current;
  const CHASE_RANGE = 200;
  const ATTACK_RANGE = 45;
  const ATTACK_COOLDOWN = 1200;

  if (distance < ATTACK_RANGE && currentTime - lastAttackTime > ATTACK_COOLDOWN) {
    return 'attack';
  } else if (distance < CHASE_RANGE) {
    return 'chase';
  } else {
    return 'patrol';
  }
}

/** Determine boss phase based on health percentage */
export function getBossPhase(healthPercent: number, phases: readonly { healthPercent: number; attackPattern: string }[]): BossPhase {
  for (let i = phases.length - 1; i >= 0; i--) {
    if (healthPercent <= phases[i].healthPercent) {
      // Phase 1 = easiest, higher index = harder
      if (healthPercent <= (phases[2]?.healthPercent ?? 0.3)) return 3;
      if (healthPercent <= (phases[1]?.healthPercent ?? 0.6)) return 2;
      return 1;
    }
  }
  return 1;
}

/**
 * Calculate damage after applying invincibility.
 */
export function calculateDamage(
  damageAmount: number,
  currentHealth: number,
  isInvincible: boolean,
): { damageTaken: number; newHealth: number; wasInvincible: boolean } {
  if (isInvincible) {
    return { damageTaken: 0, newHealth: currentHealth, wasInvincible: true };
  }
  const newHealth = Math.max(0, currentHealth - damageAmount);
  return { damageTaken: damageAmount, newHealth, wasInvincible: false };
}

/**
 * Determine the health bar color based on health percentage.
 */
export function getHealthBarColor(
  healthPercent: number,
  highThreshold: number,
  lowThreshold: number,
): 'high' | 'mid' | 'low' {
  if (healthPercent > highThreshold) return 'high';
  if (healthPercent > lowThreshold) return 'mid';
  return 'low';
}

/**
 * Check if an attack hits based on distance and facing direction.
 */
export function isAttackInRange(
  distance: number,
  range: number,
  attackerX: number,
  targetX: number,
  facingRight: boolean,
): boolean {
  if (distance >= range) return false;
  const targetIsRight = targetX > attackerX;
  return (targetIsRight && facingRight) || (!targetIsRight && !facingRight);
}

/** Calculate token collection effects */
export function calculateTokenCollection(
  tokenType: 'crystal' | 'coin' | 'heart',
  currentScore: number,
  currentHealth: number,
  maxHealth: number,
): { score: number; health: number } {
  const tokenConfigs: Record<string, { score: number; health: number }> = {
    crystal: { score: 50, health: 0 },
    coin: { score: 10, health: 0 },
    heart: { score: 0, health: 25 },
  };
  const config = tokenConfigs[tokenType];
  return {
    score: currentScore + config.score,
    health: Math.min(maxHealth, currentHealth + config.health),
  };
}

/** Level data interface */
export interface LevelData {
  name: string;
  worldWidth: number;
  bossX: number;
  backgroundTheme: LevelTheme;
  enemyCount: number;
  tokenCount: number;
  platformCount: number;
}
