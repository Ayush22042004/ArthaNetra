const { test } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const request = require('supertest')
const jwt = require('jsonwebtoken')
process.env.JWT_SECRET = 'isolated-investigation-test-secret'
const records = []
const work = { projectId: 'site-1', title: 'Road work', contractorId: 'owner', amount: 10000 }
const db = {
  collection(name) {
    return {
      async createIndex() {},
      async findOne(query) {
        if (name === 'contractor_projects') return query.projectId === work.projectId ? work : null
        if (name === 'investigation_cases')
          return (
            records.find(row =>
              Object.entries(query).every(([key, value]) => row[key] === value)
            ) || null
          )
        return null
      },
      find() {
        return {
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
            return name === 'investigation_cases' ? records : []
          },
        }
      },
      aggregate() {
        return {
          async toArray() {
            return []
          },
        }
      },
      async countDocuments() {
        return 0
      },
      async updateOne(query, update, options) {
        const row = records.find(item =>
          Object.entries(query).every(([key, value]) => item[key] === value)
        )
        if (!row && options?.upsert) {
          records.push(structuredClone(update.$setOnInsert))
          return { modifiedCount: 0, upsertedCount: 1 }
        }
        if (!row) return { modifiedCount: 0 }
        if (update.$set) Object.assign(row, update.$set)
        if (update.$inc) row.version += update.$inc.version
        if (update.$push) row.events.push(update.$push.events)
        return { modifiedCount: 1 }
      },
    }
  },
}
require('../utils/database').connectToDatabase = async () => db
require('../models/User').findById = async id =>
  id === 'admin-1'
    ? { _id: 'admin-1', name: 'Reviewer', role: 'admin', email: 'reviewer@test.invalid' }
    : id === 'reader'
      ? { _id: 'reader', role: 'user' }
      : null
const app = express()
app.use(express.json())
app.use('/investigations', require('../routes/investigations'))
app.use((error, req, res, _next) =>
  res.status(error.statusCode || 500).json({ error: error.message })
)
const token = userId => jwt.sign({ userId }, process.env.JWT_SECRET)
const auth = { Authorization: `Bearer ${token('admin-1')}` }

test('investigation actions require an existing authority account', async () => {
  await request(app).get('/investigations').expect(401)
  await request(app)
    .get('/investigations')
    .set('Authorization', `Bearer ${token('reader')}`)
    .expect(403)
  await request(app)
    .get('/investigations')
    .set('Authorization', `Bearer ${token('missing')}`)
    .expect(401)
})
test('case lifecycle persists one case, validates source, records audit and rejects stale revisions', async () => {
  await request(app)
    .post('/investigations')
    .set(auth)
    .send({ sourceType: 'users', sourceId: 'site-1', note: 'Requires investigation.' })
    .expect(400)
  await request(app)
    .post('/investigations')
    .set(auth)
    .send({
      sourceType: 'contractor_projects',
      sourceId: 'missing',
      note: 'Requires investigation.',
    })
    .expect(404)
  const payload = {
    sourceType: 'contractor_projects',
    sourceId: 'site-1',
    note: 'Review site evidence.',
    amount: 999999,
  }
  const opened = await request(app).post('/investigations').set(auth).send(payload).expect(201)
  const id = opened.body.data.caseId
  assert.equal(opened.body.data.snapshot.amount, 10000)
  await request(app).post('/investigations').set(auth).send(payload).expect(201)
  assert.equal(records.length, 1)
  await request(app)
    .patch(`/investigations/${id}`)
    .set(auth)
    .send({ status: 'VERIFIED', note: 'too short', version: 1 })
    .expect(400)
  await request(app)
    .patch(`/investigations/${id}`)
    .set(auth)
    .send({ status: 'ESCALATED', note: 'Location needs site inspection.', version: 1 })
    .expect(200)
  await request(app)
    .patch(`/investigations/${id}`)
    .set(auth)
    .send({ status: 'VERIFIED', note: 'Stale review cannot replace evidence.', version: 1 })
    .expect(409)
  const detail = await request(app).get(`/investigations/${id}`).set(auth).expect(200)
  assert.equal(detail.body.data.status, 'ESCALATED')
  assert.equal(detail.body.data.version, 2)
  assert.equal(detail.body.data.events.length, 2)
  assert.equal(detail.body.data.events[1].actor.email, 'reviewer@test.invalid')
  assert.equal(detail.body.data.completeness.paymentLinkAvailable, false)
})
