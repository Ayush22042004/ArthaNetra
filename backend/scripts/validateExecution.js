// Opt-in integration check. All writes go to randomly named temporary collections.
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const { MongoClient, ObjectId } = require('mongodb')
const express = require('express')
const request = require('supertest')
const assert = require('node:assert/strict')
const sharp = require('sharp')
const jwt = require('jsonwebtoken')
const { randomUUID } = require('crypto')

async function main() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET)
    throw new Error('Configure backend MongoDB and JWT secrets before validation.')
  const prefix = `qa_execution_${randomUUID().replace(/-/g, '')}_`
  const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 3 })
  await client.connect()
  const source = client.db(process.env.DATABASE_NAME || 'mplads')
  const touched = new Set()
  const db = {
    collection(name) {
      const target = prefix + name
      touched.add(target)
      return source.collection(target)
    },
  }
  const adapter = require('../utils/database')
  adapter.connectToDatabase = async () => db
  adapter.getCollection = async name => db.collection(name)
  const app = express()
  app.use(express.json({ limit: '7mb' }))
  app.use('/contractors', require('../routes/contractors'))
  app.use('/investigations', require('../routes/investigations'))
  app.use((error, req, res, _next) =>
    res.status(error.statusCode || 500).json({ error: error.message })
  )
  try {
    const accounts = await request(app).get('/contractors/demo-accounts').expect(200)
    const login = await request(app)
      .post('/contractors/login')
      .send({ email: accounts.body.data[0].email, password: accounts.body.data[0].passwordHint })
      .expect(200)
    const auth = { Authorization: `Bearer ${login.body.data.token}` }
    const dashboard = await request(app).get('/contractors/dashboard').set(auth).expect(200)
    const project = dashboard.body.data.projects[0]
    assert.ok(project)
    assert.ok(!JSON.stringify(dashboard.body).includes('passwordHash'))
    await request(app).get('/contractors/dashboard?contractorId=someone-else').set(auth).expect(403)
    const photo = await sharp(
      require('path').resolve(__dirname, '../../frontend/public/contractor-login-worker.svg')
    )
      .resize(480, 480)
      .jpeg()
      .toBuffer()
    const payload = {
      photoUrl: `data:image/jpeg;base64,${photo.toString('base64')}`,
      mediaName: 'worker-illustration.jpg',
      latitude: project.registeredLatitude,
      longitude: project.registeredLongitude,
      gpsAccuracy: 15,
      gpsCapturedAt: new Date().toISOString(),
      clientCaptureTime: new Date().toISOString(),
      progressPercent: Math.min(100, project.progressPercent + 1),
      remarks: 'Isolated automated negative-evidence validation; not a real field submission.',
    }
    await request(app)
      .post(`/contractors/projects/${project.projectId}/updates`)
      .send(payload)
      .expect(401)
    await request(app)
      .post(`/contractors/projects/${project.projectId}/updates`)
      .set(auth)
      .send({ ...payload, gpsCapturedAt: '2000-01-01' })
      .expect(400)
    const submitted = await request(app)
      .post(`/contractors/projects/${project.projectId}/updates`)
      .set(auth)
      .send(payload)
      .expect(201)
    assert.notEqual(submitted.body.data.verification.status, 'VERIFIED')
    const timeline = await request(app)
      .get(`/contractors/projects/${project.projectId}/timeline`)
      .set(auth)
      .expect(200)
    assert.ok(
      timeline.body.data.updates.some(item => item.updateId === submitted.body.data.update.updateId)
    )
    const stored = await db
      .collection('contractor_projects')
      .findOne({ projectId: project.projectId })
    assert.equal(
      stored.progressPercent,
      project.progressPercent,
      'Unverified progress must not overwrite accepted progress'
    )
    const map = await request(app).get('/contractors/map-projects').expect(200)
    assert.notEqual(
      map.body.data.projects.find(item => item.projectId === project.projectId).mapStatus,
      'GREEN'
    )
    const authorityId = new ObjectId()
    await db.collection('users').insertOne({
      _id: authorityId,
      name: 'Isolated QA reviewer',
      email: 'qa@example.invalid',
      role: 'admin',
      isActive: true,
    })
    const authority = {
      Authorization: `Bearer ${jwt.sign({ userId: authorityId.toString() }, process.env.JWT_SECRET)}`,
    }
    const opened = await request(app)
      .post('/investigations')
      .set(authority)
      .send({
        sourceType: 'contractor_projects',
        sourceId: project.projectId,
        note: 'Illustration submitted instead of photographic site evidence.',
      })
      .expect(201)
    await request(app)
      .patch(`/investigations/${opened.body.data.caseId}`)
      .set(authority)
      .send({
        status: 'ESCALATED',
        version: 1,
        assignedTo: authorityId.toString(),
        note: 'Request a site inspection and a fresh construction photograph.',
      })
      .expect(200)
    const detail = await request(app)
      .get(`/investigations/${opened.body.data.caseId}`)
      .set(authority)
      .expect(200)
    assert.equal(detail.body.data.version, 2)
    assert.equal(detail.body.data.events.length, 2)
    assert.ok(
      detail.body.data.evidence.some(item => item.updateId === submitted.body.data.update.updateId)
    )
    console.info(
      JSON.stringify({
        passed: true,
        databaseWritesIsolated: true,
        login: 'passed',
        ownership: 'passed',
        gpsEnforcement: 'passed',
        visionStatus: submitted.body.data.update.imageVerification.status,
        imageScore: submitted.body.data.update.imageVerification.score,
        timeline: 'persisted',
        map: 'updated',
        unverifiedProgress: 'not accepted',
        investigation: 'persisted and assigned',
        auditEvents: detail.body.data.events.length,
      })
    )
  } finally {
    for (const name of touched) {
      assert.ok(
        name.startsWith(prefix) && /^qa_execution_[a-f0-9]{32}_/.test(name),
        'Refusing unsafe test cleanup.'
      )
      await source
        .collection(name)
        .drop()
        .catch(error => {
          if (error.code !== 26) throw error
        })
    }
    await client.close()
  }
}
main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
