import * as THREE from 'three'
import { generateFaceTexture, preloadFaceTextures } from './TextureGenerator.js'

// ── Layout ────────────────────────────────────────────────────────────────────
const DICE_SIZE    = 0.78
const COL_SPACING  = 1.25
const SLOT_SPACING = 1.25
const BOARD_HALF   = 0.80

function slotZ(slot) {
  return BOARD_HALF + 0.55 + slot * SLOT_SPACING
}

function slotPosition(player, col, slot) {
  const x = (col - 1) * COL_SPACING
  const z = player === 0 ? slotZ(slot) : -slotZ(slot)
  const y = DICE_SIZE / 2 + 0.02
  return new THREE.Vector3(x, y, z)
}

// ── Multiplier colours ────────────────────────────────────────────────────────
// count 2 → gold tint, count 3 → blue tint, otherwise parchment
const COLOR_NORMAL = new THREE.Color(0xf0e4c4)
const COLOR_GOLD   = new THREE.Color(0xe8b840)
const COLOR_BLUE   = new THREE.Color(0x6699ff)

function sideColor(count) {
  if (count === 3) return COLOR_BLUE
  if (count === 2) return COLOR_GOLD
  return COLOR_NORMAL
}

// ── Rest rotation — permanent small tilt so dice never look perfectly flat ───
function randomRestRotation() {
  return {
    x: (Math.random() - 0.5) * 0.14,    // ±~4°
    y: (Math.random() - 0.5) * 0.40,    // ±~11° (Y doesn't affect top face)
    z: (Math.random() - 0.5) * 0.14,
  }
}

// ── Materials ─────────────────────────────────────────────────────────────────
function makeSideMat(color = COLOR_NORMAL) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0 })
}

function createDiceMesh(faceValue) {
  const topTex = generateFaceTexture(faceValue)
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE),
    [
      makeSideMat(),  // +X
      makeSideMat(),  // -X
      new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.5 }),  // +Y top
      new THREE.MeshStandardMaterial({ color: 0xc8b890, roughness: 0.8 }), // -Y bottom
      makeSideMat(),  // +Z
      makeSideMat(),  // -Z
    ],
  )
  mesh.castShadow = true
  return mesh
}

/** Update the 4 side-face materials of a die mesh to the given THREE.Color. */
function applySideColor(mesh, color) {
  for (const idx of [0, 1, 4, 5]) {
    mesh.material[idx].color.set(color)
  }
}

// ── Particles ─────────────────────────────────────────────────────────────────
const PARTICLE_COLORS = [0xc9a84c, 0xffd060, 0xff8844, 0xffffff]

function spawnParticles(scene, origin, particleList) {
  const count = 10
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color:       PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      transparent: true,
      opacity:     1,
    })
    const size = 0.04 + Math.random() * 0.06
    const geo  = new THREE.SphereGeometry(size, 4, 4)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(origin)

    const angle = Math.random() * Math.PI * 2
    const speed = 1.2 + Math.random() * 2.0
    const vel   = new THREE.Vector3(
      Math.cos(angle) * speed,
      1.5 + Math.random() * 2.5,
      Math.sin(angle) * speed,
    )
    scene.add(mesh)
    particleList.push({ mesh, vel, life: 1.0 })
  }
}

// ── SceneManager ──────────────────────────────────────────────────────────────
export class SceneManager {
  constructor(canvas) {
    this._canvas    = canvas
    this._diceMap   = new Map()   // "p-c-s" → { mesh, target, restRot }
    this._particles = []
    this._rafId     = null
    this._ready     = false
  }

  init() {
    const canvas = this._canvas
    const rect   = canvas.getBoundingClientRect()
    const w      = rect.width  || 800
    const h      = rect.height || 600

    this._renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this._renderer.setSize(w, h, false)
    this._renderer.shadowMap.enabled = true
    this._renderer.shadowMap.type    = THREE.PCFSoftShadowMap

    this._scene  = new THREE.Scene()

    this._camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 100)
    this._camera.position.set(0, 9, 6)
    this._camera.lookAt(0, 0, 0)

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

