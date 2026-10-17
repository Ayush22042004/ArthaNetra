const { test } = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
process.env.JWT_SECRET = 'test-only-secret-not-for-deployment'
const database = require('../utils/database')
database.connectToDatabase = async () => ({
  collection: name => ({
    findOne: async query =>
      name === 'contractors'
        ? { contractorId: query.contractorId }
        : { contractorId: 'owner', projectId: query.projectId },
  }),
})
const { requireContractor, issueContractorToken } = require('../middleware/contractorAuth')
async function check(token, params = {}, query = {}) {
  let status,
    passed = false
  const res = {
    status(value) {
      status = value
      return this
    },
    json() {
      return this
    },
  }
  await requireContractor(
    { headers: { authorization: `Bearer ${token}` }, params, query },
    res,
    () => {
      passed = true
    }
  )
  return { status, passed }
}
test('field sessions are signed JWTs and reject forged, expired and authority tokens', async () => {
  const token = issueContractorToken('owner')
  assert.equal(
    jwt.verify(token, process.env.JWT_SECRET, { audience: 'arthanetra-field' }).contractorId,
    'owner'
  )
  assert.equal((await check(token)).passed, true)
  for (const invalid of [
    'predictable-old-hash',
    token + 'x',
    jwt.sign({ contractorId: 'owner', role: 'CONTRACTOR' }, process.env.JWT_SECRET, {
      audience: 'arthanetra-field',
      expiresIn: -1,
    }),
    jwt.sign({ role: 'admin' }, process.env.JWT_SECRET),
  ])
    assert.equal((await check(invalid)).status, 401)
})
test('contractors cannot access another account or assigned work', async () => {
  assert.equal((await check(issueContractorToken('attacker'), { projectId: 'work-1' })).status, 403)
  assert.equal(
    (await check(issueContractorToken('owner'), {}, { contractorId: 'other' })).status,
    403
  )
  assert.equal((await check(issueContractorToken('owner'), { projectId: 'work-1' })).passed, true)
})
