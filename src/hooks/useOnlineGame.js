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
