const express = require('express')
const crypto = require('crypto')
const { connectToDatabase } = require('../utils/database')

const router = express.Router()

const verificationWeights = {
  geo: 0.35,
  image: 0.3,
  duplicate: 0.2,
  progress: 0.15,
}

const contractorsSeed = [
  {
    contractorId: 'abc-infra',
    companyName: 'ABC Infra Works',
    registrationNumber: 'MH-RD-2041',
    district: 'Mumbai Suburban',
    specializations: ['Roads', 'Drainage', 'Urban works'],
    projectsCompleted: 42,
    activeProjects: 4,
    onTimeCompletionRate: 94,
    averageCostOverrun: 3.2,
    verifiedEvidenceRate: 96,
    workQuality: 91,
    complianceScore: 98,
    anomalyRate: 6,
    demoHistoricalData: true,
  },
  {
    contractorId: 'dakshin-build',
    companyName: 'Dakshin Buildcon',
    registrationNumber: 'KA-CIV-3188',
    district: 'Dharwad',
    specializations: ['Community halls', 'Education', 'Concrete works'],
    projectsCompleted: 31,
    activeProjects: 3,
    onTimeCompletionRate: 88,
    averageCostOverrun: 5.8,
    verifiedEvidenceRate: 91,
    workQuality: 86,
    complianceScore: 94,
    anomalyRate: 11,
    demoHistoricalData: true,
  },
  {
    contractorId: 'eastern-civic',
    companyName: 'Eastern Civic Projects',
    registrationNumber: 'WB-INF-1092',
    district: 'Kolkata',
    specializations: ['School infrastructure', 'Water supply', 'Public buildings'],
    projectsCompleted: 55,
    activeProjects: 5,
    onTimeCompletionRate: 82,
    averageCostOverrun: 7.4,
    verifiedEvidenceRate: 87,
    workQuality: 84,
    complianceScore: 90,
    anomalyRate: 14,
    demoHistoricalData: true,
  },
  {
    contractorId: 'narmada-civil',
    companyName: 'Narmada Civil Services',
    registrationNumber: 'GJ-CIV-7720',
    district: 'Vadodara',
    specializations: ['Roads', 'Rural assets', 'Water works'],
    projectsCompleted: 27,
    activeProjects: 2,
    onTimeCompletionRate: 78,
    averageCostOverrun: 9.1,
    verifiedEvidenceRate: 81,
    workQuality: 79,
    complianceScore: 88,
    anomalyRate: 19,
    demoHistoricalData: true,
  },
  {
    contractorId: 'uttar-path',
    companyName: 'Uttar Path Engineering',
    registrationNumber: 'UP-RD-5548',
    district: 'Lucknow',
    specializations: ['Roads', 'Anganwadi buildings', 'Public works'],
    projectsCompleted: 36,
    activeProjects: 4,
    onTimeCompletionRate: 91,
    averageCostOverrun: 4.6,
    verifiedEvidenceRate: 93,
    workQuality: 88,
    complianceScore: 96,
    anomalyRate: 8,
    demoHistoricalData: true,
  },
]

const demoContractorCredentials = {
  'field@abcinfra.in': { password: 'field123', contractorId: 'abc-infra' },
  'site@dakshinbuild.in': { password: 'field123', contractorId: 'dakshin-build' },
  'ops@easterncivic.in': { password: 'field123', contractorId: 'eastern-civic' },
  'field@narmadacivil.in': { password: 'field123', contractorId: 'narmada-civil' },
  'site@uttarpath.in': { password: 'field123', contractorId: 'uttar-path' },
}

