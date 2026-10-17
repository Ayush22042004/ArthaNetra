import { describe, expect, it } from 'vitest'
import { verificationOutcome } from './verificationOutcome'
describe('verification outcome presentation', () => {
  it('prioritizes a known image mismatch even when other signals are unavailable', () => {
    expect(verificationOutcome(null, 'SUSPICIOUS')).toBe('Review required')
    expect(verificationOutcome(61, 'SUSPICIOUS')).toBe('Review required')
  })
  it('does not fabricate missing or zero scores', () => {
    expect(verificationOutcome(null, 'UNASSESSED')).toBe('Incomplete checks')
    expect(verificationOutcome(0, 'REVIEW_REQUIRED')).toBe('0/100')
    expect(verificationOutcome(92, 'VERIFIED')).toBe('92/100')
  })
})
