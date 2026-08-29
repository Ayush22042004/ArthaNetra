import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import {
  FiAlertTriangle,
  FiArrowUpRight,
  FiCheckCircle,
  FiCloud,
  FiMap,
  FiMaximize2,
  FiNavigation,
  FiRefreshCw,
  FiStar,
} from 'react-icons/fi'
import apiClient from '../../../services/api/apiClient'
import { projectImagesAPI, type ProjectImage } from '../../../services/api/projectImages'
import { weatherAPI, type WeatherSignal } from '../../../services/api/weather'
import FundReleaseTimeline from '../components/Common/FundReleaseTimeline'
import 'leaflet/dist/leaflet.css'
import './IntelligenceMap.css'

type RiskLevel = 'Low' | 'Medium' | 'High'

interface RiskApiWork {
  workId?: number
  recommendationId?: number
  name?: string
  workName?: string
  title?: string
  category?: string
  constituency?: string
  district?: string
  state?: string
  riskScore?: number
  riskLevel?: string
  utilization?: number
  allocated?: number
  expenditure?: number
  reasons?: string[]
  status?: string
  contractor?: string
  qualityRating?: number
  images?: string[]
  imageUrls?: string[]
  photos?: string[] | Record<string, string[]>
  latitude?: number
  longitude?: number
  lat?: number
  lng?: number
}

interface ConstituencyApiRow {
  constituency?: string
  state?: string
  district?: string
  projectCount?: number
  totalAmount?: number
}

interface Coordinate {
  lat: number
  lng: number
  state?: string
}

interface MapProject {
  id: number
  title: string
  category: string
  constituency: string
  district: string
  state: string
  funds: number
  expenditure: number
  progress: number
  risk: number
  riskLevel: RiskLevel
  reasons: string[]
  status: string
  contractor: string
  qualityRating: number
  images: string[]
  lat: number
  lng: number
  coordinateSource: 'project' | 'constituency' | 'state' | 'country'
  daysDelayed: number
}

interface RiskDensityGroup {
  key: string
  constituency: string
  state: string
  count: number
  maxRisk: number
  averageRisk: number
  riskLevel: RiskLevel
  representativeId: number
}

