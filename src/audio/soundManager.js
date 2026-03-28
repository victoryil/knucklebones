/**
 * SoundManager — Web Audio API, no external files needed.
 * All sounds are synthesized procedurally.
 */

let _ctx = null

function ctx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  // Resume after browser autoplay policy suspends it
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

/**
 * Short noise "crack" played when dice are destroyed.
 * Sounds like a bone snapping / a die shattering.
 */
export function playDestruction() {
  try {
    const ac  = ctx()
    const now = ac.currentTime

    // ── Noise burst (the "crack") ────────────────────────────────
    const sampleRate = ac.sampleRate
    const duration   = 0.18
    const samples    = Math.floor(sampleRate * duration)
    const buf        = ac.createBuffer(1, samples, sampleRate)
    const data       = buf.getChannelData(0)

    for (let i = 0; i < samples; i++) {
      // White noise with fast exponential decay
      const decay = Math.pow(1 - i / samples, 3)
      data[i] = (Math.random() * 2 - 1) * decay
    }

    const noise = ac.createBufferSource()
    noise.buffer = buf

    // Band-pass → gives a "crunch" quality rather than plain noise
    const bp = ac.createBiquadFilter()
    bp.type            = 'bandpass'
    bp.frequency.value = 900
    bp.Q.value         = 1.8

    const noiseGain = ac.createGain()
    noiseGain.gain.setValueAtTime(0.55, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    noise.connect(bp)
    bp.connect(noiseGain)
    noiseGain.connect(ac.destination)
    noise.start(now)

    // ── Pitched "pop" underneath the crack ──────────────────────
    const osc = ac.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(260, now)
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.14)

    const oscGain = ac.createGain()
    oscGain.gain.setValueAtTime(0.22, now)
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)

    osc.connect(oscGain)
    oscGain.connect(ac.destination)
    osc.start(now)
    osc.stop(now + 0.14)
  } catch {
    // Audio is non-critical — silent fail
  }
}
