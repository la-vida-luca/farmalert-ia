// FarmAlert-IA Backend - Production-grade server.js
// Supports 1000+ farmers with full CRUD for farms, real-time weather per farm,
// secure user profiles, JWT auth, and observability.
// Node 18+, Express 5, PostgreSQL, OpenWeather, Helmet, Rate limiting, CORS

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const { Pool } = require('pg')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const fetch = require('node-fetch')

// App
const app = express()
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// Logging
const LOG_FORMAT = process.env.LOG_FORMAT || 'tiny'
app.use(morgan(LOG_FORMAT))

// Config
const PORT = process.env.PORT || 3000
const OWM_API_KEY = process.env.OWM_API_KEY || process.env.OPENWEATHER_API_KEY
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS || 10)

if (!process.env.DATABASE_URL) {
  // Soft warn; still attempt local dev via individual params
  console.warn('DATABASE_URL not set. Ensure DB env vars are configured.')
}

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_POOL_MAX || 20), // enough for 1000+ users with proper reuse
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT || 30000),
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT || 10000),
})

// Helpers
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

function authRequired(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' })
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' })
    req.user = user
    next()
  })
}

function requireSelfOrAdmin(req, res, next) {
  const { id } = req.params
  if (req.user.role === 'admin' || String(req.user.id) === String(id)) return next()
  return res.status(403).json({ success: false, message: 'Forbidden' })
}

// Basic rate limiter (per IP)
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_MAX || 600),
})
app.use('/api/', apiLimiter)

// DB bootstrap: create tables if not exist (idempotent)
async function migrate() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'farmer', -- 'farmer' | 'admin'
      phone TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS farms (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      area_ha DOUBLE PRECISION,
      crop_type TEXT,
      city TEXT,
      region TEXT,
      country TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_farms_owner ON farms(owner_id);

    CREATE TABLE IF NOT EXISTS weather_cache (
      farm_id UUID PRIMARY KEY REFERENCES farms(id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

// Validation helpers
function validateLatLng(lat, lon) {
  return (
    typeof lat === 'number' && lat >= -90 && lat <= 90 &&
    typeof lon === 'number' && lon >= -180 && lon <= 180
  )
}

function normalizeFarmInput(body) {
  const {
    name, latitude, longitude, area_ha, crop_type, city, region, country
  } = body
  return {
    name: String(name || '').trim(),
    latitude: typeof latitude === 'string' ? Number(latitude) : latitude,
    longitude: typeof longitude === 'string' ? Number(longitude) : longitude,
    area_ha: area_ha == null ? null : Number(area_ha),
    crop_type: crop_type ? String(crop_type).trim() : null,
    city: city ? String(city).trim() : null,
    region: region ? String(region).trim() : null,
    country: country ? String(country).trim() : null,
  }
}

// Auth routes
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { email, password, name, phone } = req.body
  if (!email || !password) return res.status(400).json({ success: false, message: 'email and password required' })
  const hash = await bcrypt.hash(password, SALT_ROUNDS)
  const { rows } = await pool.query(
    'INSERT INTO users(email, password_hash, name, phone) VALUES($1,$2,$3,$4) RETURNING id, email, name, role, phone, created_at',
    [email.toLowerCase(), hash, name || null, phone || null]
  )
  const user = rows[0]
  const token = signToken({ id: user.id, email: user.email, role: user.role })
  res.status(201).json({ success: true, user, token })
}))

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ success: false, message: 'email and password required' })
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
  const user = rows[0]
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' })
  const token = signToken({ id: user.id, email: user.email, role: user.role })
  res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone }, token })
}))

// User profile routes
app.get('/api/users/me', authRequired, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT id, email, name, role, phone, created_at, updated_at FROM users WHERE id = $1', [req.user.id])
  res.json({ success: true, user: rows[0] })
}))

app.patch('/api/users/:id', authRequired, requireSelfOrAdmin, asyncHandler(async (req, res) => {
  const { name, phone, password } = req.body
  let password_set = ''
  const params = []
  let idx = 1
  if (name !== undefined) { params.push(name); password_set += `name = $${idx++}, ` }
  if (phone !== undefined) { params.push(phone); password_set += `phone = $${idx++}, ` }
  if (password) {
    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    params.push(hash)
    password_set += `password_hash = $${idx++}, `
  }
  if (!password_set) return res.status(400).json({ success: false, message: 'No updates provided' })
  password_set = password_set.replace(/,\s*$/, '')
  params.push(req.params.id)
  const { rows } = await pool.query(
    `UPDATE users SET ${password_set}, updated_at = NOW() WHERE id = $${idx} RETURNING id, email, name, role, phone, created_at, updated_at`,
    params
  )
  res.json({ success: true, user: rows[0] })
}))

