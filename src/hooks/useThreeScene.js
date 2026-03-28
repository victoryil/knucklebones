import { useEffect, useRef } from 'react'
import { SceneManager } from '@/three/SceneManager.js'

/**
 * Mounts a Three.js SceneManager on the given canvas ref.
 *
 * @param {React.RefObject} canvasRef
 * @param {Array}           boards        3D board state (synced to the scene)
 * @param {object}          interaction   { phase, currentPlayer, onPlace }
 */
export function useThreeScene(canvasRef, boards, interaction = {}) {
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

  // Sync board state
  useEffect(() => {
    if (managerRef.current && boards) {
      managerRef.current.syncBoards(boards)
    }
  }, [boards])

  // Sync interaction state (phase, active player, onPlace callback)
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
