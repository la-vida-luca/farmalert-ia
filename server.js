const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all Netlify URLs and localhost
    if (origin.endsWith('.netlify.app') || 
        origin === 'http://localhost:3000' ||
        origin === 'https://farmalert.netlify.app' ||
        origin === 'https://fermalertia.netlify.app') {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
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
