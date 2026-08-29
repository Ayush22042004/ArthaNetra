import apiClient from './apiClient'

export interface ProjectImage {
  id?: number | string
  alt?: string
  photographer?: string
  thumbnail?: string
  original?: string
}

export const projectImagesAPI = {
  search: async (query: string, signal?: AbortSignal): Promise<ProjectImage[]> => {
    const response = await apiClient.get('/project-images', {
      params: { query },
      signal,
      skipErrorToast: true,
    })

    return response?.data?.items || response?.items || []
  },
}
