# Knucklebones Web — Agent guide

Fan recreation of the Knucklebones dice mini-game from *Cult of the Lamb*.
Stack: **React 18 + Vite 6 + Three.js 0.170 + PeerJS**, 100% client-side, no backend.

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
    constants.js      # pure helpers: calcColumnScore, placeInColumn, destroyFromColumn,
                      #   compactColumn, isBoardFull, isColumnFull, calcTotalScore
    gameReducer.js    # useReducer state machine — single source of truth for all game state
    botStrategy.js    # botStrategyEasy / botStrategyNormal / botStrategyHard + dispatcher
  network/
    networkInterface.js  # PeerJS WebRTC — host(), join(), sendMove(), disconnect()
  three/
    SceneManager.js   # imperative Three.js: board geometry, dice meshes, particles, render loop
    TextureGenerator.js  # Canvas2D skull textures (1-6 faces), cached as CanvasTexture
  audio/
    AudioEngine.js    # Web Audio API facade — volume, music toggle, sfx
    soundManager.js   # Web Audio API synthesised sounds (no external files)
  settings/
    store.js          # localStorage singleton: read/write all user preferences
  hooks/
    useGameReducer.js # wraps dispatch with named callbacks (rollDice, placeDice, …)
    useThreeScene.js  # mounts SceneManager, syncs boards via ResizeObserver
    useBotPlayer.js   # drives bot turns with per-difficulty delays + strategy calls
    useGamepad.js     # Gamepad API polling — edge detection, deadzone, Xbox/PS/Switch
    useOnlineGame.js  # PeerJS event wiring (opponent moves → dispatch)
  components/
    screens/
      StartScreen.jsx     # main menu: mode select, names, bot difficulty, settings, tutorial btn
      GameScreen.jsx      # orchestrates 3D/2D views, guards bot turn, keyboard + gamepad input
      GameOverScreen.jsx  # result display with per-player column breakdown
      TutorialScreen.jsx  # 9-step scripted walkthrough with live mini-board preview
    game/
      PlayerPanel.jsx     # side panels in 3D mode (score, column scores, roll/place buttons)
      DiceDisplay.jsx     # CSS 2D die face — skull positions, combo tinting (gold ×2, blue ×3)
      Board2D.jsx         # full 2D board layout for mobile / force-2D mode
      BoardOverlay.jsx    # 3D overlay UI elements
      ScorePanel.jsx      # score display widget
    ui/
      Button.jsx
      InfoModal.jsx       # two-tab modal: Rules + Controller diagram (SVG callouts)
      InfoButton.jsx
      SettingsPanel.jsx   # audio / graphics / game settings overlay
  i18n/
    es.js / en.js     # full string tables
    index.js          # t(key), setLocale(), getCurrentLocale()
  App.jsx             # screen router (START | TUTORIAL | GAME | GAMEOVER) + locale + 2D state
```

## Screen flow

```
START ──→ TUTORIAL ──→ START
  │
  └──→ GAME ──→ GAMEOVER ──→ GAME   (rematch)
                     └──→ START  (menu)
```

## Game state machine (gameReducer.js)

```
ROLLING → [ROLL_DICE] → PLACING → [PLACE_DICE] → ANIMATING → [ANIMATION_DONE] → ROLLING
                                                           └→ GAMEOVER (board full)
```

- `state.mode` → `'local' | 'bot' | 'online'`
- `state.lastDestroyed` → `[{player, col, positions}]` set by each `PLACE_DICE`
- `state.columnScores` → `[[c0,c1,c2], [c0,c1,c2]]` — always in sync with boards
- `state.winner` → `0 | 1 | null` (set at GAMEOVER)

**Critical**: `rollDice` uses `Math.floor(Math.random() * 6) + 1` (never 0).

## Scoring rule

Column score = `Σ (value × count²)` for each group of identical dice.
- 1 same → ×1, 2 same → ×4, 3 same → ×9

## Bot AI (botStrategy.js)

Three difficulties, all purely positional (no randomness after the roll):

| Difficulty | Strategy |
|---|---|
| `easy` | 30% pure random column; 70% own-score-only greedy (ignores destruction) |
| `normal` | 1-ply greedy: `own_total_after − opp_total_after` + 0.5 × same-value bonus |
| `hard` | 2-ply expected minimax over all 6 opponent rolls + multiplier bonus + threat disruption bonus |

`useBotPlayer` think-delays: easy `{roll:500, place:380}`, normal `{roll:950, place:750}`, hard `{roll:1200, place:900}`.
Bot difficulty is read from `settings.botDifficulty` (localStorage) at effect-creation time.

## 2D mode

- Auto-enabled when `window.innerWidth < 768` (re-checked on resize).
- User can force-enable via Settings toggle (stored in `localStorage` key `knucklebones-force2d`).
- `key={is2D ? '2d' : '3d'}` on `GameScreen` forces full React remount on switch, disposing the WebGL context cleanly.
- `Board2D` renders opponent (top) → central strip (scores + die/button) → turn strip → player board (bottom) → column buttons.
- Cells sized with `min(17vw, 9.5dvh, 70px)` via `@supports (height: 1dvh)` for safe iOS Safari fit.
- `DiceDisplay` `combo` prop (1|2|3) applies gold/blue tinting matching 3D SceneManager colours.

## Three.js layout

- Board flat on **XZ plane** (Y = 0).
- Player 0 at positive Z (front), Player 1 at negative Z (back).
- Columns along X (spacing 1.25), slots along Z (spacing 1.25).
- Camera: `position(0, 14, 6)`, `lookAt(0, 0, 0)`, FOV 50°. `setPixelRatio(1)` fixed.
- Direct `renderer.render(scene, camera)` — no EffectComposer (removed for performance).
- `triggerBloomPulse()` / `setBloomEnabled()` are kept as no-ops for API compatibility.
- Multiplier tinting: count 2 → gold `#e8b840`, count 3 → blue `#6699ff`, count 1 → parchment.