const projectsSeed = [
  {
    projectId: 'field-road-ward-5',
    contractorId: 'abc-infra',
    title: 'Construction of Road - Ward 5',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    category: 'Roads',
    amount: 25000000,
    registeredLatitude: 19.076,
    registeredLongitude: 72.8777,
    progressPercent: 46,
    expectedProgress: 50,
    riskLevel: 'Medium',
    deadline: '2026-10-20',
    lastUpdateAt: null,
  },
  {
    projectId: 'thane-drainage-upgrade',
    contractorId: 'abc-infra',
    title: 'Storm Water Drainage Upgrade',
    district: 'Thane',
    state: 'Maharashtra',
    category: 'Drainage',
    amount: 18000000,
    registeredLatitude: 19.2183,
    registeredLongitude: 72.9781,
    progressPercent: 72,
    expectedProgress: 70,
    riskLevel: 'Low',
    deadline: '2026-09-30',
    lastUpdateAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
  },
  {
    projectId: 'panvel-link-road',
    contractorId: 'abc-infra',
    title: 'Panvel Link Road Resurfacing',
    district: 'Raigad',
    state: 'Maharashtra',
    category: 'Roads',
    amount: 32000000,
    registeredLatitude: 18.9894,
    registeredLongitude: 73.1175,
    progressPercent: 28,
    expectedProgress: 42,
    riskLevel: 'High',
    deadline: '2026-10-05',
    lastUpdateAt: new Date(Date.now() - 54 * 60 * 60 * 1000),
  },
  {
    projectId: 'dharwad-classroom-block',
    contractorId: 'dakshin-build',
    title: 'College Room Construction at Nulvi',
    district: 'Dharwad',
    state: 'Karnataka',
    category: 'Education',
    amount: 500000,
    registeredLatitude: 15.4589,
    registeredLongitude: 75.0078,
    progressPercent: 0,
    expectedProgress: 15,
    riskLevel: 'High',
    deadline: '2026-11-12',
    lastUpdateAt: null,
  },
  {
    projectId: 'kolkata-water-kiosk',
    contractorId: 'eastern-civic',
    title: 'Public Drinking Water Kiosk Network',
    district: 'Kolkata',
    state: 'West Bengal',
    category: 'Water supply',
    amount: 9400000,
    registeredLatitude: 22.5726,
    registeredLongitude: 88.3639,
    progressPercent: 64,
    expectedProgress: 66,
    riskLevel: 'Medium',
    deadline: '2026-10-02',
    lastUpdateAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
  },
  {
    projectId: 'lucknow-anganwadi',
    contractorId: 'uttar-path',
    title: 'Anganwadi Building and Access Path',
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    category: 'Public buildings',
    amount: 7600000,
    registeredLatitude: 26.8467,
    registeredLongitude: 80.9462,
    progressPercent: 38,
    expectedProgress: 44,
    riskLevel: 'Medium',
    deadline: '2026-10-18',
    lastUpdateAt: new Date(Date.now() - 34 * 60 * 60 * 1000),
  },
  {
    projectId: 'vadodara-water-lines',
    contractorId: 'narmada-civil',
    title: 'Rural Drinking Water Pipeline Extension',
    district: 'Vadodara',
    state: 'Gujarat',
    category: 'Water supply',
    amount: 12600000,
    registeredLatitude: 22.3072,
    registeredLongitude: 73.1812,
    progressPercent: 41,
    expectedProgress: 47,
    riskLevel: 'Medium',
    deadline: '2026-10-14',
    lastUpdateAt: new Date(Date.now() - 19 * 60 * 60 * 1000),
  },
  {
    projectId: 'nagpur-community-hall',
    contractorId: 'dakshin-build',
    title: 'Community Hall Repair and Accessibility Works',
    district: 'Nagpur',
    state: 'Maharashtra',
    category: 'Public buildings',
    amount: 6400000,
    registeredLatitude: 21.1458,
    registeredLongitude: 79.0882,
    progressPercent: 83,
    expectedProgress: 81,
    riskLevel: 'Low',
    deadline: '2026-09-24',
    lastUpdateAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
  },
  {
    projectId: 'patna-school-lab',
    contractorId: 'eastern-civic',
    title: 'School Science Lab Civil Upgrade',
    district: 'Patna',
    state: 'Bihar',
    category: 'Education',
    amount: 8800000,
    registeredLatitude: 25.5941,
    registeredLongitude: 85.1376,
    progressPercent: 22,
    expectedProgress: 39,
    riskLevel: 'High',
    deadline: '2026-10-27',
    lastUpdateAt: null,
  },
  {
    projectId: 'jaipur-rural-road',
    contractorId: 'uttar-path',
    title: 'Rural Road Shoulder Strengthening',
    district: 'Jaipur',
    state: 'Rajasthan',
    category: 'Roads',
    amount: 21500000,
    registeredLatitude: 26.9124,
    registeredLongitude: 75.7873,
    progressPercent: 53,
    expectedProgress: 57,
    riskLevel: 'Medium',
    deadline: '2026-10-11',
    lastUpdateAt: new Date(Date.now() - 28 * 60 * 60 * 1000),
  },
  {
    projectId: 'guwahati-drain-cover',
    contractorId: 'eastern-civic',
    title: 'Drain Cover and Footpath Safety Works',
    district: 'Guwahati',
    state: 'Assam',
    category: 'Drainage',
    amount: 11200000,
    registeredLatitude: 26.1445,
    registeredLongitude: 91.7362,
    progressPercent: 34,
    expectedProgress: 45,
    riskLevel: 'Medium',
    deadline: '2026-10-19',
    lastUpdateAt: new Date(Date.now() - 43 * 60 * 60 * 1000),
  },
  {
    projectId: 'bhopal-health-centre',
    contractorId: 'narmada-civil',
    title: 'Primary Health Centre Waiting Area',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    category: 'Public buildings',
    amount: 9800000,
    registeredLatitude: 23.2599,
    registeredLongitude: 77.4126,
    progressPercent: 67,
    expectedProgress: 62,
    riskLevel: 'Low',
    deadline: '2026-09-29',
    lastUpdateAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    projectId: 'chennai-school-roof',
    contractorId: 'dakshin-build',
    title: 'Government School Roof Replacement',
    district: 'Chennai',
    state: 'Tamil Nadu',
    category: 'Education',
    amount: 14300000,
    registeredLatitude: 13.0827,
    registeredLongitude: 80.2707,
    progressPercent: 58,
    expectedProgress: 63,
    riskLevel: 'Medium',
    deadline: '2026-10-08',
    lastUpdateAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
  },
  {
    projectId: 'amritsar-road-lights',
    contractorId: 'abc-infra',
    title: 'Road Safety Lighting and Resurfacing',
    district: 'Amritsar',
    state: 'Punjab',
    category: 'Roads',
    amount: 17400000,
    registeredLatitude: 31.634,
    registeredLongitude: 74.8723,
    progressPercent: 17,
    expectedProgress: 33,
    riskLevel: 'High',
    deadline: '2026-10-31',
    lastUpdateAt: null,
  },
  {
    projectId: 'ranchi-water-tank',
    contractorId: 'narmada-civil',
    title: 'Community Water Tank Foundation',
    district: 'Ranchi',
    state: 'Jharkhand',
    category: 'Water supply',
    amount: 7900000,
    registeredLatitude: 23.3441,
    registeredLongitude: 85.3096,
    progressPercent: 76,
    expectedProgress: 73,
    riskLevel: 'Low',
    deadline: '2026-09-26',
    lastUpdateAt: new Date(Date.now() - 11 * 60 * 60 * 1000),
  },
]

const sampleImages = {
  Roads: [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=85',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=85',
  ],
  Drainage: ['https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1200&q=85'],
  Education: ['https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=85'],
  'Water supply': ['https://images.unsplash.com/photo-1538300342682-cf57afb97285?w=1200&q=85'],
  'Public buildings': ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=85'],
}

const stateCoordinates = {
  Maharashtra: [19.7515, 75.7139],
  Karnataka: [15.3173, 75.7139],
  'West Bengal': [22.9868, 87.855],
  'Uttar Pradesh': [26.8467, 80.9462],
  Gujarat: [22.2587, 71.1924],
  Rajasthan: [27.0238, 74.2179],
  Bihar: [25.0961, 85.3131],
  Assam: [26.2006, 92.9376],
  'Tamil Nadu': [11.1271, 78.6569],
  'Madhya Pradesh': [22.9734, 78.6569],
  Jharkhand: [23.6102, 85.2799],
  Punjab: [31.1471, 75.3412],
  Kerala: [10.8505, 76.2711],
  Haryana: [29.0588, 76.0856],
  Delhi: [28.6139, 77.209],
}

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0))

const stableHash = value =>
  crypto.createHash('sha1').update(String(value || '')).digest().readUInt32BE(0)

const slugify = value =>
  String(value || 'work')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'work'

