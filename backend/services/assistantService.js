const { connectToDatabase } = require('../utils/database')
const { analyzeWorks } = require('./ai/riskEngine')

const MAX_QUESTION_LENGTH = 1000
const MAX_PAGE_CONTEXT_LENGTH = 9000
const GEMINI_TIMEOUT_MS = 12000

const compactCurrency = value =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(Number(value || 0))

const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractKeywords = question =>
  String(question || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 4)
    .slice(0, 8)

const buildWorkSearchQuery = question => {
  const keywords = extractKeywords(question)
  if (!keywords.length) return {}

  const regexes = keywords.map(word => new RegExp(escapeRegex(word), 'i'))
  return {
    $or: regexes.flatMap(regex => [
      { workDescription: regex },
      { work_name: regex },
      { constituency: regex },
      { state: regex },
      { district: regex },
      { mpName: regex },
      { workCategory: regex },
    ]),
  }
}

const getRiskSnapshot = async db => {
  const [completedWorks, recommendedWorks] = await Promise.all([
    db.collection('works_completed').find({}).limit(200).toArray(),
    db.collection('works_recommended').find({}).limit(800).toArray(),
  ])

  const sampledWorkIds = [
    ...new Set(
      [...completedWorks, ...recommendedWorks]
        .map(work => work.workId || work.work_id)
        .filter(workId => workId !== undefined && workId !== null)
        .map(workId => String(workId))
    ),
  ]

  const sampledWorkIdValues = [
    ...sampledWorkIds,
    ...sampledWorkIds.map(workId => Number(workId)).filter(Number.isFinite),
  ]

  const expenditures = sampledWorkIdValues.length
    ? await db
        .collection('expenditures')
        .find({
          paymentStatus: 'Payment Success',
          workId: { $in: sampledWorkIdValues },
        })
        .project({ workId: 1, expenditureAmount: 1 })
        .toArray()
    : []

  const expenditureMap = {}
  expenditures.forEach(exp => {
    if (exp.workId === undefined || exp.workId === null) return
    const key = String(exp.workId)
    expenditureMap[key] = (expenditureMap[key] || 0) + Number(exp.expenditureAmount || 0)
  })

  const works = [
    ...completedWorks.map(work => ({
      ...work,
      source: 'completed',
      work_name: work.workDescription || work.work_name || work.name || 'Completed Work',
      allocated_amount:
        Number(work.finalAmount) || Number(work.sanctionedAmount) || Number(work.amount) || 0,
      status: work.status || 'Completed',
    })),
    ...recommendedWorks.map(work => ({
      ...work,
      source: 'recommended',
      work_name: work.workDescription || work.work_name || work.name || 'Recommended Work',
      allocated_amount:
        Number(work.recommendedAmount) ||
        Number(work.sanctionedAmount) ||
        Number(work.amount) ||
        0,
      status: work.status || 'Recommended',
    })),
  ].map(work => {
    const workId = work.workId || work.work_id
    const expenditure = expenditureMap[String(workId)] || 0
    return { ...work, totalPaid: expenditure, expenditure }
  })

  const analysis = analyzeWorks(works)
  return {
    totalWorks: analysis.totalWorks,
    highRiskCount: analysis.highRiskCount,
    mediumRiskCount: analysis.mediumRiskCount,
    lowRiskCount: analysis.lowRiskCount,
    topHighRiskProjects: analysis.highRiskProjects.slice(0, 5),
  }
}

const normalizeSlugText = value =>
  String(value || '')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .pop()
    ?.replace(/-/g, ' ')
    .replace(/\b\d{2,}\b/g, '')
    .trim()

const getRouteContext = async (db, route = '') => {
  const routeText = String(route || '')
  const routeSubject = normalizeSlugText(routeText)
  if (!routeSubject) return null

  if (routeText.includes('/mps/')) {
    const terms = routeSubject
      .split(/\s+/)
      .filter(word => word.length >= 3)
      .slice(0, 6)
    const regexes = terms.map(word => new RegExp(escapeRegex(word), 'i'))

    return db
      .collection('summaries')
      .findOne({
        type: 'mp_summary',
        $or: regexes.flatMap(regex => [
          { mpName: regex },
          { constituency: regex },
          { state: regex },
        ]),
      })
  }

  if (routeText.includes('/states/')) {
    return db.collection('summaries').findOne({
      type: 'state_summary',
      state: new RegExp(escapeRegex(routeSubject), 'i'),
    })
  }

  return null
}

