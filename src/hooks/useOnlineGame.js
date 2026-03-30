import { useEffect } from 'react'
import { onOpponentMove, onDisconnect } from '@/network/networkInterface.js'

export function useOnlineGame(mode, dispatch, onNetworkError, onSyncRequest) {
  useEffect(() => {
    if (mode !== 'online') return
    onOpponentMove(msg => {
      if (msg.type === 'ROLL')               dispatch({ type: 'ROLL_DICE',     value: msg.value })
      if (msg.type === 'PLACE')              dispatch({ type: 'PLACE_DICE',    col:   msg.col   })
      if (msg.type === 'STATE_SYNC')         dispatch({ type: 'RESTORE_STATE', state: msg.state })
      if (msg.type === 'STATE_SYNC_REQUEST') onSyncRequest?.()
    })
    onDisconnect(() => onNetworkError?.())
  }, [mode, dispatch, onNetworkError, onSyncRequest])
}
