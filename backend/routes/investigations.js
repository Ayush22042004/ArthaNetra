const express = require('express')
const { randomUUID } = require('crypto')
const { ObjectId } = require('mongodb')
const { connectToDatabase } = require('../utils/database')
const { adminAuth } = require('../middleware/auth')
const { reconcilePayments } = require('../services/financialReconciliation')
const router = express.Router()
const sources = ['contractor_projects', 'works_completed', 'works_recommended']
const statuses = ['OPEN', 'IN_REVIEW', 'VERIFIED', 'ESCALATED', 'RESOLVED']
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })
const actor = req => ({ id: req.user.id, name: req.user.name, email: req.user.email })
const note = value => {
  if (typeof value !== 'string' || value.trim().length < 10 || value.length > 2000)
    throw fail('A review note between 10 and 2000 characters is required.')
  return value.trim()
}
async function database() {
  const db = await connectToDatabase()
  await db.collection('investigation_cases').createIndex({ workKey: 1 }, { unique: true })
  return db
}
async function sourceWork(db, type, id) {
  if (!sources.includes(type) || typeof id !== 'string' || !id || id.length > 120)
    throw fail('Invalid work reference.')
  const values = [id]
  if (/^\d+$/.test(id)) values.push(Number(id))
  const query =
    type === 'contractor_projects'
      ? { projectId: id }
      : {
          $or: [
            { workId: { $in: values } },
            ...(type === 'works_recommended' ? [{ recommendationId: { $in: values } }] : []),
            ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : []),
          ],
        }
  const work = await db.collection(type).findOne(query)
  if (!work) throw fail('The original work was not found. Refresh the map before reviewing.', 404)
  return work
}

router.use(...adminAuth)
router.get('/reviewers', async (req, res, next) => {
  try {
    const db = await database()
    res.json({
      success: true,
      data: await db
        .collection('users')
        .find({ role: 'admin', isActive: true })
        .project({ name: 1, email: 1 })
        .toArray(),
    })
  } catch (error) {
    next(error)
  }
})
router.get('/', async (req, res, next) => {
  try {
    const db = await database()
    const query = statuses.includes(req.query.status) ? { status: req.query.status } : {}
    const data = await db
      .collection('investigation_cases')
      .find(query)
      .project({ snapshot: 0 })
      .sort({ updatedAt: -1 })
      .limit(200)
      .toArray()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})
router.post('/', async (req, res, next) => {
  try {
    const db = await database()
    const { sourceType, sourceId } = req.body
    const reason = note(req.body.note)
    const work = await sourceWork(db, sourceType, sourceId)
    const workKey = `${sourceType}:${sourceId}`
    const now = new Date()
    const record = {
      caseId: randomUUID(),
      workKey,
      sourceType,
      sourceId,
      title:
        work.title ||
        work.workName ||
        work.workDescription ||
        work.description ||
        `Work ${sourceId}`,
      status: 'OPEN',
      version: 1,
      assignedTo: null,
      snapshot: work,
      createdAt: now,
      updatedAt: now,
      events: [{ action: 'OPEN', note: reason, actor: actor(req), at: now }],
    }
    await db
      .collection('investigation_cases')
      .updateOne({ workKey }, { $setOnInsert: record }, { upsert: true })
    res.status(201).json({
      success: true,
      data: await db.collection('investigation_cases').findOne({ workKey }),
    })
  } catch (error) {
    next(error)
  }
})
router.get('/:caseId', async (req, res, next) => {
  try {
    const db = await database()
    const record = await db.collection('investigation_cases').findOne({ caseId: req.params.caseId })
    if (!record) throw fail('Case not found.', 404)
    const work = await sourceWork(db, record.sourceType, record.sourceId)
    const projects =
      record.sourceType === 'contractor_projects'
        ? [work]
        : await db
            .collection('contractor_projects')
            .find({
              sourceCollection: record.sourceType,
              sourceWorkId: {
                $in: [record.sourceId, Number(record.sourceId)].filter(
                  x => typeof x !== 'number' || Number.isFinite(x)
                ),
              },
            })
            .toArray()
    const evidenceQuery = { projectId: { $in: projects.map(project => project.projectId) } }
    const evidence = await db
      .collection('work_updates')
      .find(evidenceQuery)
      .sort({ serverUploadTime: -1 })
      .limit(30)
      .toArray()
    const linkedWork =
      record.sourceType === 'contractor_projects' &&
      ['works_completed', 'works_recommended'].includes(work.sourceCollection) &&
      work.sourceWorkId
        ? await sourceWork(db, work.sourceCollection, String(work.sourceWorkId))
        : work
    const paymentId =
      linkedWork.workId || (record.sourceType === 'works_completed' ? record.sourceId : null)
    const paymentQuery = {
      ...(linkedWork.house ? { house: linkedWork.house } : {}),
      ...(linkedWork.lsTerm ? { lsTerm: linkedWork.lsTerm } : {}),
      workId: {
        $in:
          paymentId === null
            ? []
            : [String(paymentId), Number(paymentId)].filter(
                x => typeof x !== 'number' || Number.isFinite(x)
              ),
      },
    }
    const payments = await db.collection('expenditures').find(paymentQuery).limit(200).toArray()
    const financials = await reconcilePayments(db, paymentQuery, linkedWork)
    const [paymentCount, evidenceCount] = await Promise.all([
      db.collection('expenditures').countDocuments(paymentQuery),
      db.collection('work_updates').countDocuments(evidenceQuery),
    ])
    const metadata = await db.collection('data_sync_metadata').findOne({})
    res.json({
      success: true,
      data: {
        ...record,
        work,
        evidence,
        payments,
        financials,
        completeness: {
          paymentCount,
          paymentsIncluded: payments.length,
          evidenceCount,
          evidenceIncluded: evidence.length,
          paymentLinkAvailable: paymentId !== null,
        },
        dataFreshness: metadata?.lastUpdated || metadata?.lastSyncTime || null,
        generatedAt: new Date(),
        governanceNote:
          'Review signals support human investigation. They are not findings of fraud or procurement decisions.',
      },
    })
  } catch (error) {
    next(error)
  }
})
router.patch('/:caseId', async (req, res, next) => {
  try {
    const db = await database()
    const record = await db.collection('investigation_cases').findOne({ caseId: req.params.caseId })
    if (!record) throw fail('Case not found.', 404)
    const reviewNote = note(req.body.note)
    const status = req.body.status || record.status
    if (!statuses.includes(status) || !Number.isInteger(req.body.version))
      throw fail('Invalid status or revision.')
    const assignedTo = req.body.assignedTo === undefined ? record.assignedTo : req.body.assignedTo
    if (assignedTo) {
      if (
        !ObjectId.isValid(assignedTo) ||
        !(await db
          .collection('users')
          .findOne({ _id: new ObjectId(assignedTo), role: 'admin', isActive: true }))
      )
        throw fail('Reviewer must be an active authority account.')
    }
    const now = new Date()
    const result = await db.collection('investigation_cases').updateOne(
      { caseId: record.caseId, version: req.body.version },
      {
        $set: { status, assignedTo, updatedAt: now },
        $inc: { version: 1 },
        $push: {
          events: {
            action: status,
            previousStatus: record.status,
            assignedTo,
            actor: actor(req),
            note: reviewNote,
            at: now,
          },
        },
      }
    )
    if (!result.modifiedCount)
      throw fail('Another reviewer changed this case. Refresh before saving.', 409)
    res.json({
      success: true,
      data: await db.collection('investigation_cases').findOne({ caseId: record.caseId }),
    })
  } catch (error) {
    next(error)
  }
})
module.exports = router
