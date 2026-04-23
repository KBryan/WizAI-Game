# AGENTS.md — Project Configuration for Autonomous Agents

> **Version**: v2.0
> **Date**: 2026-04-06
> **Template**: Copy this file to your repository root and fill in the CUSTOMIZE sections.

---

## Project Overview

**Name**: WizAI-Game
**Purpose**: A 2D pixel-art platformer built with Phaser 3, developed using AI-assisted game programming.
**Primary Language**: TypeScript 5.x
**Framework**: Phaser 3
**Repository Type**: Single project

---

## Navigation

| Path | Type | Purpose | Entry Point |
|------|------|---------|-------------|
| `src/` | source | Game source code | `src/main.ts` |
| `src/scenes/` | module | Game scenes | `src/scenes/GameScene.ts` |
| `src/config/` | module | Game configuration | `src/config/gameConfig.ts` |
| `public/assets/` | assets | Sprite sheets & assets | `public/assets/characters/` |
| `docs/` | docs | Project documentation | `docs/screenshot.png` |

---

## Architecture

- **Game type**: 2D pixel-art platformer (client-side browser game)
- **Game engine**: Phaser 3 with arcade physics
- **Build tool**: Vite (fast dev server & bundler)
- **Testing**: Vitest for unit tests
- **Rendering**: Canvas-based pixel-perfect rendering
- **Asset pipeline**: Sprite sheets with JSON manifests
- **Deployment target**: Static hosting (GitHub Pages, Vercel, Netlify)

### Key Directories

| Directory | Purpose |
|---|---|
| `src/` | TypeScript game source code |
| `src/scenes/` | Phaser scene classes (Boot, Game, etc.) |
| `src/config/` | Game configuration (physics, dimensions) |
| `src/types/` | TypeScript type definitions |
| `public/assets/` | Static assets (sprites, audio, tilemaps) |
| `docs/` | Screenshots and documentation |

---

## Development Commands

### Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env    # Adjust if your project uses a different env setup
```

### Validation

```bash
# Run tests
npm test                # vitest run

# Run type checker
npx tsc --noEmit        # TypeScript type checking

# Run build
npm run build           # tsc && vite build
```

### Run Locally

```bash
# Start development server
npm run dev             # vite --host 0.0.0.0 --port 3000
```

---

## Coding Rules

### Style

- Follow the project's existing code style
- Use descriptive variable and function names
- Keep functions focused — one responsibility per function
- Maximum function length: ~50 lines (prefer shorter)

### Patterns

- **Error handling**: Use TypeScript strict mode; handle asset loading errors gracefully
- **Logging**: Use `console.log` sparingly; prefer Phaser's built-in debugging in dev
- **Testing**: Test game logic (state machines, physics calculations) with Vitest
- **Naming**: Use PascalCase for classes (`BootScene`, `PlayerController`), camelCase for functions/variables

### Game-Specific Conventions

- **Scenes**: Each major game state is a Phaser Scene class in `src/scenes/`
- **Animations**: Define all sprite animations in `BootScene` preload
- **Physics**: Use Arcade Physics for platformer mechanics
- **State Machine**: Player character uses state machine (idle, run, jump, attack, etc.)

### Do NOT

- Do not use `console.log` in production builds
- Do not add dependencies without documenting them
- Do not modify generated files (build output, lock files) by hand
- Do not commit credentials, API keys, or secrets
- Do not block the main thread with heavy computations (use Phaser's time events)

---

## Risk Areas

| Path / Area | Risk Level | Notes |
|---|---|---|
| `src/scenes/GameScene.ts` | High | Core gameplay loop — changes affect all mechanics |
| `src/config/` | Medium | Physics config changes affect game feel |
| `public/assets/` | Low | Asset-only changes — no code impact |
| `docs/` | Low | Documentation only |

---

## Review Expectations

### All Changes

- [ ] Tests pass (existing + new)
- [ ] TypeScript compiles with no errors (`tsc --noEmit`)
- [ ] No unrelated changes included
- [ ] Commit messages follow conventional format: `type(scope): description`

### Feature Changes

- [ ] Game mechanics work as expected
- [ ] Edge cases handled (off-screen, invalid input)
- [ ] Performance acceptable on target devices
- [ ] Documentation updated if behavior changed

### Asset Changes

- [ ] Sprite sheets properly formatted
- [ ] JSON manifests updated
- [ ] No broken references in code

---

## Escalation

### Channels

- **Standard**: Open a GitHub issue or comment on the PR
- **Urgent**: Tag @KBryan in the PR

### Escalation Triggers

- Changes to core game loop or physics
- Asset pipeline modifications
- Changes requiring coordination with external artists
- Ambiguous requirements after one clarification attempt
- Test failures that cannot be resolved in 2 attempts

---

## Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `PORT` | Dev server port | No (default: 3000) |
| `NODE_ENV` | Environment mode | No (default: development) |

---

## Additional Context

### Known Issues

- Parallax background & tilemap terrain are planned but not yet implemented
- Enemy AI with combat system is in development
- Audio & visual effects are pending

### Recent Changes

- Character state machine with smooth animation transitions
- Arcade physics (gravity, ground collision, jumping)
- Full sprite sheet animation system (22 animations)

### Team Conventions

- Use AI-assisted development for rapid iteration
- Prefer pixel-perfect rendering for retro aesthetic
- Keep game logic decoupled from rendering

---

*This file follows the [Agentic Engineering Workflow Framework](https://github.com/your-org/agentic-workflow) v2.0 standard.*