const getAssistantContext = async (question, route) => {
  const db = await connectToDatabase()
  const workQuery = buildWorkSearchQuery(question)

  const [overviewAgg, topStates, topMPs, matchedCompleted, matchedRecommended, riskSnapshot, routeContext] =
    await Promise.all([
      db
        .collection('summaries')
        .aggregate([
          { $match: { type: 'mp_summary' } },
          {
            $group: {
              _id: null,
              totalAllocated: {
                $sum: { $ifNull: ['$allocatedAmount', { $ifNull: ['$totalAllocated', 0] }] },
              },
              totalExpenditure: { $sum: { $ifNull: ['$totalExpenditure', 0] } },
              totalMPs: { $sum: 1 },
              completedWorks: { $sum: { $ifNull: ['$completedWorksCount', 0] } },
              recommendedWorks: { $sum: { $ifNull: ['$recommendedWorksCount', 0] } },
            },
          },
        ])
        .toArray(),
      db
        .collection('summaries')
        .find({ type: 'state_summary' })
        .sort({ utilizationPercentage: -1 })
        .limit(5)
        .project({
          state: 1,
          totalAllocated: 1,
          totalExpenditure: 1,
          utilizationPercentage: 1,
          mpCount: 1,
        })
        .toArray(),
      db
        .collection('summaries')
        .find({ type: 'mp_summary' })
        .sort({ utilizationPercentage: -1 })
        .limit(5)
        .project({
          mpName: 1,
          constituency: 1,
          state: 1,
          allocatedAmount: 1,
          totalExpenditure: 1,
          utilizationPercentage: 1,
          completedWorksCount: 1,
          recommendedWorksCount: 1,
        })
        .toArray(),
      db
        .collection('works_completed')
        .find(workQuery)
        .limit(5)
        .project({
          workDescription: 1,
          constituency: 1,
          state: 1,
          district: 1,
          workCategory: 1,
          finalAmount: 1,
          mpName: 1,
          status: 1,
        })
        .toArray(),
      db
        .collection('works_recommended')
        .find(workQuery)
        .limit(5)
        .project({
          workDescription: 1,
          constituency: 1,
          state: 1,
          district: 1,
          workCategory: 1,
          recommendedAmount: 1,
          mpName: 1,
          status: 1,
        })
        .toArray(),
      getRiskSnapshot(db),
      getRouteContext(db, route),
    ])

  const overview = overviewAgg[0] || {}
  const utilization =
    overview.totalAllocated > 0 ? (overview.totalExpenditure / overview.totalAllocated) * 100 : 0

  return {
    overview: {
      totalAllocated: overview.totalAllocated || 0,
      totalExpenditure: overview.totalExpenditure || 0,
      utilizationPercentage: Number(utilization.toFixed(2)),
      totalMPs: overview.totalMPs || 0,
      completedWorks: overview.completedWorks || 0,
      recommendedWorks: overview.recommendedWorks || 0,
    },
    topStates,
    topMPs,
    matchedWorks: [...matchedCompleted, ...matchedRecommended].slice(0, 8),
    riskSnapshot,
    routeContext,
    generatedAt: new Date().toISOString(),
  }
}

const getFirstMatch = (text, pattern) => {
  const match = String(text || '').match(pattern)
  return match?.[1]?.trim() || null
}

const cleanPageLines = pageContext =>
  String(pageContext || '')
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line && !/^home\s*\/|^ask ai$/i.test(line))
    .slice(0, 60)

