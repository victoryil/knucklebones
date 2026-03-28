import { useEffect, useRef } from 'react'
import { SceneManager } from '@/three/SceneManager.js'

/**
 * Mounts a Three.js SceneManager on the given canvas ref.
 * Syncs boards whenever boards prop changes.
 */
export function useThreeScene(canvasRef, boards) {
  const managerRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const manager = new SceneManager(canvas)
    manager.init()
    managerRef.current = manager

    // ResizeObserver for responsive canvas
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

  // Sync boards whenever they change
  useEffect(() => {
    if (managerRef.current && boards) {
      managerRef.current.syncBoards(boards)
    }
  }, [boards])

  return managerRef
}
