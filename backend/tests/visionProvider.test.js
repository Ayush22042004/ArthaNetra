const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { analyzeImage, getVisionStatus } = require('../services/visionProvider')
const originalFetch = global.fetch
const previous = Object.fromEntries(
  ['GEMINI_API_KEY', 'GEMINI_VISION_MODEL', 'GEMINI_VISION_FALLBACK_MODELS'].map(name => [
    name,
    process.env[name],
  ])
)
afterEach(() => {
  global.fetch = originalFetch
  for (const [name, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})
const setup = () => {
  process.env.GEMINI_API_KEY = 'test-secret-never-returned'
  process.env.GEMINI_VISION_MODEL = 'primary-vision'
  process.env.GEMINI_VISION_FALLBACK_MODELS = 'backup-vision'
}
const value = {
  project_match: true,
  progress_plausible: null,
  confidence_percent: 92,
  detected_work_type: 'Concrete construction',
  detected_stage: 'Rebar placement',
  visible_features: ['Steel reinforcement is visible'],
  issues: [],
  summary: 'Rebar placement and concrete structural construction are visible.',
}
const success = (fields = {}) => ({
  ok: true,
  json: async () => ({
    candidates: [
      {
        finishReason: 'STOP',
        content: {
          parts: [
            { thought: true, text: 'Private reasoning is not application output.' },
            { text: JSON.stringify({ ...value, ...fields }) },
          ],
        },
      },
    ],
  }),
})
const analyze = () =>
  analyzeImage(
    { title: 'Concrete building construction' },
    { progressPercent: 35 },
    'data:image/jpeg;base64,dGVzdA=='
  )

test('busy primary uses a bounded fallback and returns explainable actual-image output', async () => {
  setup()
  const calls = []
  global.fetch = async (url, options) => {
    calls.push(url)
    assert.equal(JSON.parse(options.body).contents[0].parts[1].inlineData.data, 'dGVzdA==')
    return calls.length === 1 ? { ok: false, status: 503 } : success()
  }
  const result = await analyze()
  assert.equal(calls.length, 2)
  assert.equal(result.model, 'backup-vision')
  assert.equal(result.confidence, 92)
  assert.equal(result.projectMatch, true)
  assert.equal(result.progressPlausible, null)
  assert.deepEqual(result.visibleFeatures, value.visible_features)
  assert.equal(getVisionStatus().state, 'READY')
  assert.ok(
    !JSON.stringify({ result, health: getVisionStatus() }).includes(process.env.GEMINI_API_KEY)
  )
})
test('quota and credential errors are explicit and do not hammer fallback models', async () => {
  setup()
  for (const [status, code] of [
    [429, 'RATE_LIMITED'],
    [403, 'AUTHENTICATION_FAILED'],
  ]) {
    let calls = 0
    global.fetch = async () => {
      calls++
      return { ok: false, status, headers: { get: () => '30' } }
    }
    const result = await analyze()
    assert.equal(result.errorCode, code)
    assert.equal(result.score, null)
    assert.equal(calls, 1)
  }
})
test('truncated output, invalid booleans and fractional confidence cannot verify evidence', async () => {
  setup()
  for (const response of [
    {
      ok: true,
      json: async () => ({
        candidates: [
          { finishReason: 'MAX_TOKENS', content: { parts: [{ text: JSON.stringify(value) }] } },
        ],
      }),
    },
    success({ project_match: 'yes' }),
    success({ confidence_percent: 0.92 }),
  ]) {
    global.fetch = async () => response
    const result = await analyze()
    assert.equal(result.score, null)
    assert.equal(result.errorCode, 'INVALID_RESPONSE')
  }
})
test('unrelated image is rejected even when provider confidence is high', async () => {
  setup()
  global.fetch = async () =>
    success({
      project_match: false,
      confidence_percent: 100,
      summary: 'This is an illustration, not site evidence.',
    })
  const result = await analyze()
  assert.equal(result.projectMatch, false)
  assert.equal(result.score, 0)
  assert.equal(result.status, 'SUSPICIOUS')
})
