require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const sharp = require('sharp')
const path = require('path')
const { analyzeImage, getVisionStatus } = require('../services/visionProvider')

async function main() {
  const project = {
    title: 'Building construction: reinforced concrete structure',
    category: 'Building construction',
    progressPercent: 30,
  }
  const results = []
  for (const [name, filename, expected] of [
    ['construction photograph', 'site-construction.jpg', true],
    ['worker illustration', 'unrelated-worker.svg', false],
  ]) {
    const image = await sharp(path.resolve(__dirname, '../fixtures', filename))
      .resize({ width: 640, height: 640, fit: 'inside' })
      .jpeg()
      .toBuffer()
    const result = await analyzeImage(
      project,
      { progressPercent: 35 },
      `data:image/jpeg;base64,${image.toString('base64')}`
    )
    results.push({
      fixture: name,
      passed: result.projectMatch === expected && !result.errorCode,
      model: result.model,
      projectMatch: result.projectMatch,
      confidence: result.confidence,
      visibleStage: result.detectedStage,
      summary: result.summary,
      errorCode: result.errorCode,
      attempts: result.attempts,
    })
  }
  console.info(
    JSON.stringify(
      { passed: results.every(result => result.passed), provider: getVisionStatus(), results },
      null,
      2
    )
  )
  if (!results.every(result => result.passed)) process.exitCode = 1
}
main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
