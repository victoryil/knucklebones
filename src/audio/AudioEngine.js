/**
 * AudioEngine — singleton Web Audio API engine.
 * Handles ambient generative music (drone + bells + rhythm) and all SFX.
 * Call audioEngine.init() on first user interaction.
 */

class AudioEngine {
  constructor() {
    this.ctx          = null
    this.masterGain   = null
    this.musicGain    = null
    this.sfxGain      = null
    this.initialized  = false

    this._musicVolume = 0.35
    this._sfxVolume   = 1.0
    this._masterVolume = 0.8
    this._musicEnabled = true
    this._sfxEnabled   = true

    this._droneOscillators = []
    this._melodyTimeout    = null
    this._rhythmTimeout    = null
    this._droneReverb      = null
    this._bellReverb       = null
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  init() {
    if (this.initialized) {
      if (this.ctx?.state === 'suspended') this.ctx.resume()
      return
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
      this.masterGain = this.ctx.createGain()
      this.musicGain  = this.ctx.createGain()
      this.sfxGain    = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
      this.musicGain.connect(this.masterGain)
      this.sfxGain.connect(this.masterGain)
      this.setVolumes(this._masterVolume, this._musicVolume, this._sfxVolume)
      this.initialized = true
      this.startAmbientMusic()
    } catch {
      // Audio unavailable — silent fail
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume()
  }

  // ── Volume controls ───────────────────────────────────────────────────────
  setVolumes(master, music, sfx) {
    this._masterVolume = master
    this._musicVolume  = music
    this._sfxVolume    = sfx
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.masterGain.gain.setTargetAtTime(master, t, 0.05)
    this.musicGain.gain.setTargetAtTime(this._musicEnabled ? music : 0, t, 0.05)
    this.sfxGain.gain.setTargetAtTime(this._sfxEnabled ? sfx : 0, t, 0.05)
  }

  setMasterVolume(v) {
    this._masterVolume = v
    if (!this.ctx) return
    this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1)
  }

  setMusicVolume(v) {
    this._musicVolume = v
    if (!this.ctx || !this._musicEnabled) return
    this.musicGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1)
  }

