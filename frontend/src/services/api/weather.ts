import apiClient from './apiClient'

export interface WeatherSignal {
  label: string
  latitude: number
  longitude: number
  current: {
    temperature_2m?: number
    precipitation?: number
    rain?: number
    wind_speed_10m?: number
    weather_code?: number
  }
  daily: {
    precipitation_probability_max?: number[]
    precipitation_sum?: number[]
  }
  units: {
    temperature: string
    precipitation: string
    wind: string
  }
  risk: {
    level: 'LOW' | 'MEDIUM' | 'HIGH'
    reason: string
  }
  cached: boolean
  fetchedAt: string
}

export const weatherAPI = {
  getForecast: async ({
    lat,
    lng,
    label,
  }: {
    lat: number
    lng: number
    label?: string
  }): Promise<WeatherSignal> => {
    const response = await apiClient.get('/weather/forecast', {
      params: { lat, lng, label },
      skipErrorToast: true,
    })

    return response?.data || response
  },
}
