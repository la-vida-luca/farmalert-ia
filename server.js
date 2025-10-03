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

// In-memory storage for demo purposes
const users = [];
const farms = [];

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ 
      success: false, 
      message: 'User already exists'
    });
  }
  
  // Create new user
  const newUser = {
    id: users.length + 1,
    email,
    password, // In production, hash this!
    name,
    createdAt: new Date()
  };
  
  users.push(newUser);
  
  res.status(201).json({ 
    success: true, 
    message: 'User registered successfully',
    user: { id: newUser.id, email: newUser.email, name: newUser.name }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Find user
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid credentials'
    });
  }
  
  res.json({ 
    success: true, 
    message: 'Login successful',
    token: 'sample-jwt-token-' + user.id,
    user: { id: user.id, email: user.email, name: user.name }
  });
});

// Farm routes (CRUD)
app.get('/api/farms', (req, res) => {
  res.json({ 
    success: true, 
    farms: farms 
  });
});

app.post('/api/farms', (req, res) => {
  const { name, location, size, crops } = req.body;
  
  const newFarm = {
    id: farms.length + 1,
    name,
    location,
    size,
    crops,
    createdAt: new Date()
  };
  
  farms.push(newFarm);
  
  res.status(201).json({ 
    success: true, 
    message: 'Farm created successfully',
    farm: newFarm
  });
});

app.get('/api/farms/:id', (req, res) => {
  const farm = farms.find(f => f.id === parseInt(req.params.id));
  
  if (!farm) {
    return res.status(404).json({ 
      success: false, 
      message: 'Farm not found'
    });
  }
  
  res.json({ 
    success: true, 
    farm: farm 
  });
});

app.put('/api/farms/:id', (req, res) => {
  const farmIndex = farms.findIndex(f => f.id === parseInt(req.params.id));
  
  if (farmIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      message: 'Farm not found'
    });
  }
  
  const { name, location, size, crops } = req.body;
  farms[farmIndex] = {
    ...farms[farmIndex],
    name: name || farms[farmIndex].name,
    location: location || farms[farmIndex].location,
    size: size || farms[farmIndex].size,
    crops: crops || farms[farmIndex].crops,
    updatedAt: new Date()
  };
  
  res.json({ 
    success: true, 
    message: 'Farm updated successfully',
    farm: farms[farmIndex]
  });
});

app.delete('/api/farms/:id', (req, res) => {
  const farmIndex = farms.findIndex(f => f.id === parseInt(req.params.id));
  
  if (farmIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      message: 'Farm not found'
    });
  }
  
  farms.splice(farmIndex, 1);
  
  res.json({ 
    success: true, 
    message: 'Farm deleted successfully'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
