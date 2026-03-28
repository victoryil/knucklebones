# Knucklebones Web

Fan recreation of the Knucklebones dice mini-game from *Cult of the Lamb* (Massive Monster / Devolver Digital).
Built with React + Vite + Three.js. **100% client-side, no backend required.**

## Quick start

```bash
npm install
npm run dev      # development server at http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build
```

## Project structure

```
src/
  game/
    constants.js        # scoring, column logic, helpers
    gameReducer.js      # useReducer state machine (ROLLING → PLACING → ANIMATING → …)
  network/
    networkInterface.js # online stub — wire up WebSocket/WebRTC here (Phase 2)
  three/
    SceneManager.js     # imperative Three.js scene — dice meshes, animation loop
    TextureGenerator.js # Canvas2D skull textures for each die face (1-6)
  hooks/
    useGameReducer.js   # game state + dispatch
    useThreeScene.js    # mounts SceneManager, syncs boards via ResizeObserver
  components/
    screens/            # StartScreen, GameScreen, GameOverScreen
    game/               # BoardOverlay, DiceDisplay, ScorePanel
    ui/                 # Button
  i18n/
    es.js               # Spanish strings (default)
    index.js            # t(key) helper; call setLocale('xx') to switch
```

## Scoring rules

For each column, identical dice **multiply** each other:
- 1 die of value V → `V × 1 = V`
- 2 dice of value V → `V × 2 × 2 = V × 4`
- 3 dice of value V → `V × 3 × 3 = V × 9`

Formally: `column_score = Σ value × count²` for each distinct value group.

When you place a die in column C, all opponent dice of the **same value** in column C are **destroyed**.

## How to add online multiplayer (Phase 2)

1. Open `src/network/networkInterface.js` — all stubs are documented.
2. **WebSocket approach:**
   ```js
   connect: async (roomId) => {
     ws = new WebSocket(`wss://yourserver.com/room/${roomId}`)
     await new Promise(r => ws.addEventListener('open', r))
   },
   sendMove: (col) => ws.send(JSON.stringify({ type: 'PLACE_DICE', col })),
   onOpponentMove: (cb) => {
     ws.addEventListener('message', e => {
       const msg = JSON.parse(e.data)
       if (msg.type === 'PLACE_DICE') cb(msg.col)
     })
   },
   ```
3. In `GameScreen`, call `NetworkInterface.sendMove(col)` **before** dispatching locally.
4. For opponent turns, subscribe in a `useEffect` and dispatch `{ type: 'PLACE_DICE', col }`.
5. Set `mode: 'online'` in the game context to disable the Roll button for the non-local player.

## How to add a bot (Phase 2)

1. Create `src/game/botStrategy.js`:
   ```js
   // Returns the best column index for the current roll
   export function botStrategy(state) {
     const { boards, currentRoll } = state
     const opponentBoard = boards[0]
     // Greedy: prefer columns where placing destroys opponent dice
     for (let c = 0; c < 3; c++) {
       if (!isColumnFull(boards[1][c]) && opponentBoard[c].includes(currentRoll)) return c
     }
     // Fallback: highest score gain
     return [0,1,2].filter(c => !isColumnFull(boards[1][c]))[0] ?? 0
   }
   ```
2. In `useGameReducer.js`, after `ROLL_DICE` when `state.mode === 'bot' && state.currentPlayer === 1`:
   ```js
   useEffect(() => {
     if (state.phase === 'placing' && state.currentPlayer === 1 && state.mode === 'bot') {
       const id = setTimeout(() => placeDice(botStrategy(state)), 700)
       return () => clearTimeout(id)
     }
   }, [state])
   ```

## Adding a new language

1. Duplicate `src/i18n/es.js`, name it e.g. `en.js`, translate all values.
2. Import it in `src/i18n/index.js` and add to the `locales` map.
3. Call `setLocale('en')` at startup (or from a locale picker component).

## Disclaimer

Knucklebones Web es un proyecto de fan sin ánimo de lucro.
Knucklebones fue creado originalmente por Massive Monster y publicado por Devolver Digital
como parte del videojuego Cult of the Lamb (2022). Este proyecto no está afiliado,
patrocinado ni aprobado por Massive Monster ni Devolver Digital.
Todos los derechos del juego original pertenecen a sus respectivos propietarios.
