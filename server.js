const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OWM_API_KEY = process.env.OWM_API_KEY || process.env.OPENWEATHER_API_KEY;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ---------------- Weather Service Helpers ----------------
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

function buildQuery(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function owmGet(path, params) {
  if (!OWM_API_KEY) throw new Error('OWM_API_KEY not configured');
  const qs = buildQuery({ ...params, appid: OWM_API_KEY });
  const url = `${OWM_BASE}${path}?${qs}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenWeatherMap error ${resp.status}: ${text}`);
  }
  return resp.json();
}

function normalizeCurrentWeather(d) {
  return {
    coord: d.coord,
    weather: d.weather,
    main: {
      temp: d.main.temp,
      feels_like: d.main.feels_like,
      pressure: d.main.pressure,
      humidity: d.main.humidity,
      temp_min: d.main.temp_min,
      temp_max: d.main.temp_max
    },
    wind: d.wind,
    rain: d.rain,
    snow: d.snow,
    clouds: d.clouds,
    sys: d.sys,
    name: d.name,
    dt: d.dt,
    timezone: d.timezone
  };
}

function normalizeForecast(d) {
  return {
    city: d.city,
    cnt: d.cnt,
    list: d.list.map(item => ({
      dt: item.dt,
      main: item.main,
      weather: item.weather,
      clouds: item.clouds,
      wind: item.wind,
      visibility: item.visibility,
      pop: item.pop,
      rain: item.rain,
      snow: item.snow,
      dt_txt: item.dt_txt
    }))
  };
}

// ---------------- Weather Endpoints ----------------
// Current weather by coordinates or city
app.get('/api/weather/current', async (req, res) => {
  try {
    const { lat, lon, city, units = 'metric', lang = 'fr' } = req.query;
    let data;
    if (lat && lon) {
      data = await owmGet('/weather', { lat, lon, units, lang });
    } else if (city) {
      data = await owmGet('/weather', { q: city, units, lang });
    } else {
      return res.status(400).json({ success: false, message: 'Provide lat/lon or city' });
    }
    res.json({ success: true, data: normalizeCurrentWeather(data) });
  } catch (err) {
    console.error('Current weather error:', err);
    res.status(500).json({ success: false, message: 'Weather service error', error: err.message });
  }
});

// 5 day / 3 hour forecast by coordinates or city
app.get('/api/weather/forecast', async (req, res) => {
  try {
    const { lat, lon, city, units = 'metric', lang = 'fr' } = req.query;
    let data;
    if (lat && lon) {
      data = await owmGet('/forecast', { lat, lon, units, lang });
    } else if (city) {
      data = await owmGet('/forecast', { q: city, units, lang });
    } else {
      return res.status(400).json({ success: false, message: 'Provide lat/lon or city' });
    }
    res.json({ success: true, data: normalizeForecast(data) });
  } catch (err) {
    console.error('Forecast error:', err);
    res.status(500).json({ success: false, message: 'Weather service error', error: err.message });
  }
});

// One Call 3.0 summary (current + minutely + hourly + daily) by coords
app.get('/api/weather/onecall', async (req, res) => {
  try {
    const { lat, lon, units = 'metric', lang = 'fr', exclude } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: 'Provide lat and lon' });
    }
    const data = await owmGet('/onecall', { lat, lon, units, lang, exclude });
    res.json({ success: true, data });
  } catch (err) {
    console.error('OneCall error:', err);
    res.status(500).json({ success: false, message: 'Weather service error', error: err.message });
  }
});

// ---------------- Existing API and DB setup (truncated for brevity) ----------------
// Migration script to clean and recreate database tables
const runMigration = async () => {
  try {
    console.log('Starting database migration...');
    // Drop existing tables (in reverse order due to foreign key constraints)
    await pool.query('DROP TABLE IF EXISTS farms CASCADE');
    console.log('Dropped farms table');

    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('Dropped users table');

    // Create users table with name as optional field
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created users table (name is optional)');

    // Create farms table
    await pool.query(`
      CREATE TABLE farms (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created farms table');

  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  }
};

// Example dashboard endpoint that now uses real weather for a farm
app.get('/api/dashboard/:farmId', async (req, res) => {
  try {
    const { farmId } = req.params;
    const { units = 'metric', lang = 'fr' } = req.query;
    const farmRes = await pool.query('SELECT id, name, location, latitude, longitude FROM farms WHERE id = $1', [farmId]);
    if (farmRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Farm not found' });
    }
    const farm = farmRes.rows[0];
    if (farm.latitude == null || farm.longitude == null) {
      return res.status(400).json({ success: false, message: 'Farm missing coordinates' });
    }

    const [current, forecast] = await Promise.all([
      owmGet('/weather', { lat: farm.latitude, lon: farm.longitude, units, lang }),
      owmGet('/forecast', { lat: farm.latitude, lon: farm.longitude, units, lang })
    ]);

    res.json({
      success: true,
      dashboard: {
        farm,
        weather: normalizeCurrentWeather(current),
        forecast: normalizeForecast(forecast)
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Dashboard error', error: err.message });
  }
});

// Root route
app.get('/', (req, res) => res.json({ message: 'API OK', status: 'running', version: '2.1.0' }));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
