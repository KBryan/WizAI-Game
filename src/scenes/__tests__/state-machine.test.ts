import { describe, it, expect } from 'vitest';
import {
  PlayerState,
  EnemyState,
  PlayerStates,
  EnemyStates,
  PlayerStateTransitions,
  EnemyStateTransitions,
  isValidPlayerTransition,
  isValidEnemyTransition,
  getNextEnemyState,
} from '../../types/states';

describe('PlayerState type', () => {
  it('should include all required states', () => {
    const expected: PlayerState[] = ['idle', 'run', 'jump', 'fall', 'attack', 'crouch', 'damage', 'death', 'spell', 'shield'];
    expect(PlayerStates).toHaveLength(expected.length);
    for (const state of expected) {
      expect(PlayerStates).toContain(state);
    }
  });

  it('should not have duplicate states', () => {
    expect(new Set(PlayerStates).size).toBe(PlayerStates.length);
  });
});

describe('EnemyState type', () => {
  it('should include all required states', () => {
    const expected: EnemyState[] = ['idle', 'patrol', 'chase', 'attack', 'damage', 'death'];
    expect(EnemyStates).toHaveLength(expected.length);
    for (const state of expected) {
      expect(EnemyStates).toContain(state);
    }
  });

  it('should not have duplicate states', () => {
    expect(new Set(EnemyStates).size).toBe(EnemyStates.length);
  });
});

describe('PlayerState transitions', () => {
  it('should allow idle to transition to run', () => {
    expect(isValidPlayerTransition('idle', 'run')).toBe(true);
  });

  it('should allow idle to transition to jump', () => {
    expect(isValidPlayerTransition('idle', 'jump')).toBe(true);
  });

  it('should allow idle to transition to attack', () => {
    expect(isValidPlayerTransition('idle', 'attack')).toBe(true);
  });

  it('should allow idle to transition to crouch', () => {
    expect(isValidPlayerTransition('idle', 'crouch')).toBe(true);
  });

  it('should allow idle to transition to damage', () => {
    expect(isValidPlayerTransition('idle', 'damage')).toBe(true);
  });

  it('should allow idle to transition to shield', () => {
    expect(isValidPlayerTransition('idle', 'shield')).toBe(true);
  });

  it('should allow idle to transition to spell', () => {
    expect(isValidPlayerTransition('idle', 'spell')).toBe(true);
  });

  it('should allow idle to transition to fall', () => {
    expect(isValidPlayerTransition('idle', 'fall')).toBe(true);
  });

  it('should not allow idle to transition to death directly', () => {
    expect(isValidPlayerTransition('idle', 'death')).toBe(false);
  });

  it('should not allow idle to transition back to idle', () => {
    // idle -> idle is a same-state transition, typically not in the list
    expect(isValidPlayerTransition('idle', 'idle')).toBe(false);
  });

  it('should allow damage to transition only to idle or death', () => {
    expect(isValidPlayerTransition('damage', 'idle')).toBe(true);
    expect(isValidPlayerTransition('damage', 'death')).toBe(true);
    expect(isValidPlayerTransition('damage', 'run')).toBe(false);
    expect(isValidPlayerTransition('damage', 'attack')).toBe(false);
  });

  it('should allow death to have no valid transitions', () => {
    expect(PlayerStateTransitions.death).toHaveLength(0);
    expect(isValidPlayerTransition('death', 'idle')).toBe(false);
  });

  it('should allow jump to transition to fall', () => {
    expect(isValidPlayerTransition('jump', 'fall')).toBe(true);
  });

  it('should allow attack to transition to idle after completion', () => {
    expect(isValidPlayerTransition('attack', 'idle')).toBe(true);
  });

  it('should allow shield to transition to idle when released', () => {
    expect(isValidPlayerTransition('shield', 'idle')).toBe(true);
  });

  it('should have valid transitions for every player state', () => {
    for (const state of PlayerStates) {
      expect(PlayerStateTransitions[state]).toBeDefined();
      expect(Array.isArray(PlayerStateTransitions[state])).toBe(true);
    }
  });
});

describe('EnemyState transitions', () => {
  it('should allow patrol to transition to chase', () => {
    expect(isValidEnemyTransition('patrol', 'chase')).toBe(true);
  });

  it('should allow patrol to transition to attack', () => {
    expect(isValidEnemyTransition('patrol', 'attack')).toBe(true);
  });

  it('should allow chase to transition back to patrol', () => {
    expect(isValidEnemyTransition('chase', 'patrol')).toBe(true);
  });

  it('should allow chase to transition to attack', () => {
    expect(isValidEnemyTransition('chase', 'attack')).toBe(true);
  });

  it('should allow any non-damage state to transition to damage', () => {
    for (const state of EnemyStates) {
      if (state === 'death' || state === 'damage') continue;
      expect(isValidEnemyTransition(state, 'damage')).toBe(true);
    }
  });

  it('should allow any state to transition to death', () => {
    for (const state of EnemyStates) {
      if (state === 'death' || state === 'damage') continue;
      expect(isValidEnemyTransition(state, 'death')).toBe(true);
    }
  });

  it('should not allow death to transition to any state', () => {
    expect(EnemyStateTransitions.death).toHaveLength(0);
  });

  it('should have valid transitions for every enemy state', () => {
    for (const state of EnemyStates) {
      expect(EnemyStateTransitions[state]).toBeDefined();
      expect(Array.isArray(EnemyStateTransitions[state])).toBe(true);
    }
  });
});

describe('getNextEnemyState', () => {
  it('should return attack when enemy is very close and not on cooldown', () => {
    expect(getNextEnemyState('patrol', 30, 0, 5000, false)).toBe('attack');
  });

  it('should return chase when enemy is within chase range but outside attack range', () => {
    expect(getNextEnemyState('patrol', 100, 0, 5000, false)).toBe('chase');
  });

  it('should return patrol when enemy is outside chase range', () => {
    expect(getNextEnemyState('patrol', 300, 0, 5000, false)).toBe('patrol');
  });

  it('should return current state when enemy is currently attacking', () => {
    expect(getNextEnemyState('attack', 30, 0, 5000, true)).toBe('attack');
  });

  it('should not attack when on cooldown (within attack range)', () => {
    expect(getNextEnemyState('patrol', 30, 4900, 5000, false)).toBe('chase');
  });

  it('should attack when close and cooldown has elapsed', () => {
    expect(getNextEnemyState('patrol', 30, 1000, 3000, false)).toBe('attack');
  });

  it('should chase when just outside attack range', () => {
    expect(getNextEnemyState('patrol', 50, 0, 5000, false)).toBe('chase');
  });

  it('should chase when at exactly chase range boundary', () => {
    // At exactly 200, it's not less than 200, so it patrols
    expect(getNextEnemyState('patrol', 200, 0, 5000, false)).toBe('patrol');
    // Just inside chase range
    expect(getNextEnemyState('patrol', 199, 0, 5000, false)).toBe('chase');
  });
});
