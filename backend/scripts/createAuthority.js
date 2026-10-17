require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const mongoose = require('mongoose')
const User = require('../models/User')

async function main() {
  const {
    AUTHORITY_EMAIL: email,
    AUTHORITY_PASSWORD: password,
    MONGODB_URI,
    DATABASE_NAME,
  } = process.env
  if (!email || !password || password.length < 12 || !MONGODB_URI)
    throw new Error(
      'Set AUTHORITY_EMAIL, AUTHORITY_PASSWORD (at least 12 characters) and MONGODB_URI. No default authority password is provided.'
    )
  await mongoose.connect(MONGODB_URI, DATABASE_NAME ? { dbName: DATABASE_NAME } : {})
  const existing = await User.findByEmail(email)
  if (existing) throw new Error('Account already exists. No permissions or password were changed.')
  await User.create({
    email,
    password,
    name: process.env.AUTHORITY_NAME || 'Authority Reviewer',
    role: 'admin',
    isActive: true,
  })
  console.info(
    'Authority account created. Sign in at /login using the configured email and password.'
  )
}
main()
  .catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
