const IMAGE_CACHE_TTL_MS = 30 * 60 * 1000
const imageCache = new Map()

const normalizeQuery = value =>
  String(value || 'public infrastructure construction')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)

const fetchProjectImages = async queryInput => {
  const query = normalizeQuery(queryInput)
  const apiKey = process.env.PEXELS_API_KEY

  if (!apiKey) {
    return {
      items: [],
      source: 'Pexels',
      message: 'PEXELS_API_KEY is not configured',
    }
  }

  const cacheKey = query.toLowerCase()
  const cached = imageCache.get(cacheKey)

  if (cached && Date.now() - cached.cachedAt < IMAGE_CACHE_TTL_MS) {
    return {
      ...cached.data,
      cached: true,
    }
  }

  const params = new URLSearchParams({
    query,
    per_page: '9',
    orientation: 'landscape',
  })

  const response = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
    headers: {
      Authorization: apiKey,
      'User-Agent': 'ArthaNetra/1.0',
    },
  })

  if (!response.ok) {
    const error = new Error('Project image provider request failed')
    error.statusCode = response.status
    throw error
  }

  const payload = await response.json()
  const items = (payload.photos || [])
    .map(photo => ({
      id: photo.id,
      alt: photo.alt || query,
      photographer: photo.photographer,
      thumbnail: photo.src?.medium || photo.src?.large || photo.src?.original,
      original: photo.src?.large2x || photo.src?.original || photo.src?.large,
    }))
    .filter(item => item.thumbnail || item.original)

  const data = {
    items,
    source: 'Pexels',
    query,
    cached: false,
  }

  imageCache.set(cacheKey, {
    cachedAt: Date.now(),
    data,
  })

  return data
}

module.exports = {
  fetchProjectImages,
}
