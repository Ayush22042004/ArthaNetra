const express = require('express')
const router = express.Router()

const { connectToDatabase } = require('../utils/database')
const { cacheMiddleware } = require('../middleware/cache')
const { analyzeWorks } = require('../services/ai/riskEngine')

router.get('/risk-analysis', cacheMiddleware(30 * 60), async (req, res, next) => {
  try {
    console.log('\n========== AI RISK ANALYSIS ==========')

    // Get native MongoDB database
    const db = await connectToDatabase()

    console.log('Connected database:', db.databaseName)

    // List ALL collections
    const collections = await db.listCollections().toArray()

    console.log(
      'Available collections:',
      collections.map(c => c.name)
    )

    // Check counts
    const completedCount = await db
      .collection('works_completed')
      .countDocuments()

    const recommendedCount = await db
      .collection('works_recommended')
      .countDocuments()

    const expenditureCount = await db
      .collection('expenditures')
      .countDocuments()

    console.log('works_completed count:', completedCount)
    console.log('works_recommended count:', recommendedCount)
    console.log('expenditures count:', expenditureCount)

    // Fetch works
    const [completedWorks, recommendedWorks] = await Promise.all([
      db.collection('works_completed')
        .find({})
        .limit(500)
        .toArray(),

      db.collection('works_recommended')
        .find({})
        .limit(500)
        .toArray(),
    ])

    console.log('Fetched completed works:', completedWorks.length)
    console.log('Fetched recommended works:', recommendedWorks.length)

    // Combine works
    const allWorks = [
      ...completedWorks.map(work => ({
        ...work,

        source: 'completed',

        work_name:
          work.workDescription ||
          work.work_name ||
          work.name ||
          'Completed Work',

        allocated_amount:
          Number(work.finalAmount) ||
          Number(work.sanctionedAmount) ||
          Number(work.amount) ||
          0,

        status:
          work.status ||
          'Completed',
      })),

      ...recommendedWorks.map(work => ({
        ...work,

        source: 'recommended',

        work_name:
          work.workDescription ||
          work.work_name ||
          work.name ||
          'Recommended Work',

        allocated_amount:
          Number(work.recommendedAmount) ||
          Number(work.sanctionedAmount) ||
          Number(work.amount) ||
          0,

        status:
          work.status ||
          'Recommended',
      })),
    ]

    if (allWorks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No works found for risk analysis',

        debug: {
          database: db.databaseName,

          collections: collections.map(c => c.name),

          works_completed: completedCount,

          works_recommended: recommendedCount,

          expenditures: expenditureCount,
        },
      })
    }

    const analyzedWorkIds = [
      ...new Set(
        allWorks
          .map(work => work.workId || work.work_id)
          .filter(workId => workId !== undefined && workId !== null)
          .map(workId => String(workId))
      ),
    ]
    const analyzedWorkIdValues = [
      ...analyzedWorkIds,
      ...analyzedWorkIds.map(workId => Number(workId)).filter(Number.isFinite),
    ]

    // Fetch only payments for the sampled works instead of scanning all expenditure records.
    const expenditures = await db
      .collection('expenditures')
      .find({
        paymentStatus: 'Payment Success',
        workId: {
          $in: analyzedWorkIdValues,
        },
      })
      .toArray()

    console.log(
      'Successful expenditure records:',
      expenditures.length
    )

    // Build expenditure map
    const expenditureMap = {}

    expenditures.forEach(exp => {
      if (
        exp.workId === undefined ||
        exp.workId === null
      ) {
        return
      }

      const key = String(exp.workId)

      expenditureMap[key] =
        (expenditureMap[key] || 0) +
        Number(exp.expenditureAmount || 0)
    })

    // Attach expenditure to work
    const worksForAnalysis = allWorks.map(work => {
      const workId =
        work.workId ||
        work.work_id

      const expenditure =
        expenditureMap[String(workId)] || 0

      return {
        ...work,

        totalPaid: expenditure,

        expenditure,
      }
    })

    // Run AI Risk Engine
    const analysis = analyzeWorks(worksForAnalysis)

    console.log('Analysis complete')
    console.log('Total works:', analysis.totalWorks)
    console.log('High risk:', analysis.highRiskCount)
    console.log('Medium risk:', analysis.mediumRiskCount)
    console.log('Low risk:', analysis.lowRiskCount)

    res.json({
      success: true,

      message:
        'AI risk analysis completed successfully',

      data: analysis,

      metadata: {
        database: db.databaseName,

        completedWorks:
          completedWorks.length,

        recommendedWorks:
          recommendedWorks.length,

        totalWorksAnalyzed:
          worksForAnalysis.length,

        totalExpenditureRecords:
          expenditures.length,
      },

      lastUpdated:
        new Date().toISOString(),
    })

  } catch (error) {
    console.error(
      'AI Risk Analysis Error:',
      error
    )

    next(error)
  }
})

module.exports = router