const constituencyCoordinates: Record<string, Coordinate> = {
  AGRA: { lat: 27.1767, lng: 78.0081, state: 'Uttar Pradesh' },
  ALWAR: { lat: 27.553, lng: 76.6346, state: 'Rajasthan' },
  AMRAVATI: { lat: 20.9374, lng: 77.7796, state: 'Maharashtra' },
  'ANANDPUR SAHIB': { lat: 31.2396, lng: 76.5026, state: 'Punjab' },
  ARAKKONAM: { lat: 13.0841, lng: 79.6708, state: 'Tamil Nadu' },
  ARANI: { lat: 12.6677, lng: 79.2853, state: 'Tamil Nadu' },
  ARARIA: { lat: 26.1325, lng: 87.4522, state: 'Bihar' },
  'ARUNACHAL EAST': { lat: 27.1, lng: 95.2, state: 'Arunachal Pradesh' },
  BANDA: { lat: 25.4763, lng: 80.3395, state: 'Uttar Pradesh' },
  BANSWARA: { lat: 23.5461, lng: 74.4349, state: 'Rajasthan' },
  BARDOLI: { lat: 21.122, lng: 73.1126, state: 'Gujarat' },
  BASIRHAT: { lat: 22.6574, lng: 88.8672, state: 'West Bengal' },
  BEED: { lat: 18.9891, lng: 75.7601, state: 'Maharashtra' },
  BHARATPUR: { lat: 27.2152, lng: 77.503, state: 'Rajasthan' },
  BISHNUPUR: { lat: 23.0738, lng: 87.3199, state: 'West Bengal' },
  BOLPUR: { lat: 23.6712, lng: 87.6919, state: 'West Bengal' },
  BUXAR: { lat: 25.5647, lng: 83.9777, state: 'Bihar' },
  CHITTOOR: { lat: 13.2172, lng: 79.1003, state: 'Andhra Pradesh' },
  COOCHBEHAR: { lat: 26.3452, lng: 89.4482, state: 'West Bengal' },
  DAHOD: { lat: 22.8379, lng: 74.2531, state: 'Gujarat' },
  DAMOH: { lat: 23.8388, lng: 79.4422, state: 'Madhya Pradesh' },
  DARJEELING: { lat: 27.041, lng: 88.2663, state: 'West Bengal' },
  DHARWAD: { lat: 15.4589, lng: 75.0078, state: 'Karnataka' },
  'DIAMOND HARBOUR': { lat: 22.191, lng: 88.1905, state: 'West Bengal' },
  DINDIGUL: { lat: 10.3624, lng: 77.9695, state: 'Tamil Nadu' },
  DIPHU: { lat: 25.8434, lng: 93.4313, state: 'Assam' },
  DURG: { lat: 21.1904, lng: 81.2849, state: 'Chhattisgarh' },
  ELURU: { lat: 16.7107, lng: 81.0952, state: 'Andhra Pradesh' },
  ERNAKULAM: { lat: 9.9816, lng: 76.2999, state: 'Kerala' },
  FARIDKOT: { lat: 30.6769, lng: 74.7583, state: 'Punjab' },
  FATEHPUR: { lat: 25.921, lng: 80.809, state: 'Uttar Pradesh' },
  'FATEHPUR SIKRI': { lat: 27.0945, lng: 77.6679, state: 'Uttar Pradesh' },
  FIROZABAD: { lat: 27.1592, lng: 78.3957, state: 'Uttar Pradesh' },
  FIROZPUR: { lat: 30.9331, lng: 74.6225, state: 'Punjab' },
  'GAUTAM BUDDHA NAGAR': { lat: 28.5355, lng: 77.391, state: 'Uttar Pradesh' },
  GIRIDIH: { lat: 24.1914, lng: 86.2996, state: 'Jharkhand' },
  GURGAON: { lat: 28.4595, lng: 77.0266, state: 'Haryana' },
  GUWAHATI: { lat: 26.1445, lng: 91.7362, state: 'Assam' },
  HAMIRPUR: { lat: 25.9559, lng: 80.1487, state: 'Uttar Pradesh' },
  HARDOI: { lat: 27.3986, lng: 80.1317, state: 'Uttar Pradesh' },
  HOOGHLY: { lat: 22.8963, lng: 88.2461, state: 'West Bengal' },
  JAIPUR: { lat: 26.9124, lng: 75.7873, state: 'Rajasthan' },
  'JANJGIR CHAMPA': { lat: 21.9722, lng: 82.5676, state: 'Chhattisgarh' },
  JHANJHARPUR: { lat: 26.2647, lng: 86.2799, state: 'Bihar' },
  JOYNAGAR: { lat: 22.1772, lng: 88.4258, state: 'West Bengal' },
  KADAPA: { lat: 14.4673, lng: 78.8242, state: 'Andhra Pradesh' },
  KANNIYAKUMARI: { lat: 8.0883, lng: 77.5385, state: 'Tamil Nadu' },
  KHANDWA: { lat: 21.8314, lng: 76.3496, state: 'Madhya Pradesh' },
  KHARGONE: { lat: 21.8335, lng: 75.6149, state: 'Madhya Pradesh' },
  KHUNTI: { lat: 23.0767, lng: 85.2789, state: 'Jharkhand' },
  KOCHI: { lat: 9.9312, lng: 76.2673, state: 'Kerala' },
  KOLLAM: { lat: 8.8932, lng: 76.6141, state: 'Kerala' },
  KORBA: { lat: 22.3595, lng: 82.7501, state: 'Chhattisgarh' },
  KOTA: { lat: 25.2138, lng: 75.8648, state: 'Rajasthan' },
  KRISHNANAGAR: { lat: 23.4058, lng: 88.4917, state: 'West Bengal' },
  'KUSHI NAGAR': { lat: 26.7399, lng: 83.8887, state: 'Uttar Pradesh' },
  MADURAI: { lat: 9.9252, lng: 78.1198, state: 'Tamil Nadu' },
  MANDI: { lat: 31.7087, lng: 76.9314, state: 'Himachal Pradesh' },
  MAVELIKKARA: { lat: 9.2593, lng: 76.5564, state: 'Kerala' },
  'MUMBAI SOUTH': { lat: 18.9388, lng: 72.8354, state: 'Maharashtra' },
  NAGALAND: { lat: 26.1584, lng: 94.5624, state: 'Nagaland' },
  NAGINA: { lat: 29.4451, lng: 78.4368, state: 'Uttar Pradesh' },
  NAGPUR: { lat: 21.1458, lng: 79.0882, state: 'Maharashtra' },
  NANDURBAR: { lat: 21.3756, lng: 74.2428, state: 'Maharashtra' },
  NIZAMABAD: { lat: 18.6725, lng: 78.0941, state: 'Telangana' },
  PALI: { lat: 25.7711, lng: 73.3234, state: 'Rajasthan' },
  PARBHANI: { lat: 19.2608, lng: 76.7748, state: 'Maharashtra' },
  PATHANAMTHITTA: { lat: 9.2648, lng: 76.787, state: 'Kerala' },
  'PATNA SAHIB': { lat: 25.5941, lng: 85.1376, state: 'Bihar' },
  PUDUCHERRY: { lat: 11.9416, lng: 79.8083, state: 'Puducherry' },
  'PURVI CHAMPARAN': { lat: 26.6469, lng: 84.9089, state: 'Bihar' },
  RAIPUR: { lat: 21.2514, lng: 81.6296, state: 'Chhattisgarh' },
  RAJGARH: { lat: 24.0079, lng: 76.7279, state: 'Madhya Pradesh' },
  RAVER: { lat: 21.2477, lng: 76.0356, state: 'Maharashtra' },
  ROHTAK: { lat: 28.8955, lng: 76.6066, state: 'Haryana' },
  SARGUJA: { lat: 22.8961, lng: 83.0963, state: 'Chhattisgarh' },
  SABARKANTHA: { lat: 23.5981, lng: 72.9693, state: 'Gujarat' },
  SHAHDOL: { lat: 23.3002, lng: 81.3569, state: 'Madhya Pradesh' },
  SHAHJAHANPUR: { lat: 27.8837, lng: 79.9122, state: 'Uttar Pradesh' },
  SHIRUR: { lat: 18.8276, lng: 74.3748, state: 'Maharashtra' },
  SIKKIM: { lat: 27.533, lng: 88.5122, state: 'Sikkim' },
  SIVAGANGA: { lat: 9.8433, lng: 78.4809, state: 'Tamil Nadu' },
  SOLAPUR: { lat: 17.6599, lng: 75.9064, state: 'Maharashtra' },
  SONEPAT: { lat: 28.9931, lng: 77.0151, state: 'Haryana' },
  SULTANPUR: { lat: 26.2648, lng: 82.0727, state: 'Uttar Pradesh' },
  TENKASI: { lat: 8.959, lng: 77.3152, state: 'Tamil Nadu' },
  THANE: { lat: 19.2183, lng: 72.9781, state: 'Maharashtra' },
  TIRUPPUR: { lat: 11.1085, lng: 77.3411, state: 'Tamil Nadu' },
  ULUBERIA: { lat: 22.4711, lng: 88.1098, state: 'West Bengal' },
  VAISHALI: { lat: 25.6838, lng: 85.3549, state: 'Bihar' },
  VIRUDHUNAGAR: { lat: 9.568, lng: 77.9624, state: 'Tamil Nadu' },
  'YAVATMAL WASHIM': { lat: 20.3888, lng: 78.1204, state: 'Maharashtra' },
}

