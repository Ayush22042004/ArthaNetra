const { test } = require('node:test')
const assert = require('node:assert/strict')
const { buildTestingSite } = require('../services/testingSite')
test('sandbox reference never mutates or claims to verify live fallback coordinates', () => {
  const original = {
    registeredLatitude: 19,
    registeredLongitude: 73,
    coordinateSource: 'state_centroid_fallback_not_official_site_gps',
  }
  const site = buildTestingSite(original)
  assert.equal(site.project.coordinateSource, 'sandbox_reference')
  assert.equal(site.reference.actualSiteVerified, false)
  assert.equal(original.coordinateSource, 'state_centroid_fallback_not_official_site_gps')
  assert.notEqual(site.project, original)
})
test('missing or invalid coordinates get an explicit fixed testing reference, not null-island', () => {
  for (const source of [
    {},
    { registeredLatitude: null, registeredLongitude: '' },
    { registeredLatitude: 200, registeredLongitude: 500 },
  ]) {
    const site = buildTestingSite(source)
    assert.equal(site.reference.latitude, 28.6139)
    assert.equal(site.reference.longitude, 77.209)
    assert.equal(site.reference.actualSiteVerified, false)
  }
})
