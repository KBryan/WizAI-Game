# Feature: Level 2 — Post-Boss Progression with 10 Enemies and Final Boss

## Feature Description
After the player defeats the Level 1 boss (Forest Guardian), the game transitions to Level 2 instead of showing a static victory screen. Level 2 features a new environment, 10 enemies, and a powerful Final Boss. The player's health and score persist between levels, creating a continuous progression arc. This adds depth, replayability, and a satisfying multi-stage challenge to the game.

## User Story
As a player
I want to progress to a second level after defeating the first boss, facing 10 enemies and a final boss
So that the game feels like a complete adventure with escalating challenge and a satisfying conclusion

## Problem Statement
Currently, defeating the Level 1 boss displays a static "VICTORY!" text with no further gameplay. The game ends abruptly, leaving players without a sense of progression or closure. There is no level system, no way to carry progress forward, and no endgame challenge beyond the first boss.

## Solution Statement
Introduce a level progression system with two distinct levels:
- **Level 1**: The existing scene (6 enemies + Forest Guardian boss)
- **Level 2**: A new scene triggered after Level 1 boss defeat, featuring 10 enemies with enhanced AI, a new Final Boss with unique mechanics, a distinct visual theme, and a true game-ending victory sequence

The solution involves:
1. Creating a `Level2Scene` that follows the same patterns as `GameScene` but with increased difficulty
2. Adding a `LevelManager` to track current level and handle transitions
3. Persisting player health and score across levels via scene data
4. Adding a level transition screen between Level 1 and Level 2
5. Creating a Final Boss with distinct stats, behavior, and visual identity
6. Adding a true game completion screen after defeating the Final Boss
7. Updating `GameConfig` with Level 2-specific configurations
8. Registering the new scene in `main.ts`
9. Adding comprehensive tests for level progression, Final Boss combat, and transition logic

## Relevant Files
Use these files to implement the feature:

- `src/main.ts` — Entry point; register `Level2Scene` in the scene array and ensure scene order supports progression
- `src/scenes/GameScene.ts` — Core gameplay for Level 1; modify boss death handler to transition to Level 2 instead of showing static victory
- `src/scenes/Level2Scene.ts` — New scene for Level 2 with 10 enemies, new environment, and Final Boss (follows GameScene patterns)
- `src/scenes/BootScene.ts` — Asset loading; may need to load additional assets for Level 2 theme (purple enemy sprites, new boss sprites)
- `src/scenes/MenuScene.ts` — Menu scene; no changes needed unless adding level select
- `src/config/GameConfig.ts` — Add Level 2 configuration: enemy count (10), Final Boss stats, world dimensions for Level 2, enemy spawn points
- `src/types/states.ts` — State machine helpers; may need new enemy/boss states for Level 2 AI behaviors
- `src/utils/logger.ts` — Logging utility; add level transition and Final Boss event logs
- `AGENTS.md` — Defines coding rules, scene patterns, and validation commands
- `manifest.yml` — Defines validation commands (`npm test`, `npm run build`, `tsc --noEmit`)
- `package.json` — Confirm test runner (Vitest) and build scripts

### New Files
- `src/scenes/Level2Scene.ts` — Level 2 gameplay scene with 10 enemies and Final Boss
- `src/scenes/LevelTransitionScene.ts` — Interstitial scene showing "Level 2" text and preparing player for next challenge
- `src/scenes/VictoryScene.ts` — True game completion scene after Final Boss defeat
- `src/config/Level2Config.ts` — Level 2-specific configuration (enemy positions, boss stats, world layout)
- `src/scenes/__tests__/level2.test.ts` — Unit tests for Level 2 enemy spawning, Final Boss combat, and level progression
- `src/scenes/__tests__/level-transition.test.ts` — Unit tests for level transition logic and state persistence

## Implementation Plan

### Phase 1: Foundation
- Add Level 2 configuration to `GameConfig.ts` with 10 enemy spawn points, Final Boss stats, and world dimensions
- Create `Level2Config.ts` for Level 2-specific layout data (platform positions, enemy patrol points)
- Update `BootScene.ts` to load any additional assets needed for Level 2 (purple enemy variant, new background layers if available)
- Create `LevelTransitionScene.ts` as a reusable interstitial scene that accepts player state data and fades into the next level
- Create `VictoryScene.ts` for the true game ending after Final Boss defeat
- Register new scenes in `main.ts` scene array

### Phase 2: Core Implementation
- Create `Level2Scene.ts` following `GameScene.ts` architecture:
  - 10 enemies with patrol, chase, and attack behaviors
  - New environment with different platform layout and background
  - Final Boss with enhanced mechanics (e.g., multi-phase combat, summon minions, or area attacks)
  - Player health and score carried over from Level 1 via scene data
- Modify `GameScene.ts` boss death handler:
  - Remove static "VICTORY!" text
  - Transition to `LevelTransitionScene` with player health and score data
