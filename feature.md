# Feature: Online Multiplayer (Static Web App)

## Overview
Add real-time 1v1 online play to Knucklebones Web without any custom backend, using **WebRTC P2P via PeerJS** (free public signaling server at `peerjs.com`).

Only 2 events need synchronization: the dice roll value and the column placement choice. Both peers run the same deterministic reducer with the same inputs → state stays perfectly in sync.

---

## Authority Model

```
Host (player 0)            Guest (player 1)
────────────────           ─────────────────
Generates PeerID           Enters room code
Rolls → sends { type: 'ROLL', value }
                           Receives → dispatches ROLL_DICE(value)
                           Places → sends { type: 'PLACE', col }
Host receives → dispatches PLACE_DICE(col)
```

- The **active player** is authoritative for their own roll value.
- Both sides run the same pure reducer → identical state without full-state broadcast.

---

## Room Code UX Flow

```
StartScreen
  └─ [Online] selected
       ├─ [Host Game]  → host() → show "Room code: XXXX" + spinner
       │                on peer connects → start game as player 0
       └─ [Join Game]  → input field for code
                         [Connect] → join(code) → start game as player 1
```

---

## Files to Change

| File | Change |
|------|--------|
| `src/network/networkInterface.js` | Full PeerJS implementation (replace stub) |
| `src/hooks/useOnlineGame.js` | **New** — wires incoming network messages → dispatch |
| `src/hooks/useGameReducer.js` | Send moves over network inside rollDice/placeDice |
| `src/components/screens/StartScreen.jsx` | Host / Join room code sub-panel |
| `src/components/screens/GameScreen.jsx` | Guard local input by playerIndex |
| `src/App.jsx` | Thread playerIndex, handle online start event |
| `package.json` | Add `peerjs` dependency |

---

## Implementation Details

### 1. `src/network/networkInterface.js`

```js
import Peer from 'peerjs'

let peer = null, conn = null
let _onOpponentMove = null, _onDisconnect = null

export function host(onConnect) {
  peer = new Peer()
  return new Promise(resolve => {
    peer.on('open', id => resolve(id))           // room code = peer ID
    peer.on('connection', c => { conn = c; _wireConn(); onConnect?.() })
  })
}

export function join(roomCode, onConnect) {
  peer = new Peer()
  return new Promise(resolve => {
    peer.on('open', () => {
      conn = peer.connect(roomCode)
      conn.on('open', () => { _wireConn(); onConnect?.(); resolve() })
    })
  })
}

function _wireConn() {
  conn.on('data', msg => _onOpponentMove?.(msg))
  conn.on('close', () => _onDisconnect?.())
}

export function sendMove(msg)       { conn?.send(msg) }
export function onOpponentMove(cb)  { _onOpponentMove = cb }
export function onDisconnect(cb)    { _onDisconnect = cb }
export function isConnected()       { return conn?.open ?? false }
export function disconnect()        { conn?.close(); peer?.destroy(); peer = conn = null }
```

**Message payloads:**
- Roll: `{ type: 'ROLL', value: 1–6 }`
- Place: `{ type: 'PLACE', col: 0–2 }`

---

### 2. `src/hooks/useOnlineGame.js` (new)

```js
import { useEffect } from 'react'
import { onOpponentMove, onDisconnect } from '@/network/networkInterface.js'

export function useOnlineGame(mode, dispatch, onNetworkError) {
  useEffect(() => {
    if (mode !== 'online') return
    onOpponentMove(msg => {
      if (msg.type === 'ROLL')  dispatch({ type: 'ROLL_DICE',  value: msg.value })
      if (msg.type === 'PLACE') dispatch({ type: 'PLACE_DICE', col:   msg.col   })
    })
    onDisconnect(() => onNetworkError?.())
  }, [mode, dispatch, onNetworkError])
}
```

---

### 3. `src/hooks/useGameReducer.js` — modified rollDice / placeDice

```js
const rollDice = useCallback(() => {
  const value = Math.ceil(Math.random() * 6)
  dispatch({ type: 'ROLL_DICE', value })
  if (state.mode === 'online') sendMove({ type: 'ROLL', value })
}, [state.mode])

const placeDice = useCallback((col) => {
  dispatch({ type: 'PLACE_DICE', col })
  if (state.mode === 'online') sendMove({ type: 'PLACE', col })
}, [state.mode])
```

Add `useOnlineGame(state.mode, dispatch, handleNetworkError)` inside the hook.

---

### 4. `src/components/screens/StartScreen.jsx`

When `mode === 'online'`, replace the P2 name field with a Host/Join panel:

```
[ Host Game ]  [ Join Game ]

Host selected:
  Generating room code…  →  Room code: ABCD1234
  Waiting for opponent to connect…

Join selected:
  [ Enter room code: __________ ]  [ Connect ]
```

On successful connection, call `onStart({ playerNames, mode: 'online', playerIndex: 0|1 })`.

---

### 5. `src/components/screens/GameScreen.jsx`

Accept `playerIndex` prop. Block local `onRoll` / `onPlace` when `currentPlayer !== playerIndex`:

```js
const isMyTurn = currentPlayer === playerIndex
// Pass isMyTurn to PlayerPanels; space bar handler already checks mode+currentPlayer
```

---

### 6. `src/App.jsx`

```js
const [playerIndex, setPlayerIndex] = useState(0)

const handleStart = useCallback(({ playerNames, mode, playerIndex: pi = 0 }) => {
  setPlayerIndex(pi)
  startGame(playerNames, mode)
  setScreen(SCREENS.GAME)
}, [startGame])
```

Pass `playerIndex` to `<GameScreen>`.

---

## Reconnection / Late Join
Out of scope for v1. If connection drops mid-game, show an error overlay and return to menu. Both players must stay connected throughout.

---

## Verification Steps

1. `npm install peerjs && npm run build` — no errors, bundle splits correctly
2. Open two browser tabs (or two devices):
   - Tab A: Online → Host → copy room code shown
   - Tab B: Online → Join → paste code → Connect
3. Both tabs transition to GameScreen (A = left/P0, B = right/P1)
4. Tab A rolls and places — Tab B updates identically and vice-versa
5. Game reaches GameOver — both tabs show winner screen
6. Close one tab mid-game — remaining tab returns to menu gracefully