const stateCoordinates: Record<string, Coordinate> = {
  'ANDHRA PRADESH': { lat: 15.9129, lng: 79.74 },
  'ARUNACHAL PRADESH': { lat: 28.218, lng: 94.7278 },
  ASSAM: { lat: 26.2006, lng: 92.9376 },
  BIHAR: { lat: 25.0961, lng: 85.3131 },
  CHHATTISGARH: { lat: 21.2787, lng: 81.8661 },
  GUJARAT: { lat: 22.2587, lng: 71.1924 },
  HARYANA: { lat: 29.0588, lng: 76.0856 },
  'HIMACHAL PRADESH': { lat: 31.1048, lng: 77.1734 },
  JHARKHAND: { lat: 23.6102, lng: 85.2799 },
  KARNATAKA: { lat: 15.3173, lng: 75.7139 },
  KERALA: { lat: 10.8505, lng: 76.2711 },
  'MADHYA PRADESH': { lat: 22.9734, lng: 78.6569 },
  MAHARASHTRA: { lat: 19.7515, lng: 75.7139 },
  NAGALAND: { lat: 26.1584, lng: 94.5624 },
  PUDUCHERRY: { lat: 11.9416, lng: 79.8083 },
  PUNJAB: { lat: 31.1471, lng: 75.3412 },
  RAJASTHAN: { lat: 27.0238, lng: 74.2179 },
  'TAMIL NADU': { lat: 11.1271, lng: 78.6569 },
  TELANGANA: { lat: 18.1124, lng: 79.0193 },
  'UTTAR PRADESH': { lat: 26.8467, lng: 80.9462 },
  'WEST BENGAL': { lat: 22.9868, lng: 87.855 },
  SIKKIM: { lat: 27.533, lng: 88.5122 },
}

interface EvidenceImage {
  src: string
  caption: string
  source: 'database' | 'provider' | 'category'
}

const evidenceGalleryByCategory: Record<string, string[]> = {
  road: [
    'https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1590479773265-7464e5d48118?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=82',
  ],
  water: [
    'https://images.unsplash.com/photo-1581091870622-1e7e7fb1182c?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=900&q=82',
  ],
  building: [
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=82',
  ],
  power: [
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1487875961445-47a00398c267?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=900&q=82',
  ],
  community: [
    'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1581092919535-7146ff1a590b?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=82',
  ],
}

const getEvidenceBucket = (project: MapProject) => {
  const text = `${project.title} ${project.category}`.toLowerCase()

  if (/road|bridge|culvert|drain|path|street|resurfacing|cc\s/.test(text)) return 'road'
  if (/water|tank|tube.?well|drinking|pipeline|irrigation|pond/.test(text)) return 'water'
  if (/electric|solar|light|power|transformer|energy/.test(text)) return 'power'
  if (/school|college|building|hall|anganwadi|hospital|clinic|shed|room|toilet/.test(text)) {
    return 'building'
  }
  return 'community'
}

const getEvidenceLabel = (project: MapProject) => {
  const category = project.category?.trim()

  if (!category || /^(normal|others|normal\/others|uncategorised)$/i.test(category)) {
    if (/road|bridge|culvert|drain|path|street|resurfacing|cc\s/i.test(project.title)) {
      return 'Road work'
    }

    if (/water|tank|tube.?well|drinking|pipeline|irrigation|pond/i.test(project.title)) {
      return 'Water infrastructure'
    }

    if (/school|college|building|hall|anganwadi|hospital|clinic|shed|room|toilet/i.test(project.title)) {
      return 'Public building'
    }

    return 'Field evidence'
  }

  return category
}

const buildImageSearchQuery = (project: MapProject) =>
  [
    project.title,
    project.category,
    project.district,
    project.state,
    'India public infrastructure construction site',
  ]
    .filter(Boolean)
    .join(' ')

const selectedProjectKey = (project: MapProject | undefined) =>
  project
    ? [
        project.id,
        project.title,
        project.constituency,
        project.district,
        project.state,
        project.category,
      ].join('|')
    : ''

const hashString = (value: string) =>
  value.split('').reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7)

const buildDynamicRiskReasons = (
  project: MapProject | undefined,
  weatherReason: string,
  isVerified: boolean,
  isEscalated: boolean
) => {
  if (!project) return []

  const reasons: string[] = []
  const spendRate = project.funds > 0 ? Math.round((project.expenditure / project.funds) * 100) : 0
  const normalizedStatus = project.status || 'Unknown'
  const needsExecutionCheck = /recommended|pending|under review|not started/i.test(normalizedStatus)

  if (project.progress === 0) {
    reasons.push(
      project.funds > 0
        ? `0% progress and ${formatFunds(project.expenditure)} spend are recorded against ${formatFunds(project.funds)} sanctioned funds.`
        : '0% progress is recorded, so execution evidence is still missing.'
    )
  } else if (project.progress < 100) {
    reasons.push(
      `Work is in progress at ${project.progress}% completion; next fund release should depend on milestone evidence.`
    )
  } else {
    reasons.push('100% completion is recorded; verify closure photos, final bill, and payment trail.')
  }

  if (project.progress > 0 && needsExecutionCheck) {
    reasons.push(
      `Status still says ${normalizedStatus} despite ${project.progress}% progress, so the work status needs reconciliation.`
    )
  } else if (project.progress === 0 && needsExecutionCheck) {
    reasons.push(`Current status is ${normalizedStatus}; check whether the work has actually started on site.`)
  }

  if (project.funds > 0 && project.expenditure > project.funds) {
    reasons.push('Recorded expenditure is higher than allocated funds and needs financial reconciliation.')
  } else if (project.progress >= 80 && project.expenditure === 0) {
    reasons.push('High progress is reported, but no expenditure is recorded; payment data needs verification.')
  } else if (project.progress > 0 && project.progress < 100 && project.funds > 0 && spendRate < 25) {
    reasons.push(`Only ${spendRate}% of sanctioned funds have been spent while work is already underway.`)
  }

  if (!project.qualityRating && project.riskLevel !== 'Low') {
    reasons.push('Contractor quality rating is not recorded yet.')
  } else if (project.qualityRating && project.qualityRating < 3) {
    reasons.push(`Contractor quality rating is low at ${project.qualityRating.toFixed(1)} out of 5.`)
  }

  if (project.coordinateSource !== 'project') {
    reasons.push(`Map pin uses ${project.coordinateSource}-level location, not exact worksite GPS.`)
  }

  if (weatherReason && !/^Weather clear:/i.test(weatherReason)) {
    reasons.push(weatherReason)
  }

  if (isVerified) {
    reasons.push('Field verification has been marked, so remaining follow-up should focus on finance and closure evidence.')
  }

  if (isEscalated) {
    reasons.push('This work has been escalated for review.')
  }

  if (!reasons.length) reasons.push('No major risk detected for this selected work.')

  return Array.from(new Set(reasons)).slice(0, 5)
}

