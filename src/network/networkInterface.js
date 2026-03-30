import Peer from 'peerjs'

let peer = null, conn = null
let _onOpponentMove = null, _onDisconnect = null, _onEmote = null

export function host(onConnect) {
  peer = new Peer()
  return new Promise(resolve => {
    peer.on('open', id => resolve(id))
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
  conn.on('data', msg => {
    if (msg.type === 'EMOTE') _onEmote?.(msg)
    else _onOpponentMove?.(msg)
  })
  conn.on('close', () => _onDisconnect?.())
}

export function sendMove(msg)        { conn?.send(msg) }
export function onOpponentMove(cb)   { _onOpponentMove = cb }
export function onDisconnect(cb)     { _onDisconnect = cb }
export function onEmoteReceived(cb)  { _onEmote = cb }
export function isConnected()        { return conn?.open ?? false }
export function disconnect()         { conn?.close(); peer?.destroy(); peer = conn = null }
