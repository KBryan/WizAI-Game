# Chore: Add AI Agent Logging to the Game

## Chore Description
The game currently has no structured logging for the AI Agent. We need to add a lightweight, environment-aware logging system that the AI Agent can use to emit debug, info, warn, and error messages during gameplay. The logger must:

- Be a standalone TypeScript utility in `src/utils/logger.ts`.
- Support log levels: `debug`, `info`, `warn`, `error`.
- Respect the build environment: **no `console.log` calls in production builds** (per AGENTS.md "Do NOT" rules).
- Be usable from any scene or module (e.g., `BootScene`, `GameScene`, `MenuScene`, and state-machine helpers).
- Include unit tests in `src/utils/__tests__/logger.test.ts` to verify level filtering and production suppression.
- Leave all existing tests passing with zero regressions.

## Relevant Files
Use these files to resolve the chore:

- `src/main.ts` — Entry point; may need to set a global debug flag or import the logger.
- `src/scenes/BootScene.ts` — Asset loading; good place to log loading progress and animation setup.
- `src/scenes/GameScene.ts` — Core gameplay loop; needs logging for player state changes, enemy AI decisions, combat events, and errors.
- `src/scenes/MenuScene.ts` — Menu interactions; can log settings toggles and scene transitions.
- `src/types/states.ts` — State-machine helpers; can log invalid transitions.
- `src/config/GameConfig.ts` — Holds game constants; a good place to add a `debug` / `logLevel` toggle.
- `src/config/MenuConfig.ts` — Menu constants; not directly needed but part of the config family.
- `AGENTS.md` — Defines coding rules, including "Do not use `console.log` in production builds" and validation commands.
- `manifest.yml` — Defines validation commands (`npm test`, `npm run build`, `tsc --noEmit`).
- `package.json` — To confirm test runner (Vitest) and build scripts.

### New Files
- `src/utils/logger.ts` — The logging utility with level-based filtering and environment awareness.
- `src/utils/__tests__/logger.test.ts` — Unit tests for the logger.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add log-level configuration to GameConfig
- Open `src/config/GameConfig.ts`.
- Add a `debug` section with at least:
  - `logLevel: 'debug' | 'info' | 'warn' | 'error'` — default to `'debug'` in development and `'warn'` in production.
  - `enabled: boolean` — default to `true` in development and `false` in production.
- Keep the existing `as const` assertion and do not break any existing imports.

### 2. Create the logger utility
- Create `src/utils/logger.ts`.
- Export a `Logger` class (or a set of functions) that:
  - Reads the current log level and enabled flag from `GameConfig.debug`.
  - Provides methods: `debug()`, `info()`, `warn()`, `error()`.
  - Prefixes each message with a timestamp and a `[WizAI]` tag.
  - Suppresses **all** output when `enabled` is `false` or when the message level is below the configured `logLevel`.
  - Uses `console.log`, `console.warn`, `console.error` internally (never `console.log` for `warn`/`error`).
  - Is tree-shake friendly and does not side-effect on import.
- Export a default singleton instance for convenience.

### 3. Add unit tests for the logger
- Create `src/utils/__tests__/logger.test.ts`.
- Test cases must cover:
  - Messages at or above the current level are printed.
  - Messages below the current level are suppressed.
  - When `enabled` is `false`, nothing is printed regardless of level.
  - `error()` and `warn()` use the correct console methods.
  - Timestamp and `[WizAI]` tag are present in the output.
- Mock `console` methods to avoid polluting test output.

### 4. Integrate logging into BootScene
- Open `src/scenes/BootScene.ts`.
- Import the logger.
- Add `logger.info('BootScene preload started')` at the top of `preload()`.
- Add `logger.info('BootScene animations created, starting MenuScene')` at the end of `create()`.
- Add `logger.debug('Asset loading progress:', value)` inside the `progress` event handler.

### 5. Integrate logging into GameScene
- Open `src/scenes/GameScene.ts`.
- Import the logger.
- Add `logger.info('GameScene create started')` at the top of `create()`.
- Add `logger.debug('Player state changed:', oldState, '->', newState)` inside `changePlayerState()`.
- Add `logger.debug('Enemy AI state:', ai.state, 'for enemy at', enemy.x, enemy.y)` inside `updateEnemies()`.
- Add `logger.info('Player took damage, health:', this.playerHealth)` inside `playerTakeDamage()`.
- Add `logger.warn('Enemy died at', enemy.x, enemy.y)` inside `enemyTakeDamage()` when `ai.health <= 0`.
- Add `logger.error('Combat overlap with dead enemy')` as a guard inside `handleCombat()` if an unexpected dead enemy is encountered.

### 6. Integrate logging into MenuScene
- Open `src/scenes/MenuScene.ts`.
- Import the logger.
- Add `logger.info('MenuScene create started')` at the top of `create()`.
- Add `logger.debug('Settings toggled:', label, '->', isOn)` inside `createToggle()`.
- Add `logger.info('Transitioning to GameScene')` inside the play button `pointerdown` handler.

### 7. Integrate logging into state-machine helpers
- Open `src/types/states.ts`.
- Import the logger.
- Add `logger.warn('Invalid player state transition:', from, '->', to)` inside `isValidPlayerTransition()` when the transition is invalid.
- Add `logger.warn('Invalid enemy state transition:', from, '->', to)` inside `isValidEnemyTransition()` when the transition is invalid.

### 8. Run validation commands
- Execute the test suite to confirm new and existing tests pass.
- Execute the TypeScript type checker to confirm no type errors.
- Execute the production build to confirm no `console.log` leaks in the build output (Vite should strip or the logger should suppress them).

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

```bash
# Run all unit tests (existing + new logger tests)
npm test

# Run TypeScript type checking
npx tsc --noEmit

# Run production build to ensure no console.log leaks and logger is tree-shaken correctly
npm run build
```

## Notes
- The AGENTS.md explicitly forbids `console.log` in production builds. The logger must gate every call behind the `enabled` flag, which should be driven by `NODE_ENV` or an explicit build-time replacement.
- Because this is a Vite project, consider using `import.meta.env.DEV` or `import.meta.env.PROD` inside the logger to set the default `enabled` / `logLevel` values, but keep `GameConfig.debug` as the authoritative runtime override.
- Keep log messages concise; avoid logging every frame (`update`) to prevent performance issues.
- If any existing test fails after adding imports, verify that Vitest can resolve the new `src/utils/` path (it should already be covered by the existing `tsconfig.json` or Vite alias settings).