- Implement Final Boss in `Level2Scene.ts`:
  - Higher health, damage, and unique attack patterns compared to Level 1 boss
  - Distinct visual (use purple or a new color variant)
  - Death triggers transition to `VictoryScene`

### Phase 3: Integration
- Ensure player state (health, score, position) persists correctly from Level 1 → Level 2
- Add level indicator to HUD in both scenes
- Update `MenuScene` play button to always start from Level 1 (reset state)
- Add logging for level transitions and Final Boss events
- Ensure camera bounds, world bounds, and physics are correct for Level 2 dimensions

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Update GameConfig with Level 2 settings
- Open `src/config/GameConfig.ts`
- Add a `levels` section with:
  - `level1: { enemyCount: 6, bossName: 'FOREST GUARDIAN', worldWidth: 3200 }`
  - `level2: { enemyCount: 10, bossName: 'SHADOW LORD', worldWidth: 4800 }`
- Add `finalBoss` section with stats (higher than `boss`): health 400, damage 30, scale 3.5, charge speed 280, etc.
- Add `level2` enemy config with increased speed, health, and damage compared to level 1 enemies
- Keep all existing config values intact to avoid breaking Level 1

### 2. Create Level2Config.ts for layout data
- Create `src/config/Level2Config.ts`
- Export `Level2Layout` object containing:
  - `platformPositions`: array of 8-10 platform positions spread across 4800px width
  - `enemySpawnPoints`: array of 10 enemy spawn points with patrol ranges
  - `finalBossSpawn`: `{ x: 4500, y: groundY }`
  - `playerSpawn`: `{ x: 100, y: groundY }`
  - `backgroundTint`: `0x1a0a2e` (dark purple atmosphere)
- Follow the same structure as platform positions in `GameScene.ts`

### 3. Update BootScene to load Level 2 assets
- Open `src/scenes/BootScene.ts`
- Add loading for purple enemy sprite sheets (`char-purple-1`, `char-purple-2`) if not already loaded
- Add animation creation for `level2_enemy` prefix using purple sprites
- Add animation creation for `final_boss` prefix using a distinct sprite (reuse green or add new if available)
- Ensure existing animations for `player`, `enemy`, `boss` remain unchanged

### 4. Create LevelTransitionScene
- Create `src/scenes/LevelTransitionScene.ts`
- Extend `Phaser.Scene`
- Accept scene data: `{ playerHealth: number, score: number, level: number }`
- Display level title (e.g., "LEVEL 2 — The Shadow Realm") with fade-in animation
- Show player stats (health, score) carried over
- After 3 seconds, fade out and start `Level2Scene` passing the data forward
- Add background color tint and atmospheric text

### 5. Create VictoryScene
- Create `src/scenes/VictoryScene.ts`
- Extend `Phaser.Scene`
- Display "YOU HAVE SAVED THE REALM!" or similar epic victory text
- Show final score
- Add "Play Again" button that returns to `MenuScene`
- Add parallax background and particle effects for celebration

### 6. Create Level2Scene
- Create `src/scenes/Level2Scene.ts`
- Copy the structure from `GameScene.ts` as the base
- Modify `create()` to:
  - Read player state from scene data (health, score) or use defaults
  - Set world width to `GameConfig.levels.level2.worldWidth` (4800)
  - Use `Level2Config` for platform and enemy positions
  - Spawn 10 enemies using purple sprites with `level2_enemy` animations
  - Apply dark background tint for atmosphere
- Modify enemy AI to be slightly more aggressive (use `GameConfig.level2Enemy` stats)
- Implement `spawnFinalBoss()` method:
  - Spawn at `Level2Config.finalBossSpawn`
  - Use `final_boss` animations
  - Use `GameConfig.finalBoss` stats
  - Add a new mechanic: every 25% health lost, the boss enters a "rage" phase with increased speed
- On Final Boss death:
  - Show victory text briefly
  - Transition to `VictoryScene` after delay
- Add level indicator to HUD (e.g., "Level 2" text in top-right)

### 7. Modify GameScene for level progression
- Open `src/scenes/GameScene.ts`
- In `bossTakeDamage()`, when `ai.health <= 0`:
  - Remove the static `victoryText` creation and infinite tween
  - Instead, create a brief "Level 1 Complete!" text that fades out
  - After `GameConfig.boss.deathDelay`, call `this.scene.start('LevelTransitionScene', { playerHealth: this.playerHealth, score: this.score, level: 2 })`
- Ensure the boss destruction and cleanup still happen before transition
- Keep the score and health bar updates intact

### 8. Register new scenes in main.ts
- Open `src/main.ts`
- Import `Level2Scene`, `LevelTransitionScene`, and `VictoryScene`
- Update scene array: `[BootScene, MenuScene, GameScene, LevelTransitionScene, Level2Scene, VictoryScene]`