const pickText = (record, fields, fallback = '') => {
  for (const field of fields) {
    if (record?.[field] !== undefined && record[field] !== null && String(record[field]).trim()) {
      return String(record[field]).trim()
    }
  }
  return fallback
}

const pickNumber = (record, fields, fallback = 0) => {
  for (const field of fields) {
    const value = Number(record?.[field])
    if (Number.isFinite(value) && value > 0) return value
  }
  return fallback
}

const inferCategory = text => {
  const value = String(text || '').toLowerCase()
  if (/(road|cc road|paver|bridge|culvert|path|street)/.test(value)) return 'Roads'
  if (/(drain|sewer|storm water|nala)/.test(value)) return 'Drainage'
  if (/(school|class|college|library|education|lab)/.test(value)) return 'Education'
  if (/(water|tank|pipeline|drinking|kiosk|well)/.test(value)) return 'Water supply'
  if (/(hall|building|anganwadi|community|centre|center|toilet)/.test(value)) return 'Public buildings'
  return 'Public works'
}

const coordinateForWork = work => {
  const explicitLat = Number(work.latitude || work.lat || work.workLatitude)
  const explicitLng = Number(work.longitude || work.lng || work.workLongitude)
  if (Number.isFinite(explicitLat) && Number.isFinite(explicitLng) && explicitLat !== 0 && explicitLng !== 0) {
    return { lat: explicitLat, lng: explicitLng, source: 'official_work_coordinate' }
  }

  const state = pickText(work, ['state', 'STATE'])
  const base = stateCoordinates[state] || [22.9734, 78.6569]
  const hash = stableHash(`${work.workId || work.work_id || work._id}-${state}`)
  const latOffset = ((hash % 900) - 450) / 10000
  const lngOffset = (((hash >> 10) % 900) - 450) / 10000
  return {
    lat: Number((base[0] + latOffset).toFixed(6)),
    lng: Number((base[1] + lngOffset).toFixed(6)),
    source: 'state_centroid_fallback_not_official_site_gps',
  }
}

const contractorForWork = (work, category) => {
  const text = `${category} ${pickText(work, ['state', 'constituency', 'district'])}`.toLowerCase()
  if (text.includes('karnataka') || text.includes('tamil') || text.includes('education')) return 'dakshin-build'
  if (text.includes('west bengal') || text.includes('bihar') || text.includes('assam')) return 'eastern-civic'
  if (text.includes('gujarat') || text.includes('madhya') || text.includes('jharkhand') || text.includes('water')) return 'narmada-civil'
  if (text.includes('uttar') || text.includes('rajasthan') || text.includes('punjab')) return 'uttar-path'
  return 'abc-infra'
}

