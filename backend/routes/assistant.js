const express = require('express')
const router = express.Router()

const { answerQuestion } = require('../services/assistantService')

router.post('/chat', async (req, res, next) => {
  try {
    const data = await answerQuestion({
      question: req.body?.question,
      route: req.body?.route,
      pageContext: req.body?.pageContext,
    })

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