const buildEvidenceImages = (
  project: MapProject | undefined,
  providerImages: ProjectImage[] = []
): EvidenceImage[] => {
  if (!project) return []

  if (project.images.length) {
    return project.images.slice(0, 3).map((src, index) => ({
      src,
      caption: `Uploaded field evidence ${index + 1} for ${project.constituency}`,
      source: 'database',
    }))
  }

  if (providerImages.length) {
    return providerImages.slice(0, 3).map((image, index) => ({
      src: image.thumbnail || image.original || '',
      caption: image.photographer
        ? `${project.constituency} project context ${index + 1}, photo by ${image.photographer}`
        : `${project.constituency} project context ${index + 1}`,
      source: 'provider',
    })).filter(image => image.src)
  }

  const bucket = getEvidenceBucket(project)
  const images = evidenceGalleryByCategory[bucket] || evidenceGalleryByCategory.community
  const label = getEvidenceLabel(project)
  const offset = hashString(selectedProjectKey(project)) % images.length

  return [0, 1, 2].map(index => ({
    src: images[(offset + index) % images.length],
    caption: `${label} view ${index + 1} for ${project.constituency}`,
    source: 'category',
  }))
}

const normalizeKey = (value = '') =>
  value
    .toUpperCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeImages = (work: RiskApiWork) => {
  const collections = [work.images, work.imageUrls, work.photos]

  return collections
    .flatMap(value => {
      if (!value) return []
      if (Array.isArray(value)) return value
      if (typeof value === 'object') return Object.values(value).flat()
      return []
    })
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
}

const toRiskLevel = (value: string | undefined, score: number): RiskLevel => {
  const normalized = value?.toUpperCase()
  if (normalized === 'HIGH' || score >= 70) return 'High'
  if (normalized === 'MEDIUM' || score >= 40) return 'Medium'
  return 'Low'
}

const resolveCoordinate = (
  work: RiskApiWork
): Coordinate & { source: MapProject['coordinateSource'] } => {
  const lat = toNumber(work.latitude ?? work.lat, Number.NaN)
  const lng = toNumber(work.longitude ?? work.lng, Number.NaN)

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng, state: work.state, source: 'project' }
  }

  const constituencyMatch = constituencyCoordinates[normalizeKey(work.constituency)]
  if (constituencyMatch) return { ...constituencyMatch, source: 'constituency' }

  const stateMatch = stateCoordinates[normalizeKey(work.state)]
  if (stateMatch) return { ...stateMatch, state: work.state, source: 'state' }

  return { lat: 22.9734, lng: 78.6569, state: 'India', source: 'country' }
}

const normalizeWork = (work: RiskApiWork, index: number): MapProject => {
  const risk = Math.round(toNumber(work.riskScore))
  const riskLevel = toRiskLevel(work.riskLevel, risk)
  const coordinate = resolveCoordinate(work)
  const constituency = work.constituency || 'Unknown constituency'
  const state = work.state || coordinate.state || 'India'
  const progress = Math.min(100, Math.max(0, Math.round(toNumber(work.utilization))))
  const rawId = toNumber(work.workId || work.recommendationId, Number.NaN)

  return {
    id: Number.isFinite(rawId) ? rawId : index + 1,
    title: work.name || work.workName || work.title || 'Untitled MPLADS work',
    category: work.category || 'Uncategorised',
    constituency,
    district: work.district || constituency,
    state,
    funds: toNumber(work.allocated),
    expenditure: toNumber(work.expenditure),
    progress,
    risk,
    riskLevel,
    reasons: Array.isArray(work.reasons)
      ? work.reasons
      : typeof work.reasons === 'string' && work.reasons.trim()
        ? [work.reasons]
        : [],
    status: work.status || (riskLevel === 'Low' ? 'Completed' : 'Under review'),
    contractor: work.contractor || 'Agency not recorded',
    qualityRating: Math.min(5, Math.max(0, toNumber(work.qualityRating))),
    images: normalizeImages(work),
    lat: coordinate.lat,
    lng: coordinate.lng,
    coordinateSource: coordinate.source,
    daysDelayed:
      riskLevel === 'High'
        ? Math.max(14, Math.round(risk / 2))
        : riskLevel === 'Medium'
          ? Math.max(3, Math.round(risk / 8))
          : 0,
  }
}

