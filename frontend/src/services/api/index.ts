export { default as apiClient } from './apiClient'
export { summaryAPI } from './summary'
export { mpladsAPI } from './mplads'
export { worksAPI } from './works'
export { analyticsAPI } from './analytics'
export { expendituresAPI } from './expenditures'
export { weatherAPI } from './weather'
export { assistantAPI } from './assistant'

import { summaryAPI } from './summary'
import { mpladsAPI } from './mplads'
import { worksAPI } from './works'
import { analyticsAPI } from './analytics'
import { expendituresAPI } from './expenditures'
import { weatherAPI } from './weather'
import { assistantAPI } from './assistant'

// Re-export all APIs as a single object for convenience
export const api = {
  summary: summaryAPI,
  mplads: mpladsAPI,
  works: worksAPI,
  analytics: analyticsAPI,
  expenditures: expendituresAPI,
  weather: weatherAPI,
  assistant: assistantAPI,
}