const normalizeMpladsWorkToProject = (work, index, status) => {
  const workId = work.workId || work.work_id || work.WORK_RECOMMENDATION_DTL_ID || String(work._id)
  const title = pickText(
    work,
    ['workDescription', 'work_description', 'name', 'title', 'activityName', 'workName'],
    `MPLADS Work ${workId}`
  )
  const category = inferCategory(`${title} ${pickText(work, ['workCategory', 'category'])}`)
  const amount = pickNumber(work, ['recommendedAmount', 'finalAmount', 'estimated_cost', 'cost'], 500000)
  const progressBase = status === 'Completed' ? 100 : Math.max(5, Math.min(76, 18 + ((stableHash(workId) + index * 7) % 58)))
  const expectedProgress = status === 'Completed' ? 100 : Math.min(95, progressBase + 8 + (index % 18))
  const riskLevel =
    status === 'Completed'
      ? 'Low'
      : amount >= 2500000 && progressBase < expectedProgress - 12
        ? 'High'
        : index % 3 === 0
          ? 'Medium'
          : 'Low'
  const coordinates = coordinateForWork(work)

  return {
    projectId: `mplads-${status.toLowerCase()}-${slugify(workId)}`,
    contractorId: contractorForWork(work, category),
    title,
    district: pickText(work, ['constituency', 'district'], 'Constituency not recorded'),
    state: pickText(work, ['state'], 'State not recorded'),
    category,
    amount,
    registeredLatitude: coordinates.lat,
    registeredLongitude: coordinates.lng,
    coordinateSource: coordinates.source,
    progressPercent: progressBase,
    expectedProgress,
    riskLevel,
    deadline: new Date(Date.now() + (20 + (index % 60)) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    lastUpdateAt: status === 'Completed' ? new Date(Date.now() - (index + 3) * 60 * 60 * 1000) : null,
    latestVerificationStatus: status === 'Completed' ? 'VERIFIED' : 'PENDING',
    source: 'official_mplads_work',
    sourceCollection: status === 'Completed' ? 'works_completed' : 'works_recommended',
    sourceWorkId: workId,
    mpName: pickText(work, ['mpName', 'mp_name']),
    house: pickText(work, ['house']),
    lsTerm: work.lsTerm || work.ls_term || null,
  }
}

const haversineMetres = (lat1, lon1, lat2, lon2) => {
  const toRad = degree => (degree * Math.PI) / 180
  const earthRadius = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const evidenceFingerprint = value =>
  crypto.createHash('sha256').update(String(value || '').trim().toLowerCase()).digest('hex')

const calculateQualityScore = contractor => {
  const costAdherence = clamp(100 - (contractor.averageCostOverrun || 0) * 5)
  const lowAnomalyRate = clamp(100 - (contractor.anomalyRate || 0) * 4)
  const components = {
    onTimeCompletion: clamp(contractor.onTimeCompletionRate),
    costAdherence,
    verifiedUpdates: clamp(contractor.verifiedEvidenceRate),
    workQuality: clamp(contractor.workQuality),
    compliance: clamp(contractor.complianceScore),
    lowAnomalyRate,
  }

  const score = Math.round(
    components.onTimeCompletion * 0.25 +
      components.costAdherence * 0.2 +
      components.verifiedUpdates * 0.2 +
      components.workQuality * 0.15 +
      components.compliance * 0.1 +
      components.lowAnomalyRate * 0.1
  )

  return { score, components }
}

const hasRelevantSpecialization = (contractor, project) => {
  const category = String(project.category || '').toLowerCase()
  const title = String(project.title || '').toLowerCase()
  return (contractor.specializations || []).some(item => {
    const specialization = String(item || '').toLowerCase()
    return (
      specialization.includes(category) ||
      category.includes(specialization) ||
      title.includes(specialization.split(' ')[0])
    )
  })
}

const calculateContractorMatch = (contractor, project) => {
  const quality = calculateQualityScore(contractor)
  const relevantExperience = hasRelevantSpecialization(contractor, project) ? 96 : 68
  const districtExperience =
    String(contractor.district || '').toLowerCase() === String(project.district || '').toLowerCase()
      ? 94
      : String(project.state || '').toLowerCase().includes('maharashtra') &&
          String(contractor.district || '').toLowerCase().includes('mumbai')
        ? 84
        : 72
  const costDiscipline = clamp(100 - (contractor.averageCostOverrun || 0) * 5)
  const verifiedEvidence = clamp(contractor.verifiedEvidenceRate)

  const score = Math.round(
    relevantExperience * 0.28 +
      districtExperience * 0.18 +
      quality.score * 0.24 +
      clamp(contractor.onTimeCompletionRate) * 0.16 +
      costDiscipline * 0.08 +
      verifiedEvidence * 0.06
  )

  const reasons = [
    hasRelevantSpecialization(contractor, project)
      ? `Relevant specialization for ${project.category}.`
      : `Lower direct specialization match for ${project.category}.`,
    districtExperience >= 90
      ? `Direct district experience in ${project.district}.`
      : `Regional fit based on nearby or comparable work history.`,
    `${contractor.onTimeCompletionRate}% on-time completion history.`,
    `${contractor.verifiedEvidenceRate}% verified evidence rate from monitored updates.`,
  ]

  return {
    contractorId: contractor.contractorId,
    companyName: contractor.companyName,
    registrationNumber: contractor.registrationNumber,
    district: contractor.district,
    specializations: contractor.specializations || [],
    qualityCredit: quality.score,
    matchScore: clamp(score),
    components: {
      relevantExperience,
      districtExperience,
      qualityCredit: quality.score,
      onTimePerformance: clamp(contractor.onTimeCompletionRate),
      costDiscipline,
      verifiedEvidence,
    },
    reasons,
    governanceNote:
      'Decision support only. Final selection remains subject to procurement, tender, eligibility, and government rules.',
  }
}

const deriveProjectExecutionStatus = (project, latestUpdate) => {
  const hoursSinceUpdate = latestUpdate?.serverUploadTime
    ? (Date.now() - new Date(latestUpdate.serverUploadTime).getTime()) / (60 * 60 * 1000)
    : Infinity
  const progressGap = clamp(project.expectedProgress) - clamp(project.progressPercent)
  const latestStatus = latestUpdate?.verificationStatus || project.latestVerificationStatus

  if (
    latestUpdate?.geoVerification?.status === 'LOCATION_MISMATCH' ||
    latestStatus === 'SUSPICIOUS' ||
    progressGap > 18
  ) {
    return {
      status: 'RED',
      label: 'Serious review signal',
      reason: 'Location mismatch, suspicious evidence, or major schedule lag.',
    }
  }

  if (!latestUpdate || latestStatus === 'REVIEW_REQUIRED' || hoursSinceUpdate > 36 || progressGap > 8) {
    return {
      status: 'YELLOW',
      label: 'Review required',
      reason: 'Evidence is missing, stale, under review, or progress is behind plan.',
    }
  }

  return {
    status: 'GREEN',
    label: 'Healthy',
    reason: 'Recent verified evidence and progress are within expected range.',
  }
}

const getVerificationStatus = score => {
  if (score >= 80) return 'VERIFIED'
  if (score >= 60) return 'REVIEW_REQUIRED'
  return 'SUSPICIOUS'
}

const verifyGeo = (project, body) => {
  const hasSubmittedCoordinates =
    body.latitude !== undefined &&
    body.longitude !== undefined &&
    body.latitude !== '' &&
    body.longitude !== ''
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  const accuracy = Number(body.gpsAccuracy || body.accuracy || 0)

  if (!hasSubmittedCoordinates || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      status: 'REVIEW_REQUIRED',
      score: 45,
      distanceMetres: null,
      accuracyMetres: accuracy || null,
      summary: 'GPS was not captured with this update.',
    }
  }

  const distance = haversineMetres(
    Number(project.registeredLatitude),
    Number(project.registeredLongitude),
    latitude,
    longitude
  )
  const accuracyPenalty = accuracy > 100 ? 10 : accuracy > 50 ? 5 : 0
  let status = 'VERIFIED'
  let score = 100 - accuracyPenalty

  if (distance > 1000) {
    status = 'LOCATION_MISMATCH'
    score = 20
  } else if (distance > 250) {
    status = 'REVIEW_REQUIRED'
    score = 65 - accuracyPenalty
  } else if (distance > 100) {
    score = 88 - accuracyPenalty
  }

  return {
    status,
    score: clamp(score),
    distanceMetres: Math.round(distance),
    accuracyMetres: accuracy || null,
    summary:
      status === 'VERIFIED'
        ? 'Submitted GPS is within the site verification radius.'
        : 'Submitted GPS needs manual review against the registered site.',
  }
}

const verifyImage = (project, photoUrl = '') => {
  const text = `${photoUrl} ${project.title} ${project.category}`.toLowerCase()
  const categoryKeywords = {
    roads: ['road', 'asphalt', 'paving', 'street', 'highway', 'construction'],
    drainage: ['drain', 'pipe', 'storm', 'water', 'construction'],
    education: ['school', 'college', 'classroom', 'building', 'construction'],
    'water supply': ['water', 'pipe', 'kiosk', 'pump', 'tank'],
    'public buildings': ['building', 'hall', 'community', 'construction'],
  }
  const keywords = categoryKeywords[String(project.category || '').toLowerCase()] || [
    'construction',
    'site',
    'work',
  ]
  const matches = keywords.filter(keyword => text.includes(keyword)).length
  const score = clamp(58 + matches * 11 + (photoUrl ? 12 : 0))

  return {
    status: score >= 75 ? 'PROJECT_MATCH' : 'REVIEW_REQUIRED',
    score,
    detectedWorkType: project.category,
    detectedStage:
      project.progressPercent > 70
        ? 'Finishing and closure stage'
        : project.progressPercent > 35
          ? 'Execution stage visible'
          : 'Early work stage',
    confidence: score,
    summary:
      score >= 75
        ? 'Evidence context broadly matches the assigned work type.'
        : 'Evidence should be reviewed because the project context is weak.',
    issues: score >= 75 ? [] : ['Low category match confidence'],
  }
}

const verifyProgress = (project, submittedProgress) => {
  const progress = clamp(submittedProgress)
  const previous = clamp(project.progressPercent)
  const jump = progress - previous
  const lag = clamp(project.expectedProgress) - progress
  let score = 90
  const issues = []

  if (jump < 0) {
    score = 45
    issues.push('Progress moved backwards from the last update')
  } else if (jump > 25) {
    score = 62
    issues.push('Large one-day progress jump needs review')
  }

  if (lag > 20) {
    score -= 15
    issues.push('Progress is materially behind expected progress')
  }

  return {
    status: score >= 80 ? 'PLAUSIBLE' : 'REVIEW_REQUIRED',
    score: clamp(score),
    previousProgress: previous,
    submittedProgress: progress,
    expectedProgress: clamp(project.expectedProgress),
    issues,
  }
}

const ensureDemoData = async db => {
  const contractors = db.collection('contractors')
  const projects = db.collection('contractor_projects')
  const updates = db.collection('work_updates')

  await Promise.all([
    contractors.createIndex({ contractorId: 1 }, { unique: true }),
    projects.createIndex({ projectId: 1 }, { unique: true }),
    updates.createIndex({ projectId: 1, serverUploadTime: -1 }),
    updates.createIndex({ contractorId: 1, serverUploadTime: -1 }),
    updates.createIndex({ projectId: 1, evidenceFingerprint: 1 }),
  ])

  await Promise.all(
    contractorsSeed.map(contractor =>
      contractors.updateOne(
        { contractorId: contractor.contractorId },
        { $setOnInsert: { ...contractor, createdAt: new Date() } },
        { upsert: true }
      )
    )
  )

  await Promise.all(
    projectsSeed.map(project =>
      projects.updateOne(
        { projectId: project.projectId },
        { $setOnInsert: { ...project, createdAt: new Date(), latestVerificationStatus: 'PENDING' } },
        { upsert: true }
      )
    )
  )

  const realProjectCount = await projects.countDocuments({ source: 'official_mplads_work' })
  if (realProjectCount < 20) {
    const [recommendedWorks, completedWorks] = await Promise.all([
      db
        .collection('works_recommended')
        .find({
          state: { $nin: [null, ''] },
          workDescription: { $nin: [null, ''] },
          recommendedAmount: { $gt: 0 },
        })
        .sort({ recommendedAmount: -1 })
        .limit(24)
        .toArray(),
      db
        .collection('works_completed')
        .find({
          state: { $nin: [null, ''] },
          workDescription: { $nin: [null, ''] },
          finalAmount: { $gt: 0 },
        })
        .sort({ completedDate: -1 })
        .limit(12)
        .toArray(),
    ])

    const realMpladsProjects = [
      ...recommendedWorks.map((work, index) => normalizeMpladsWorkToProject(work, index, 'Recommended')),
      ...completedWorks.map((work, index) => normalizeMpladsWorkToProject(work, index, 'Completed')),
    ]

    await Promise.all(
      realMpladsProjects.map(project =>
        projects.updateOne(
          { projectId: project.projectId },
          {
            $setOnInsert: {
              ...project,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        )
      )
    )
  }

  const existingUpdate = await updates.findOne({ seededDemo: true })
  if (!existingUpdate) {
    const firstProject = projectsSeed[1]
    const fingerprint = evidenceFingerprint(sampleImages.Drainage[0])
    await updates.insertOne({
      updateId: `upd-${Date.now()}-seed`,
      projectId: firstProject.projectId,
      contractorId: firstProject.contractorId,
      photoUrl: sampleImages.Drainage[0],
      latitude: firstProject.registeredLatitude + 0.0004,
      longitude: firstProject.registeredLongitude + 0.0003,
      gpsAccuracy: 18,
      progressPercent: firstProject.progressPercent,
      remarks: 'Drainage excavation and pipe alignment verified on site.',
      clientCaptureTime: new Date(Date.now() - 7 * 60 * 60 * 1000),
      serverUploadTime: new Date(Date.now() - 7 * 60 * 60 * 1000),
      evidenceFingerprint: fingerprint,
      geoVerification: { status: 'VERIFIED', score: 96, distanceMetres: 55 },
      imageVerification: { status: 'PROJECT_MATCH', score: 86, confidence: 86 },
      duplicateCheck: { status: 'UNIQUE', score: 100, duplicateDetected: false },
      progressVerification: { status: 'PLAUSIBLE', score: 90 },
      overallVerificationScore: 92,
      verificationStatus: 'VERIFIED',
      seededDemo: true,
    })
  }

  const now = Date.now()
  const seededEvidence = [
    {
      projectId: 'nagpur-community-hall',
      contractorId: 'dakshin-build',
      photoUrl: sampleImages['Public buildings'][0],
      latitudeOffset: 0.00025,
      longitudeOffset: 0.0002,
      progressPercent: 84,
      hoursAgo: 6,
      status: 'VERIFIED',
      score: 91,
      geoStatus: 'VERIFIED',
      duplicate: false,
      remarks: 'Accessibility ramp shuttering and wall repair verified at the community hall.',
    },
    {
      projectId: 'bhopal-health-centre',
      contractorId: 'narmada-civil',
      photoUrl: sampleImages['Public buildings'][0],
      latitudeOffset: 0.00018,
      longitudeOffset: 0.00018,
      progressPercent: 68,
      hoursAgo: 4,
      status: 'VERIFIED',
      score: 89,
      geoStatus: 'VERIFIED',
      duplicate: false,
      remarks: 'Waiting area masonry and roof beam work verified at the health centre.',
    },
    {
      projectId: 'ranchi-water-tank',
      contractorId: 'narmada-civil',
      photoUrl: sampleImages['Water supply'][0],
      latitudeOffset: 0.00022,
      longitudeOffset: 0.00014,
      progressPercent: 77,
      hoursAgo: 9,
      status: 'VERIFIED',
      score: 90,
      geoStatus: 'VERIFIED',
      duplicate: false,
      remarks: 'Water tank foundation curing and reinforcement checks submitted.',
    },
    {
      projectId: 'kolkata-water-kiosk',
      contractorId: 'eastern-civic',
      photoUrl: sampleImages['Water supply'][0],
      latitudeOffset: 0.0035,
      longitudeOffset: 0.0029,
      progressPercent: 65,
      hoursAgo: 18,
      status: 'REVIEW_REQUIRED',
      score: 68,
      geoStatus: 'REVIEW_REQUIRED',
      duplicate: true,
      remarks: 'Evidence requires review because the submitted asset resembles an earlier field update.',
    },
    {
      projectId: 'panvel-link-road',
      contractorId: 'abc-infra',
      photoUrl: sampleImages.Roads[1],
      latitudeOffset: 0.064,
      longitudeOffset: 0.056,
      progressPercent: 29,
      hoursAgo: 14,
      status: 'SUSPICIOUS',
      score: 48,
      geoStatus: 'LOCATION_MISMATCH',
      duplicate: false,
      remarks: 'Submitted GPS is far from registered road alignment and needs field officer review.',
    },
  ]

  await Promise.all(
    seededEvidence.map(item => {
      const project = projectsSeed.find(candidate => candidate.projectId === item.projectId)
      if (!project) return null
      const serverUploadTime = new Date(now - item.hoursAgo * 60 * 60 * 1000)
      const distanceMetres =
        item.geoStatus === 'LOCATION_MISMATCH'
          ? 7200
          : item.geoStatus === 'REVIEW_REQUIRED'
            ? 520
            : 46
      const fingerprint = evidenceFingerprint(item.photoUrl)

      return updates.updateOne(
        { updateId: `seed-${item.projectId}` },
        {
          $setOnInsert: {
            updateId: `seed-${item.projectId}`,
            projectId: item.projectId,
            contractorId: item.contractorId,
            photoUrl: item.photoUrl,
            latitude: project.registeredLatitude + item.latitudeOffset,
            longitude: project.registeredLongitude + item.longitudeOffset,
            gpsAccuracy: 21,
            progressPercent: item.progressPercent,
            remarks: item.remarks,
            clientCaptureTime: serverUploadTime,
            serverUploadTime,
            evidenceFingerprint: fingerprint,
            geoVerification: {
              status: item.geoStatus,
              score: item.geoStatus === 'VERIFIED' ? 96 : item.geoStatus === 'REVIEW_REQUIRED' ? 64 : 20,
              distanceMetres,
            },
            imageVerification: { status: 'PROJECT_MATCH', score: 86, confidence: 86 },
            duplicateCheck: {
              status: item.duplicate ? 'REVIEW_REQUIRED' : 'UNIQUE',
              score: item.duplicate ? 35 : 100,
              duplicateDetected: item.duplicate,
              similarity: item.duplicate ? 96 : 0,
            },
            progressVerification: { status: 'PLAUSIBLE', score: 88 },
            overallVerificationScore: item.score,
            verificationStatus: item.status,
            seededDemo: true,
          },
        },
        { upsert: true }
      )
    })
  )
}

const withDemoData = async () => {
  const db = await connectToDatabase()
  await ensureDemoData(db)
  return db
}

router.get('/demo-accounts', async (req, res, next) => {
  try {
    const db = await withDemoData()
    const contractors = await db.collection('contractors').find({}).toArray()
    const contractorMap = new Map(contractors.map(contractor => [contractor.contractorId, contractor]))
    const accounts = Object.entries(demoContractorCredentials).map(([email, config]) => {
      const contractor = contractorMap.get(config.contractorId)
      return {
        email,
        passwordHint: 'field123',
        contractorId: config.contractorId,
        companyName: contractor?.companyName || config.contractorId,
        district: contractor?.district || '',
      }
    })

    res.json({ success: true, data: accounts })
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const db = await withDemoData()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    const credentials = demoContractorCredentials[email]

    if (!credentials || credentials.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid contractor credentials',
      })
    }

    const contractor = await db.collection('contractors').findOne({ contractorId: credentials.contractorId })
    if (!contractor) {
      return res.status(404).json({ success: false, error: 'Contractor profile not found' })
    }

    const token = crypto
      .createHash('sha256')
      .update(`${email}:${credentials.contractorId}:${new Date().toISOString().slice(0, 10)}`)
      .digest('hex')

    const quality = calculateQualityScore(contractor)
    res.json({
      success: true,
      data: {
        token,
        role: 'CONTRACTOR',
        contractor: {
          ...contractor,
          email,
          qualityCredit: quality.score,
          scoreComponents: quality.components,
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/dashboard', async (req, res, next) => {
  try {
    const contractorId = req.query.contractorId || 'abc-infra'
    const db = await withDemoData()
    const contractor = await db.collection('contractors').findOne({ contractorId })
    if (!contractor) return res.status(404).json({ success: false, error: 'Contractor not found' })

    const projects = await db
      .collection('contractor_projects')
      .find({ contractorId })
      .sort({ source: -1, riskLevel: 1, amount: -1 })
      .toArray()
    const updates = await db
      .collection('work_updates')
      .find({ contractorId })
      .sort({ serverUploadTime: -1 })
      .limit(12)
      .toArray()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const updatesToday = updates.filter(update => new Date(update.serverUploadTime) >= startOfDay)
    const updatesDueToday = projects.filter(project => {
      if (project.progressPercent >= 100) return false
      if (!project.lastUpdateAt) return true
      return new Date(project.lastUpdateAt) < startOfDay
    }).length
    const quality = calculateQualityScore(contractor)

    res.json({
      success: true,
      data: {
        contractor: { ...contractor, qualityCredit: quality.score, scoreComponents: quality.components },
        metrics: {
          assignedProjects: projects.length,
          activeProjects: projects.filter(project => project.progressPercent < 100).length,
          updatesDueToday,
          verifiedUpdates: updates.filter(update => update.verificationStatus === 'VERIFIED').length,
          updatesToday: updatesToday.length,
          qualityCredit: quality.score,
        },
        projects,
        latestUpdates: updates,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/projects', async (req, res, next) => {
  try {
    const contractorId = req.query.contractorId
    const db = await withDemoData()
    const query = contractorId ? { contractorId } : {}
    const projects = await db.collection('contractor_projects').find(query).sort({ riskLevel: 1 }).toArray()
    res.json({ success: true, data: projects })
  } catch (error) {
    next(error)
  }
})

router.get('/leaderboard', async (req, res, next) => {
  try {
    const db = await withDemoData()
    const district = req.query.district
    const specialization = req.query.specialization
    const query = {}

    if (district) query.district = new RegExp(String(district), 'i')
    if (specialization) query.specializations = new RegExp(String(specialization), 'i')

    const contractors = await db.collection('contractors').find(query).toArray()
    const rows = contractors
      .map(contractor => {
        const quality = calculateQualityScore(contractor)
        return {
          ...contractor,
          qualityCredit: quality.score,
          scoreComponents: quality.components,
          riskRecord: clamp(100 - (contractor.anomalyRate || 0) * 4),
        }
      })
      .sort((a, b) => b.qualityCredit - a.qualityCredit)
      .map((contractor, index) => ({ ...contractor, rank: index + 1 }))

    res.json({ success: true, data: rows })
  } catch (error) {
    next(error)
  }
})

router.get('/map-projects', async (req, res, next) => {
  try {
    const db = await withDemoData()
    const projects = await db.collection('contractor_projects').find({}).toArray()
    const contractors = await db.collection('contractors').find({}).toArray()
    const contractorMap = new Map(contractors.map(contractor => [contractor.contractorId, contractor]))

    const latestUpdates = await Promise.all(
      projects.map(project =>
        db
          .collection('work_updates')
          .findOne({ projectId: project.projectId }, { sort: { serverUploadTime: -1 } })
      )
    )

    const items = projects.map((project, index) => {
      const latestUpdate = latestUpdates[index]
      const contractor = contractorMap.get(project.contractorId)
      const quality = contractor ? calculateQualityScore(contractor) : { score: null }
      const execution = deriveProjectExecutionStatus(project, latestUpdate)

      return {
        projectId: project.projectId,
        title: project.title,
        contractorId: project.contractorId,
        contractorName: contractor?.companyName || 'Unassigned',
        district: project.district,
        state: project.state,
        category: project.category,
        progressPercent: project.progressPercent,
        expectedProgress: project.expectedProgress,
        riskLevel: project.riskLevel,
        latitude: project.registeredLatitude,
        longitude: project.registeredLongitude,
        lastUpdateAt: latestUpdate?.serverUploadTime || project.lastUpdateAt,
        latestPhotoUrl: latestUpdate?.photoUrl || project.latestPhotoUrl,
        latestVerificationScore:
          latestUpdate?.overallVerificationScore || project.latestVerificationScore || null,
        latestVerificationStatus:
          latestUpdate?.verificationStatus || project.latestVerificationStatus || 'PENDING',
        contractorQualityCredit: quality.score,
        source: project.source || 'demo_execution_layer',
        sourceCollection: project.sourceCollection,
        sourceWorkId: project.sourceWorkId,
        coordinateSource: project.coordinateSource,
        mpName: project.mpName,
        mapStatus: execution.status,
        mapStatusLabel: execution.label,
        mapStatusReason: execution.reason,
      }
    })

    res.json({
      success: true,
      data: {
        projects: items,
        counts: items.reduce(
          (acc, item) => {
            acc.total += 1
            acc[item.mapStatus.toLowerCase()] += 1
            return acc
          },
          { total: 0, green: 0, yellow: 0, red: 0 }
        ),
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/field-monitoring', async (req, res, next) => {
  try {
    const db = await withDemoData()
    const updates = await db.collection('work_updates').find({}).sort({ serverUploadTime: -1 }).limit(30).toArray()
    const projects = await db.collection('contractor_projects').find({}).toArray()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    res.json({
      success: true,
      data: {
        projectsTracked: projects.length,
        projectsUpdatedToday: updates.filter(update => new Date(update.serverUploadTime) >= startOfDay).length,
        verifiedEvidenceToday: updates.filter(
          update =>
            update.verificationStatus === 'VERIFIED' && new Date(update.serverUploadTime) >= startOfDay
        ).length,
        requiringReview: updates.filter(update => update.verificationStatus !== 'VERIFIED').length,
        locationMismatches: updates.filter(
          update => update.geoVerification?.status === 'LOCATION_MISMATCH'
        ).length,
        possibleReusedPhotos: updates.filter(update => update.duplicateCheck?.duplicateDetected).length,
        latestUpdates: updates,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/source-coverage', async (req, res, next) => {
  try {
    const db = await withDemoData()
    const projects = await db.collection('contractor_projects').find({}).toArray()
    const updates = await db.collection('work_updates').find({}).toArray()

    const officialProjects = projects.filter(project => project.source === 'official_mplads_work')
    const exactCoordinateProjects = projects.filter(
      project => project.coordinateSource === 'official_or_record_coordinate'
    )
    const fallbackCoordinateProjects = projects.filter(
      project => project.coordinateSource === 'state_centroid_fallback_not_official_site_gps'
    )
    const imageEvidence = updates.filter(
      update => update.mediaType === 'image' || String(update.photoUrl || '').startsWith('data:image')
    )
    const videoEvidence = updates.filter(update => update.mediaType === 'video')
    const gpsVerifiedUpdates = updates.filter(update => update.geoVerification?.status === 'VERIFIED')
    const reviewUpdates = updates.filter(update => update.verificationStatus !== 'VERIFIED')

    res.json({
      success: true,
      data: {
        officialMpladsProjects: officialProjects.length,
        demoExecutionProjects: projects.length - officialProjects.length,
        totalContractorProjects: projects.length,
        sourceCollections: {
          worksRecommended: officialProjects.filter(project => project.sourceCollection === 'works_recommended')
            .length,
          worksCompleted: officialProjects.filter(project => project.sourceCollection === 'works_completed').length,
        },
        coordinates: {
          exactOrRecordCoordinates: exactCoordinateProjects.length,
          stateCentroidFallback: fallbackCoordinateProjects.length,
          note:
            'MPLADS public records usually do not expose exact contractor worksite GPS, so fallback coordinates are visibly marked in the UI.',
        },
        evidence: {
          totalUpdates: updates.length,
          gpsVerifiedUpdates: gpsVerifiedUpdates.length,
          reviewRequiredUpdates: reviewUpdates.length,
          imageEvidence: imageEvidence.length,
          videoEvidence: videoEvidence.length,
          duplicateEvidenceFlags: updates.filter(update => update.duplicateCheck?.duplicateDetected).length,
        },
        officialDataBoundary:
          'Projects, works, MP/state context, amounts, recommendations, completions, and expenditures come from MPLADS MongoDB collections. Contractor accounts and performance history are demo entities because MPLADS public data does not publish contractor logins, daily photos, or contractor score histories.',
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/projects/:projectId/shortlist', async (req, res, next) => {
  try {
    const db = await withDemoData()
    const project = await db.collection('contractor_projects').findOne({ projectId: req.params.projectId })
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' })

    const contractors = await db.collection('contractors').find({}).toArray()
    const shortlist = contractors
      .map(contractor => calculateContractorMatch(contractor, project))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 4)
      .map((contractor, index) => ({ ...contractor, rank: index + 1 }))

    res.json({
      success: true,
      data: {
        project: {
          projectId: project.projectId,
          title: project.title,
          district: project.district,
          state: project.state,
          category: project.category,
          riskLevel: project.riskLevel,
          amount: project.amount,
        },
        shortlist,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/projects/:projectId/timeline', async (req, res, next) => {
  try {
    const db = await withDemoData()
    const project = await db.collection('contractor_projects').findOne({ projectId: req.params.projectId })
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' })

    const updates = await db
      .collection('work_updates')
      .find({ projectId: req.params.projectId })
      .sort({ serverUploadTime: -1 })
      .toArray()

    res.json({ success: true, data: { project, updates } })
  } catch (error) {
    next(error)
  }
})

router.get('/:contractorId/score', async (req, res, next) => {
  try {
    const db = await withDemoData()
    const contractor = await db.collection('contractors').findOne({ contractorId: req.params.contractorId })
    if (!contractor) return res.status(404).json({ success: false, error: 'Contractor not found' })

    const quality = calculateQualityScore(contractor)
    res.json({ success: true, data: { contractorId: contractor.contractorId, ...quality } })
  } catch (error) {
    next(error)
  }
})

router.get('/:contractorId', async (req, res, next) => {
  try {
    const db = await withDemoData()
    const contractor = await db.collection('contractors').findOne({ contractorId: req.params.contractorId })
    if (!contractor) return res.status(404).json({ success: false, error: 'Contractor not found' })

    const projects = await db
      .collection('contractor_projects')
      .find({ contractorId: req.params.contractorId })
      .toArray()
    const quality = calculateQualityScore(contractor)

    res.json({
      success: true,
      data: { ...contractor, projects, qualityCredit: quality.score, scoreComponents: quality.components },
    })
  } catch (error) {
    next(error)
  }
})

router.post('/projects/:projectId/updates', async (req, res, next) => {
  try {
    const db = await withDemoData()
    const project = await db.collection('contractor_projects').findOne({ projectId: req.params.projectId })
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' })

    const body = req.body || {}
    const contractorId = body.contractorId || project.contractorId
    const progressPercent = clamp(body.progressPercent)
    const photoUrl = body.photoUrl || sampleImages[project.category]?.[0] || ''
    const mediaType = ['image', 'video', 'url'].includes(body.mediaType) ? body.mediaType : 'url'
    const mediaName = String(body.mediaName || '').slice(0, 160)
    if (!Number.isFinite(Number(body.latitude)) || !Number.isFinite(Number(body.longitude))) {
      return res.status(400).json({
        success: false,
        error: 'GPS latitude and longitude are required for field evidence.',
      })
    }
    const fingerprint = evidenceFingerprint(photoUrl)
    const duplicateMatch = await db
      .collection('work_updates')
      .findOne({ projectId: project.projectId, evidenceFingerprint: fingerprint })
    const geoVerification = verifyGeo(project, body)
    const imageVerification = verifyImage(project, photoUrl)
    const progressVerification = verifyProgress(project, progressPercent)
    const duplicateCheck = duplicateMatch
      ? {
          status: 'REVIEW_REQUIRED',
          score: 35,
          duplicateDetected: true,
          similarity: 96,
          matchedUpdateId: duplicateMatch.updateId,
          summary: 'This evidence image appears to have been submitted before for this project.',
        }
      : {
          status: 'UNIQUE',
          score: 100,
          duplicateDetected: false,
          similarity: 0,
          matchedUpdateId: null,
          summary: 'No matching earlier evidence asset was found for this project.',
        }

    const overallVerificationScore = Math.round(
      geoVerification.score * verificationWeights.geo +
        imageVerification.score * verificationWeights.image +
        duplicateCheck.score * verificationWeights.duplicate +
        progressVerification.score * verificationWeights.progress
    )
    const verificationStatus = getVerificationStatus(overallVerificationScore)
    const now = new Date()
    const update = {
      updateId: `upd-${now.getTime()}-${crypto.randomBytes(3).toString('hex')}`,
      projectId: project.projectId,
      contractorId,
      photoUrl,
      mediaType,
      mediaName,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      gpsAccuracy: Number(body.gpsAccuracy || body.accuracy || 0),
      progressPercent,
      remarks: String(body.remarks || '').slice(0, 600),
      clientCaptureTime: body.clientCaptureTime ? new Date(body.clientCaptureTime) : now,
      serverUploadTime: now,
      evidenceFingerprint: fingerprint,
      geoVerification,
      imageVerification,
      duplicateCheck,
      progressVerification,
      overallVerificationScore,
      verificationStatus,
      reviewLanguage: 'Potential anomalies require manual review. The system does not make fraud findings.',
    }

    await db.collection('work_updates').insertOne(update)
    await db.collection('contractor_projects').updateOne(
      { projectId: project.projectId },
      {
        $set: {
          progressPercent,
          lastUpdateAt: now,
          latestVerificationStatus: verificationStatus,
          latestVerificationScore: overallVerificationScore,
          latestPhotoUrl: photoUrl,
        },
      }
    )

    const timeline = await db
      .collection('work_updates')
      .find({ projectId: project.projectId })
      .sort({ serverUploadTime: -1 })
      .limit(8)
      .toArray()

    res.status(201).json({
      success: true,
      data: {
        update,
        verification: {
          weights: verificationWeights,
          score: overallVerificationScore,
          status: verificationStatus,
          geoVerification,
          imageVerification,
          duplicateCheck,
          progressVerification,
        },
        timeline,
      },
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
