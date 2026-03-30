import { useEffect, useRef } from 'react'

// Standard Gamepad API button indices (matches Xbox / PS / Switch Pro layouts)
const BTN = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5,
  LT: 6, RT: 7,
  SELECT: 8, START: 9,
  L3: 10, R3: 11,
  DPAD_UP: 12, DPAD_DOWN: 13, DPAD_LEFT: 14, DPAD_RIGHT: 15,
}

const AXIS_DEADZONE = 0.35

/**
 * Polls the Gamepad API every animation frame and fires action callbacks on
 * button-press edges (down transition only — no repeat on hold).
 *
 * Control scheme:
 *   Rolling phase  → A / Start / any face button   → roll
 *   Placing phase  → D-pad left / LB / stick left   → prev column
 *                    D-pad right / RB / stick right  → next column
 *                    A / Cross                       → confirm place
 *
 * @param {object}  callbacks
 *   onRoll()         — triggered when A or Start is pressed in rolling phase
 *   onConfirm()      — triggered when A is pressed in placing phase
 *   onColPrev()      — move column selection left
 *   onColNext()      — move column selection right
 * @param {boolean} enabled   pause all callbacks when false (e.g. bot turn)
 */
export function useGamepad({ onRoll, onConfirm, onColPrev, onColNext }, enabled) {
  // Keep callbacks in a ref so the RAF loop never needs to restart
  const cb = useRef({ onRoll, onConfirm, onColPrev, onColNext })
  useEffect(() => { cb.current = { onRoll, onConfirm, onColPrev, onColNext } })

  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  // prev[gpIndex] = { buttons: boolean[], axisX: -1|0|1 }
  const prev = useRef({})

  useEffect(() => {
    if (typeof navigator.getGamepads !== 'function') return   // API unsupported

    let rafId

    const poll = () => {
      rafId = requestAnimationFrame(poll)

      const gamepads = navigator.getGamepads()
      for (const gp of gamepads) {
        if (!gp) continue

        const p = prev.current[gp.index] ?? { buttons: [], axisX: 0 }

        if (enabledRef.current) {
          // ── Button edges ─────────────────────────────────────────────────
          gp.buttons.forEach((btn, idx) => {
            const wasDown = p.buttons[idx] ?? false
            if (btn.pressed && !wasDown) onButtonPress(idx, cb.current)
          })

          // ── Left stick X — edge (neutral → direction) ─────────────────
          const curAxisX = axisSnap(gp.axes[0] ?? 0)
          if (curAxisX !== 0 && curAxisX !== p.axisX) {
            if (curAxisX < 0) cb.current.onColPrev?.()
            else              cb.current.onColNext?.()
          }
          prev.current[gp.index] = {
            buttons: gp.buttons.map(b => b.pressed),
            axisX: curAxisX,
          }
        } else {
          // Still record state while disabled so we don't get a burst of
          // "new" presses the moment the player's turn starts.
          prev.current[gp.index] = {
            buttons: gp.buttons.map(b => b.pressed),
            axisX: axisSnap(gp.axes[0] ?? 0),
          }
        }
      }
    }

    rafId = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(rafId)
  }, [])  // intentionally empty — uses refs for all reactive values
}

function axisSnap(v) {
  if (v < -AXIS_DEADZONE) return -1
  if (v >  AXIS_DEADZONE) return  1
  return 0
}

function onButtonPress(idx, callbacks) {
  switch (idx) {
    case BTN.A:
    case BTN.START:
      // A/Start: roll in rolling phase OR confirm place in placing phase.
      // GameScreen decides which is valid based on current phase.
      callbacks.onRoll?.()
      callbacks.onConfirm?.()
      break

    case BTN.DPAD_LEFT:
    case BTN.LB:
      callbacks.onColPrev?.()
      break

    case BTN.DPAD_RIGHT:
    case BTN.RB:
      callbacks.onColNext?.()
      break

    // B / X / Y: direct column shortcuts (left→col 0, up→col 1, right→col 2)
    // Matches the physical positions of face buttons on most controllers.
    case BTN.B:   callbacks.onColNext?.(); callbacks.onConfirm?.(); break
    case BTN.X:   callbacks.onColPrev?.(); callbacks.onConfirm?.(); break
    case BTN.Y:   callbacks.onConfirm?.(); break

    default: break
  }
}
