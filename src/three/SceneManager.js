import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { generateFaceTexture, preloadFaceTextures } from './TextureGenerator.js'
import { settings } from '@/settings/store.js'

// ── Layout ────────────────────────────────────────────────────────────────────
const DICE_SIZE    = 0.78
const COL_SPACING  = 1.25
const SLOT_SPACING = 1.25
const BOARD_HALF   = 0.80

function slotZ(slot) { return BOARD_HALF + 0.55 + slot * SLOT_SPACING }

function slotPosition(player, col, slot) {
  const x = (col - 1) * COL_SPACING
  const z = player === 0 ? slotZ(slot) : -slotZ(slot)
  return new THREE.Vector3(x, DICE_SIZE / 2 + 0.02, z)
}

const COL_Z_CENTER = (slotZ(0) + slotZ(2)) / 2
const COL_DEPTH    = slotZ(2) - slotZ(0) + DICE_SIZE + 0.5
const COL_WIDTH    = COL_SPACING - 0.06

// ── Quality presets ───────────────────────────────────────────────────────────
function pixelRatioFor(quality) {
  if (quality === 'low')    return 1
  if (quality === 'medium') return Math.min(window.devicePixelRatio, 1.5)
  return window.devicePixelRatio          // high — full HiDPI
}

function bloomStrFor(quality) {
  if (quality === 'low')    return 0
  if (quality === 'medium') return 0.3
  return 0.5                              // high
}

function bloomRadFor(quality) {
  return quality === 'high' ? 0.4 : 0.3
}

// ── Multiplier colours ────────────────────────────────────────────────────────
const COLOR_NORMAL = new THREE.Color(0xf5e6c8)   // lighter ivory
const COLOR_GOLD   = new THREE.Color(0xe8b840)
const COLOR_BLUE   = new THREE.Color(0x6699ff)

function sideColor(count) {
  if (count === 3) return COLOR_BLUE
  if (count === 2) return COLOR_GOLD
  return COLOR_NORMAL
}

function randomRestRotation() {
  return {
    x: (Math.random() - 0.5) * 0.14,
    y: (Math.random() - 0.5) * 0.40,
    z: (Math.random() - 0.5) * 0.14,
  }
}

// ── Dice materials — roughness 0.4, metalness 0.15 for better light response ─
function makeSideMat(color = COLOR_NORMAL) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.15 })
}

function createDiceMesh(faceValue) {
  const topTex = generateFaceTexture(faceValue)
  const mesh   = new THREE.Mesh(
    new THREE.BoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE),
    [
      makeSideMat(),
      makeSideMat(),
      new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.4, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.5, metalness: 0.1 }),
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

