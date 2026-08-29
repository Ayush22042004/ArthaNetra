import apiClient from './apiClient'

export interface AssistantResponse {
  answer: string
  mode: 'data-grounded' | 'gemini-grounded'
  route?: string | null
  suggestions: string[]
  context?: unknown
}

export const assistantAPI = {
  chat: async ({
    question,
    route,
    pageContext,
  }: {
    question: string
    route?: string
    pageContext?: string
  }): Promise<AssistantResponse> => {
    const response = await apiClient.post('/assistant/chat', {
      question,
      route,
      pageContext,
    })

    return response?.data || response
  },
}
