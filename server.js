const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['https://farmalert.netlify.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  // TODO: Implement user registration logic
  res.status(201).json({ 
    success: true, 
    message: 'User registered successfully',
    user: { email, name }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  // TODO: Implement authentication logic
  res.json({ 
    success: true, 
    message: 'Login successful',
    token: 'sample-jwt-token',
    user: { email }
  });
});

// Farm routes (CRUD)
app.get('/api/farms', (req, res) => {
  // TODO: Fetch farms from database
  res.json({ 
    success: true,
    farms: []
  });
});

app.post('/api/farms', (req, res) => {
  const { name, location, size, crops } = req.body;
  // TODO: Create farm in database
  res.status(201).json({ 
    success: true,
    message: 'Farm created successfully',
    farm: { id: Date.now(), name, location, size, crops }
  });
});

app.get('/api/farms/:id', (req, res) => {
  const { id } = req.params;
  // TODO: Fetch specific farm from database
  res.json({ 
    success: true,
    farm: { id, name: 'Sample Farm' }
  });
});

app.put('/api/farms/:id', (req, res) => {
  const { id } = req.params;
  const { name, location, size, crops } = req.body;
  // TODO: Update farm in database
  res.json({ 
    success: true,
    message: 'Farm updated successfully',
    farm: { id, name, location, size, crops }
  });
});

app.delete('/api/farms/:id', (req, res) => {
  const { id } = req.params;
  // TODO: Delete farm from database
  res.json({ 
    success: true,
    message: 'Farm deleted successfully'
  });
});

// Weather routes
app.get('/api/weather/:location', (req, res) => {
  const { location } = req.params;
  // TODO: Fetch weather data from external API
  res.json({ 
    success: true,
    location,
    weather: {
      temperature: 22,
      humidity: 65,
      conditions: 'Partly cloudy',
      forecast: []
    }
  });
});

app.post('/api/weather/alerts', (req, res) => {
  const { farmId, alertType } = req.body;
  // TODO: Create weather alert
  res.status(201).json({ 
    success: true,
    message: 'Weather alert created',
    alert: { farmId, alertType, timestamp: new Date() }
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'FarmAlert API is running',
    version: '1.0.0',
    endpoints: {
      auth: ['/api/auth/register', '/api/auth/login'],
      farms: ['/api/farms', '/api/farms/:id'],
      weather: ['/api/weather/:location', '/api/weather/alerts']
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

app.listen(PORT, () => {
  console.log(`FarmAlert server running on port ${PORT}`);
});
