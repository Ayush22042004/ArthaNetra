const { test } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const request = require('supertest')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
process.env.JWT_SECRET = 'isolated-testing-session-secret'
const writes = []
const project = {
  projectId: 'owned-site',
  contractorId: 'owner',
  registeredLatitude: 19.07,
  registeredLongitude: 72.87,
  progressPercent: 40,
  coordinateSource: 'state_centroid_fallback_not_official_site_gps',
}
const updates = []
const db = {
  collection(name) {
    return {
      async findOne(query) {
        return name === 'contractors'
          ? { contractorId: query.contractorId }
          : query.projectId === project.projectId
            ? project
            : null
      },
      async insertOne(value) {
        writes.push(name)
        updates.push(value)
      },
      find() {
        return {
          sort() {
            return this
          },
          limit() {
            return this
          },
          async toArray() {
            return updates
          },
        }
      },
    }
  },
}
require('../utils/database').connectToDatabase = async () => db
require('../services/evidenceVerification').verifyEvidence = async (isolated, testProject) => {
  assert.ok(isolated.collection('work_updates'))
  assert.throws(() => isolated.collection('contractors'))
  assert.equal(testProject.coordinateSource, 'sandbox_reference')
  assert.equal(project.coordinateSource, 'state_centroid_fallback_not_official_site_gps')
  return {
    photoUrl: 'data:image/jpeg;base64,test',
    overallVerificationScore: null,
    verificationStatus: 'UNASSESSED',
    strictVerificationVersion: 3,
    imageVerification: { status: 'UNASSESSED', score: null },
    geoVerification: { status: 'VERIFIED', score: 100, distanceMetres: 0 },
  }
}
const { issueContractorToken } = require('../middleware/contractorAuth')
const app = express()
app.use(express.json({ limit: '7mb' }))
app.use('/testing', require('../routes/contractorTesting'))
app.use((error, req, res, _next) =>
  res.status(error.statusCode || 500).json({ error: error.message })
)
const auth = { Authorization: `Bearer ${issueContractorToken('owner')}` }

test('testing is password locked, session bound, expires, and never writes to live data', async () => {
  process.env.FIELD_TEST_PASSWORD_HASH = await bcrypt.hash('unit-test-password', 4)
  await request(app).post('/testing/unlock').send({ password: 'unit-test-password' }).expect(401)
  await request(app).get('/testing/projects/owned-site/sample').set(auth).expect(403)
  await request(app).post('/testing/unlock').set(auth).send({ password: 'wrong' }).expect(403)
  const unlocked = await request(app)
    .post('/testing/unlock')
    .set(auth)
    .send({ password: 'unit-test-password' })
    .expect(200)
  const token = unlocked.body.data.token
  const credentials = { ...auth, 'X-Field-Test-Token': token }
  const sample = await request(app)
    .get('/testing/projects/owned-site/sample')
    .set(credentials)
    .expect(200)
  assert.match(sample.body.data.photoUrl, /^data:image\/jpeg;base64,/)
  assert.equal(sample.body.data.latitude, project.registeredLatitude)
  assert.equal(sample.body.data.testSiteReference.actualSiteVerified, false)
  await request(app)
    .get('/testing/projects/owned-site/sample')
    .set({ ...credentials, Authorization: `Bearer ${issueContractorToken('other')}` })
    .expect(403)
  const expired = jwt.sign({ contractorId: 'owner' }, process.env.JWT_SECRET, {
    audience: 'arthanetra-field-testing',
    expiresIn: -1,
  })
  await request(app)
    .get('/testing/projects/owned-site/sample')
    .set({ ...auth, 'X-Field-Test-Token': expired })
    .expect(403)
  await request(app)
    .post('/testing/projects/owned-site/updates')
    .set(auth)
    .send(sample.body.data)
    .expect(403)
  const submitted = await request(app)
    .post('/testing/projects/owned-site/updates')
    .set(credentials)
    .send(sample.body.data)
    .expect(201)
  assert.equal(submitted.body.data.testing, true)
  assert.equal(submitted.body.data.update.simulatedGps, true)
  assert.equal(submitted.body.data.update.geoVerification.simulated, true)
  assert.match(
    submitted.body.data.update.geoVerification.summary,
    /does not verify the actual worksite/
  )
  assert.deepEqual(writes, ['test_work_updates'])
  assert.equal(project.progressPercent, 40)
  const timeline = await request(app)
    .get('/testing/projects/owned-site/updates')
    .set(credentials)
    .expect(200)
  assert.equal(timeline.body.data.updates.length, 1)
  delete process.env.FIELD_TEST_PASSWORD_HASH
  await request(app).get('/testing/projects/owned-site/sample').set(credentials).expect(503)
})
