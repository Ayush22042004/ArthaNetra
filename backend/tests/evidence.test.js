const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const sharp = require('sharp')
const {
  validateCapture,
  prepareImage,
  similarity,
  analyzeImage,
  verifyEvidence,
} = require('../services/evidenceVerification')
const originalFetch = global.fetch
const originalKey = process.env.GEMINI_API_KEY
afterEach(() => {
  global.fetch = originalFetch
  if (originalKey) process.env.GEMINI_API_KEY = originalKey
  else delete process.env.GEMINI_API_KEY
})
const capture = () => ({
  latitude: 19,
  longitude: 73,
  gpsAccuracy: 20,
  gpsCapturedAt: new Date().toISOString(),
  progressPercent: 30,
  clientCaptureTime: new Date().toISOString(),
})
const image = async () =>
  `data:image/jpeg;base64,${(
    await sharp({ create: { width: 320, height: 240, channels: 3, background: '#287a55' } })
      .jpeg()
      .toBuffer()
  ).toString('base64')}`

test('fresh GPS is mandatory and invalid values are rejected', () => {
  assert.doesNotThrow(() => validateCapture(capture()))
  for (const field of ['latitude', 'longitude', 'gpsAccuracy', 'progressPercent'])
    assert.throws(() => validateCapture({ ...capture(), [field]: '' }))
  for (const value of [
    { latitude: 91 },
    { longitude: -181 },
    { gpsAccuracy: 300 },
    { progressPercent: 101 },
    { gpsCapturedAt: '2000-01-01' },
  ])
    assert.throws(() => validateCapture({ ...capture(), ...value }))
})
test('uploaded bytes are decoded, normalized and perceptually fingerprinted', async () => {
  const result = await prepareImage(await image())
  assert.match(result.photoUrl, /^data:image\/jpeg;base64,/)
  assert.match(result.perceptualHash, /^[a-f0-9]{16}$/)
  assert.equal(similarity(result.perceptualHash, result.perceptualHash), 100)
  assert.equal(similarity('0000000000000000', 'ffffffffffffffff'), 0)
  await assert.rejects(prepareImage('https://example.com/road.jpg'))
  await assert.rejects(prepareImage('data:image/jpeg;base64,YmFk'))
})
test('unavailable, malformed or unconfigured vision cannot receive a passing score', async () => {
  delete process.env.GEMINI_API_KEY
  assert.equal((await analyzeImage({}, {}, await image())).score, null)
  process.env.GEMINI_API_KEY = 'test-only'
  global.fetch = async () => ({ ok: false, status: 429 })
  assert.equal((await analyzeImage({}, {}, await image())).status, 'UNASSESSED')
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }),
  })
  assert.equal((await analyzeImage({}, {}, await image())).score, null)
})
test('vision receives actual inline pixels and rejects unrelated images despite accurate GPS', async () => {
  process.env.GEMINI_API_KEY = 'test-only'
  global.fetch = async (url, options) => {
    assert.ok(JSON.parse(options.body).contents[0].parts[1].inlineData.data.length > 100)
    return {
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    project_match: false,
                    progress_plausible: false,
                    confidence_percent: 99,
                    detected_stage: 'illustration',
                    issues: ['Not a site photograph'],
                    summary: 'An icon is not evidence of construction.',
                  }),
                },
              ],
            },
          },
        ],
      }),
    }
  }
  const db = {
    collection: () => ({
      find: () => ({
        project() {
          return this
        },
        sort() {
          return this
        },
        limit() {
          return this
        },
        async toArray() {
          return []
        },
      }),
    }),
  }
  const result = await verifyEvidence(
    db,
    {
      title: 'Road construction',
      progressPercent: 25,
      registeredLatitude: 19,
      registeredLongitude: 73,
    },
    { ...capture(), photoUrl: await image() }
  )
  assert.equal(result.imageVerification.score, 0)
  assert.equal(result.verificationStatus, 'SUSPICIOUS')
  assert.notEqual(result.verificationStatus, 'VERIFIED')
})
test('regional fallback GPS leaves overall evidence unassessed', async () => {
  delete process.env.GEMINI_API_KEY
  const db = {
    collection: () => ({
      find: () => ({
        project() {
          return this
        },
        sort() {
          return this
        },
        limit() {
          return this
        },
        async toArray() {
          return []
        },
      }),
    }),
  }
  const result = await verifyEvidence(
    db,
    {
      coordinateSource: 'state_centroid_fallback_not_official_site_gps',
      progressPercent: 25,
      registeredLatitude: 19,
      registeredLongitude: 73,
    },
    { ...capture(), photoUrl: await image() }
  )
  assert.equal(result.geoVerification.status, 'UNASSESSED')
  assert.equal(result.overallVerificationScore, null)
  assert.equal(result.verificationStatus, 'UNASSESSED')
})

test('verification capacity is bounded and slots are released', async () => {
  delete process.env.GEMINI_API_KEY
  const photoUrl = await image()
  const db = {
    collection: () => ({
      find: () => ({
        project() {
          return this
        },
        sort() {
          return this
        },
        limit() {
          return this
        },
        async toArray() {
          return []
        },
      }),
    }),
  }
  const project = { registeredLatitude: 19, registeredLongitude: 73, progressPercent: 25 }
  const body = { ...capture(), photoUrl }
  const first = verifyEvidence(db, project, body)
  const second = verifyEvidence(db, project, body)
  await assert.rejects(verifyEvidence(db, project, body), error => error.statusCode === 429)
  await Promise.all([first, second])
  assert.ok(await verifyEvidence(db, project, body))
})
