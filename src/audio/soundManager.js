/**
 * SoundManager — thin re-export layer over AudioEngine.
 * Keeps backward-compatibility with existing callers (GameScreen, etc.).
 */
import { audioEngine } from './AudioEngine.js'

export function playDestruction() { audioEngine.playDestroy()  }
export function playRoll()        { audioEngine.playRoll()     }
export function playPlace()       { audioEngine.playPlace()    }
export function playVictory()     { audioEngine.playVictory()  }
export function playDefeat()      { audioEngine.playDefeat()   }
