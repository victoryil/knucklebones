import { useEffect, useRef } from 'react'
import { SceneManager } from '@/three/SceneManager.js'

/**
 * @param {React.RefObject} canvasRef
 * @param {Array}           boards        current board state
 * @param {object}          interaction   { phase, currentPlayer, onPlace }
 * @param {Array}           lastDestroyed [{player, col, positions}]
 */
export function useThreeScene(canvasRef, boards, interaction = {}, lastDestroyed = []) {
  const managerRef = useRef(null)

  // Mount / unmount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const manager = new SceneManager(canvas)
    manager.init()
    managerRef.current = manager

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        manager.resize(width, height)
      }
    })
    ro.observe(canvas.parentElement ?? canvas)

    return () => {
      ro.disconnect()
      manager.dispose()
      managerRef.current = null
    }
  }, [canvasRef])

  // Sync board + destruction info whenever either changes
  useEffect(() => {
    if (managerRef.current && boards) {
      managerRef.current.syncBoards(boards, lastDestroyed)
    }
  }, [boards, lastDestroyed])

  // Sync interaction state
  const { phase, currentPlayer, onPlace } = interaction
  useEffect(() => {
    if (!managerRef.current) return
    managerRef.current.setInteraction(
      currentPlayer ?? 0,
      phase === 'placing',
      onPlace ?? null,
      boards ?? null,
    )
  }, [phase, currentPlayer, onPlace, boards])

  return managerRef
}
