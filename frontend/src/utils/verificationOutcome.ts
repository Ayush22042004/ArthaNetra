export function verificationOutcome(score: number | null | undefined, status: string) {
  if (status === 'SUSPICIOUS') return 'Review required'
  if (score == null) return 'Incomplete checks'
  return `${score}/100`
}
