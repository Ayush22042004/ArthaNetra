const jwt = require('jsonwebtoken')
const { connectToDatabase } = require('../utils/database')

const issueContractorToken = contractorId => {
  if (!process.env.JWT_SECRET)
    throw Object.assign(new Error('Authentication is not configured.'), { statusCode: 503 })
  return jwt.sign({ contractorId, role: 'CONTRACTOR' }, process.env.JWT_SECRET, {
    audience: 'arthanetra-field',
    expiresIn: '8h',
  })
}

async function requireContractor(req, res, next) {
  try {
    if (!process.env.JWT_SECRET)
      return res.status(503).json({ error: 'Authentication is not configured.' })
    const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1]
    const claims = jwt.verify(token || '', process.env.JWT_SECRET, {
      audience: 'arthanetra-field',
      algorithms: ['HS256'],
    })
    const db = await connectToDatabase()
    const contractor = await db
      .collection('contractors')
      .findOne({ contractorId: claims.contractorId, isActive: { $ne: false } })
    if (claims.role !== 'CONTRACTOR' || !contractor)
      return res.status(401).json({ error: 'Contractor account is unavailable. Sign in again.' })
    if (req.query.contractorId && req.query.contractorId !== contractor.contractorId)
      return res
        .status(403)
        .json({ error: 'This contractor account cannot access another contractor.' })
    if (req.params.projectId) {
      const project = await db
        .collection('contractor_projects')
        .findOne({ projectId: req.params.projectId })
      if (!project || project.contractorId !== contractor.contractorId)
        return res.status(403).json({ error: 'This work is not assigned to your account.' })
    }
    req.contractor = contractor
    next()
  } catch (error) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
      return res.status(401).json({ error: 'Your contractor session has expired. Sign in again.' })
    }
    next(error)
  }
}
module.exports = { issueContractorToken, requireContractor }