const buildPageContextAnswer = (question, context) => {
  const route = String(context.activeRoute || '')
  const pageContext = String(context.pageContext || '')
  const lines = cleanPageLines(pageContext)
  const squashed = pageContext.replace(/\s+/g, ' ')

  if (/payment details|payment summary|payment timeline/i.test(pageContext)) {
    const work =
      lines.find(line => line.length > 18 && !/payment|work information|active modal|mp:|constituency:|work id:/i.test(line)) ||
      'the selected work'
    const mp = getFirstMatch(squashed, /MP:\s*([A-Za-z0-9().,\s-]+?)(?:\s+Constituency:|\s+Work ID:|$)/i)
    const constituency = getFirstMatch(squashed, /Constituency:\s*([A-Za-z0-9().,\s-]+?)(?:\s+Work ID:|$)/i)
    const workId = getFirstMatch(squashed, /Work ID:\s*([0-9A-Za-z-]+)/i)
    const installments = getFirstMatch(squashed, /Total Installments\s*([0-9]+)/i)
    const paid = getFirstMatch(squashed, /Total Amount Paid\s*([₹Rs0-9.,\sLKCr]+)/i)
    const successful = getFirstMatch(squashed, /Successful Payments\s*([0-9]+)/i)
    const timeline = lines.filter(line => /payment success|payment pending|failed|[0-9]{4}/i.test(line)).slice(0, 3)

    return [
      `This Payment Details modal is showing fund release history for **${work}**.`,
      mp || constituency || workId
        ? `- Project context: ${[mp ? `MP ${mp}` : null, constituency ? `constituency ${constituency}` : null, workId ? `work ID ${workId}` : null].filter(Boolean).join(', ')}.`
        : '- Project context is partially visible in the modal.',
      `- Payment summary: ${installments || 'visible'} installment(s), ${paid ? `${paid} paid` : 'paid amount visible in the card'}, and ${successful || 'recorded'} successful payment(s).`,
      timeline.length
        ? `- Recent payment timeline: ${timeline.join('; ')}.`
        : '- The timeline shows payment events and their recorded status.',
      'What it means: this screen is useful for checking whether money has actually moved for the selected work, not just whether the work was recommended. For audit, compare this with completion status and field evidence.',
    ].join('\n')
  }

  if (route.includes('compare') || /compare/i.test(question)) {
    const selectedCount = getFirstMatch(squashed, /MPs Selected\s*([0-9]+)/i)
    const avgUtilization = getFirstMatch(squashed, /Average Utilization\s*([0-9.]+%)/i)
    const nationalAverage = getFirstMatch(squashed, /National Average\s*([0-9.]+%)/i)
    const highestUtilization = getFirstMatch(
      squashed,
      /Highest Utilization\s*([A-Za-z0-9().,\s-]+?)\s*([0-9.]+%)/i
    )
    const tableRows = lines.filter(line => line.includes('|') && /%|₹|works/i.test(line)).slice(1, 5)

    return [
      `This is a constituency/MP comparison screen with ${selectedCount || 'the selected'} representatives side by side.`,
      avgUtilization
        ? `- Average utilization on this comparison is ${avgUtilization}${nationalAverage ? `, against a national average of ${nationalAverage}` : ''}.`
        : '- The page is comparing allocation, spending, utilization, completed works, recommended works, and completion rate.',
      highestUtilization
        ? `- The strongest visible utilization signal is ${highestUtilization}.`
        : '- Use utilization to see fund absorption, and completion rate to see execution quality.',
      tableRows.length
        ? `Visible comparison rows:\n${tableRows.map(row => `- ${row}`).join('\n')}`
        : '- The visible table gives the clearest winner/lag indicator by metric.',
      'In short: this page is useful for spotting who is spending funds efficiently, who is completing works, and whether high utilization is backed by actual project completion.',
    ].join('\n')
  }

  if (route.includes('mps')) {
    const title = lines.find(line => /mp|constituency|lok sabha|rajya sabha/i.test(line)) || 'this MP'
    return [
      `This page is focused on ${title}.`,
      '- I would first look at allocation vs expenditure to understand fund absorption.',
      '- Then check completed vs recommended works to see whether money spent is translating into finished projects.',
      '- If risk, contractor, or weather cards are visible, use those as field-verification signals rather than final proof.',
    ].join('\n')
  }

  if (route.includes('map')) {
    return [
      'This map view is for geospatial monitoring of MPLADS works.',
      '- Marker color shows risk level, and popups expose the selected project details.',
      '- The side panel ranks constituencies by risk density.',
      '- If exact GPS is missing, the platform should treat the pin as constituency-level context, not exact worksite proof.',
    ].join('\n')
  }

  return [
    'I am reading the current screen first. The main things visible here are:',
    ...lines.slice(0, 8).map(line => `- ${line}`),
    'Ask me about one metric, row, MP, state, or project and I will narrow the explanation.',
  ].join('\n')
}