  setSfxVolume(v) {
    this._sfxVolume = v
    if (!this.ctx || !this._sfxEnabled) return
    this.sfxGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1)
  }

  setMusicEnabled(enabled) {
    this._musicEnabled = enabled
    if (!this.ctx) return
    const target = enabled ? this._musicVolume : 0
    this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.3)
  }

  setSfxEnabled(enabled) {
    this._sfxEnabled = enabled
    if (!this.ctx) return
    const target = enabled ? this._sfxVolume : 0
    this.sfxGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05)
  }

  // ── Reverb factory ────────────────────────────────────────────────────────
  _createReverb(decayTime = 2.5) {
    const length  = Math.floor(this.ctx.sampleRate * decayTime)
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3)
      }
    }
    const conv = this.ctx.createConvolver()
    conv.buffer = impulse
    return conv
  }

  // ── Ambient music ─────────────────────────────────────────────────────────
  startAmbientMusic() {
    if (!this.initialized) return
    this._startDrone()
    this._startMelody()
    this._startRhythm()
  }

  /** CAPA 1 — three sawtooth oscillators → lowpass → reverb → musicGain */
  _startDrone() {
    this._droneReverb = this._createReverb(2.5)
    this._droneReverb.connect(this.musicGain)

    const freqs = [55, 55.3, 82.5]
    for (const freq of freqs) {
      const osc = this.ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq

      const g = this.ctx.createGain()
      g.gain.value = 0.08

      const lp = this.ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 200

      osc.connect(g)
      g.connect(lp)
      lp.connect(this._droneReverb)
      osc.start()
      this._droneOscillators.push({ osc, gain: g })
    }
  }

  /** CAPA 2 — pentatonic minor bells, every 3–7 seconds */
  _startMelody() {
    this._bellReverb = this._createReverb(2.5)
    this._bellReverb.connect(this.musicGain)

    const SCALE = [220, 246.94, 261.63, 293.66, 329.63]

    const scheduleNext = () => {
      if (!this.initialized) return
      const delay = 3000 + Math.random() * 4000
      this._melodyTimeout = setTimeout(() => {
        const count = 1 + Math.floor(Math.random() * 3)
        for (let i = 0; i < count; i++) {
          const freq = SCALE[Math.floor(Math.random() * SCALE.length)]
          this._playBell(freq, this._bellReverb, i * 0.22)
        }
        scheduleNext()
      }, delay)
    }
    scheduleNext()
  }

  _playBell(freq, reverb, offset = 0) {
    if (!this.initialized) return
    const now = this.ctx.currentTime + offset
    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(0.15, now + 0.002)
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.5)

    osc.connect(g)
    g.connect(reverb)
    osc.start(now)
    osc.stop(now + 1.6)
  }

  /** CAPA 3 — noise bandpass drum, every ~2 seconds */
  _startRhythm() {
    const BASE_INTERVAL = 2000 // ms (60 BPM × 2 beats)

    const beat = () => {
      if (!this.initialized) return
      this._playDrum()
      const jitter = BASE_INTERVAL * (0.95 + Math.random() * 0.1)
      this._rhythmTimeout = setTimeout(beat, jitter)
    }
    // Start after a short offset so it doesn't clash with drone init
    this._rhythmTimeout = setTimeout(beat, 800)
  }

  _playDrum() {
    if (!this.initialized) return
    const now    = this.ctx.currentTime
    const length = Math.floor(this.ctx.sampleRate * 0.05)
    const buf    = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const data   = buf.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1

    const src = this.ctx.createBufferSource()
    src.buffer = buf

    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 80
    bp.Q.value = 2

    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.12, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    src.connect(bp)
    bp.connect(g)
    g.connect(this.musicGain)
    src.start(now)
  }

  // ── Gameplay reactivity ───────────────────────────────────────────────────
  onScoreChange(playerScore, opponentScore) {
    if (!this.initialized) return
    const diff = playerScore - opponentScore
    const t    = this.ctx.currentTime
    if (diff > 20) {
      this.musicGain.gain.setTargetAtTime(
        this._musicEnabled ? this._musicVolume * 1.28 : 0, t, 2,
      )
      // Slight pitch raise on drone
      for (const { osc } of this._droneOscillators) {
        osc.detune.setTargetAtTime(50, t, 3)
      }
    } else if (diff < -20) {
      this.musicGain.gain.setTargetAtTime(
        this._musicEnabled ? this._musicVolume * 0.7 : 0, t, 2,
      )
      for (const { osc } of this._droneOscillators) {
        osc.detune.setTargetAtTime(0, t, 3)
      }
    } else {
      this.musicGain.gain.setTargetAtTime(
        this._musicEnabled ? this._musicVolume : 0, t, 2,
      )
      for (const { osc } of this._droneOscillators) {
        osc.detune.setTargetAtTime(0, t, 3)
      }
    }
  }

  onComboCreated(multiplier) {
    if (!this.initialized) return
    if (multiplier === 2) {
      this._playArpeggio([440, 554, 659], 0.10)
    } else if (multiplier >= 3) {
      this._playArpeggio([440, 554, 659, 880], 0.10)
    }
  }

  onDiceDestroyed() {
    if (!this.initialized) return
    const now = this.ctx.currentTime
    for (const freq of [220, 233, 246]) {
      const osc = this.ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq

      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.2, now)
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

      osc.connect(g)
      g.connect(this.sfxGain)
      osc.start(now)
      osc.stop(now + 0.5)
    }
  }

  _playArpeggio(freqs, noteDuration) {
    if (!this.initialized) return
    const rev = this._createReverb(1.0)
    rev.connect(this.sfxGain)
    freqs.forEach((freq, i) => {
      const t   = this.ctx.currentTime + i * noteDuration
      const osc = this.ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.25, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + noteDuration * 2.5)

      osc.connect(g)
      g.connect(rev)
      osc.start(t)
      osc.stop(t + noteDuration * 3)
    })
  }

  // ── SFX ───────────────────────────────────────────────────────────────────
  playRoll() {
    if (!this.initialized) return
    try {
      const now    = this.ctx.currentTime
      const length = Math.floor(this.ctx.sampleRate * 0.08)
      const buf    = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
      const data   = buf.getChannelData(0)
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1

      const src = this.ctx.createBufferSource()
      src.buffer = buf

      const hp = this.ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 800

      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.3, now)
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

      src.connect(hp)
      hp.connect(g)
      g.connect(this.sfxGain)
      src.start(now)
    } catch {}
  }

  playPlace() {
    if (!this.initialized) return
    try {
      const now = this.ctx.currentTime

      // Layer 1 — low thud
      const o1 = this.ctx.createOscillator()
      o1.type = 'sawtooth'
      o1.frequency.value = 120
      const g1 = this.ctx.createGain()
      g1.gain.setValueAtTime(0.25, now)
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
      o1.connect(g1)
      g1.connect(this.sfxGain)
      o1.start(now)
      o1.stop(now + 0.07)

      // Layer 2 — high click
      const o2 = this.ctx.createOscillator()
      o2.type = 'sine'
      o2.frequency.value = 800
      const g2 = this.ctx.createGain()
      g2.gain.setValueAtTime(0.18, now)
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
      o2.connect(g2)
      g2.connect(this.sfxGain)
      o2.start(now)
      o2.stop(now + 0.05)
    } catch {}
  }

  playDestroy() {
    if (!this.initialized) return
    try {
      const ac  = this.ctx
      const now = ac.currentTime

      // Initial crack at 2000 Hz
      const crackOsc = ac.createOscillator()
      crackOsc.type = 'sine'
      crackOsc.frequency.value = 2000
      const crackG = ac.createGain()
      crackG.gain.setValueAtTime(0.3, now)
      crackG.gain.exponentialRampToValueAtTime(0.001, now + 0.02)
      crackOsc.connect(crackG)
      crackG.connect(this.sfxGain)
      crackOsc.start(now)
      crackOsc.stop(now + 0.025)

      // Noise burst with reverb
      const sampleRate = ac.sampleRate
      const duration   = 0.18
      const samples    = Math.floor(sampleRate * duration)
      const buf        = ac.createBuffer(1, samples, sampleRate)
      const data       = buf.getChannelData(0)
      for (let i = 0; i < samples; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / samples, 3)
      }
      const noise = ac.createBufferSource()
      noise.buffer = buf

      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 900
      bp.Q.value = 1.8

      // Reverb for the "cabin resonance" feel
      const rev = this._createReverb(1.5)
      rev.connect(this.sfxGain)

      const noiseG = ac.createGain()
      noiseG.gain.setValueAtTime(0.55, now)
      noiseG.gain.exponentialRampToValueAtTime(0.001, now + duration)

      noise.connect(bp)
      bp.connect(noiseG)
      noiseG.connect(rev)
      noise.start(now)

      // Pitched pop
      const osc = ac.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(260, now)
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.14)
      const oscG = ac.createGain()
      oscG.gain.setValueAtTime(0.22, now)
      oscG.gain.exponentialRampToValueAtTime(0.001, now + 0.14)
      osc.connect(oscG)
      oscG.connect(this.sfxGain)
      osc.start(now)
      osc.stop(now + 0.15)
    } catch {}
  }

  playVictory() {
    if (!this.initialized) return
    try {
      const freqs = [261, 329, 392, 523, 659, 784]
      const rev   = this._createReverb(2.0)
      rev.connect(this.sfxGain)
      freqs.forEach((freq, i) => {
        const t   = this.ctx.currentTime + i * 0.14
        const osc = this.ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = freq
        const g = this.ctx.createGain()
        g.gain.setValueAtTime(0.3, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
        osc.connect(g)
        g.connect(rev)
        osc.start(t)
        osc.stop(t + 0.6)
      })
    } catch {}
  }

  playDefeat() {
    if (!this.initialized) return
    try {
      const freqs = [392, 329, 261, 220, 165]
      const rev   = this._createReverb(2.0)
      rev.connect(this.sfxGain)
      const lp = this.ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 300
      lp.connect(rev)
      freqs.forEach((freq, i) => {
        const t   = this.ctx.currentTime + i * 0.25
        const osc = this.ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.value = freq
        const g = this.ctx.createGain()
        g.gain.setValueAtTime(0.25, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
        osc.connect(g)
        g.connect(lp)
        osc.start(t)
        osc.stop(t + 0.7)
      })
    } catch {}
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  destroy() {
    clearTimeout(this._melodyTimeout)
    clearTimeout(this._rhythmTimeout)
    for (const { osc } of this._droneOscillators) {
      try { osc.stop() } catch {}
    }
    this._droneOscillators = []
    try { this.ctx?.close() } catch {}
    this.initialized = false
  }
}

export const audioEngine = new AudioEngine()
