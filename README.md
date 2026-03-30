# Knucklebones Web

Fan recreation of the Knucklebones dice mini-game from *Cult of the Lamb* (Massive Monster / Devolver Digital).
Built with **React 18 + Vite 6 + Three.js 0.170 + PeerJS**. 100% client-side — no backend required.

---

## Quick start

```bash
npm install
npm run dev      # development server → http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build
npm run lint     # ESLint check
```

---

## Features

### Game modes
| Mode | Description |
|---|---|
| **Local 1vs1** | Two players share the same screen/keyboard |
| **vs Bot** | Play against an AI opponent |
| **Online 1vs1** | Peer-to-peer via PeerJS (WebRTC) — no server needed |

### Bot difficulties
| Difficulty | Behaviour |
|---|---|
| **Easy** | 30% random moves; otherwise ignores destruction and combos |
| **Normal** | 1-ply greedy: maximises score differential after each placement |
| **Hard** | 2-ply expected minimax over all 6 possible opponent rolls + multiplier and threat bonuses |

### Display modes
- **3D mode** — Three.js WebGL board with animated dice, skull textures, screen shake and particles.
- **2D mode** — Flat CSS board optimised for mobile. Auto-enabled on viewports < 768 px wide; can also be forced in Settings.

### Other features
- 🎮 **Gamepad support** — Xbox, PlayStation and Switch Pro controllers (see Controls tab in the info modal)
- ⌨️ **Keyboard shortcuts** — Space to roll, Arrow keys to navigate columns, 1/2/3 to place directly
- 🔗 **Online invite links** — Host generates a `?room=<code>` URL; guest opens it and joins automatically
- 📖 **Interactive tutorial** — 9-step guided walkthrough with a live mini-board
- ⚙️ **Settings** — Volume, quality, bloom, shake, fast animations, 2D toggle, bot difficulty — persisted to localStorage
- 🌐 **i18n** — Spanish (default) and English; toggle in the top corner

---

## Scoring rules

For each column, identical dice multiply each other:

| Same dice | Formula | Example (value 3) |
|---|---|---|
| 1 die | 3 × 1 | **3** |
| 2 dice 🟡 | (3+3) × 2 | **12** |
| 3 dice 🔵 | (3+3+3) × 3 | **27** |

Formally: `column_score = Σ value × count²` per distinct value group.

**Destruction** — when you place a die with value V in column C, every opponent die of value V in column C is removed from their board.

The game ends when one player fills all 9 slots. Highest total score wins.

---

## Controls

### Keyboard
| Key | Action |
|---|---|
| `Space` / `Enter` | Roll dice / Confirm column |
| `← →` Arrow keys | Navigate columns |
| `1` `2` `3` | Place directly in that column |

### Gamepad (Xbox / PS / Switch Pro)
| Button | Action |
|---|---|
| **A** / Start | Roll dice or confirm column |
| **D-pad ←→** / LB / RB | Previous / next column |
| **Left stick ←→** | Previous / next column |
| **B** | Next column + place |
| **X** | Previous column + place |
| **Y** | Place in current column |

---

## Online multiplayer

Uses **PeerJS** (WebRTC) — fully peer-to-peer, no dedicated server.

1. Player A clicks **Crear Sala** → a room code is generated.
2. Player A clicks **🔗 Copiar enlace de invitación** → copies `https://…?room=<code>`.
3. Player B opens that link → the join form is pre-filled automatically.
4. Player B clicks **Conectar** → game starts.

---

## Project structure

```
src/
  game/
    constants.js        # scoring helpers, placeInColumn, destroyFromColumn, compactColumn
    gameReducer.js      # useReducer state machine (ROLLING → PLACING → ANIMATING → GAMEOVER)
    botStrategy.js      # Easy / Normal / Hard strategies + dispatcher
  network/
    networkInterface.js # PeerJS host/join/sendMove/disconnect
  three/
    SceneManager.js     # Three.js scene — dice meshes, particles, camera, render loop
    TextureGenerator.js # Canvas2D skull face textures (values 1-6)
  audio/
    AudioEngine.js      # volume / music / sfx facade
    soundManager.js     # Web Audio API synthesised sounds (zero external files)
  settings/
    store.js            # localStorage singleton for all user preferences
  hooks/
    useGameReducer.js   # named dispatch wrappers (rollDice, placeDice, …)
    useThreeScene.js    # mounts/resizes SceneManager
    useBotPlayer.js     # drives bot turns with difficulty-aware delays
    useGamepad.js       # Gamepad API polling with edge detection
    useOnlineGame.js    # PeerJS event bridge → dispatch
  components/
    screens/
      StartScreen.jsx       # main menu (mode, names, bot difficulty, settings, tutorial)
      GameScreen.jsx        # game orchestrator — 3D/2D, bot guard, keyboard, gamepad
      GameOverScreen.jsx    # winner + per-player column score breakdown
      TutorialScreen.jsx    # 9-step interactive tutorial
    game/
      PlayerPanel.jsx       # side panels (3D mode only)
      DiceDisplay.jsx       # 2D CSS die with combo tinting (gold ×2, blue ×3)
      Board2D.jsx           # full 2D board for mobile / force-2D
    ui/
      InfoModal.jsx         # two-tab modal: Rules + Controller diagram
      SettingsPanel.jsx     # audio / graphics / game settings overlay
      Button.jsx
  i18n/
    es.js                   # Spanish strings (default)
    en.js                   # English strings
    index.js                # t(key), setLocale(), getCurrentLocale()
  App.jsx                   # router (START | TUTORIAL | GAME | GAMEOVER)
```

---

## Adding a new language

1. Copy `src/i18n/es.js` → `src/i18n/xx.js` and translate all values.
2. Import and register it in `src/i18n/index.js`.
3. Add the locale code to the toggle logic in `App.jsx`.

---

## Deployment

The build output is a static SPA (`dist/`). Deploy to any static host (Cloudflare Pages, Netlify, GitHub Pages, …).

If using Cloudflare Pages / Wrangler, a `wrangler.toml` and `_redirects` file are included to serve the SPA correctly and protect static assets from redirect loops.

---

## Disclaimer

Knucklebones Web es un proyecto de fan sin ánimo de lucro.
Knucklebones fue creado originalmente por **Massive Monster** y publicado por **Devolver Digital** como parte del videojuego *Cult of the Lamb* (2022).
Este proyecto no está afiliado, patrocinado ni aprobado por Massive Monster ni Devolver Digital.
Todos los derechos del juego original pertenecen a sus respectivos propietarios.