const normalizeConstituencyLowPoint = (row: ConstituencyApiRow, index: number): MapProject | null => {
  const constituency = row.constituency || row.district || ''
  const state = row.state || 'India'

  if (!constituency) return null

  const coordinate = resolveCoordinate({ constituency, state, district: row.district })

  return {
    id: 800000000 + index,
    title: `${constituency} monitored works cluster`,
    category: 'Constituency works',
    constituency,
    district: row.district || constituency,
    state: coordinate.state || state,
    funds: toNumber(row.totalAmount),
    expenditure: toNumber(row.totalAmount),
    progress: 100,
    risk: 18,
    riskLevel: 'Low',
    reasons: [
      `${toNumber(row.projectCount)} mapped works are available for this constituency cluster.`,
      'Cluster shown as low risk because it represents completed or broadly monitored work coverage.',
    ],
    status: 'Monitored cluster',
    contractor: 'Multiple agencies',
    qualityRating: 0,
    images: [],
    lat: coordinate.lat,
    lng: coordinate.lng,
    coordinateSource: coordinate.source,
    daysDelayed: 0,
  }
}

const formatFunds = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(value)

const selectVisibleProjects = (works: MapProject[]) => {
  const takeWithPlaceLimit = (items: MapProject[], maxItems: number, maxPerPlace: number) => {
    const perPlaceCount = new Map<string, number>()
    const selected: MapProject[] = []
    const overflow: MapProject[] = []

    items.forEach(project => {
      const placeKey = `${normalizeKey(project.constituency)}|${normalizeKey(project.state)}`
      const count = perPlaceCount.get(placeKey) || 0

      if (count < maxPerPlace) {
        selected.push(project)
        perPlaceCount.set(placeKey, count + 1)
      } else {
        overflow.push(project)
      }
    })

    return [...selected, ...overflow].slice(0, maxItems)
  }

  const riskWorks = works
    .filter(project => project.riskLevel !== 'Low')
    .sort((a, b) => b.risk - a.risk)
  const lowWorks = works
    .filter(project => project.riskLevel === 'Low')
    .sort((a, b) => b.funds - a.funds)

  const targetTotal = 400
  const targetLow = 80
  const targetRisk = targetTotal - targetLow

  const riskSelection = takeWithPlaceLimit(riskWorks, targetRisk, 12)
  const lowSelection = takeWithPlaceLimit(lowWorks, targetLow, 1)
  const selectedIds = new Set([...riskSelection, ...lowSelection].map(project => project.id))
  const remainingSlots = targetTotal - riskSelection.length - lowSelection.length

  if (remainingSlots > 0) {
    const extraRisk = takeWithPlaceLimit(
      riskWorks.filter(project => !selectedIds.has(project.id)),
      remainingSlots,
      20,
    )

    extraRisk.forEach(project => selectedIds.add(project.id))

    const extraLow = takeWithPlaceLimit(
      lowWorks.filter(project => !selectedIds.has(project.id)),
      Math.max(0, remainingSlots - extraRisk.length),
      2,
    )

    return [...riskSelection, ...extraRisk, ...lowSelection, ...extraLow].slice(0, targetTotal)
  }

  return [...riskSelection, ...lowSelection].slice(0, targetTotal)
}

const buildDensityRows = (works: MapProject[]): RiskDensityGroup[] => {
  const groups = new Map<string, RiskDensityGroup & { totalRisk: number }>()

  works.forEach(project => {
    const key = `${normalizeKey(project.constituency) || 'UNKNOWN'}|${
      normalizeKey(project.state) || 'INDIA'
    }`
    const existing = groups.get(key)

    if (!existing) {
      groups.set(key, {
        key,
        constituency: project.constituency,
        state: project.state,
        count: 1,
        maxRisk: project.risk,
        averageRisk: project.risk,
        totalRisk: project.risk,
        riskLevel: project.riskLevel,
        representativeId: project.id,
      })
      return
    }

    existing.count += 1
    existing.totalRisk += project.risk
    existing.averageRisk = Math.round(existing.totalRisk / existing.count)

    if (project.risk > existing.maxRisk) {
      existing.maxRisk = project.risk
      existing.riskLevel = project.riskLevel
      existing.representativeId = project.id
    }
  })

  return Array.from(groups.values())
    .map(({ totalRisk, ...group }) => group)
    .sort((a, b) => b.maxRisk - a.maxRisk || b.count - a.count || a.constituency.localeCompare(b.constituency))
    .slice(0, 12)
}