// Farms CRUD
app.post('/api/farms', authRequired, asyncHandler(async (req, res) => {
  const input = normalizeFarmInput(req.body)
  if (!input.name || !validateLatLng(input.latitude, input.longitude)) {
    return res.status(400).json({ success: false, message: 'Invalid name or coordinates' })
  }
  const { rows } = await pool.query(`
    INSERT INTO farms(owner_id, name, latitude, longitude, area_ha, crop_type, city, region, country)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `, [req.user.id, input.name, input.latitude, input.longitude, input.area_ha, input.crop_type, input.city, input.region, input.country])
  res.status(201).json({ success: true, farm: rows[0] })
}))

app.get('/api/farms', authRequired, asyncHandler(async (req, res) => {
  // Admin sees all, farmer sees own
  let rows
  if (req.user.role === 'admin') {
    ;({ rows } = await pool.query('SELECT * FROM farms ORDER BY created_at DESC LIMIT 1000'))
  } else {
    ;({ rows } = await pool.query('SELECT * FROM farms WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]))
  }
  res.json({ success: true, farms: rows })
}))

app.get('/api/farms/:id', authRequired, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM farms WHERE id = $1', [req.params.id])
  const farm = rows[0]
  if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' })
  if (req.user.role !== 'admin' && farm.owner_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Forbidden' })
  }
  res.json({ success: true, farm })
}))

app.patch('/api/farms/:id', authRequired, asyncHandler(async (req, res) => {
  const { rows: rows0 } = await pool.query('SELECT * FROM farms WHERE id = $1', [req.params.id])
  const farm0 = rows0[0]
  if (!farm0) return res.status(404).json({ success: false, message: 'Farm not found' })
  if (req.user.role !== 'admin' && farm0.owner_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' })

  const input = normalizeFarmInput(req.body)
  const sets = []
  const params = []
  let i = 1
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== '') { sets.push(`${k} = $${i++}`); params.push(v) }
  }
  if (!sets.length) return res.status(400).json({ success: false, message: 'No updates provided' })
  params.push(req.params.id)
  const { rows } = await pool.query(`UPDATE farms SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`, params)
  res.json({ success: true, farm: rows[0] })
}))

app.delete('/api/farms/:id', authRequired, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT owner_id FROM farms WHERE id = $1', [req.params.id])
  const farm = rows[0]
  if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' })
  if (req.user.role !== 'admin' && farm.owner_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' })
  await pool.query('DELETE FROM farms WHERE id = $1', [req.params.id])
  await pool.query('DELETE FROM weather_cache WHERE farm_id = $1', [req.params.id])
  res.json({ success: true })
}))

// Real-time weather per farm with short cache (to reduce API cost)
const WEATHER_TTL_MS = Number(process.env.WEATHER_TTL_MS || 5 * 60 * 1000)

async function fetchWeather(lat, lon) {
  if (!OWM_API_KEY) throw new Error('OpenWeather API key missing')
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=metric&lang=fr`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`OpenWeather error: ${resp.status}`)
  return resp.json()
}

app.get('/api/farms/:id/weather', authRequired, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT id, owner_id, latitude, longitude FROM farms WHERE id = $1', [req.params.id])
  const farm = rows[0]
  if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' })
  if (req.user.role !== 'admin' && farm.owner_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' })

  // Check cache
  const { rows: cw } = await pool.query('SELECT data, fetched_at FROM weather_cache WHERE farm_id = $1', [farm.id])
  const now = Date.now()
  if (cw[0]) {
    const age = now - new Date(cw[0].fetched_at).getTime()
    if (age < WEATHER_TTL_MS) {
      return res.json({ success: true, from_cache: true, weather: cw[0].data })
    }
  }
  // Fetch fresh
  const data = await fetchWeather(farm.latitude, farm.longitude)
  await pool.query(`
    INSERT INTO weather_cache(farm_id, data, fetched_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (farm_id)
    DO UPDATE SET data = EXCLUDED.data, fetched_at = NOW()
  `, [farm.id, data])
  res.json({ success: true, from_cache: false, weather: data })
}))

// Health and metrics
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime(), ts: new Date().toISOString() }))
