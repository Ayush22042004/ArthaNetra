import { describe, expect, it } from 'vitest'
import { projectMetrics } from './projectMetrics'
describe('work count definitions', () => {
  it('treats recommended outstanding works as pending, not total', () => {
    expect(projectMetrics(300, 100)).toEqual({
      completed: 300,
      pending: 100,
      total: 400,
      completionRate: 75,
      pendingRate: 25,
    })
  })
  it('handles no works and completed-only portfolios', () => {
    expect(projectMetrics().completionRate).toBe(0)
    expect(projectMetrics(12, 0).completionRate).toBe(100)
  })
})