    this._buildBoards()
    preloadFaceTextures()
    this._ready = true
    this._startLoop()
  }

  // ── Static board geometry ─────────────────────────────────────────────────
  _buildBoards() {
    const BOARD_W  = COL_SPACING * 2 + DICE_SIZE + 0.7
    const slotFar  = slotZ(2) + DICE_SIZE / 2 + 0.25
    const slotNear = slotZ(0) - DICE_SIZE / 2 - 0.25

    for (const player of [0, 1]) {
      const zNear = player === 0 ?  slotNear : -slotFar
      const zFar  = player === 0 ?  slotFar  : -slotNear
      const zCtr  = (zNear + zFar) / 2
      const depth = Math.abs(zFar - zNear)

      const board = new THREE.Mesh(
        new THREE.BoxGeometry(BOARD_W, 0.12, depth),
        new THREE.MeshStandardMaterial({ color: player === 0 ? 0x1a0c30 : 0x2a0c18, roughness: 0.85 }),
      )
      board.position.set(0, -0.06, zCtr)
      board.receiveShadow = true
      this._scene.add(board)

      for (let c = 0; c < 3; c++) {
        for (let s = 0; s < 3; s++) {
          const pos    = slotPosition(player, c, s)
          const marker = new THREE.Mesh(
            new THREE.BoxGeometry(DICE_SIZE + 0.08, 0.04, DICE_SIZE + 0.08),
            new THREE.MeshStandardMaterial({ color: player === 0 ? 0x3a1a5a : 0x5a1a2a, roughness: 0.9 }),
          )
          marker.position.set(pos.x, 0.02, pos.z)
          marker.receiveShadow = true
          this._scene.add(marker)
        }
      }

      for (let c = 0; c < 2; c++) {
        const div = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.18, depth - 0.2),
          new THREE.MeshStandardMaterial({ color: player === 0 ? 0x4a2060 : 0x6a2030, roughness: 0.9 }),
        )
        div.position.set((c - 0.5) * COL_SPACING, 0.09, zCtr)
        this._scene.add(div)
      }

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(BOARD_W + 0.04, 0.16, depth + 0.04)),
        new THREE.LineBasicMaterial({ color: player === 0 ? 0x6a3a80 : 0x803a4a }),
      )
      edges.position.set(0, -0.02, zCtr)
      this._scene.add(edges)
    }

    // Centre dividing line
    this._scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-(COL_SPACING + DICE_SIZE * 0.5 + 0.35), 0.01, 0),
        new THREE.Vector3( (COL_SPACING + DICE_SIZE * 0.5 + 0.35), 0.01, 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0x4a3060 }),
    ))
  }

  // ── Board sync ────────────────────────────────────────────────────────────
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
              const mesh   = createDiceMesh(val)
              const target = slotPosition(p, c, s)
              const rest   = randomRestRotation()

              // Start above
              mesh.position.copy(target).setY(target.y + 5)
              mesh.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
              )
              this._scene.add(mesh)
              this._diceMap.set(key, { mesh, target: target.clone(), rest })
            }
          }
        }
      }
    }

    // Remove destroyed dice — spawn particles at their position first
    for (const [key, entry] of this._diceMap) {
      if (!present.has(key)) {
        spawnParticles(this._scene, entry.mesh.position.clone(), this._particles)
        this._scene.remove(entry.mesh)
        this._diceMap.delete(key)
      }
    }

    // Update multiplier colours for every die currently on the board
    this._updateMultiplierColors(boards)
  }

  // ── Multiplier colouring ──────────────────────────────────────────────────
  _updateMultiplierColors(boards) {
    for (let p = 0; p < 2; p++) {
      for (let c = 0; c < 3; c++) {
        // Count occurrences of each value in this column
        const col    = boards[p][c]
        const counts = {}
        for (const v of col) {
          if (v !== null) counts[v] = (counts[v] ?? 0) + 1
        }

        for (let s = 0; s < 3; s++) {
          const val = col[s]
          if (val === null) continue
          const key   = `${p}-${c}-${s}`
          const entry = this._diceMap.get(key)
          if (!entry) continue
          const count = counts[val] ?? 1
          applySideColor(entry.mesh, sideColor(count))
        }
      }
    }
  }

  // ── Render loop ───────────────────────────────────────────────────────────
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
    const POS_K = 10
    const ROT_K = 6

    // Animate dice toward their resting position / rotation
    for (const { mesh, target, rest } of this._diceMap.values()) {
      mesh.position.lerp(target, 1 - Math.exp(-POS_K * dt))
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, rest.x, 1 - Math.exp(-ROT_K * dt))
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, rest.y, 1 - Math.exp(-ROT_K * dt))
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, rest.z, 1 - Math.exp(-ROT_K * dt))
    }

    // Animate particles
    const dead = []
    for (const p of this._particles) {
      p.life -= dt * 2.0
      p.vel.y -= dt * 5            // gravity
      p.mesh.position.addScaledVector(p.vel, dt)
      p.mesh.material.opacity = Math.max(0, p.life)
      if (p.life <= 0) {
        this._scene.remove(p.mesh)
        dead.push(p)
      }
    }
    if (dead.length) {
      this._particles = this._particles.filter(p => !dead.includes(p))
    }
  }

  // ── Resize / dispose ──────────────────────────────────────────────────────
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
    this._particles = []
    this._ready = false
  }
}
