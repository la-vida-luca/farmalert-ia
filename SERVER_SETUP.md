# FarmAlert IA Server Setup Guide

## Overview
This is a production-grade Node.js/Express server with PostgreSQL database support, JWT authentication, and real-time weather integration via OpenWeatherMap API.

## Prerequisites
- Node.js 18+ 
- PostgreSQL 12+ database
- OpenWeatherMap API key

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `OWM_API_KEY` or `OPENWEATHER_API_KEY` - OpenWeatherMap API key
- `JWT_SECRET` - Secret key for JWT token signing (change in production!)

Optional variables:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `JWT_EXPIRES_IN` - Token expiration (default: 24h)
- `CORS_ORIGINS` - Comma-separated allowed origins (default: *)
- `LOG_FORMAT` - Morgan log format (default: tiny)
- `SALT_ROUNDS` - Bcrypt salt rounds (default: 10)

### 3. Start the Server
```bash
npm start
```

The server will:
1. Connect to PostgreSQL
2. Run database migrations automatically
3. Create tables if they don't exist
4. Start listening on the configured port

## Database Schema

### users
- `id` (UUID, PK) - User identifier
- `email` (TEXT, UNIQUE) - User email
- `password_hash` (TEXT) - Bcrypt hashed password
- `name` (TEXT) - User's full name
- `role` (TEXT) - 'farmer' or 'admin'
- `phone` (TEXT) - Phone number
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

### farms
- `id` (UUID, PK) - Farm identifier
- `owner_id` (UUID, FK) - References users(id)
- `name` (TEXT) - Farm name
- `latitude` (DOUBLE PRECISION) - GPS latitude
- `longitude` (DOUBLE PRECISION) - GPS longitude
- `area_ha` (DOUBLE PRECISION) - Area in hectares
- `crop_type` (TEXT) - Type of crop
- `city` (TEXT) - City name
- `region` (TEXT) - Region name
- `country` (TEXT) - Country name
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

### weather_cache
- `farm_id` (UUID, PK, FK) - References farms(id)
- `data` (JSONB) - Cached weather data
- `fetched_at` (TIMESTAMPTZ) - Last fetch timestamp

## API Endpoints

### Authentication
**POST /api/auth/register**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "phone": "+33123456789"
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### User Profile
**GET /api/users/me**
- Requires: `Authorization: Bearer <token>`

### Farms
**POST /api/farms** - Create farm
```json
{
  "name": "My Farm",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "area_ha": 100.5,
  "crop_type": "wheat",
  "city": "Paris",
  "region": "Île-de-France",
  "country": "France"
}
```

**GET /api/farms** - List farms (user's farms or all for admin)

**GET /api/farms/:id** - Get specific farm

**DELETE /api/farms/:id** - Delete farm

### Weather
**GET /api/farms/:id/weather** - Get weather data for farm

### Health Check
**GET /health** - Server health status

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: 600 requests per 15 minutes per IP
- **Helmet**: Security headers for Express
- **CORS**: Configurable cross-origin resource sharing
- **Bcrypt**: Password hashing with configurable salt rounds
- **Input Validation**: Validates coordinates and required fields

## Production Deployment

### Railway / Heroku / Similar PaaS
1. Set environment variables in the platform dashboard
2. Ensure PostgreSQL addon is provisioned
3. Set `NODE_ENV=production`
4. The `DATABASE_URL` will be automatically provided by the platform

### Manual Deployment
1. Configure PostgreSQL database
2. Set all required environment variables
3. Run `npm install --production`
4. Start with `npm start` or use a process manager like PM2

## Monitoring

- Health check endpoint: `GET /health`
- Returns: `{ ok: true, uptime: <seconds>, ts: <ISO timestamp> }`

## Troubleshooting

### Connection Issues
- Verify `DATABASE_URL` is correctly formatted
- Check PostgreSQL is running and accessible
- Ensure firewall rules allow connection

### Migration Errors
- Check PostgreSQL user has CREATE EXTENSION privileges
- Verify user has table creation permissions
- Check logs for specific error messages

### Authentication Errors
- Verify `JWT_SECRET` is set
- Check token is properly formatted in Authorization header
- Ensure token hasn't expired

## Development

To run in development mode with auto-reload:
```bash
npm install -g nodemon
nodemon server.js
```

## License
See LICENSE file in repository root.