### 9. Add level progression tests
- Create `src/scenes/__tests__/level-transition.test.ts`
- Test that `LevelTransitionScene` correctly receives and forwards player state data
- Test that scene data shape matches expectations
- Create `src/scenes/__tests__/level2.test.ts`
- Test that `Level2Config` has exactly 10 enemy spawn points
- Test that Final Boss stats are higher than Level 1 boss stats
- Test that level 2 world width is greater than level 1
- Test that `GameConfig.levels.level2.enemyCount` equals 10

### 10. Add Final Boss combat tests
- In `src/scenes/__tests__/level2.test.ts`
- Test Final Boss health is greater than regular boss
- Test Final Boss damage is greater than regular boss
- Test that level 2 enemy speed/health are increased compared to level 1
- Test that `Level2Config` platform positions span the full world width

### 11. Update existing tests if needed
- Run existing tests to check for regressions
- Update `combat.test.ts` if any config paths changed
- Update `state-machine.test.ts` if new states were added

### 12. Run validation commands
- Execute the test suite to confirm all tests pass
- Execute TypeScript type checker
- Execute production build to ensure no errors
- Manually verify level transition flow works in browser

## Testing Strategy

### Unit Tests
- **LevelTransitionScene**: Verify it accepts `{ playerHealth, score, level }` data and forwards it to the next scene
- **Level2Config**: Verify 10 enemy spawn points exist, platform positions are within world bounds, final boss spawn is near the end
- **GameConfig levels**: Verify `level1.enemyCount === 6` and `level2.enemyCount === 10`
- **Final Boss stats**: Verify `finalBoss.health > boss.health`, `finalBoss.damageDealt > boss.damageDealt`
- **VictoryScene**: Verify it can be instantiated and has required text elements

### Integration Tests
- **Level 1 → Level 2 flow**: Simulate boss death in GameScene and verify transition to LevelTransitionScene with correct data
- **State persistence**: Verify player health and score from Level 1 are correctly applied in Level 2
- **Final Boss defeat**: Verify defeating Final Boss transitions to VictoryScene
- **Menu → Level 1**: Verify starting a new game always begins at Level 1 with full health and zero score

### Edge Cases
- Player dies in Level 2: scene restarts within Level 2 (not Level 1), preserving level context
- Player defeats Level 1 boss with 1 HP: verify 1 HP is carried to Level 2
- Player has zero score in Level 1: verify zero score is carried to Level 2
- Rapid scene transitions: ensure no memory leaks from unfinished tweens or event listeners
- Missing scene data: Level 2 should gracefully default to full health and zero score if data is absent
- Final Boss dies during charge attack: ensure clean state cleanup and transition

## Acceptance Criteria
- [ ] Defeating the Level 1 boss transitions to `LevelTransitionScene` instead of showing static victory
- [ ] `LevelTransitionScene` displays level title and carries over player health + score
- [ ] Level 2 spawns exactly 10 enemies with purple sprites and enhanced stats
- [ ] Level 2 has a distinct environment (different platform layout, wider world, darker atmosphere)
- [ ] Final Boss has unique stats, behavior, and visual identity compared to Level 1 boss
- [ ] Defeating the Final Boss transitions to `VictoryScene` with final score display and "Play Again" option
- [ ] Player health and score persist correctly from Level 1 to Level 2
- [ ] Starting a new game from the menu always begins at Level 1 with full health and zero score
- [ ] All existing tests pass with zero regressions
- [ ] New tests cover level progression, Final Boss combat, and state persistence
- [ ] TypeScript compiles with no errors
- [ ] Production build succeeds with no warnings

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

```bash
# Run all unit tests (existing + new level 2 tests)
npm test

# Run TypeScript type checking
npx tsc --noEmit

# Run production build to ensure no build errors
npm run build

# Start dev server and manually verify level progression flow
npm run dev
```

## Notes
- The existing codebase uses `char-green-1/2` for the Level 1 boss. For the Final Boss, consider using `char-purple-1/2` (already in assets) or applying a tint to the green sprites to differentiate.
- Level 2 world width (4800px) is 1.5x Level 1 (3200px) to accommodate 10 enemies and more platforms.
- The `LevelTransitionScene` should be lightweight and fast; avoid heavy asset loading there.
- If adding new enemy states (e.g., `rage` for Final Boss), update `EnemyState` type and `EnemyStateTransitions` in `src/types/states.ts`.
- Consider adding a `level` property to the HUD in both GameScene and Level2Scene for player clarity.
- The logger utility should be used to log level transitions (`logger.info('Transitioning to Level 2')`) and Final Boss events.
- Ensure `VictoryScene` has a clear call-to-action (Play Again button) so players know how to restart.
- No new npm dependencies are expected; Phaser 3's built-in scene system handles all transitions.
