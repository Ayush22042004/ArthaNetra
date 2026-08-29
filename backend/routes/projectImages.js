const express = require('express')
const router = express.Router()

const { fetchProjectImages } = require('../services/projectImageClient')
const { secureLogger } = require('../utils/logger')

router.get('/', async (req, res) => {
  try {
    const data = await fetchProjectImages(req.query.query)

    res.json({
      success: true,
      data,
      message: data.items.length
        ? 'Project context images loaded successfully'
        : data.message || 'No project images found',
    })
  } catch (error) {
    secureLogger.warn('Project image lookup failed', {
      statusCode: error.statusCode,
      message: error.message,
    })

    res.json({
      success: true,
      data: {
        items: [],
        source: 'Pexels',
        message: 'Project image service is temporarily unavailable',
      },
      message: 'Project image service is temporarily unavailable',
    })
  }
})

module.exports = router
