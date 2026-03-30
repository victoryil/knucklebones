import Peer from 'peerjs'

let peer = null, conn = null
let _onOpponentMove = null, _onDisconnect = null, _onEmote = null

// ── Session info — persists across reconnects ──────────────────────────────
let _savedRoomCode    = null
let _savedPlayerIndex = 0
let _reconnTimer      = null

// ── Internal helpers ───────────────────────────────────────────────────────
function _destroyPeer() {
  try { conn?.close() } catch {}
  try { peer?.destroy() } catch {}
  peer = conn = null
}

function _wireConn() {
  conn.on('data', msg => {
    if (msg.type === 'EMOTE') _onEmote?.(msg)
    else _onOpponentMove?.(msg)
  })
  conn.on('close', () => _onDisconnect?.())
}

// ── Public API ─────────────────────────────────────────────────────────────
export function host(onConnect) {
  peer = new Peer()
  return new Promise(resolve => {
    peer.on('open', id => {
      _savedRoomCode    = id
      _savedPlayerIndex = 0
      resolve(id)
    })
    peer.on('connection', c => { conn = c; _wireConn(); onConnect?.() })
  })
}

export function join(roomCode, onConnect) {
  _savedRoomCode    = roomCode
  _savedPlayerIndex = 1
  peer = new Peer()
  return new Promise(resolve => {
    peer.on('open', () => {
      conn = peer.connect(roomCode)
      conn.on('open', () => { _wireConn(); onConnect?.(); resolve() })
    })
  })
}

/**
 * Attempt to re-establish the connection after a drop.
 * Host tries to reclaim the same peer ID; guest dials the saved room code.
 * @param {Function} onSuccess   () => void   — connection restored
 * @param {Function} onAttempt   (n, max) => void — called at the start of each try
 * @param {Function} onFail      () => void   — all attempts exhausted
 * @param {number}   maxAttempts default 5
 */
export function startReconnect(onSuccess, onAttempt, onFail, maxAttempts = 5) {
  if (!_savedRoomCode) { onFail?.(); return }
  let attempt = 0

  const tryOnce = () => {
    attempt++
    onAttempt?.(attempt, maxAttempts)
    _destroyPeer()

    let done = false
    const succeed = () => { if (done) return; done = true; clearTimeout(_reconnTimer); onSuccess?.() }
    const scheduleNext = () => {
      if (done) return
      if (attempt < maxAttempts) { _reconnTimer = setTimeout(tryOnce, 3000) }
      else onFail?.()
    }

    if (_savedPlayerIndex === 0) {
      // Host — reclaim same peer ID so the guest can find us
      peer = new Peer(_savedRoomCode)
      peer.on('open', () => {
        clearTimeout(_reconnTimer)
        _reconnTimer = setTimeout(scheduleNext, 10000) // wait up to 10s for guest
      })
      peer.on('connection', c => { conn = c; _wireConn(); succeed() })
      peer.on('error',      scheduleNext)
      _reconnTimer = setTimeout(scheduleNext, 8000)
    } else {
      // Guest — dial the host's saved peer ID
      peer = new Peer()
      peer.on('open', () => {
        clearTimeout(_reconnTimer)
        conn = peer.connect(_savedRoomCode)
        conn.on('open',  succeed)
        conn.on('error', scheduleNext)
        _reconnTimer = setTimeout(scheduleNext, 8000)
      })
      peer.on('error', scheduleNext)
      _reconnTimer = setTimeout(scheduleNext, 8000)
    }
  }

  tryOnce()
}

export function cancelReconnect()    { clearTimeout(_reconnTimer) }
export function sendMove(msg)        { conn?.send(msg) }
export function onOpponentMove(cb)   { _onOpponentMove = cb }
export function onDisconnect(cb)     { _onDisconnect = cb }
export function onEmoteReceived(cb)  { _onEmote = cb }
export function isConnected()        { return conn?.open ?? false }
export function disconnect()         { cancelReconnect(); _destroyPeer() }
