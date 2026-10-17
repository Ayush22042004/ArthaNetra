const sharp = require('sharp')
const crypto = require('crypto')
const { analyzeImage } = require('./visionProvider')

const invalid = message => Object.assign(new Error(message), { statusCode: 400 })
const unassessed = summary => ({ status: 'UNASSESSED', score: null, summary })

function validateCapture(body, now = Date.now()) {
  for (const key of ['latitude', 'longitude', 'gpsAccuracy', 'progressPercent']) {
    if (
      body[key] === '' ||
      body[key] === null ||
      body[key] === undefined ||
      !['number', 'string'].includes(typeof body[key]) ||
      !Number.isFinite(Number(body[key]))
    ) {
      throw invalid(`${key} is required and must be numeric.`)
    }
  }
  if (Math.abs(Number(body.latitude)) > 90 || Math.abs(Number(body.longitude)) > 180)
    throw invalid('Invalid GPS coordinates.')
  if (Number(body.gpsAccuracy) <= 0 || Number(body.gpsAccuracy) > 250)
    throw invalid('GPS accuracy must be within 250 metres. Capture GPS again.')
  if (Number(body.progressPercent) < 0 || Number(body.progressPercent) > 100)
    throw invalid('Progress must be between 0 and 100.')
  const captured = Date.parse(body.gpsCapturedAt)
  if (!Number.isFinite(captured) || now - captured > 300000 || captured - now > 30000)
    throw invalid('A fresh GPS capture within five minutes is required.')
}

async function prepareImage(value) {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(value || ''))
  if (!match || match[2].length > 7000000)
    throw invalid('Upload a JPEG, PNG or WebP image smaller than 5 MB.')
  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.length > 5000000) throw invalid('Image must be smaller than 5 MB.')
  try {
    const image = sharp(bytes, { limitInputPixels: 16000000, failOn: 'warning' }).rotate()
    const metadata = await image.metadata()
    if (
      !['jpeg', 'png', 'webp'].includes(metadata.format) ||
      metadata.width < 160 ||
      metadata.height < 120 ||
      metadata.pages > 1
    )
      throw invalid('Use a clear, single site photograph at least 160 by 120 pixels.')
    const normalized = await image
      .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    const pixels = await sharp(normalized)
      .resize(9, 8, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer()
    let bits = ''
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) bits += pixels[y * 9 + x] > pixels[y * 9 + x + 1] ? '1' : '0'
    return {
      photoUrl: `data:image/jpeg;base64,${normalized.toString('base64')}`,
      perceptualHash: BigInt(`0b${bits}`).toString(16).padStart(16, '0'),
      evidenceFingerprint: crypto.createHash('sha256').update(normalized).digest('hex'),
    }
  } catch (error) {
    if (error.statusCode) throw error
    throw invalid('Image could not be decoded safely. Upload a valid photograph.')
  }
}

function similarity(a, b) {
  if (!/^[a-f0-9]{16}$/.test(a || '') || !/^[a-f0-9]{16}$/.test(b || '')) return 0
  const distance = (BigInt(`0x${a}`) ^ BigInt(`0x${b}`)).toString(2).replace(/0/g, '').length
  return Math.round((1 - distance / 64) * 100)
}

