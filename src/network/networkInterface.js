/**
 * NetworkInterface — Phase 1: stub (local only)
 *
 * Phase 2 integration guide (WebSocket):
 *  1. Replace connect() with `ws = new WebSocket(serverUrl)` and resolve on open.
 *  2. sendMove() emits `{ type: 'PLACE_DICE', col }` over the socket.
 *  3. onOpponentMove() registers a listener; dispatch PLACE_DICE locally when received.
 *  4. onGameState() syncs full state on reconnect.
 *
 * Phase 2 integration guide (WebRTC / peer-to-peer):
 *  1. Use a signaling server for offer/answer exchange.
 *  2. Replace ws with an RTCDataChannel for low-latency local network play.
 *
 * To add a bot:
 *  1. Import a botStrategy(state) → colIndex function.
 *  2. In useGameReducer, after ROLL_DICE when mode==='bot' and currentPlayer===1,
 *     schedule a setTimeout(() => dispatch({ type: 'PLACE_DICE', col: botStrategy(state) }), 600).
 */
export const NetworkInterface = {
  /** @param {string} _roomId */
  connect: async (_roomId) => {
    // TODO Phase 2: open WebSocket/WebRTC connection
    return Promise.resolve()
  },

  disconnect: () => {
    // TODO Phase 2: close connection
  },

  /** @param {number} _colIndex */
  sendMove: (_colIndex) => {
    // TODO Phase 2: emit move to opponent
  },

  /** @param {(colIndex: number) => void} _callback */
  onOpponentMove: (_callback) => {
    // TODO Phase 2: subscribe to remote moves
    return () => {} // returns unsubscribe function
  },

  /** @param {(state: object) => void} _callback */
  onGameState: (_callback) => {
    // TODO Phase 2: subscribe to full state sync
    return () => {}
  },

  isConnected: () => false,
  isOnline: () => false,
}
