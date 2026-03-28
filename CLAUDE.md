# Knucklebones Web — Agent guide

Fan recreation of the Knucklebones dice mini-game from *Cult of the Lamb*.
Stack: **React 18 + Vite 6 + Three.js 0.170**, 100% client-side, no backend.

## Commands

```bash
npm run dev      # dev server → http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build
npm run lint     # ESLint check
```

## Architecture

```
src/
  game/
    constants.js      # pure helpers: calcColumnScore, placeInColumn, destroyFromColumn, isBoardFull
    gameReducer.js    # useReducer state machine — single source of truth for all game state
  network/
    networkInterface.js  # Phase-2 stub (WebSocket / WebRTC hookup point)
  three/
    SceneManager.js   # imperative Three.js: board geometry, dice meshes, particles, render loop
    TextureGenerator.js  # Canvas2D skull textures (1-6 faces), cached as CanvasTexture
  audio/
    soundManager.js   # Web Audio API synthesised sounds (no external files)
  hooks/
    useGameReducer.js # wraps dispatch with named callbacks (rollDice, placeDice, …)
    useThreeScene.js  # mounts SceneManager, syncs boards via ResizeObserver
  components/
    screens/          # StartScreen, GameScreen, GameOverScreen
    game/             # PlayerPanel (side boxes), DiceDisplay (2D die for panels), ScorePanel
    ui/               # Button, InfoModal + InfoButton
  i18n/
    es.js / en.js     # string tables
    index.js          # t(key), setLocale(), getCurrentLocale()
  App.jsx             # screen router + locale state
```

## Game state machine (gameReducer.js)

```
ROLLING → [ROLL_DICE] → PLACING → [PLACE_DICE] → ANIMATING → [ANIMATION_DONE] → ROLLING
                                                           └→ GAMEOVER (board full)
```

`state.lastDestroyed` — array of `{player, col, positions}` set after each `PLACE_DICE`.
Used by `GameScreen` to trigger `playDestruction()` sound.

## Scoring rule

Column score = `Σ (value × count²)` for each group of identical dice.
- 1 same → ×1, 2 same → ×4, 3 same → ×9

## Three.js layout

- Board lies flat on the **XZ plane** (Y = 0).
- `slotPosition(player, col, slot)` → `Vector3(x, DICE_SIZE/2, z)`.
  - Player 0 at positive Z (front), Player 1 at negative Z (back).
  - Columns along X (spacing 1.25), slots along Z (spacing 1.25).
- Camera: `position(0, 9, 6)`, `lookAt(0, 0, 0)`, FOV 48°.
- Each die has a permanent random **rest rotation** (~±4° X/Z, ±11° Y) so they never look perfectly flat.
- Multiplier tinting: `material.color` is multiplied with the texture map.
  - count 2 → gold `#e8b840` on all 6 faces (top face gets tinted over skull texture).
  - count 3 → blue `#6699ff` on all 6 faces.
  - count 1 → parchment `#f0e4c4` sides, white `#ffffff` on top (no tint).

## i18n

- `t(key)` reads from the current locale module-level variable.
- `App.jsx` holds `locale` React state; toggling calls `i18nSetLocale(next)` **before** `setLocale(next)` to ensure `t()` returns new values on the next render.
- `key={locale}` on the root `<div>` in App forces full re-mount of the component tree on language switch.

## Adding a new language

1. Copy `src/i18n/es.js` → `src/i18n/xx.js`, translate all values.
2. Import and register in `src/i18n/index.js`.
3. Add the locale code to the toggle logic in `App.jsx`.

## Phase 2 — Online multiplayer

See `src/network/networkInterface.js` for the full hookup guide (WebSocket + WebRTC).
Key integration points:
- `mode` field in game state (`'local' | 'online' | 'bot'`).
- `PLACE_DICE` must fire only after server confirmation in online mode.
- `NetworkInterface.sendMove(col)` called before local dispatch.

## Phase 2 — Bot AI

See `README.md → "How to add a bot"` for a greedy strategy scaffold.
Hook: `useEffect` watching `phase === 'placing' && currentPlayer === 1 && mode === 'bot'`.

## Coding conventions

- Variables, functions, comments: **English**.
- UI strings: via `t(key)`, never hardcoded.
- CSS: one `.module.css` per component, CSS variables from `src/index.css`.
- No `react-three-fiber` — Three.js is always imperative in `SceneManager`.
- `@/` alias maps to `src/` (configured in `vite.config.js`).
- Do not add abstractions for one-off operations; prefer explicit code.
