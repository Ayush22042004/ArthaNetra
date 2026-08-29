/**
 * MPLADS AI Risk Analysis Engine
 */

function calculateRisk(work) {
  let riskScore = 0
  const reasons = []

  // Amount allocated/sanctioned for the work
  const allocated = Number(
    work.finalAmount ||
    work.recommendedAmount ||
    work.sanctioned_amount ||
    work.allocated_amount ||
    work.amount ||
    0
  )

  // Total money actually spent
  const expenditure = Number(
    work.totalPaid ||
    work.expenditure ||
    work.expended_amount ||
    work.total_expenditure ||
    0
  )

  const status = String(
    work.status ||
    work.work_status ||
    ''
  ).toLowerCase()

  // -------------------------
  // 1. STATUS RISK
  // -------------------------

  const isCompleted = status.includes('completed') || status.includes('complete')
  const isRecommended = status.includes('recommended')
  const isPending = status.includes('pending') || status.includes('not started')
  const isInProgress = status.includes('progress') || status.includes('ongoing')

  if (isRecommended) {
    riskScore += 30
    reasons.push('Work is recommended and awaiting execution evidence')
  } else if (isPending) {
    riskScore += 35
    reasons.push('Work is pending or not yet started')
  } else if (isInProgress) {
    riskScore += 25
    reasons.push('Work is still in progress')
  }

  // -------------------------
  // 2. FUND UTILIZATION RISK
  // -------------------------

  let utilization = 0

  if (allocated > 0) {
    utilization = (expenditure / allocated) * 100

    if (expenditure === 0 && !isCompleted) {
      riskScore += isRecommended ? 25 : 30
      reasons.push('No expenditure recorded against the sanctioned amount')
    } else if (expenditure === 0 && isCompleted) {
      riskScore += 35
      reasons.push('Completion is recorded but payment linkage is unavailable')
    } 
    else if (utilization < 25) {
      riskScore += isCompleted ? 35 : 25
      reasons.push(
        isCompleted
          ? 'Completed work has very low linked fund utilization'
          : 'Very low fund utilization'
      )
    } 
    else if (utilization < 50) {
      riskScore += isCompleted ? 25 : 15
      reasons.push(
        isCompleted ? 'Completed work has low linked fund utilization' : 'Low fund utilization'
      )
    }

    // High spending but incomplete project
    if (
      utilization > 80 &&
      !isCompleted
    ) {
      riskScore += 20
      reasons.push('High expenditure but project is incomplete')
    }

    // Overspending
    if (utilization > 100) {
      riskScore += 30
      reasons.push('Expenditure exceeds allocated amount')
    }
  } else {
    reasons.push('Allocated amount unavailable')
  }

  // -------------------------
  // FINAL SCORE
  // -------------------------

  riskScore = Math.min(riskScore, 100)

  let riskLevel = 'LOW'

  const amountIsMaterial = allocated >= 500000
  const amountIsHighValue = allocated >= 750000
  const hasExecutionSignal = expenditure > 0 || utilization > 0 || isInProgress || isCompleted

  if (isRecommended && !hasExecutionSignal && amountIsHighValue) {
    riskScore += 20
    reasons.push('High-value work has no execution or payment signal yet')
  } else if (isRecommended && !hasExecutionSignal && amountIsMaterial) {
    riskScore += 10
    reasons.push('Material-value work has no execution or payment signal yet')
  }

  riskScore = Math.min(riskScore, 100)

  if (riskScore >= 70) {
    riskLevel = 'HIGH'
  } 
  else if (riskScore >= 35) {
    riskLevel = 'MEDIUM'
  }

  return {
    riskScore,
    riskLevel,
    utilization: Number(utilization.toFixed(2)),
    allocated,
    expenditure,
    reasons,
  }
}


function analyzeWorks(works) {
  const normalizeImages = work => {
    const candidates = [
      work.images,
      work.imageUrls,
      work.photos,
      work.before_photos,
      work.after_photos,
      work.site_photos,
      work.evidence,
    ]

    return candidates
      .flatMap(value => {
        if (!value) return []
        if (Array.isArray(value)) return value
        if (typeof value === 'object') return Object.values(value).flat()
        return [value]
      })
      .filter(value => typeof value === 'string' && value.trim())
  }

  const pickField = (work, fields, fallback = undefined) => {
    for (const field of fields) {
      if (work[field] !== undefined && work[field] !== null && work[field] !== '') {
        return work[field]
      }
    }
    return fallback
  }

  const toResult = item => ({
    workId: item.work.workId || item.work.work_id || item.work._id,

    name:
      item.work.workDescription ||
      item.work.work_name ||
      item.work.name ||
      'Unnamed Project',

    category: pickField(item.work, ['workCategory', 'category', 'work_type'], 'Uncategorised'),
    constituency: pickField(item.work, ['constituency', 'constituencyName', 'mpConstituency']),
    district: pickField(item.work, ['district', 'districtName']),
    state: pickField(item.work, ['state', 'stateName']),
    status: pickField(item.work, ['status', 'work_status', 'workStatus']),
    contractor: pickField(item.work, [
      'contractor',
      'contractorName',
      'agency',
      'implementingAgency',
      'executingAgency',
    ]),
    qualityRating: Number(pickField(item.work, ['quality_rating', 'qualityRating'], 0)) || 0,
    latitude: Number(pickField(item.work, ['latitude', 'lat'], NaN)),
    longitude: Number(pickField(item.work, ['longitude', 'lng', 'lon'], NaN)),
    images: normalizeImages(item.work),

    ...item.analysis,
  })

  const results = works.map(work => ({
    work,
    analysis: calculateRisk(work),
  }))

  const highRisk = results.filter(
    item => item.analysis.riskLevel === 'HIGH'
  )

  const mediumRisk = results.filter(
    item => item.analysis.riskLevel === 'MEDIUM'
  )

  const lowRisk = results.filter(
    item => item.analysis.riskLevel === 'LOW'
  )

  return {
    totalWorks: works.length,

    highRiskCount: highRisk.length,
    mediumRiskCount: mediumRisk.length,
    lowRiskCount: lowRisk.length,

    highRiskProjects: highRisk
      .slice(0, 10)
      .map(toResult),

    results: results.map(toResult),
  }
}


module.exports = {
  calculateRisk,
  analyzeWorks,
}
