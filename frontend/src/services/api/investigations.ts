import apiClient from './apiClient'
const config = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
})
export const investigationsAPI = {
  list: () => apiClient.get('/investigations', config()),
  reviewers: () => apiClient.get('/investigations/reviewers', config()),
  get: (id: string) => apiClient.get(`/investigations/${encodeURIComponent(id)}`, config()),
  create: (sourceType: string, sourceId: string, note: string) =>
    apiClient.post('/investigations', { sourceType, sourceId, note }, config()),
  update: (
    id: string,
    payload: { status: string; version: number; note: string; assignedTo?: string | null }
  ) => apiClient.patch(`/investigations/${encodeURIComponent(id)}`, payload, config()),
}