## Online multiplayer (PeerJS WebRTC)

- `host(onConnect)` → resolves with the peer ID (= room code).
- `join(roomCode, onConnect)` → connects to host peer.
- Invite link: `<origin>?room=<peerId>` — `StartScreen` detects `?room=` on mount, pre-fills join flow, cleans URL with `history.replaceState`.
- Copy-link button appears in host waiting state; copies the full invite URL to clipboard.
- `useOnlineGame` wires `conn.on('data')` → `dispatch(PLACE_DICE)` for opponent moves.

## Gamepad support (useGamepad.js)

Polls `navigator.getGamepads()` every RAF frame; fires on button-down edges only.

| Button | Action |
|---|---|
| A / Start | Roll dice (rolling phase) OR confirm column (placing phase) |
| D-pad ← / LB | Previous column |
| D-pad → / RB | Next column |
| Left stick ←→ | Previous / next column (deadzone 0.35) |
| B | Next column + confirm |
| X | Previous column + confirm |
| Y | Confirm current column |

Callbacks stored in a `useRef` so the RAF loop never restarts on re-renders.
All input is ignored when `isHumanTurn` is false (bot / online opponent turn).

## Settings (store.js)

Persisted to `localStorage` key `knucklebones-settings`:

| Key | Default | Description |
|---|---|---|
| `masterVolume` | 0.8 | |
| `musicVolume` | 0.35 | |
| `sfxVolume` | 1.0 | |
| `musicEnabled` | true | |
| `sfxEnabled` | true | |
| `bloomEnabled` | false | |
| `shakeEnabled` | true | |
| `particlesEnabled` | true | |
| `quality` | `'medium'` | `'high'|'medium'|'low'` |
| `fastAnimations` | false | |
| `botDifficulty` | `'normal'` | `'easy'|'normal'|'hard'` |

`updateSetting(key, value)` mutates the singleton in-place and persists.

## Tutorial (TutorialScreen.jsx)

9 scripted steps, each with:
- Pre-defined `boards` state and optional `roll` value
- `highlight` field → which column(s) to outline (`'col0'|'col1'|'col2'|'opp-col0'|'roll'`)
- Title + explanation text + optional callout note

Steps cover: empty board → roll → place → ×2 combo (gold) → ×3 combo (blue) → destruction scenario → post-destruction → advanced board → game-over condition.

## i18n

- `t(key)` reads from the module-level locale variable (sync, no async).
- `App.jsx` holds `locale` React state; toggling calls `i18nSetLocale(next)` **before** `setLocale(next)`.
- `key={locale}` on the root `<div>` forces full re-mount on language switch.

### Adding a new language

1. Copy `src/i18n/es.js` → `src/i18n/xx.js`, translate all values.
2. Import and register in `src/i18n/index.js`.
3. Add locale code to toggle logic in `App.jsx`.

## Coding conventions

- Variables, functions, comments: **English**.
- UI strings: via `t(key)`, never hardcoded.
- CSS: one `.module.css` per component, CSS variables from `src/index.css`.
- No `react-three-fiber` — Three.js is always imperative in `SceneManager`.
- `@/` alias maps to `src/` (configured in `vite.config.js`).
- Do not add abstractions for one-off operations; prefer explicit code.
- Die values always generated with `Math.floor(Math.random() * 6) + 1` — never `Math.ceil`.
