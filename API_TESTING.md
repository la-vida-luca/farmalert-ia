# API Testing Examples

This file contains example curl commands for testing the FarmAlert IA API endpoints.

## Prerequisites
- Server running (requires PostgreSQL database configured)
- OpenWeatherMap API key configured

## Health Check
```bash
# Check if server is running
curl http://localhost:3000/health
```

Expected response:
```json
{
  "ok": true,
  "uptime": 123.45,
  "ts": "2024-01-01T12:00:00.000Z"
}
```

## Authentication

### Register New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com",
    "password": "securepassword123",
    "name": "Jean Dupont",
    "phone": "+33123456789"
  }'
```

Expected response:
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "farmer@example.com",
    "name": "Jean Dupont",
    "role": "farmer",
    "phone": "+33123456789",
    "created_at": "2024-01-01T12:00:00.000Z"
  },
  "token": "jwt-token-here"
}
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com",
    "password": "securepassword123"
  }'
```

Expected response:
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "farmer@example.com",
    "name": "Jean Dupont",
    "role": "farmer",
    "phone": "+33123456789"
  },
  "token": "jwt-token-here"
}
```

## User Profile

### Get Current User Profile
```bash
# Replace YOUR_JWT_TOKEN with the token from login/register
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "farmer@example.com",
    "name": "Jean Dupont",
    "role": "farmer",
    "phone": "+33123456789",
    "created_at": "2024-01-01T12:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

## Farm Management

### Create a Farm
```bash
curl -X POST http://localhost:3000/api/farms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ferme Bio de Normandie",
    "latitude": 49.1829,
    "longitude": -0.3707,
    "area_ha": 150.5,
    "crop_type": "wheat",
    "city": "Caen",
    "region": "Normandie",
    "country": "France"
  }'
```

Expected response:
```json
{
  "success": true,
  "farm": {
    "id": "uuid-here",
    "owner_id": "user-uuid",
    "name": "Ferme Bio de Normandie",
    "latitude": 49.1829,
    "longitude": -0.3707,
    "area_ha": 150.5,
    "crop_type": "wheat",
    "city": "Caen",
    "region": "Normandie",
    "country": "France",
    "created_at": "2024-01-01T12:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

### List All Farms
```bash
curl http://localhost:3000/api/farms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "farms": [
    {
      "id": "uuid-here",
      "owner_id": "user-uuid",
      "name": "Ferme Bio de Normandie",
      "latitude": 49.1829,
      "longitude": -0.3707,
      "area_ha": 150.5,
      "crop_type": "wheat",
      "city": "Caen",
      "region": "Normandie",
      "country": "France",
      "created_at": "2024-01-01T12:00:00.000Z",
      "updated_at": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### Get Specific Farm
```bash
# Replace FARM_ID with the farm's UUID
curl http://localhost:3000/api/farms/FARM_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "farm": {
    "id": "uuid-here",
    "owner_id": "user-uuid",
    "name": "Ferme Bio de Normandie",
    "latitude": 49.1829,
    "longitude": -0.3707,
    "area_ha": 150.5,
    "crop_type": "wheat",
    "city": "Caen",
    "region": "Normandie",
    "country": "France",
    "created_at": "2024-01-01T12:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

### Delete a Farm
```bash
# Replace FARM_ID with the farm's UUID
curl -X DELETE http://localhost:3000/api/farms/FARM_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "success": true
}
```

## Weather

### Get Weather for a Farm
```bash
# Replace FARM_ID with the farm's UUID
curl http://localhost:3000/api/farms/FARM_ID/weather \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response (simplified - actual response includes full OpenWeatherMap data):
```json
{
  "success": true,
  "weather": {
    "coord": {
      "lon": -0.3707,
      "lat": 49.1829
    },
    "weather": [
      {
        "id": 800,
        "main": "Clear",
        "description": "ciel dégagé",
        "icon": "01d"
      }
    ],
    "main": {
      "temp": 18.5,
      "feels_like": 17.8,
      "temp_min": 17.2,
      "temp_max": 19.5,
      "pressure": 1013,
      "humidity": 65
    },
    "wind": {
      "speed": 3.5,
      "deg": 250
    },
    "name": "Caen"
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "email and password required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Farm not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Testing Workflow

1. **Check server health**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Register a new user**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
   ```

3. **Save the token from the response**
   ```bash
   export TOKEN="paste-your-token-here"
   ```

4. **Create a farm**
   ```bash
   curl -X POST http://localhost:3000/api/farms \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Farm","latitude":48.8566,"longitude":2.3522}'
   ```

5. **Save the farm ID from the response**
   ```bash
   export FARM_ID="paste-farm-id-here"
   ```

6. **Get weather for the farm**
   ```bash
   curl http://localhost:3000/api/farms/$FARM_ID/weather \
     -H "Authorization: Bearer $TOKEN"
   ```

7. **List all farms**
   ```bash
   curl http://localhost:3000/api/farms \
     -H "Authorization: Bearer $TOKEN"
   ```

## Production Testing

For production deployments (e.g., Railway), replace `http://localhost:3000` with your production URL:

```bash
export API_URL="https://farmalert-ia-production.up.railway.app"
curl $API_URL/health
```