async function processEvidence(db, project, body) {
  validateCapture(body)
  const media = await prepareImage(body.photoUrl)
  const previous = await db
    .collection('work_updates')
    .find({ perceptualHash: { $exists: true } })
    .project({ perceptualHash: 1, updateId: 1, projectId: 1 })
    .sort({ serverUploadTime: -1 })
    .limit(2000)
    .toArray()
  const matches = previous
    .map(item => ({ ...item, similarity: similarity(media.perceptualHash, item.perceptualHash) }))
    .sort((a, b) => b.similarity - a.similarity)
  const matched = matches[0]
  const duplicateDetected = Boolean(matched && matched.similarity >= 94)
  const duplicateCheck = {
    status: duplicateDetected ? 'REVIEW_REQUIRED' : 'UNIQUE',
    score: duplicateDetected ? 0 : 100,
    duplicateDetected,
    similarity: matched?.similarity || 0,
    matchedUpdateId: duplicateDetected ? matched.updateId : null,
    summary: `Perceptual comparison against ${previous.length} recent processed images. Historical images without a hash are not assessed.`,
  }
  const radians = n => (n * Math.PI) / 180
  const lat1 = Number(project.registeredLatitude),
    lng1 = Number(project.registeredLongitude)
  const a =
    Math.sin(radians(Number(body.latitude) - lat1) / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(Number(body.latitude))) *
      Math.sin(radians(Number(body.longitude) - lng1) / 2) ** 2
  const distanceMetres = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
  const exact =
    !String(project.coordinateSource || '').includes('fallback') &&
    Number.isFinite(lat1) &&
    Number.isFinite(lng1)
  const geoVerification = !exact
    ? unassessed(
        'Exact site coordinates are unavailable; a regional fallback cannot verify site location.'
      )
    : {
        distanceMetres: Math.round(distanceMetres),
        score: distanceMetres <= 250 ? 100 : distanceMetres <= 1000 ? 50 : 0,
        status:
          distanceMetres <= 250
            ? 'VERIFIED'
            : distanceMetres <= 1000
              ? 'REVIEW_REQUIRED'
              : 'LOCATION_MISMATCH',
        summary:
          'Compared browser-reported GPS with registered coordinates. Browser GPS is not tamper-proof.',
      }
  const imageVerification = await analyzeImage(project, body, media.photoUrl)
  const movement = Number(body.progressPercent) - Number(project.progressPercent || 0)
  const issues = []
  if (movement < 0 || movement > 20)
    issues.push('Declared progress changed unusually; authority review required.')
  if (imageVerification.progressPlausible === false)
    issues.push('Visible evidence does not support the declared progress.')
  const capture = Date.parse(body.clientCaptureTime)
  if (!Number.isFinite(capture) || Date.now() - capture > 86400000 || capture > Date.now() + 30000)
    issues.push(
      'Photo capture time is missing, old or inconsistent. Client metadata is not proof of freshness.'
    )
  const progressVerification = issues.length
    ? { status: 'REVIEW_REQUIRED', score: 40, issues }
    : typeof imageVerification.progressPlausible !== 'boolean'
      ? {
          ...unassessed(
            'The image cannot establish the declared progress. An authority must review it.'
          ),
          issues,
        }
      : { status: 'CONSISTENT', score: 100, issues }
  const unavailable =
    geoVerification.score === null ||
    imageVerification.score === null ||
    progressVerification.score === null
  const score = unavailable
    ? null
    : Math.round(
        geoVerification.score * 0.35 +
          imageVerification.score * 0.3 +
          duplicateCheck.score * 0.2 +
          progressVerification.score * 0.15
      )
  const serious =
    imageVerification.status === 'SUSPICIOUS' || geoVerification.status === 'LOCATION_MISMATCH'
  const verificationStatus = serious
    ? 'SUSPICIOUS'
    : unavailable
      ? 'UNASSESSED'
      : duplicateDetected ||
          issues.length ||
          score < 80 ||
          imageVerification.status !== 'VERIFIED' ||
          geoVerification.status !== 'VERIFIED'
        ? 'REVIEW_REQUIRED'
        : 'VERIFIED'
  return {
    ...media,
    geoVerification,
    imageVerification,
    duplicateCheck,
    progressVerification,
    overallVerificationScore: score,
    verificationStatus,
    strictVerificationVersion: 3,
  }
}

let activeVerifications = 0
async function verifyEvidence(db, project, body) {
  if (activeVerifications >= 2)
    throw Object.assign(new Error('Evidence verification is busy. Please retry shortly.'), {
      statusCode: 429,
    })
  activeVerifications += 1
  try {
    return await processEvidence(db, project, body)
  } finally {
    activeVerifications -= 1
  }
}

module.exports = { verifyEvidence, validateCapture, prepareImage, similarity, analyzeImage }
