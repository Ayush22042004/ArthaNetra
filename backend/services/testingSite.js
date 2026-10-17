function buildTestingSite(project) {
  const latitude = Number(project.registeredLatitude)
  const longitude = Number(project.registeredLongitude)
  const present = value => value !== null && value !== undefined && value !== ''
  const valid =
    present(project.registeredLatitude) &&
    present(project.registeredLongitude) &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  const reference = {
    latitude: valid ? latitude : 28.6139,
    longitude: valid ? longitude : 77.209,
    source: 'synthetic_testing_reference',
    actualSiteVerified: false,
  }
  return {
    reference,
    project: {
      ...project,
      registeredLatitude: reference.latitude,
      registeredLongitude: reference.longitude,
      coordinateSource: 'sandbox_reference',
    },
  }
}

module.exports = { buildTestingSite }
