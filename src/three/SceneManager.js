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

// Derived layout values used for hit areas and highlights
const COL_Z_CENTER = (slotZ(0) + slotZ(2)) / 2                      // 2.60
const COL_DEPTH    = slotZ(2) - slotZ(0) + DICE_SIZE + 0.5          // 3.28
const COL_WIDTH    = COL_SPACING - 0.06                              // 1.19

// ── Multiplier colours ────────────────────────────────────────────────────────
const COLOR_NORMAL = new THREE.Color(0xf0e4c4)
const COLOR_GOLD   = new THREE.Color(0xe8b840)
const COLOR_BLUE   = new THREE.Color(0x6699ff)

function sideColor(count) {
  if (count === 3) return COLOR_BLUE
  if (count === 2) return COLOR_GOLD
  return COLOR_NORMAL
}

// ── Rest rotation ─────────────────────────────────────────────────────────────
function randomRestRotation() {
  return {
    x: (Math.random() - 0.5) * 0.14,
    y: (Math.random() - 0.5) * 0.40,
    z: (Math.random() - 0.5) * 0.14,
  }
}

// ── Materials ─────────────────────────────────────────────────────────────────
function makeSideMat(color = COLOR_NORMAL) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0 })
}

function createDiceMesh(faceValue) {
  const topTex = generateFaceTexture(faceValue)
  const mesh   = new THREE.Mesh(
    new THREE.BoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE),
    [
      makeSideMat(),
      makeSideMat(),
      new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0xc8b890, roughness: 0.8 }),
      makeSideMat(),
      makeSideMat(),
    ],
  )
  mesh.castShadow = true
  return mesh
}

function applyMultiplierColor(mesh, count) {
  const col = sideColor(count)
  for (const idx of [0, 1, 3, 4, 5]) mesh.material[idx].color.set(col)
  mesh.material[2].color.set(count >= 2 ? col : new THREE.Color(0xffffff))
}

// ── Particles ─────────────────────────────────────────────────────────────────
const PARTICLE_COLORS = [0xc9a84c, 0xffd060, 0xff8844, 0xffffff]

function spawnParticles(scene, origin, list) {
  for (let i = 0; i < 10; i++) {
    const mat  = new THREE.MeshBasicMaterial({ color: PARTICLE_COLORS[i % 4], transparent: true, opacity: 1 })
    const size = 0.04 + Math.random() * 0.06
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 4, 4), mat)
    mesh.position.copy(origin)
    const angle = Math.random() * Math.PI * 2
    const speed = 1.2 + Math.random() * 2.0
    list.push({
      mesh,
      vel: new THREE.Vector3(Math.cos(angle) * speed, 1.5 + Math.random() * 2.5, Math.sin(angle) * speed),
      life: 1.0,
    })
    scene.add(mesh)
  }
}

