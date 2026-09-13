const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000
const weatherCache = new Map()

const toNumber = value => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const cacheKeyFor = (lat, lng) => `${lat.toFixed(2)},${lng.toFixed(2)}`

const classifyWeatherRisk = payload => {
  const current = payload.current || {}
  const daily = payload.daily || {}
  const precipitation = toNumber(current.precipitation) || toNumber(current.rain) || 0
  const wind = toNumber(current.wind_speed_10m) || 0
  const precipitationProbability = Math.max(
    ...((daily.precipitation_probability_max || []).map(value => toNumber(value) || 0)),
    0
  )
  const precipitationSum = Math.max(
    ...((daily.precipitation_sum || []).map(value => toNumber(value) || 0)),
    0
  )

  if (precipitationProbability >= 70 || precipitationSum >= 25 || wind >= 45) {
    return {
      level: 'HIGH',
      reason:
        'Weather alert: heavy rain or high wind may delay site progress and field verification.',
    }
  }

  if (precipitationProbability >= 40 || precipitation >= 2 || precipitationSum >= 8 || wind >= 30) {
    return {
      level: 'MEDIUM',
      reason:
        'Weather watch: rainfall or wind may affect outdoor work milestones in the next 72 hours.',
    }
  }

  return {
    level: 'LOW',
    reason: 'Weather clear: no major weather disruption signal for current milestone progress.',
  }
}

const buildFallbackWeatherSignal = ({ latitude, longitude, label, statusCode }) => ({
  label: label || 'Selected MPLADS site',
  latitude,
  longitude,
  current: {
    temperature_2m: null,
    precipitation: null,
    rain: null,
    wind_speed_10m: null,
    weather_code: null,
  },
  daily: {
    precipitation_probability_max: [],
    precipitation_sum: [],
  },
  units: {
    temperature: 'C',
    precipitation: 'mm',
    wind: 'km/h',
  },
  risk: {
    level: 'MEDIUM',
    reason:
      statusCode === 429
        ? 'Weather review: live provider rate limit reached, so field teams should manually verify local conditions before milestone release.'
        : 'Weather review: live provider is unavailable, so field teams should manually verify local conditions before milestone release.',
  },
  cached: false,
  providerUnavailable: true,
  providerStatusCode: statusCode || null,
  fetchedAt: new Date().toISOString(),
})

const summarizeWttrDaily = day => {
  const hourly = Array.isArray(day?.hourly) ? day.hourly : []
  const rainChances = hourly.map(entry => toNumber(entry.chanceofrain) || 0)
  const rainAmounts = hourly.map(entry => toNumber(entry.precipMM) || 0)

  return {
    probability: rainChances.length ? Math.max(...rainChances) : 0,
    precipitation: rainAmounts.reduce((total, value) => total + value, 0),
  }
}

const fetchWttrForecast = async ({ latitude, longitude, label, primaryStatusCode }) => {
  const url = `https://wttr.in/${latitude},${longitude}?format=j1`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ArthaNetra-MPLADS/1.0 (weather fallback)',
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const error = new Error('Secondary weather provider request failed')
    error.statusCode = response.status
    throw error
  }

  const payload = await response.json()
  const current = payload.current_condition?.[0] || {}
  const dailyRows = Array.isArray(payload.weather) ? payload.weather.slice(0, 3) : []
  const dailySummary = dailyRows.map(summarizeWttrDaily)

  const normalizedPayload = {
    current: {
      temperature_2m: toNumber(current.temp_C),
      precipitation: toNumber(current.precipMM),
      rain: toNumber(current.precipMM),
      wind_speed_10m: toNumber(current.windspeedKmph),
      weather_code: toNumber(current.weatherCode),
    },
    daily: {
      precipitation_probability_max: dailySummary.map(day => day.probability),
      precipitation_sum: dailySummary.map(day => Number(day.precipitation.toFixed(2))),
    },
  }

  return {
    label: label || 'Selected MPLADS site',
    latitude,
    longitude,
    current: normalizedPayload.current,
    daily: normalizedPayload.daily,
    units: {
      temperature: 'C',
      precipitation: 'mm',
      wind: 'km/h',
    },
    risk: classifyWeatherRisk(normalizedPayload),
    cached: false,
    provider: 'wttr.in',
    primaryProviderStatusCode: primaryStatusCode || null,
    fetchedAt: new Date().toISOString(),
  }
}

const fetchFallbackWeather = async ({ latitude, longitude, label, statusCode }) => {
  try {
    return await fetchWttrForecast({
      latitude,
      longitude,
      label,
      primaryStatusCode: statusCode,
    })
  } catch (error) {
    return buildFallbackWeatherSignal({ latitude, longitude, label, statusCode })
  }
}

const fetchWeatherForecast = async ({ lat, lng, label }) => {
  const latitude = toNumber(lat)
  const longitude = toNumber(lng)

  if (latitude === null || longitude === null) {
    const error = new Error('Valid latitude and longitude are required')
    error.statusCode = 400
    throw error
  }

  const key = cacheKeyFor(latitude, longitude)
  const cached = weatherCache.get(key)

  if (cached && Date.now() - cached.cachedAt < WEATHER_CACHE_TTL_MS) {
    return {
      ...cached.data,
      cached: true,
      label: label || cached.data.label,
    }
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,precipitation,rain,weather_code,wind_speed_10m',
    daily: 'precipitation_probability_max,precipitation_sum',
    forecast_days: '3',
    timezone: 'auto',
  })

  let response
  try {
    response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
  } catch (error) {
    const fallback = await fetchFallbackWeather({ latitude, longitude, label })
    weatherCache.set(key, {
      cachedAt: Date.now(),
      data: fallback,
    })
    return fallback
  }

  if (!response.ok) {
    const fallback = await fetchFallbackWeather({
      latitude,
      longitude,
      label,
      statusCode: response.status,
    })
    weatherCache.set(key, {
      cachedAt: Date.now(),
      data: fallback,
    })
    return fallback
  }

  const payload = await response.json()
  const risk = classifyWeatherRisk(payload)

  const data = {
    label: label || 'Selected MPLADS site',
    latitude,
    longitude,
    current: payload.current || {},
    daily: payload.daily || {},
    units: {
      temperature: payload.current_units?.temperature_2m || 'C',
      precipitation: payload.current_units?.precipitation || 'mm',
      wind: payload.current_units?.wind_speed_10m || 'km/h',
    },
    risk,
    cached: false,
    provider: 'open-meteo',
    fetchedAt: new Date().toISOString(),
  }

  weatherCache.set(key, {
    cachedAt: Date.now(),
    data,
  })

  return data
}

module.exports = {
  fetchWeatherForecast,
}
