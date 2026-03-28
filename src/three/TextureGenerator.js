import * as THREE from 'three'

const SIZE   = 256
const BG     = '#f0e4c4'
const INK    = '#1a0a1e'
const BORDER = '#b09870'

// Standard pip positions (normalised 0-1 within the face)
const PIPS = {
  1: [[0.50, 0.50]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.25, 0.25], [0.50, 0.50], [0.75, 0.75]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.50, 0.50], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.27, 0.20], [0.73, 0.20], [0.27, 0.50], [0.73, 0.50], [0.27, 0.80], [0.73, 0.80]],
}

/**
 * Draw a simple readable skull centred at (cx, cy) with given radius.
 * Optimised for small sizes (r ≈ 22-38px on a 256px canvas).
 */
function drawSkull(ctx, cx, cy, r) {
  ctx.save()
  ctx.fillStyle   = INK
  ctx.strokeStyle = INK

  // Cranium
  ctx.beginPath()
  ctx.arc(cx, cy - r * 0.05, r * 0.78, Math.PI, 0)
  ctx.lineTo(cx + r * 0.78, cy + r * 0.45)
  ctx.lineTo(cx - r * 0.78, cy + r * 0.45)
  ctx.closePath()
  ctx.fill()

  // Jaw
  ctx.beginPath()
  ctx.roundRect(cx - r * 0.62, cy + r * 0.38, r * 1.24, r * 0.62, r * 0.12)
  ctx.fill()

  // Teeth gaps (cut out of jaw)
  ctx.fillStyle = BG
  const tw = r * 0.26
  const th = r * 0.30
  const ty = cy + r * 0.62
  const tx0 = cx - r * 0.40
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.roundRect(tx0 + i * (tw + r * 0.07), ty, tw, th, r * 0.05)
    ctx.fill()
  }

  // Eye sockets
  ctx.fillStyle = BG
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.28, cy + r * 0.08, r * 0.24, r * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx + r * 0.28, cy + r * 0.08, r * 0.24, r * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

const cache = new Map()

export function generateFaceTexture(value) {
  if (cache.has(value)) return cache.get(value)

  const canvas = document.createElement('canvas')
  canvas.width  = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  // Parchment background
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Border
  ctx.strokeStyle = BORDER
  ctx.lineWidth   = 10
  ctx.strokeRect(5, 5, SIZE - 10, SIZE - 10)

  // Skull icons at pip positions
  const pips    = PIPS[value] ?? PIPS[1]
  const PAD     = 28
  const usable  = SIZE - PAD * 2
  const radius  = value <= 2 ? 36 : value <= 4 ? 28 : 22

  for (const [nx, ny] of pips) {
    drawSkull(ctx, PAD + nx * usable, PAD + ny * usable, radius)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  cache.set(value, tex)
  return tex
}

export function preloadFaceTextures() {
  for (let v = 1; v <= 6; v++) generateFaceTexture(v)
}
