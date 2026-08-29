const express = require('express')
const router = express.Router()

const { fetchWeatherForecast } = require('../services/weatherClient')

router.get('/forecast', async (req, res, next) => {
  try {
    const data = await fetchWeatherForecast({
      lat: req.query.lat,
      lng: req.query.lng,
      label: req.query.label,
    })

    res.json({
      success: true,
      data,
      message: 'Weather forecast signal generated successfully',
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
