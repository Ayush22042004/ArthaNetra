export function projectMetrics(completedInput = 0, pendingInput = 0) {
  const completed = Math.max(0, Number(completedInput) || 0)
  const pending = Math.max(0, Number(pendingInput) || 0)
  const total = completed + pending
  return {
    completed,
    pending,
    total,
    completionRate: total ? (completed / total) * 100 : 0,
    pendingRate: total ? (pending / total) * 100 : 0,
  }
}