const buildDeterministicAnswer = (question, context) => {
  const q = String(question).toLowerCase()
  const { overview, riskSnapshot, topStates, topMPs, matchedWorks, pageContext, routeContext } = context
  const lines = []

  if (pageContext && (q.includes('this') || q.includes('page') || q.includes('comparison') || q.includes('compare'))) {
    return buildPageContextAnswer(question, context)
  } else if (routeContext && (q.includes('this') || q.includes('mp') || q.includes('state'))) {
    lines.push('Current page subject from the route:')
    lines.push(JSON.stringify(routeContext, null, 2).slice(0, 1200))
  } else if (q.includes('risk') || q.includes('high') || q.includes('danger')) {
    lines.push(
      `I analysed ${riskSnapshot.totalWorks} works in the current risk set. ${riskSnapshot.highRiskCount} are high risk, ${riskSnapshot.mediumRiskCount} are medium risk, and ${riskSnapshot.lowRiskCount} are low risk.`
    )
    if (riskSnapshot.topHighRiskProjects.length) {
      lines.push('Top high-risk signals:')
      riskSnapshot.topHighRiskProjects.forEach((project, index) => {
        lines.push(
          `${index + 1}. ${project.name} in ${project.constituency || 'unknown constituency'} - score ${project.riskScore}. Reasons: ${(project.reasons || []).join('; ') || 'not specified'}.`
        )
      })
    }
  } else if (q.includes('fund') || q.includes('spent') || q.includes('expenditure')) {
    lines.push(
      `Across the available MPLADS summary data, allocation is ${compactCurrency(overview.totalAllocated)} and expenditure is ${compactCurrency(overview.totalExpenditure)}, giving roughly ${overview.utilizationPercentage}% utilization.`
    )
    lines.push(
      'For release control, use milestone-gated funding: survey verification, work execution, midline evidence, then closure audit.'
    )
  } else if (q.includes('state') || q.includes('best') || q.includes('top')) {
    lines.push('Top utilization states in the current summary:')
    topStates.forEach((state, index) => {
      lines.push(
        `${index + 1}. ${state.state}: ${(state.utilizationPercentage || 0).toFixed(1)}% utilization, ${compactCurrency(state.totalExpenditure)} spent.`
      )
    })
  } else if (q.includes('mp') || q.includes('contractor')) {
    lines.push('Top MP utilization signals:')
    topMPs.forEach((mp, index) => {
      lines.push(
        `${index + 1}. ${mp.mpName || 'Unknown MP'} (${mp.constituency || 'unknown'}): ${(mp.utilizationPercentage || 0).toFixed(1)}% utilization, ${mp.completedWorksCount || 0}/${mp.recommendedWorksCount || 0} works completed.`
      )
    })
    lines.push(
      'Contractor rating is shown on MP detail pages when DB quality/agency fields are available; otherwise it is derived from completion and utilization as a temporary signal.'
    )
  } else if (matchedWorks.length) {
    lines.push('I found these matching works:')
    matchedWorks.slice(0, 5).forEach((work, index) => {
      lines.push(
        `${index + 1}. ${work.workDescription || 'Unnamed work'} - ${work.constituency || 'unknown'}, ${work.state || 'unknown'} (${compactCurrency(work.finalAmount || work.recommendedAmount || 0)}).`
      )
    })
  } else {
    lines.push(
      `Current MPLADS snapshot: ${overview.totalMPs} MP records, ${compactCurrency(overview.totalAllocated)} allocated, ${compactCurrency(overview.totalExpenditure)} spent, and ${overview.utilizationPercentage}% utilization.`
    )
    lines.push(
      'You can ask about high-risk works, state performance, MP utilization, fund release milestones, weather risk, or project search.'
    )
  }

  return lines.join('\n')
}

const askGemini = async ({ question, context }) => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  const model = String(process.env.GEMINI_MODEL || 'gemini-3.6-flash').replace(/^models\//, '')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are an MPLADS civic intelligence assistant embedded inside the web app.

Answer from the active page first, then use database context only as supporting context.
If the user says "this", "this MP", "this state", "this comparison", or "on this page", prioritize pageContext and routeContext.
Do not give a generic national overview unless the active page context is missing or the user asks nationally.
Explain what the visible comparison/table/cards mean in plain language and mention the specific names/metrics visible in context.
If data is missing, say exactly what is missing.
Be concise and useful.
Do not use Markdown tables. Use short paragraphs and bullets because the answer appears in a compact chat widget.

Context JSON:
${JSON.stringify(context).slice(0, 18000)}

Question: ${question}`,
                },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) return null
    const payload = await response.json()
    return payload?.candidates?.[0]?.content?.parts?.[0]?.text || null
  } finally {
    clearTimeout(timeout)
  }
}

const answerQuestion = async ({ question, route, pageContext }) => {
  const normalizedQuestion = String(question || '').trim().slice(0, MAX_QUESTION_LENGTH)
  const normalizedPageContext = String(pageContext || '').trim().slice(0, MAX_PAGE_CONTEXT_LENGTH)
  if (!normalizedQuestion) {
    const error = new Error('Question is required')
    error.statusCode = 400
    throw error
  }

  const context = await getAssistantContext(normalizedQuestion, route)
  context.pageContext = normalizedPageContext
  context.activeRoute = route || null
  const llmAnswer = await askGemini({ question: normalizedQuestion, context }).catch(() => null)
  const answer = llmAnswer || buildDeterministicAnswer(normalizedQuestion, context)

  return {
    answer,
    mode: llmAnswer ? 'gemini-grounded' : 'data-grounded',
    route: route || null,
    context,
    suggestions: [
      'Explain this page',
      'Explain this comparison',
      'What should I notice here?',
      'Which projects are highest risk?',
    ],
  }
}

module.exports = {
  answerQuestion,
}
