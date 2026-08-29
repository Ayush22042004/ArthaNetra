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

  if (
    status.includes('pending') ||
    status.includes('not started') ||
    status.includes('recommended')
  ) {
    riskScore += 40
    reasons.push('Work is pending or not yet started')
  } 
  else if (
    status.includes('progress') ||
    status.includes('ongoing')
  ) {
    riskScore += 25
    reasons.push('Work is still in progress')
  }

  // -------------------------
  // 2. FUND UTILIZATION RISK
  // -------------------------

  let utilization = 0

  if (allocated > 0) {
    utilization = (expenditure / allocated) * 100

    if (expenditure === 0) {
      riskScore += 30
      reasons.push('No expenditure recorded')
    } 
    else if (utilization < 25) {
      riskScore += 25
      reasons.push('Very low fund utilization')
    } 
    else if (utilization < 50) {
      riskScore += 15
      reasons.push('Low fund utilization')
    }

    // High spending but incomplete project
    if (
      utilization > 80 &&
      !status.includes('completed')
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

  if (riskScore >= 70) {
    riskLevel = 'HIGH'
  } 
  else if (riskScore >= 40) {
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
