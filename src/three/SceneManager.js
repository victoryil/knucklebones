import * as THREE from 'three'
import { generateFaceTexture, preloadFaceTextures } from './TextureGenerator.js'

// ── Layout constants ──────────────────────────────────────────────────────────
const DICE_SIZE    = 0.78   // die edge length
const COL_SPACING  = 1.25   // X distance between columns
const SLOT_SPACING = 1.25   // Z distance between slots within a column
const BOARD_HALF   = 0.80   // half the Z gap between the two boards at center

// Z position of each slot (0 = closest to center, 2 = farthest)
function slotZ(slot) {
  return BOARD_HALF + 0.55 + slot * SLOT_SPACING
  // slot 0 → 1.35, slot 1 → 2.60, slot 2 → 3.85
}

/**
 * 3D world position for player / column / slot.
 * Board lies flat on the XZ plane (Y = 0).
 * Player 0 is at positive Z (near camera), Player 1 at negative Z.
 */
function slotPosition(player, col, slot) {
  const x = (col - 1) * COL_SPACING          // -1.25, 0, 1.25
  const z = player === 0 ? slotZ(slot) : -slotZ(slot)
  const y = DICE_SIZE / 2 + 0.02             // die sits on board surface
  return new THREE.Vector3(x, y, z)
}

// ── Dice mesh ─────────────────────────────────────────────────────────────────
const parchmentMat = () =>
  new THREE.MeshStandardMaterial({ color: 0xf0e4c4, roughness: 0.6, metalness: 0 })

function createDiceMesh(faceValue) {
  const topTex = generateFaceTexture(faceValue)
  const materials = [
    parchmentMat(),                                                         // +X
    parchmentMat(),                                                         // -X
    new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.5 }),       // +Y (top)
    new THREE.MeshStandardMaterial({ color: 0xc8b890, roughness: 0.8 }),   // -Y (bottom)
    parchmentMat(),                                                         // +Z
    parchmentMat(),                                                         // -Z
  ]
  const geo = new THREE.BoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE)
  const mesh = new THREE.Mesh(geo, materials)
  mesh.castShadow = true
  return mesh
}

// ── SceneManager ──────────────────────────────────────────────────────────────
export class SceneManager {
  constructor(canvas) {
    this._canvas  = canvas
    this._diceMap = new Map()   // key "p-c-s" → { mesh, targetPos, settling }
    this._rafId   = null
    this._ready   = false
  }

  init() {
    const canvas = this._canvas
    const rect   = canvas.getBoundingClientRect()
    const w      = rect.width  || 800
    const h      = rect.height || 600

    // Renderer
    this._renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this._renderer.setSize(w, h, false)
    this._renderer.shadowMap.enabled = true
    this._renderer.shadowMap.type    = THREE.PCFSoftShadowMap

    // Scene
    this._scene = new THREE.Scene()

    // Camera — top-down perspective, sees both boards comfortably
    this._camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 100)
    this._camera.position.set(0, 9, 6)
    this._camera.lookAt(0, 0, 0)

    // Lighting — clean, no drama
    this._scene.add(new THREE.AmbientLight(0xfff8ee, 0.9))

    const sun = new THREE.DirectionalLight(0xfff0dd, 1.1)
    sun.position.set(3, 10, 5)
    sun.castShadow           = true
    sun.shadow.mapSize.width  = 1024
    sun.shadow.mapSize.height = 1024
    sun.shadow.camera.near   = 1
    sun.shadow.camera.far    = 25
    sun.shadow.camera.left   = -8
    sun.shadow.camera.right  =  8
    sun.shadow.camera.top    =  8
    sun.shadow.camera.bottom = -8
    this._scene.add(sun)

    // Build static scene elements
    this._buildBoards()

