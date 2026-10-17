const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const sharp = require('sharp')
const path = require('path')
const rateLimit = require('express-rate-limit')
const { connectToDatabase } = require('../utils/database')
const { requireContractor } = require('../middleware/contractorAuth')
const { verifyEvidence } = require('../services/evidenceVerification')
const { buildTestingSite } = require('../services/testingSite')
const router = express.Router()
const binding = req =>
  crypto
    .createHash('sha256')
    .update(req.headers.authorization || '')
    .digest('hex')

function requireTesting(req, res, next) {
  try {
    if (!process.env.FIELD_TEST_PASSWORD_HASH)
      return res.status(503).json({ error: 'Testing mode is not configured on this server.' })
    const claims = jwt.verify(req.headers['x-field-test-token'] || '', process.env.JWT_SECRET, {
      audience: 'arthanetra-field-testing',
      algorithms: ['HS256'],
    })
    if (claims.contractorId !== req.contractor.contractorId || claims.binding !== binding(req))
      throw new Error('Wrong session')
    next()
  } catch {
    res
      .status(403)
      .json({ error: 'Testing mode is locked or expired. Enter the testing password again.' })
  }
}

router.post(
  '/unlock',
  requireContractor,
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
  async (req, res, next) => {
    try {
      const hash = process.env.FIELD_TEST_PASSWORD_HASH
      if (!hash)
        return res.status(503).json({ error: 'Testing mode is not configured on this server.' })
      const password = req.body?.password
      if (
        typeof password !== 'string' ||
        password.length > 128 ||
        !(await bcrypt.compare(password, hash))
      )
        return res.status(403).json({ error: 'Incorrect testing password.' })
      const token = jwt.sign(
        { contractorId: req.contractor.contractorId, binding: binding(req) },
        process.env.JWT_SECRET,
        { audience: 'arthanetra-field-testing', expiresIn: '15m' }
      )
      res.json({
        success: true,
        data: { token, expiresAt: new Date(Date.now() + 900000).toISOString() },
      })
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/projects/:projectId/sample',
  requireContractor,
  requireTesting,
  async (req, res, next) => {
    try {
      const db = await connectToDatabase()
      const project = await db
        .collection('contractor_projects')
        .findOne({ projectId: req.params.projectId })
      const unrelated = req.query.kind === 'unrelated'
      const { reference } = buildTestingSite(project)
      const file = unrelated
        ? path.resolve(__dirname, '../fixtures/unrelated-worker.svg')
        : path.resolve(__dirname, '../fixtures/site-construction.jpg')
      const photo = await sharp(file)
        .resize({ width: 960, height: 960, fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer()
      res.json({
        success: true,
        data: {
          photoUrl: `data:image/jpeg;base64,${photo.toString('base64')}`,
          mediaName: unrelated ? 'test-unrelated-illustration.jpg' : 'test-sample-construction.jpg',
          latitude: reference.latitude,
          longitude: reference.longitude,
          testSiteReference: reference,
          gpsAccuracy: 15,
          gpsCapturedAt: new Date().toISOString(),
          clientCaptureTime: new Date().toISOString(),
          progressPercent: Math.min(100, Number(project.progressPercent || 0) + 5),
          remarks: 'TEST ONLY: sample media and simulated GPS; not field evidence.',
          sampleSource: unrelated
            ? 'ArthaNetra illustration (negative test)'
            : 'Unsplash construction context photograph (not this project site)',
        },
      })
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/projects/:projectId/updates',
  requireContractor,
  requireTesting,
  async (req, res, next) => {
    try {
      const db = await connectToDatabase()
      const updates = await db
        .collection('test_work_updates')
        .find({ projectId: req.params.projectId, contractorId: req.contractor.contractorId })
        .sort({ serverUploadTime: -1 })
        .limit(8)
        .toArray()
      res.json({ success: true, data: { updates, testing: true } })
    } catch (error) {
      next(error)
    }
  }
)

router.post(
  '/projects/:projectId/updates',
  requireContractor,
  requireTesting,
  async (req, res, next) => {
    try {
      const db = await connectToDatabase()
      const project = await db
        .collection('contractor_projects')
        .findOne({ projectId: req.params.projectId })
      // Only the isolated evidence collection is available to the verification pipeline.
      const isolated = {
        collection(name) {
          if (name !== 'work_updates') throw new Error('Invalid testing collection')
          return db.collection('test_work_updates')
        },
      }
      const testSite = buildTestingSite(project)
      const checked = await verifyEvidence(isolated, testSite.project, req.body || {})
      if (checked.geoVerification)
        checked.geoVerification = {
          ...checked.geoVerification,
          simulated: true,
          referenceType: 'synthetic_testing_reference',
          summary: `TEST ONLY: GPS compared with a synthetic sandbox reference${Number.isFinite(checked.geoVerification.distanceMetres) ? ` (${checked.geoVerification.distanceMetres} m away)` : ''}. This does not verify the actual worksite.`,
        }
      const update = {
        ...checked,
        updateId: `test-${crypto.randomUUID()}`,
        projectId: project.projectId,
        contractorId: req.contractor.contractorId,
        testing: true,
        simulatedGps: true,
        testSiteReference: testSite.reference,
        mediaType: 'image',
        mediaName: String(req.body.mediaName || '').slice(0, 160),
        progressPercent: Number(req.body.progressPercent),
        latitude: Number(req.body.latitude),
        longitude: Number(req.body.longitude),
        gpsAccuracy: Number(req.body.gpsAccuracy),
        gpsCapturedAt: new Date(req.body.gpsCapturedAt),
        clientCaptureTime: req.body.clientCaptureTime,
        serverUploadTime: new Date(),
        remarks: String(req.body.remarks || '').slice(0, 600),
        reviewLanguage:
          'TEST ONLY. Simulated GPS and sample evidence are not real field verification.',
      }
      await db.collection('test_work_updates').insertOne(update)
      const timeline = await db
        .collection('test_work_updates')
        .find({ projectId: project.projectId, contractorId: req.contractor.contractorId })
        .sort({ serverUploadTime: -1 })
        .limit(8)
        .toArray()
      res.status(201).json({
        success: true,
        data: {
          update,
          testing: true,
          verification: {
            score: checked.overallVerificationScore,
            status: checked.verificationStatus,
            geoVerification: checked.geoVerification,
            imageVerification: checked.imageVerification,
            duplicateCheck: checked.duplicateCheck,
            progressVerification: checked.progressVerification,
          },
          timeline,
        },
      })
    } catch (error) {
      next(error)
    }
  }
)
module.exports = router
