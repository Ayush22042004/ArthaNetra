const express = require('express')
const router = express.Router()

const summaryRoutes = require('./summary')
const analyticsRoutes = require('./analytics')
const worksRoutes = require('./works')
const expendituresRoutes = require('./expenditures')
const mpsRoutes = require('./mps')
const mpladsRoutes = require('./mplads')
const feedbackRoutes = require('./feedback')
const exportRoutes = require('./export')
const authRoutes = require('./auth')
const healthRoutes = require('./health')
const filtersRoutes = require('./filters')
const metadataRoutes = require('./metadata')
const mailingListRoutes = require('./mailingList')
const aiRoutes = require('./ai')
const weatherRoutes = require('./weather')
const assistantRoutes = require('./assistant')
const projectImageRoutes = require('./projectImages')

router.get('/', (req, res) => {
  res.json({
    message: 'ArthaNetra API',
    status: 'ok',
    endpoints: [
      '/api/summary/overview',
      '/api/mplads/search',
      '/api/works/completed',
      '/api/works/recommended',
      '/api/ai/risk-analysis',
      '/api/weather/forecast?lat=28.61&lng=77.20',
      '/api/project-images?query=road%20construction',
      '/api/assistant/chat',
    ],
  })
})

// Mount routes
router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/summary', summaryRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/works', worksRoutes)
router.use('/expenditures', expendituresRoutes)
router.use('/mplads/mps', mpsRoutes)
router.use('/mplads', mpladsRoutes)
router.use('/feedback', feedbackRoutes)
router.use('/export', exportRoutes)
router.use('/filters', filtersRoutes)
router.use('/metadata', metadataRoutes)
router.use('/mailing-list', mailingListRoutes)
router.use('/ai', aiRoutes)
router.use('/weather', weatherRoutes)
router.use('/project-images', projectImageRoutes)
router.use('/assistant', assistantRoutes)

module.exports = router
