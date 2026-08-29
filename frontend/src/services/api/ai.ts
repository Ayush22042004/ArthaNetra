import apiClient from './apiClient'

export interface RiskProject {
  workId: number | string
  name: string
  category?: string
  constituency?: string
  riskScore: number
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  utilization: number
  allocated: number
  expenditure: number
  reasons: string[]
}

export interface RiskAnalysisResponse {
  success: boolean
  message: string

  data: {
    totalWorks: number
    highRiskCount: number
    mediumRiskCount: number
    lowRiskCount?: number

    highRiskProjects: RiskProject[]

    results: RiskProject[]
  }

  metadata: {
    completedWorks: number
    recommendedWorks: number
    totalWorksAnalyzed: number
    totalExpenditureRecords: number
  }

  lastUpdated: string
}

export const getRiskAnalysis = async (): Promise<RiskAnalysisResponse> => {
  return apiClient.get('/ai/risk-analysis')
}