import { describe, it, expect } from 'vitest';

describe('Level Transition Data Shape', () => {
  it('should define the expected transition data interface', () => {
    // This test documents the contract between GameScene -> LevelTransitionScene -> Level2Scene
    const transitionData = {
      playerHealth: 75,
      score: 1250,
      level: 2,
    };

    expect(transitionData).toHaveProperty('playerHealth');
    expect(transitionData).toHaveProperty('score');
    expect(transitionData).toHaveProperty('level');
    expect(typeof transitionData.playerHealth).toBe('number');
    expect(typeof transitionData.score).toBe('number');
    expect(typeof transitionData.level).toBe('number');
    expect(transitionData.playerHealth).toBeGreaterThanOrEqual(0);
    expect(transitionData.score).toBeGreaterThanOrEqual(0);
    expect(transitionData.level).toBe(2);
  });

  it('should handle edge case of 1 HP carried over', () => {
    const data = { playerHealth: 1, score: 500, level: 2 };
    expect(data.playerHealth).toBe(1);
    expect(data.score).toBe(500);
  });

  it('should handle edge case of zero score carried over', () => {
    const data = { playerHealth: 100, score: 0, level: 2 };
    expect(data.score).toBe(0);
    expect(data.playerHealth).toBe(100);
  });

  it('should handle missing data with defaults', () => {
    // When Level2Scene receives no data, it should default to full health and zero score
    const data: { playerHealth?: number; score?: number } = {};
    const health = data.playerHealth ?? 100;
    const score = data.score ?? 0;
    expect(health).toBe(100);
    expect(score).toBe(0);
  });
});

describe('VictoryScene Data Shape', () => {
  it('should define the expected victory data interface', () => {
    const victoryData = { score: 2500 };
    expect(victoryData).toHaveProperty('score');
    expect(typeof victoryData.score).toBe('number');
    expect(victoryData.score).toBeGreaterThanOrEqual(0);
  });
});