// ── SceneManager ──────────────────────────────────────────────────────────────
export class SceneManager {
  constructor(canvas) {
    this._canvas     = canvas
    this._diceMap    = new Map()
    this._particles  = []
    this._rafId      = null
    this._ready      = false

    // Interaction state
    this._raycaster   = new THREE.Raycaster()
    this._mouseNDC    = new THREE.Vector2(-9, -9)  // off-screen default
    this._hitAreas    = []   // { mesh, player, col }
    this._highlights  = []   // { mesh, player, col }
    this._hoveredCol  = null // { player, col } | null
    this._interacting = false
    this._iPlayer     = 0
    this._iBoards     = null
    this._onPlace     = null

    // Bind event handlers so we can remove them later
    this._handleMove  = this._onPointerMove.bind(this)
    this._handleDown  = this._onPointerDown.bind(this)
    this._handleLeave = this._onPointerLeave.bind(this)
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
    this._buildHitAreas()
    preloadFaceTextures()

    canvas.addEventListener('pointermove', this._handleMove)
    canvas.addEventListener('pointerdown', this._handleDown)
    canvas.addEventListener('pointerleave', this._handleLeave)

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

    this._scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-(COL_SPACING + DICE_SIZE * 0.5 + 0.35), 0.01, 0),
        new THREE.Vector3( (COL_SPACING + DICE_SIZE * 0.5 + 0.35), 0.01, 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0x4a3060 }),
    ))
  }

  // ── Hit areas + highlight meshes ──────────────────────────────────────────
  _buildHitAreas() {
    // Player colours for the highlight overlay
    const playerColor = [0x4488ff, 0xff4466]

    for (const player of [0, 1]) {
      const zSign = player === 0 ? 1 : -1

      for (let col = 0; col < 3; col++) {
        const x = (col - 1) * COL_SPACING
        const z = COL_Z_CENTER * zSign

        // Invisible flat plane used for raycasting
        const hitMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(COL_WIDTH, COL_DEPTH),
          new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
        )
        hitMesh.rotation.x = -Math.PI / 2
        hitMesh.position.set(x, 0.15, z)
        this._scene.add(hitMesh)
        this._hitAreas.push({ mesh: hitMesh, player, col })

        // Translucent highlight box shown on hover
        const hlMesh = new THREE.Mesh(
          new THREE.BoxGeometry(COL_WIDTH, 0.08, COL_DEPTH),
          new THREE.MeshBasicMaterial({
            color:      playerColor[player],
            transparent: true,
            opacity:     0,
            depthWrite:  false,
          }),
        )
        hlMesh.position.set(x, 0.1, z)
        this._scene.add(hlMesh)
        this._highlights.push({ mesh: hlMesh, player, col })
      }
    }
  }

  // ── Interaction API ───────────────────────────────────────────────────────
  /**
   * Call this every time phase / currentPlayer changes.
   * @param {number}   player    0 or 1
   * @param {boolean}  placing   true when phase === 'placing'
   * @param {Function} onPlace   (col: number) => void
   * @param {Array}    boards    current board state (to detect full columns)
   */
  setInteraction(player, placing, onPlace, boards) {
    this._iPlayer     = player
    this._interacting = placing
    this._onPlace     = onPlace
    this._iBoards     = boards

    if (!placing) {
      this._clearHighlights()
      this._canvas.style.cursor = ''
    }
  }

  _clearHighlights() {
    for (const hl of this._highlights) hl.mesh.material.opacity = 0
    this._hoveredCol = null
  }

  // ── Pointer events ────────────────────────────────────────────────────────
  _getNDC(e) {
    const rect = this._canvas.getBoundingClientRect()
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  *  2 - 1,
      ((e.clientY - rect.top)  / rect.height) * -2 + 1,
    )
  }

  _raycastActivePlayer(ndc) {
    this._raycaster.setFromCamera(ndc, this._camera)
    const targets    = this._hitAreas.filter(h => h.player === this._iPlayer)
    const intersects = this._raycaster.intersectObjects(targets.map(h => h.mesh))
    if (!intersects.length) return null
    const hitObj = intersects[0].object
    return this._hitAreas.find(h => h.mesh === hitObj) ?? null
  }

  _isColumnFull(player, col) {
    return this._iBoards?.[player]?.[col]?.every(v => v !== null) ?? false
  }

  _onPointerMove(e) {
    if (!this._interacting) return
    const ndc  = this._getNDC(e)
    const hit  = this._raycastActivePlayer(ndc)

    this._clearHighlights()

    if (hit && !this._isColumnFull(hit.player, hit.col)) {
      const hl = this._highlights.find(h => h.player === hit.player && h.col === hit.col)
      if (hl) hl.mesh.material.opacity = 0.22
      this._canvas.style.cursor = 'pointer'
      this._hoveredCol = { player: hit.player, col: hit.col }
    } else {
      this._canvas.style.cursor = ''
      this._hoveredCol = null
    }
  }

  _onPointerDown(e) {
    if (!this._interacting || e.button !== 0) return
    const ndc = this._getNDC(e)
    const hit = this._raycastActivePlayer(ndc)
    if (hit && !this._isColumnFull(hit.player, hit.col)) {
      this._onPlace?.(hit.col)
    }
  }

  _onPointerLeave() {
    this._clearHighlights()
    this._canvas.style.cursor = ''
  }

  // ── Board sync ────────────────────────────────────────────────────────────
  /**
   * Synchronise the 3D scene with the new board state.
   *
   * Three-step process to handle destruction + compaction correctly:
   *   1. Remove explicitly destroyed dice (with particles). Their positions are
   *      the PRE-COMPACT indices stored in lastDestroyed.
   *   2. Slide surviving dice in affected columns to their compacted positions
   *      by updating their target (the lerp animation takes care of movement).
   *   3. Spawn new dice that don't yet have a mesh.
   *
   * @param {Array}  boards        new board state (already compacted in reducer)
   * @param {Array}  lastDestroyed [{player, col, positions}] — original slot indices
   */
  syncBoards(boards, lastDestroyed = []) {
    if (!this._ready) return

    // ── Step 1: explicitly destroy flagged dice ──────────────────────────────
    const compactCols = new Set()   // "p-c" pairs that need compaction
    for (const { player: p, col: c, positions } of lastDestroyed) {
      compactCols.add(`${p}-${c}`)
      for (const s of positions) {
        const key   = `${p}-${c}-${s}`
        const entry = this._diceMap.get(key)
        if (!entry) continue
        spawnParticles(this._scene, entry.mesh.position.clone(), this._particles)
        this._scene.remove(entry.mesh)
        this._diceMap.delete(key)
      }
    }

    // ── Step 2: compact surviving dice towards slot 0 in affected columns ────
    for (const colKey of compactCols) {
      const [p, c] = colKey.split('-').map(Number)

      // Gather surviving meshes in slot order
      const survivors = []
      for (let s = 0; s < 3; s++) {
        const key   = `${p}-${c}-${s}`
        const entry = this._diceMap.get(key)
        if (entry) { survivors.push(entry); this._diceMap.delete(key) }
      }
      // Re-assign to compacted positions — animate via target lerp
      survivors.forEach((entry, newSlot) => {
        entry.target.copy(slotPosition(p, c, newSlot))
        this._diceMap.set(`${p}-${c}-${newSlot}`, entry)
      })
    }

    // ── Step 3: spawn newly placed dice ──────────────────────────────────────
    for (let p = 0; p < 2; p++) {
      for (let c = 0; c < 3; c++) {
        for (let s = 0; s < 3; s++) {
          const val = boards[p][c][s]
          const key = `${p}-${c}-${s}`
          if (val !== null && !this._diceMap.has(key)) {
            const mesh   = createDiceMesh(val)
            const target = slotPosition(p, c, s)
            mesh.position.copy(target).setY(target.y + 5)
            mesh.rotation.set(
              Math.random() * Math.PI * 2,
              Math.random() * Math.PI * 2,
              Math.random() * Math.PI * 2,
            )
            this._scene.add(mesh)
            this._diceMap.set(key, { mesh, target: target.clone(), rest: randomRestRotation() })
          }
        }
      }
    }

    // ── Safety net: remove any stale meshes not represented in the board ─────
    const present = new Set()
    for (let p = 0; p < 2; p++)
      for (let c = 0; c < 3; c++)
        for (let s = 0; s < 3; s++)
          if (boards[p][c][s] !== null) present.add(`${p}-${c}-${s}`)

    for (const [key, entry] of this._diceMap) {
      if (!present.has(key)) {
        this._scene.remove(entry.mesh)
        this._diceMap.delete(key)
      }
    }

    this._updateMultiplierColors(boards)
  }

  // ── Multiplier colouring ──────────────────────────────────────────────────
  _updateMultiplierColors(boards) {
    for (let p = 0; p < 2; p++) {
      for (let c = 0; c < 3; c++) {
        const col    = boards[p][c]
        const counts = {}
        for (const v of col) { if (v !== null) counts[v] = (counts[v] ?? 0) + 1 }
        for (let s = 0; s < 3; s++) {
          const val   = col[s]
          if (val === null) continue
          const entry = this._diceMap.get(`${p}-${c}-${s}`)
          if (!entry) continue
          applyMultiplierColor(entry.mesh, counts[val] ?? 1)
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

    for (const { mesh, target, rest } of this._diceMap.values()) {
      mesh.position.lerp(target, 1 - Math.exp(-POS_K * dt))
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, rest.x, 1 - Math.exp(-ROT_K * dt))
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, rest.y, 1 - Math.exp(-ROT_K * dt))
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, rest.z, 1 - Math.exp(-ROT_K * dt))
    }

    const dead = []
    for (const p of this._particles) {
      p.life -= dt * 2.0
      p.vel.y -= dt * 5
      p.mesh.position.addScaledVector(p.vel, dt)
      p.mesh.material.opacity = Math.max(0, p.life)
      if (p.life <= 0) { this._scene.remove(p.mesh); dead.push(p) }
    }
    if (dead.length) this._particles = this._particles.filter(p => !dead.includes(p))
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
    const c = this._canvas
    c.removeEventListener('pointermove', this._handleMove)
    c.removeEventListener('pointerdown', this._handleDown)
    c.removeEventListener('pointerleave', this._handleLeave)
    c.style.cursor = ''
    this._diceMap.clear()
    this._particles = []
    this._ready = false
  }
}