const mapEmbed = (project: MapProject, zoom = 11) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(
    `${project.lat},${project.lng}`
  )}&t=k&z=${zoom}&output=embed`

const riskClass = (level: RiskLevel) => level.toLowerCase()

const markerColor = (level: RiskLevel) => {
  if (level === 'High') return '#cf5149'
  if (level === 'Medium') return '#eba93e'
  return '#55bfa7'
}

const selectedMarkerColor = '#19324f'
const INDIA_VIEW_BOUNDS: [[number, number], [number, number]] = [
  [6.2, 67.5],
  [35.8, 97.7],
]

const MapLayoutController = () => {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()

    const refreshMap = () => {
      map.invalidateSize(false)
      map.fitBounds(INDIA_VIEW_BOUNDS, {
        animate: false,
        maxZoom: 5,
        padding: [20, 28],
      })
    }

    const timer = window.setTimeout(refreshMap, 120)
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => map.invalidateSize(false))
    })

    observer.observe(container)

    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [map])

  return null
}

const MapFocus = ({ project, focusKey }: { project: MapProject; focusKey: number }) => {
  const map = useMap()
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }

    if (focusKey <= 0) return

    map.invalidateSize(false)
    map.flyTo([project.lat, project.lng], Math.max(map.getZoom(), 7), {
      animate: true,
      duration: 0.65,
    })
  }, [focusKey, map, project.id, project.lat, project.lng])

  return null
}

const IntelligenceMap = () => {
  const [projects, setProjects] = useState<MapProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [verifiedProjectIds, setVerifiedProjectIds] = useState<Set<number>>(() => new Set())
  const [escalatedProjectIds, setEscalatedProjectIds] = useState<Set<number>>(() => new Set())
  const [mapFocusKey, setMapFocusKey] = useState(0)
  const [detailPopoverOpen, setDetailPopoverOpen] = useState(true)
  const [weatherSignal, setWeatherSignal] = useState<WeatherSignal | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [projectContextImages, setProjectContextImages] = useState<ProjectImage[]>([])
  const [imagesLoading, setImagesLoading] = useState(false)

  const fetchMapData = async () => {
    try {
      setLoading(true)
      setError('')
      const [riskResponse, constituencyResponse] = await Promise.all([
        apiClient.get('/ai/risk-analysis'),
        apiClient.get('/works/constituencies', { skipErrorToast: true }),
      ])
      const analysis = riskResponse?.data || riskResponse
      const constituencyData = constituencyResponse?.data || constituencyResponse
      const rawWorks: RiskApiWork[] = Array.isArray(analysis?.data?.results)
        ? analysis.data.results
        : Array.isArray(analysis?.results)
          ? analysis.results
          : []
      const constituencyRows: ConstituencyApiRow[] = Array.isArray(constituencyData?.data?.constituencies)
        ? constituencyData.data.constituencies
        : Array.isArray(constituencyData?.constituencies)
          ? constituencyData.constituencies
          : []
      const riskProjects = rawWorks.map(normalizeWork)
      const lowProjects = constituencyRows
        .map(normalizeConstituencyLowPoint)
        .filter((project): project is MapProject => Boolean(project))
      const normalizedProjects = selectVisibleProjects([...riskProjects, ...lowProjects])
      const firstRiskProject =
        normalizedProjects.find(project => project.riskLevel === 'High') ||
        normalizedProjects.find(project => project.riskLevel === 'Medium') ||
        normalizedProjects[0]

      setProjects(normalizedProjects)
      setSelectedProjectId(firstRiskProject?.id || null)
    } catch (err) {
      console.error('Intelligence map load failed:', err)
      setError('Unable to load intelligence map data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMapData()
  }, [])

  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId) || projects[0],
    [projects, selectedProjectId]
  )

  useEffect(() => {
    if (selectedProjectId) setDetailPopoverOpen(true)
  }, [selectedProjectId])

  useEffect(() => {
    if (!selectedProject) return

    let cancelled = false
    setWeatherLoading(true)

    weatherAPI
      .getForecast({
        lat: selectedProject.lat,
        lng: selectedProject.lng,
        label: selectedProject.constituency,
      })
      .then(signal => {
        if (!cancelled) setWeatherSignal(signal)
      })
      .catch(error => {
        console.warn('Weather signal unavailable:', error)
        if (!cancelled) setWeatherSignal(null)
      })
      .finally(() => {
        if (!cancelled) setWeatherLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedProject])

  const selectedKey = selectedProjectKey(selectedProject)

  useEffect(() => {
    setProjectContextImages([])

    if (!selectedProject || selectedProject.images.length) {
      setProjectContextImages([])
      setImagesLoading(false)
      return
    }

    const controller = new AbortController()
    setImagesLoading(true)

    projectImagesAPI
      .search(buildImageSearchQuery(selectedProject), controller.signal)
      .then(images => {
        setProjectContextImages(images)
      })
      .catch(error => {
        if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
          console.warn('Project context images unavailable:', error)
        }
        setProjectContextImages([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setImagesLoading(false)
      })

    return () => controller.abort()
  }, [selectedKey, selectedProject])

  const density = useMemo(
    () => ({
      high: projects.filter(project => project.riskLevel === 'High').length,
      medium: projects.filter(project => project.riskLevel === 'Medium').length,
      low: projects.filter(project => project.riskLevel === 'Low').length,
    }),
    [projects]
  )

  const densityRows = useMemo(() => buildDensityRows(projects), [projects])

  const selectedIsVerified = selectedProject ? verifiedProjectIds.has(selectedProject.id) : false
  const selectedIsEscalated = selectedProject ? escalatedProjectIds.has(selectedProject.id) : false
  const milestoneRows = useMemo(
    () => [
      {
        label: 'Survey completed',
        status: (selectedProject?.progress || 0) > 0 ? 'Completed' : 'Pending',
      },
      {
        label: 'Work execution',
        status:
          (selectedProject?.progress || 0) === 0
            ? 'Planned'
            : (selectedProject?.progress || 0) >= 100
              ? 'Completed'
              : 'In progress',
      },
      {
        label: 'Verification and closure',
        status: selectedIsVerified
          ? 'Completed'
          : (selectedProject?.progress || 0) >= 100
            ? 'Ready for review'
            : 'Planned',
      },
    ],
    [selectedIsVerified, selectedProject?.progress]
  )
  const weatherRiskReason =
    weatherSignal?.risk?.reason ||
    (weatherLoading ? 'Weather signal is being checked for milestone progress.' : '')
  const dynamicRiskReasons = useMemo(
    () => buildDynamicRiskReasons(selectedProject, weatherRiskReason, selectedIsVerified, selectedIsEscalated),
    [selectedProject, weatherRiskReason, selectedIsVerified, selectedIsEscalated]
  )
  const evidenceImages = useMemo(
    () => buildEvidenceImages(selectedProject, projectContextImages),
    [projectContextImages, selectedKey, selectedProject]
  )

  const openFieldRoute = () => {
    if (!selectedProject) return
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${selectedProject.lat},${selectedProject.lng}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  const reviewMapLocation = () => {
    setMapFocusKey(key => key + 1)
    setDetailPopoverOpen(true)
  }

  const toggleVerified = () => {
    if (!selectedProject) return
    setVerifiedProjectIds(previous => {
      const next = new Set(previous)
      if (next.has(selectedProject.id)) next.delete(selectedProject.id)
      else next.add(selectedProject.id)
      return next
    })
  }

  const escalateProject = () => {
    if (!selectedProject) return
    setEscalatedProjectIds(previous => {
      const next = new Set(previous)
      next.add(selectedProject.id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="intelligence-map-page">
        <div className="map-state-card">
          <FiRefreshCw className="spin" />
          <h1>Loading intelligence map</h1>
          <p>Preparing live MPLADS risk signals and constituency map markers.</p>
        </div>
      </div>
    )
  }

  if (error || !selectedProject) {
    return (
      <div className="intelligence-map-page">
        <div className="map-state-card error">
          <FiAlertTriangle />
          <h1>Map data unavailable</h1>
          <p>{error || 'No risk records were returned for mapping.'}</p>
          <button type="button" onClick={fetchMapData}>
            <FiRefreshCw /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="intelligence-map-page">
      <section className="map-workspace">
        <div className="map-copy">
          <span className="eyebrow">Workspace / Intelligence map</span>
          <h1>Satellite risk intelligence for MPLADS works</h1>
          <p>
            Track constituency-level project signals, inspect delayed works, and open precise
            locations for field verification.
          </p>
        </div>

        <div className="map-metrics" aria-label="Risk density summary">
          <div>
            <span>Mapped works</span>
            <strong>{projects.length}</strong>
          </div>
          <div>
            <span>High risk</span>
            <strong>{density.high}</strong>
          </div>
          <div>
            <span>Medium</span>
            <strong>{density.medium}</strong>
          </div>
          <div>
            <span>Low</span>
            <strong>{density.low}</strong>
          </div>
        </div>
      </section>

      <section className="intelligence-grid">
        <div className="map-actions">
          <button type="button" data-label="Field route" aria-label="Open field route" onClick={openFieldRoute}>
            <FiNavigation /> <span>Field route</span>
          </button>
          <button type="button" data-label="Review map" aria-label="Review map location" onClick={reviewMapLocation}>
            <FiMaximize2 /> <span>Review map</span>
          </button>
          <button
            type="button"
            data-label={selectedIsVerified ? 'Verified' : 'Mark verified'}
            aria-label={selectedIsVerified ? 'Verified' : 'Mark verified'}
            className={selectedIsVerified ? 'success' : ''}
            onClick={toggleVerified}
          >
            <FiCheckCircle /> <span>{selectedIsVerified ? 'Verified' : 'Mark verified'}</span>
          </button>
          {selectedProject.riskLevel === 'High' && (
            <button
              type="button"
              data-label={selectedIsEscalated ? 'Escalated' : 'Escalate'}
              aria-label={selectedIsEscalated ? 'Escalated' : 'Escalate'}
              className={selectedIsEscalated ? 'warning' : 'danger'}
              onClick={escalateProject}
            >
              <FiAlertTriangle /> <span>{selectedIsEscalated ? 'Escalated' : 'Escalate'}</span>
            </button>
          )}
        </div>

        <div className="india-map-panel" aria-label="India risk density map">
          <MapContainer
            center={[22.9734, 78.6569]}
            zoom={5}
            minZoom={4}
            maxZoom={13}
            maxBounds={[
              [5.5, 66],
              [37.5, 98],
            ]}
            scrollWheelZoom
            className="leaflet-intelligence-map"
          >
            <MapLayoutController />
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <TileLayer
              attribution=""
              opacity={0.35}
              url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
            />
            <MapFocus project={selectedProject} focusKey={mapFocusKey} />
            {projects.map(project => {
              const selected = selectedProject.id === project.id
              const color = selected ? selectedMarkerColor : markerColor(project.riskLevel)

              return (
                <CircleMarker
                  key={project.id}
                  center={[project.lat, project.lng]}
                  radius={selected ? 15 : 11}
                  pathOptions={{
                    color: '#ffffff',
                    weight: selected ? 3 : 2,
                    fillColor: color,
                    fillOpacity: 0.92,
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedProjectId(project.id)
                      setMapFocusKey(key => key + 1)
                    },
                  }}
                >
                  <Popup>
                    <strong>{project.constituency}</strong>
                    <span>{project.title}</span>
                    <span>
                      {project.riskLevel} risk - {project.risk}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(project.id)
                        setMapFocusKey(key => key + 1)
                      }}
                    >
                      Review project
                    </button>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
          <div className="map-legend">
            <span>
              <i className="legend-dot low" /> Low
            </span>
            <span>
              <i className="legend-dot medium" /> Medium
            </span>
            <span>
              <i className="legend-dot high" /> High
            </span>
          </div>
        </div>

        <aside className="project-signal-panel">
          <div className="signal-card">
            <div className="signal-title">
              <FiMap />
              <div>
                <span>Selected project</span>
                <h2>{selectedProject.constituency}</h2>
              </div>
            </div>
            <p>{selectedProject.title}</p>
            <dl>
              <div>
                <dt>District</dt>
                <dd>{selectedProject.district}</dd>
              </div>
              <div>
                <dt>Funds</dt>
                <dd>{formatFunds(selectedProject.funds)}</dd>
              </div>
              <div>
                <dt>Spent</dt>
                <dd>{formatFunds(selectedProject.expenditure)}</dd>
              </div>
              <div>
                <dt>Progress</dt>
                <dd>{selectedProject.progress}%</dd>
              </div>
            </dl>
            <span className={`risk-pill ${riskClass(selectedProject.riskLevel)}`}>
              {selectedProject.riskLevel} - {selectedProject.risk}
            </span>
            <div className="contractor-rating-card">
              <FiStar />
              <div>
                <span>Contractor signal</span>
                <strong>{selectedProject.contractor}</strong>
                <em>
                  {selectedProject.qualityRating
                    ? `${selectedProject.qualityRating.toFixed(1)} / 5 quality rating`
                    : 'Rating pending from field evidence'}
                </em>
              </div>
            </div>
            <div className={`weather-chip ${weatherSignal?.risk?.level?.toLowerCase() || 'loading'}`}>
              <FiCloud />
              <span>
                {weatherLoading
                  ? 'Checking weather'
                  : weatherSignal
                    ? `${weatherSignal.risk.level} weather risk`
                    : 'Weather unavailable'}
              </span>
            </div>
            <p className="coordinate-note">Location source: {selectedProject.coordinateSource}</p>
            {(selectedIsVerified || selectedIsEscalated) && (
              <div className="project-status-row">
                {selectedIsVerified && <span className="status-chip verified">Verified</span>}
                {selectedIsEscalated && <span className="status-chip escalated">Escalated</span>}
              </div>
            )}
          </div>

          <div className="ranked-list">
            <span className="eyebrow">District signal</span>
            <h3>Risk density</h3>
            {densityRows.map((district, index) => (
              <button
                type="button"
                key={district.key}
                className={selectedProject.id === district.representativeId ? 'active' : ''}
                onClick={() => {
                  setSelectedProjectId(district.representativeId)
                  setMapFocusKey(key => key + 1)
                }}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{district.constituency}</strong>
                <em>
                  {district.state} - {district.count} work{district.count === 1 ? '' : 's'}
                </em>
                <b>{district.maxRisk}</b>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="location-context">
        <div className="section-heading">
          <span className="eyebrow">Location context</span>
          <h2>Constituency view</h2>
        </div>
        <div className="satellite-card">
          <div className="mini-place-card">
            <FiMap />
            <strong>{selectedProject.constituency}</strong>
            <span>{selectedProject.state}</span>
          </div>
          <iframe
            title={`${selectedProject.constituency} satellite location`}
            src={mapEmbed(selectedProject)}
            loading="lazy"
          />
          {detailPopoverOpen && (
            <div className="map-detail-popover">
              <button
                type="button"
                aria-label="Close project map details"
                onClick={() => setDetailPopoverOpen(false)}
              >
                x
              </button>
              <strong>{selectedProject.title}</strong>
              <span>
                {selectedProject.constituency}, {selectedProject.state}
              </span>
              <span>Funds: {formatFunds(selectedProject.funds)}</span>
              <span>Time period: {selectedProject.daysDelayed} days</span>
              <span>Category: {selectedProject.category}</span>
              <span>Progress: {selectedProject.progress}%</span>
              <span>Risk: {selectedProject.risk}%</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedProject.lat},${selectedProject.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps
              </a>
            </div>
          )}
          <a
            className="maps-link"
            href={`https://www.google.com/maps/search/?api=1&query=${selectedProject.lat},${selectedProject.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            Open location in Google Maps <FiArrowUpRight />
          </a>
          <p>
            Satellite context is provided for orientation; confirm the exact worksite during field
            verification.
          </p>
        </div>
      </section>

      <section className="field-tracking">
        <div>
          <span className="eyebrow">{selectedProject.constituency} field tracking</span>
          <h2>Completion progress</h2>
        </div>
        <div className="progress-line">
          <strong>{selectedProject.progress}%</strong>
          <span>Estimated work completed</span>
        </div>
        <div className="progress-track">
          <span style={{ width: `${selectedProject.progress}%` }} />
        </div>
        <div className="milestones">
          {milestoneRows.map((milestone, index) => (
            <div key={milestone.label}>
              <span>{index + 1}</span>
              <strong>{milestone.label}</strong>
              <em>{milestone.status}</em>
            </div>
          ))}
        </div>
        <FundReleaseTimeline totalFunds={selectedProject.funds} progress={selectedProject.progress} />
        <div className={`weather-progress-card ${weatherSignal?.risk?.level?.toLowerCase() || ''}`}>
          <div>
            <span className="eyebrow">Weather signal</span>
            <h3>Progress risk from local conditions</h3>
            <p>{weatherRiskReason || 'Weather API did not return a signal for this location.'}</p>
          </div>
          <dl>
            <div>
              <dt>Temp</dt>
              <dd>
                {weatherSignal?.current?.temperature_2m ?? '--'}
                {weatherSignal?.units?.temperature || 'C'}
              </dd>
            </div>
            <div>
              <dt>Rain</dt>
              <dd>
                {weatherSignal?.current?.precipitation ?? weatherSignal?.current?.rain ?? '--'}
                {weatherSignal?.units?.precipitation || 'mm'}
              </dd>
            </div>
            <div>
              <dt>Wind</dt>
              <dd>
                {weatherSignal?.current?.wind_speed_10m ?? '--'}
                {weatherSignal?.units?.wind || 'km/h'}
              </dd>
            </div>
          </dl>
        </div>
        <div className="risk-reason-panel">
          <span className="eyebrow">Risk reasons</span>
          {dynamicRiskReasons.length ? (
            <ul>
              {dynamicRiskReasons.map(reason => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p>No major risk detected for this work.</p>
          )}
        </div>
        <div className="gallery-heading">
          <span className="eyebrow">Site evidence</span>
          <h2>{selectedProject.constituency} evidence gallery</h2>
          {selectedProject.images.length ? (
            <p>Showing uploaded field evidence attached to this work record.</p>
          ) : imagesLoading ? (
            <p>Finding project context images for this selected work.</p>
          ) : projectContextImages.length ? (
            <p>Showing live project context images matched to this work and location.</p>
          ) : (
            <p>
              Showing category-matched field imagery until uploaded evidence is available for this
              work.
            </p>
          )}
        </div>
        <div className="project-gallery">
          {imagesLoading
            ? [1, 2, 3].map(item => <div className="gallery-skeleton" key={item} />)
            : evidenceImages.map((image, index) => (
                <figure key={`${image.src}-${index}`}>
                  <img src={image.src} alt={image.caption} loading="lazy" />
                  <figcaption>
                    {image.caption}
                    {image.source === 'database' && <span>Uploaded</span>}
                    {image.source === 'provider' && <span>Live context</span>}
                    {image.source === 'category' && <span>Reference image</span>}
                  </figcaption>
                </figure>
              ))}
        </div>
      </section>

    </div>
  )
}

export default IntelligenceMap
