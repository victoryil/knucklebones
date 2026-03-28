import {
  PHASES,
  COLS,
  SLOTS,
  calcAllColumnScores,
  calcTotalScore,
  isBoardFull,
  isColumnFull,
  placeInColumn,
  destroyFromColumn,
} from './constants.js'

/** Deep-clone the boards array */
function cloneBoards(boards) {
  return boards.map(board => board.map(col => [...col]))
}

function emptyBoard() {
  return Array.from({ length: COLS }, () => Array(SLOTS).fill(null))
}

export function getInitialState(playerNames = ['Jugador 1', 'Jugador 2']) {
  const boards = [emptyBoard(), emptyBoard()]
  return {
    phase: PHASES.ROLLING,
    currentPlayer: 0,
    boards,
    scores: [0, 0],
    columnScores: [
      calcAllColumnScores(boards[0]),
      calcAllColumnScores(boards[1]),
    ],
    currentRoll: null,
    lastDestroyed: [],   // [{player, col, positions}]
    winner: null,
    playerNames,
    mode: 'local',
  }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'ROLL_DICE': {
      if (state.phase !== PHASES.ROLLING) return state
      const roll = Math.floor(Math.random() * 6) + 1
      return { ...state, phase: PHASES.PLACING, currentRoll: roll, lastDestroyed: [] }
    }

    case 'PLACE_DICE': {
      if (state.phase !== PHASES.PLACING) return state
      const { col } = action
      const player = state.currentPlayer
      const opponent = 1 - player

      const column = state.boards[player][col]
      if (isColumnFull(column)) return state

      const newBoards = cloneBoards(state.boards)

      // Place die on current player's board
      newBoards[player][col] = placeInColumn(newBoards[player][col], state.currentRoll)

      // Destroy matching dice on opponent's board
      const { newColumn: opponentCol, destroyedPositions } = destroyFromColumn(
        newBoards[opponent][col],
        state.currentRoll,
      )
      newBoards[opponent][col] = opponentCol

      const lastDestroyed = destroyedPositions.length > 0
        ? [{ player: opponent, col, positions: destroyedPositions }]
        : []

      // Recalculate scores
      const columnScores = [
        calcAllColumnScores(newBoards[0]),
        calcAllColumnScores(newBoards[1]),
      ]
      const scores = [
        columnScores[0].reduce((a, b) => a + b, 0),
        columnScores[1].reduce((a, b) => a + b, 0),
      ]

      // Check game over — current player's board full after placement
      const gameOver = isBoardFull(newBoards[player])
      if (gameOver) {
        const winner = scores[0] === scores[1]
          ? null
          : scores[0] > scores[1] ? 0 : 1
        return {
          ...state,
          boards: newBoards,
          scores,
          columnScores,
          currentRoll: null,
          lastDestroyed,
          phase: PHASES.GAMEOVER,
          winner,
        }
      }

      return {
        ...state,
        boards: newBoards,
        scores,
        columnScores,
        currentRoll: null,
        lastDestroyed,
        phase: PHASES.ANIMATING,
        nextPlayer: 1 - player,
      }
    }

    case 'ANIMATION_DONE': {
      if (state.phase !== PHASES.ANIMATING) return state
      return {
        ...state,
        phase: PHASES.ROLLING,
        currentPlayer: state.nextPlayer ?? 1 - state.currentPlayer,
        nextPlayer: undefined,
        lastDestroyed: [],
      }
    }

    case 'RESET_GAME': {
      return getInitialState(state.playerNames)
    }

    case 'SET_PLAYER_NAMES': {
      return { ...state, playerNames: action.names }
    }

    default:
      return state
  }
}
