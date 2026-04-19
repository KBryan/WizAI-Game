export type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'attack' | 'crouch' | 'damage' | 'death' | 'spell' | 'shield';
export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'damage' | 'death';

export const PlayerStates: readonly PlayerState[] = ['idle', 'run', 'jump', 'fall', 'attack', 'crouch', 'damage', 'death', 'spell', 'shield'] as const;
export const EnemyStates: readonly EnemyState[] = ['idle', 'patrol', 'chase', 'attack', 'damage', 'death'] as const;

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

/** Check if a state transition is valid */
export function isValidPlayerTransition(from: PlayerState, to: PlayerState): boolean {
  return PlayerStateTransitions[from].includes(to);
}

/** Check if an enemy state transition is valid */
export function isValidEnemyTransition(from: EnemyState, to: EnemyState): boolean {
  return EnemyStateTransitions[from].includes(to);
}

/**
 * Determine the next enemy state based on distance to player and current state.
 * Business logic extracted from GameScene.updateEnemies.
 */
export function getNextEnemyState(
  current: EnemyState,
  distance: number,
  lastAttackTime: number,
  currentTime: number,
  isAttacking: boolean,
): EnemyState {
  if (isAttacking) return current;
  // Using config values would require importing GameConfig;
  // we accept them as part of the logical contract tested elsewhere
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

/**
 * Calculate damage after applying invincibility.
 * Returns the damage taken (0 if invincible) and whether invincibility was active.
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