    preloadFaceTextures()
    this._ready = true
    this._startLoop()
  }

  // ── Board geometry ───────────────────────────────────────────────────────────
  _buildBoards() {
    const BOARD_W = COL_SPACING * 2 + DICE_SIZE + 0.7   // ≈ 3.53
    const slotFar = slotZ(2) + DICE_SIZE / 2 + 0.25
    const slotNear = slotZ(0) - DICE_SIZE / 2 - 0.25

    for (const player of [0, 1]) {
      const zNear = player === 0 ?  slotNear : -slotFar
      const zFar  = player === 0 ?  slotFar  : -slotNear
      const zCtr  = (zNear + zFar) / 2
      const depth = Math.abs(zFar - zNear)

      // Board surface
      const boardGeo = new THREE.BoxGeometry(BOARD_W, 0.12, depth)
      const boardMat = new THREE.MeshStandardMaterial({
        color:     player === 0 ? 0x1a0c30 : 0x2a0c18,
        roughness: 0.85,
        metalness: 0.05,
      })
      const board = new THREE.Mesh(boardGeo, boardMat)
      board.position.set(0, -0.06, zCtr)
      board.receiveShadow = true
      this._scene.add(board)

      // Slot markers
      for (let c = 0; c < 3; c++) {
        for (let s = 0; s < 3; s++) {
          const pos = slotPosition(player, c, s)
          const mGeo = new THREE.BoxGeometry(DICE_SIZE + 0.08, 0.04, DICE_SIZE + 0.08)
          const mMat = new THREE.MeshStandardMaterial({
            color:     player === 0 ? 0x3a1a5a : 0x5a1a2a,
            roughness: 0.9,
          })
          const marker = new THREE.Mesh(mGeo, mMat)
          marker.position.set(pos.x, 0.02, pos.z)
          marker.receiveShadow = true
          this._scene.add(marker)
        }
      }

      // Column dividers
      for (let c = 0; c < 2; c++) {
        const dGeo = new THREE.BoxGeometry(0.06, 0.18, depth - 0.2)
        const dMat = new THREE.MeshStandardMaterial({
          color:     player === 0 ? 0x4a2060 : 0x6a2030,
          roughness: 0.9,
        })
        const div = new THREE.Mesh(dGeo, dMat)
        div.position.set((c - 0.5) * COL_SPACING, 0.09, zCtr)
        this._scene.add(div)
      }

      // Board frame
      const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(BOARD_W + 0.04, 0.16, depth + 0.04))
      const frameMat = new THREE.LineBasicMaterial({ color: player === 0 ? 0x6a3a80 : 0x803a4a })
      const frame = new THREE.LineSegments(frameGeo, frameMat)
      frame.position.set(0, -0.02, zCtr)
      this._scene.add(frame)
    }

    // Center line between the boards
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-BOARD_W / 2, 0.01, 0),
      new THREE.Vector3( BOARD_W / 2, 0.01, 0),
    ])
    const lineMat = new THREE.LineBasicMaterial({ color: 0x4a3060, linewidth: 1 })
    this._scene.add(new THREE.Line(lineGeo, lineMat))
  }

  // ── Board sync ───────────────────────────────────────────────────────────────
  /**
   * Call this whenever the board state changes.
   * Adds new dice and removes destroyed ones.
   */
  syncBoards(boards) {
    if (!this._ready) return

    const present = new Set()

    for (let p = 0; p < 2; p++) {
      for (let c = 0; c < 3; c++) {
        for (let s = 0; s < 3; s++) {
          const val = boards[p][c][s]
          const key = `${p}-${c}-${s}`

          if (val !== null) {
            present.add(key)
            if (!this._diceMap.has(key)) {
              // Spawn — start from above the target position
              const mesh   = createDiceMesh(val)
              const target = slotPosition(p, c, s)
              mesh.position.copy(target).setY(target.y + 5)
              // Random initial spin
              mesh.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
              )
              this._scene.add(mesh)
              this._diceMap.set(key, { mesh, target: target.clone(), settling: true })
            }
          }
        }
      }
    }

    // Remove dice that are no longer on the board
    for (const [key, entry] of this._diceMap) {
      if (!present.has(key)) {
        this._scene.remove(entry.mesh)
        this._diceMap.delete(key)
      }
    }
  }

  // ── Render loop ──────────────────────────────────────────────────────────────
  _startLoop() {
    let prev = performance.now()
    const loop = (now) => {
      const dt = Math.min((now - prev) / 1000, 0.05)
      prev = now
      this._tick(dt)
      this._renderer.render(this._scene, this._camera)
      this._rafId = requestAnimationFrame(loop)
    }
    this._rafId = requestAnimationFrame(loop)
  }

  _tick(dt) {
    const POS_SPEED = 10   // lerp speed for position
    const ROT_SPEED = 6    // lerp speed for rotation (settle flat)

    for (const entry of this._diceMap.values()) {
      const { mesh, target } = entry

      // Settle position
      mesh.position.lerp(target, 1 - Math.exp(-POS_SPEED * dt))

      // Settle rotation to flat (0, Y, 0) so +Y face shows skulls up
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, 0, 1 - Math.exp(-ROT_SPEED * dt))
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0, 1 - Math.exp(-ROT_SPEED * dt))
      // Y can spin freely — doesn't affect visible face from above
    }
  }

  // ── Resize ───────────────────────────────────────────────────────────────────
  resize(w, h) {
    if (!this._ready || w < 1 || h < 1) return
    this._renderer.setSize(w, h, false)
    this._camera.aspect = w / h
    this._camera.updateProjectionMatrix()
  }

  dispose() {
    if (this._rafId) cancelAnimationFrame(this._rafId)
    if (this._renderer) this._renderer.dispose()
    this._diceMap.clear()
    this._ready = false
  }
}
