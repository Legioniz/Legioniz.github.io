import assert from 'node:assert/strict'
import { adaptiveEffectKey, deriveAdaptiveProfile } from '../src/adaptive.ts'

const desktop = deriveAdaptiveProfile({
  width: 1440, height: 900, devicePixelRatio: 2, visualScale: 1,
  pointer: 'fine', saveData: false, deviceMemory: 8, hardwareConcurrency: 8, reducedMotion: false,
})
assert.equal(desktop.quality, 'full')
assert.equal(desktop.particleLimit, 42)
assert.equal(desktop.orientation, 'landscape')
assert.equal(desktop.pixelRatioCap, 1.25)
const nearbyDesktop = deriveAdaptiveProfile({ ...({ width: 1400, height: 920, devicePixelRatio: 2, visualScale: 1, pointer: 'fine', saveData: false, deviceMemory: 8, hardwareConcurrency: 8, reducedMotion: false }) })
assert.equal(adaptiveEffectKey(desktop), adaptiveEffectKey(nearbyDesktop), 'A small resize should not retrigger optional rendering work.')

const lowDpr = deriveAdaptiveProfile({
  width: 1280, height: 800, devicePixelRatio: 0.8, visualScale: 1,
  pointer: 'fine', saveData: false, deviceMemory: 8, hardwareConcurrency: 8, reducedMotion: false,
})
assert.equal(lowDpr.pixelRatioCap, 0.8)

const touch = deriveAdaptiveProfile({
  width: 390, height: 844, devicePixelRatio: 3, visualScale: 1,
  pointer: 'coarse', saveData: false, deviceMemory: 4, hardwareConcurrency: 8, reducedMotion: false,
})
assert.equal(touch.quality, 'balanced')
assert.equal(touch.particleLimit, 18)
assert.equal(touch.orientation, 'portrait')
assert.notEqual(adaptiveEffectKey(desktop), adaptiveEffectKey(touch), 'A quality/pointer change should update the rendering profile.')

const constrained = deriveAdaptiveProfile({
  width: 1280, height: 800, devicePixelRatio: 2, visualScale: 1,
  pointer: 'fine', saveData: true, deviceMemory: 8, hardwareConcurrency: 8, reducedMotion: false,
})
assert.equal(constrained.quality, 'economy')
assert.equal(constrained.particleLimit, 0)

const reduced = deriveAdaptiveProfile({
  width: 1440, height: 900, devicePixelRatio: 2, visualScale: 1,
  pointer: 'fine', saveData: false, deviceMemory: 8, hardwareConcurrency: 8, reducedMotion: true,
})
assert.equal(reduced.particleLimit, 0)

const zoomed = deriveAdaptiveProfile({
  width: 760, height: 900, devicePixelRatio: 2, visualScale: 1.4,
  pointer: 'fine', saveData: false, deviceMemory: 8, hardwareConcurrency: 8, reducedMotion: false,
})
assert.equal(zoomed.quality, 'balanced')

const invalidInput = deriveAdaptiveProfile({
  width: Number.NaN, height: Number.POSITIVE_INFINITY, devicePixelRatio: Number.NaN, visualScale: Number.NaN,
  pointer: 'fine', saveData: false, deviceMemory: Number.NaN, hardwareConcurrency: Number.NaN, reducedMotion: false,
})
assert.equal(invalidInput.width, 1)
assert.equal(invalidInput.height, 1)
assert.equal(invalidInput.visualScale, 1)
assert.equal(invalidInput.pixelRatioCap, 1)

console.log('Adaptive profile smoke tests passed: desktop, touch, data-saver, reduced-motion, zoomed viewport, DPR cap, invalid-input fallback, and resize-work coalescing.')
