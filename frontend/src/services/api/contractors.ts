import apiClient from './apiClient'

export type ContractorProject = {
  projectId: string
  contractorId: string
  title: string
  district: string
  state: string
  category: string
  amount: number
  registeredLatitude: number
  registeredLongitude: number
  progressPercent: number
  expectedProgress: number
  riskLevel: 'High' | 'Medium' | 'Low' | string
  deadline: string
  lastUpdateAt?: string | null
  latestVerificationStatus?: string
  latestVerificationScore?: number
  latestPhotoUrl?: string
  source?: string
  sourceCollection?: string
  sourceWorkId?: string | number
  coordinateSource?: string
  mpName?: string
}

export type Contractor = {
  contractorId: string
  companyName: string
  registrationNumber: string
  district: string
  specializations: string[]
  projectsCompleted: number
  activeProjects: number
  onTimeCompletionRate: number
  averageCostOverrun: number
  verifiedEvidenceRate: number
  workQuality: number
  complianceScore: number
  anomalyRate: number
  qualityCredit?: number
  rank?: number
  demoHistoricalData?: boolean
  scoreComponents?: Record<string, number>
}

export type WorkUpdate = {
  updateId: string
  projectId: string
  contractorId: string
  photoUrl: string
  mediaType?: 'image' | 'video' | 'url'
  mediaName?: string
  latitude: number
  longitude: number
  gpsAccuracy: number
  progressPercent: number
  remarks: string
  serverUploadTime: string
  overallVerificationScore: number
  verificationStatus: string
  geoVerification?: {
    status: string
    score: number
    distanceMetres?: number | null
    summary?: string
  }
  imageVerification?: {
    status: string
    score: number
    detectedWorkType?: string
    detectedStage?: string
    summary?: string
  }
  duplicateCheck?: {
    status: string
    score: number
    duplicateDetected: boolean
    similarity?: number
    summary?: string
  }
  progressVerification?: {
    status: string
    score: number
    issues?: string[]
  }
}

export type FieldUpdatePayload = {
  contractorId: string
  photoUrl: string
  mediaType?: 'image' | 'video' | 'url'
  mediaName?: string
  latitude?: number
  longitude?: number
  gpsAccuracy?: number
  progressPercent: number
  remarks: string
  clientCaptureTime: string
}

export type ContractorShortlistItem = {
  contractorId: string
  companyName: string
  registrationNumber: string
  district: string
  specializations: string[]
  qualityCredit: number
  matchScore: number
  rank: number
  components: Record<string, number>
  reasons: string[]
  governanceNote: string
}

export type FieldMonitoring = {
  projectsTracked: number
  projectsUpdatedToday: number
  verifiedEvidenceToday: number
  requiringReview: number
  locationMismatches: number
  possibleReusedPhotos: number
  latestUpdates: WorkUpdate[]
}

export type ContractorSourceCoverage = {
  officialMpladsProjects: number
  demoExecutionProjects: number
  totalContractorProjects: number
  sourceCollections: {
    worksRecommended: number
    worksCompleted: number
  }
  coordinates: {
    exactOrRecordCoordinates: number
    stateCentroidFallback: number
    note: string
  }
  evidence: {
    totalUpdates: number
    gpsVerifiedUpdates: number
    reviewRequiredUpdates: number
    imageEvidence: number
    videoEvidence: number
    duplicateEvidenceFlags: number
  }
  officialDataBoundary: string
}

export type ContractorDemoAccount = {
  email: string
  passwordHint: string
  contractorId: string
  companyName: string
  district: string
}

export const contractorsAPI = {
  getDemoAccounts() {
    return apiClient.get('/contractors/demo-accounts')
  },

  login(payload: { email: string; password: string }) {
    return apiClient.post('/contractors/login', payload)
  },

  getDashboard(contractorId = 'abc-infra') {
    return apiClient.get('/contractors/dashboard', { params: { contractorId } })
  },

  getProjects(contractorId?: string) {
    return apiClient.get('/contractors/projects', { params: contractorId ? { contractorId } : {} })
  },

  getLeaderboard(params?: { district?: string; specialization?: string }) {
    return apiClient.get('/contractors/leaderboard', { params })
  },

  getFieldMonitoring() {
    return apiClient.get('/contractors/field-monitoring')
  },

  getSourceCoverage() {
    return apiClient.get('/contractors/source-coverage')
  },

  getMapProjects() {
    return apiClient.get('/contractors/map-projects')
  },

  getShortlist(projectId: string) {
    return apiClient.get(`/contractors/projects/${projectId}/shortlist`)
  },

  getTimeline(projectId: string) {
    return apiClient.get(`/contractors/projects/${projectId}/timeline`)
  },

  submitUpdate(projectId: string, payload: FieldUpdatePayload) {
    return apiClient.post(`/contractors/projects/${projectId}/updates`, payload)
  },
}