function spawnParticles(scene, origin, list, count = 10) {
  for (let i = 0; i < count; i++) {
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
    this._fastAnimations = false
    this._particleCount  = 10    // full count; halved for medium quality

    this._raycaster  = new THREE.Raycaster()
    this._hitAreas   = []
    this._highlights = []
    this._interacting = false
    this._iPlayer    = 0
    this._iBoards    = null
    this._onPlace    = null

    this._camBasePos = new THREE.Vector3(0, 11, 4)

    // Shake state
    this._shakeActive    = false
    this._shakeIntensity = 0
    this._shakeEndTime   = 0

    // Bloom tween
    this._bloomBaseStr  = 0
    this._bloomCurrent  = 0
    this._bloomTweenEnd = 0

    this._handleMove  = this._onPointerMove.bind(this)
    this._handleDown  = this._onPointerDown.bind(this)
    this._handleLeave = this._onPointerLeave.bind(this)
  }

  init() {
    const canvas = this._canvas
    const rect   = canvas.getBoundingClientRect()
    const w      = rect.width  || 800
    const h      = rect.height || 600

    const quality = settings.quality  // loaded from localStorage

    // ── Renderer (antialias always false per spec — use FXAA if needed) ────────
    this._renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false })
    this._renderer.setPixelRatio(pixelRatioFor(quality))
    this._renderer.setSize(w, h, false)
    this._renderer.setClearColor(0x05020d, 1)
    this._renderer.shadowMap.enabled = quality !== 'low'
    this._renderer.shadowMap.type    = quality === 'high'
      ? THREE.PCFSoftShadowMap
      : THREE.BasicShadowMap

    this._scene = new THREE.Scene()
    this._scene.background = new THREE.Color(0x05020d)

    // ── Camera ────────────────────────────────────────────────────────────────
    this._camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100)
    this._camera.position.copy(this._camBasePos)
    this._camera.lookAt(0, 0, 0)

    // ── Lighting ──────────────────────────────────────────────────────────────
    // Bright warm ambient — ensures dice are visible even without direct light
    this._scene.add(new THREE.AmbientLight(0xffe8d0, 1.2))

    // Main red key light
    const keyLight = new THREE.PointLight(0xff4444, 3.0, 28)
    keyLight.position.set(0, 6, 4)
    keyLight.castShadow = quality !== 'low'
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width  = 1024
      keyLight.shadow.mapSize.height = 1024
    }
    this._scene.add(keyLight)
    this._keyLight = keyLight

    // Gold fill — warm secondary light
    const fillLight = new THREE.PointLight(0xffaa22, 1.5, 22)
    fillLight.position.set(-4, 5, 2)
    this._scene.add(fillLight)

    // Directional light — spreads across the whole board without falloff
    const dirLight = new THREE.DirectionalLight(0xfff0e0, 1.8)
    dirLight.position.set(2, 8, 5)
    dirLight.castShadow = false   // no cost
    this._scene.add(dirLight)

    // ── Post-processing ───────────────────────────────────────────────────────
    this._composer = new EffectComposer(this._renderer)
    this._composer.addPass(new RenderPass(this._scene, this._camera))

    const bStr = settings.bloomEnabled ? bloomStrFor(quality) : 0
    this._bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), bStr, bloomRadFor(quality), 0.85)
    this._bloomPass.enabled = settings.bloomEnabled && quality !== 'low'
    this._bloomBaseStr  = bStr
    this._bloomCurrent  = bStr
    this._composer.addPass(this._bloomPass)

    // Particle count depends on quality
    this._particleCount = quality === 'high' ? 10 : quality === 'medium' ? 5 : 0

    // ── Scene geometry ────────────────────────────────────────────────────────
    this._buildFloor()
    this._buildBoards()
    this._buildHitAreas()
    preloadFaceTextures()

    canvas.addEventListener('pointermove', this._handleMove)
    canvas.addEventListener('pointerdown', this._handleDown)
    canvas.addEventListener('pointerleave', this._handleLeave)

    // ── Dev stats panel ───────────────────────────────────────────────────────
    if (import.meta.env.DEV) {
      import('stats.js').then(({ default: Stats }) => {
        this._stats = new Stats()
        this._stats.showPanel(0)
        this._stats.dom.style.cssText = 'position:fixed;top:0;left:0;z-index:9999'
        document.body.appendChild(this._stats.dom)
      })
    }

    this._ready = true
    this._startLoop()
  }

  // ── Floor ─────────────────────────────────────────────────────────────────
  _buildFloor() {
    const fc   = document.createElement('canvas')
    fc.width   = fc.height = 512
    const fCtx = fc.getContext('2d')
    fCtx.fillStyle = '#050210'
    fCtx.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 2000; i++) {
      fCtx.fillStyle = `rgba(180,160,100,${Math.random() * 0.04})`
      fCtx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 6 + 1, 1)
    }
    const tex = new THREE.CanvasTexture(fc)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(3, 5)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 30),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.08
    floor.receiveShadow = true
    this._scene.add(floor)
  }

  // ── Boards ────────────────────────────────────────────────────────────────
  _buildBoards() {
    const BOARD_W  = COL_SPACING * 2 + DICE_SIZE + 0.7
    const slotFar  = slotZ(2) + DICE_SIZE / 2 + 0.25
    const slotNear = slotZ(0) - DICE_SIZE / 2 - 0.25

    for (const player of [0, 1]) {
      const zNear = player === 0 ?  slotNear : -slotFar
      const zFar  = player === 0 ?  slotFar  : -slotNear
      const zCtr  = (zNear + zFar) / 2
      const depth = Math.abs(zFar - zNear)

      // Board base
      this._scene.add(Object.assign(
        new THREE.Mesh(
          new THREE.BoxGeometry(BOARD_W, 0.12, depth),
          new THREE.MeshStandardMaterial({ color: player === 0 ? 0x060d1f : 0x1f0606, roughness: 0.85 }),
        ),
        { position: new THREE.Vector3(0, -0.06, zCtr), receiveShadow: true },
      ))

      const slotBase   = player === 0 ? 0x0a1535 : 0x350a0a
      const slotBorder = player === 0 ? 0x1a3a6a : 0x6a1a1a
      const emissiveC  = player === 0 ? new THREE.Color(0x05051a) : new THREE.Color(0x1a0505)

      for (let c = 0; c < 3; c++) {
        for (let s = 0; s < 3; s++) {
          const pos = slotPosition(player, c, s)

          // Slot base — with emissive so it glows faintly
          const marker = new THREE.Mesh(
            new THREE.BoxGeometry(DICE_SIZE + 0.1, 0.04, DICE_SIZE + 0.1),
            new THREE.MeshStandardMaterial({
              color: slotBase, roughness: 0.9,
              emissive: emissiveC, emissiveIntensity: 0.3,
            }),
          )
          marker.position.set(pos.x, 0.02, pos.z)
          marker.receiveShadow = true
          this._scene.add(marker)

          // Border ring
          const ring = new THREE.Mesh(
            new THREE.BoxGeometry(DICE_SIZE + 0.18, 0.03, DICE_SIZE + 0.18),
            new THREE.MeshStandardMaterial({
              color: slotBorder, roughness: 0.9,
              emissive: emissiveC, emissiveIntensity: 0.15,
            }),
          )
          ring.position.set(pos.x, 0.015, pos.z)
          this._scene.add(ring)
        }
      }

      // Column dividers
      const divColor = player === 0 ? 0x1a3a6a : 0x6a1a1a
      for (let c = 0; c < 2; c++) {
        const div = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.18, depth - 0.2),
          new THREE.MeshStandardMaterial({ color: divColor, roughness: 0.9 }),
        )
        div.position.set((c - 0.5) * COL_SPACING, 0.09, zCtr)
        this._scene.add(div)
      }

      // Aged-gold frame edge
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(BOARD_W + 0.06, 0.17, depth + 0.06)),
        new THREE.LineBasicMaterial({ color: 0xc8860a }),
      )
      edges.position.set(0, -0.02, zCtr)
      this._scene.add(edges)
    }

    // Centre divider
    this._scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-(COL_SPACING + DICE_SIZE * 0.5 + 0.35), 0.01, 0),
        new THREE.Vector3( (COL_SPACING + DICE_SIZE * 0.5 + 0.35), 0.01, 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0xc8860a }),
    ))
  }

  // ── Hit areas + highlights ─────────────────────────────────────────────────
  _buildHitAreas() {
    const playerColor = [0x4488ff, 0xff4466]
    for (const player of [0, 1]) {
      const zSign = player === 0 ? 1 : -1
      for (let col = 0; col < 3; col++) {
        const x = (col - 1) * COL_SPACING
        const z = COL_Z_CENTER * zSign

        const hitMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(COL_WIDTH, COL_DEPTH),
          new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
        )
        hitMesh.rotation.x = -Math.PI / 2
        hitMesh.position.set(x, 0.15, z)
        this._scene.add(hitMesh)
        this._hitAreas.push({ mesh: hitMesh, player, col })

        const hlMesh = new THREE.Mesh(
          new THREE.BoxGeometry(COL_WIDTH, 0.08, COL_DEPTH),
          new THREE.MeshBasicMaterial({ color: playerColor[player], transparent: true, opacity: 0, depthWrite: false }),
        )
        hlMesh.position.set(x, 0.1, z)
        this._scene.add(hlMesh)
        this._highlights.push({ mesh: hlMesh, player, col })
      }
    }
  }

  // ── Interaction API ────────────────────────────────────────────────────────
  setInteraction(player, placing, onPlace, boards) {
    this._iPlayer     = player
    this._interacting = placing
    this._onPlace     = onPlace
    this._iBoards     = boards
    if (!placing) { this._clearHighlights(); this._canvas.style.cursor = '' }
  }

  _clearHighlights() {
    for (const hl of this._highlights) hl.mesh.material.opacity = 0
  }

  _getNDC(e) {
    const r = this._canvas.getBoundingClientRect()
    return new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    )
  }

  _raycastActivePlayer(ndc) {
    this._raycaster.setFromCamera(ndc, this._camera)
    const targets    = this._hitAreas.filter(h => h.player === this._iPlayer)
    const intersects = this._raycaster.intersectObjects(targets.map(h => h.mesh))
    if (!intersects.length) return null
    return this._hitAreas.find(h => h.mesh === intersects[0].object) ?? null
  }

  _isColumnFull(player, col) {
    return this._iBoards?.[player]?.[col]?.every(v => v !== null) ?? false
  }

  _onPointerMove(e) {
    if (!this._interacting) return
    const hit = this._raycastActivePlayer(this._getNDC(e))
    this._clearHighlights()
    if (hit && !this._isColumnFull(hit.player, hit.col)) {
      const hl = this._highlights.find(h => h.player === hit.player && h.col === hit.col)
      if (hl) hl.mesh.material.opacity = 0.22
      this._canvas.style.cursor = 'pointer'
    } else {
      this._canvas.style.cursor = ''
    }
  }

  _onPointerDown(e) {
    if (!this._interacting || e.button !== 0) return
    const hit = this._raycastActivePlayer(this._getNDC(e))
    if (hit && !this._isColumnFull(hit.player, hit.col)) this._onPlace?.(hit.col)
  }

  _onPointerLeave() { this._clearHighlights(); this._canvas.style.cursor = '' }

  // ── Bloom / shake API ─────────────────────────────────────────────────────
  triggerBloomPulse(strength = 1.2, holdMs = 300, returnTo = null) {
    if (!this._bloomPass?.enabled) return
    this._bloomPass.strength = strength
    this._bloomCurrent = strength
    this._bloomTweenEnd = performance.now() + holdMs
    if (returnTo !== null) this._bloomBaseStr = returnTo
  }

  triggerShake(intensity = 0.08, duration = 200) {
    if (!settings.shakeEnabled) return
    this._shakeIntensity = intensity
    this._shakeEndTime   = performance.now() + duration
    this._shakeActive    = true
  }

  setBloomEnabled(enabled) {
    if (!this._bloomPass) return
    this._bloomPass.enabled = enabled && settings.quality !== 'low'
    if (enabled) {
      const bStr = bloomStrFor(settings.quality)
      this._bloomPass.strength = bStr
      this._bloomBaseStr = bStr
      this._bloomCurrent = bStr
    }
  }

  /**
   * Apply a quality preset. Updates pixel ratio, shadows, bloom, particles.
   * Must be called from the SettingsPanel after updateSetting('quality', q).
   */
  setQuality(quality) {
    // Pixel ratio — must resize afterwards to take effect
    this._renderer.setPixelRatio(pixelRatioFor(quality))
    const rect = this._canvas.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      this._renderer.setSize(rect.width, rect.height, false)
      this._composer.setSize(rect.width, rect.height)
      if (this._bloomPass) this._bloomPass.resolution.set(rect.width, rect.height)
    }

    // Shadows
    this._renderer.shadowMap.enabled = quality !== 'low'
    this._renderer.shadowMap.type    = quality === 'high'
      ? THREE.PCFSoftShadowMap
      : THREE.BasicShadowMap
    this._renderer.shadowMap.needsUpdate = true
    if (this._keyLight) this._keyLight.castShadow = quality !== 'low'

    // Bloom
    const bStr = settings.bloomEnabled ? bloomStrFor(quality) : 0
    if (this._bloomPass) {
      this._bloomPass.strength  = bStr
      this._bloomPass.radius    = bloomRadFor(quality)
      this._bloomPass.enabled   = settings.bloomEnabled && quality !== 'low'
    }
    this._bloomBaseStr = bStr
    this._bloomCurrent = bStr

    // Particles
    this._particleCount = quality === 'high' ? 10 : quality === 'medium' ? 5 : 0
  }

  setFastAnimations(fast) { this._fastAnimations = fast }

  // ── Board sync ─────────────────────────────────────────────────────────────
  syncBoards(boards, lastDestroyed = []) {
    if (!this._ready) return

    const compactCols = new Set()
    for (const { player: p, col: c, positions } of lastDestroyed) {
      compactCols.add(`${p}-${c}`)
      for (const s of positions) {
        const entry = this._diceMap.get(`${p}-${c}-${s}`)
        if (!entry) continue
        if (settings.particlesEnabled && this._particleCount > 0) {
          spawnParticles(this._scene, entry.mesh.position.clone(), this._particles, this._particleCount)
        }
        this._scene.remove(entry.mesh)
        this._diceMap.delete(`${p}-${c}-${s}`)
      }
    }

    for (const colKey of compactCols) {
      const [p, c] = colKey.split('-').map(Number)
      const survivors = []
      for (let s = 0; s < 3; s++) {
        const entry = this._diceMap.get(`${p}-${c}-${s}`)
        if (entry) { survivors.push(entry); this._diceMap.delete(`${p}-${c}-${s}`) }
      }
      survivors.forEach((entry, newSlot) => {
        entry.target.copy(slotPosition(p, c, newSlot))
        this._diceMap.set(`${p}-${c}-${newSlot}`, entry)
      })
    }

    for (let p = 0; p < 2; p++) {
      for (let c = 0; c < 3; c++) {
        for (let s = 0; s < 3; s++) {
          const val = boards[p][c][s]
          const key = `${p}-${c}-${s}`
          if (val !== null && !this._diceMap.has(key)) {
            const mesh   = createDiceMesh(val)
            const target = slotPosition(p, c, s)
            mesh.position.copy(target).setY(target.y + 5)
            mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
            this._scene.add(mesh)
            this._diceMap.set(key, { mesh, target: target.clone(), rest: randomRestRotation() })
          }
        }
      }
    }

    // Remove stale meshes
    const present = new Set()
    for (let p = 0; p < 2; p++)
      for (let c = 0; c < 3; c++)
        for (let s = 0; s < 3; s++)
          if (boards[p][c][s] !== null) present.add(`${p}-${c}-${s}`)
    for (const [key, entry] of this._diceMap) {
      if (!present.has(key)) { this._scene.remove(entry.mesh); this._diceMap.delete(key) }
    }

    this._updateMultiplierColors(boards)
  }

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
          if (entry) applyMultiplierColor(entry.mesh, counts[val] ?? 1)
        }
      }
    }
  }

  // ── Render loop ───────────────────────────────────────────────────────────
  _startLoop() {
    let prev = performance.now()
    const loop = (now) => {
      // ↑ RAF ID stored BEFORE render so dispose() can always cancel it
      this._rafId = requestAnimationFrame(loop)
      this._stats?.begin()

      const dt = Math.min((now - prev) / 1000, 0.05)
      prev = now
      this._tick(dt, now)
      this._composer.render()

      this._stats?.end()
    }
    this._rafId = requestAnimationFrame(loop)
  }

  _tick(dt, now) {
    const POS_K = this._fastAnimations ? 40 : 10
    const ROT_K = this._fastAnimations ? 25 : 6

    for (const { mesh, target, rest } of this._diceMap.values()) {
      mesh.position.lerp(target, 1 - Math.exp(-POS_K * dt))
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, rest.x, 1 - Math.exp(-ROT_K * dt))
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, rest.y, 1 - Math.exp(-ROT_K * dt))
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, rest.z, 1 - Math.exp(-ROT_K * dt))
    }

    // Particles
    const dead = []
    for (const p of this._particles) {
      p.life -= dt * 2.0
      p.vel.y -= dt * 5
      p.mesh.position.addScaledVector(p.vel, dt)
      p.mesh.material.opacity = Math.max(0, p.life)
      if (p.life <= 0) { this._scene.remove(p.mesh); dead.push(p) }
    }
    if (dead.length) this._particles = this._particles.filter(p => !dead.includes(p))

    // Bloom tween — fade back to base strength after pulse hold period
    if (this._bloomPass?.enabled && now >= this._bloomTweenEnd) {
      const diff = this._bloomBaseStr - this._bloomCurrent
      if (Math.abs(diff) > 0.001) {
        this._bloomCurrent += diff * (1 - Math.exp(-4 * dt))
        this._bloomPass.strength = this._bloomCurrent
      }
    }

    // Camera shake
    if (this._shakeActive) {
      if (now < this._shakeEndTime) {
        const i = this._shakeIntensity
        this._camera.position.x = this._camBasePos.x + (Math.random() - 0.5) * i * 2
        this._camera.position.y = this._camBasePos.y + (Math.random() - 0.5) * i
      } else {
        this._camera.position.lerp(this._camBasePos, 1 - Math.exp(-12 * dt))
        if (this._camera.position.distanceTo(this._camBasePos) < 0.002) {
          this._camera.position.copy(this._camBasePos)
          this._shakeActive = false
        }
      }
    }
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  resize(w, h) {
    if (!this._ready || w < 1 || h < 1) return
    // setSize uses whatever pixelRatio was last set via setPixelRatio — no need to re-set it
    this._renderer.setSize(w, h, false)
    this._composer.setSize(w, h)
    if (this._bloomPass) this._bloomPass.resolution.set(w, h)
    this._camera.aspect = w / h
    this._camera.updateProjectionMatrix()
  }

  // ── Dispose ───────────────────────────────────────────────────────────────
  dispose() {
    // Cancel the loop FIRST — the ID is always current because we store it
    // at the top of the loop (before render), so cancelAnimationFrame is safe
    if (this._rafId) cancelAnimationFrame(this._rafId)
    if (this._renderer) this._renderer.dispose()
    if (this._stats?.dom?.parentNode) this._stats.dom.parentNode.removeChild(this._stats.dom)
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
