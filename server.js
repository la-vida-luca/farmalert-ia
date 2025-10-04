const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
const initDB = async () => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create farms table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS farms (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        size VARCHAR(100),
        crops TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

initDB();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if CORS_ORIGIN environment variable is set
    const allowedOrigin = process.env.CORS_ORIGIN;
    if (allowedOrigin && origin === allowedOrigin) {
      return callback(null, true);
    }
    
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
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  
  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user - name can be null or undefined
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email, hashedPassword, name || null]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// Farm routes
app.post('/api/farms', async (req, res) => {
  const { name, location, size, crops, userId } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO farms (user_id, name, location, size, crops) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, name, location, size, crops]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Farm created successfully',
      farm: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating farm:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error creating farm' 
    });
  }
});

app.get('/api/farms', async (req, res) => {
  const { userId } = req.query;
  
  try {
    let result;
    if (userId) {
      result = await pool.query(
        'SELECT * FROM farms WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM farms ORDER BY created_at DESC'
      );
    }
    
    res.json({ 
      success: true, 
      farms: result.rows 
    });
  } catch (error) {
    console.error('Error fetching farms:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching farms' 
    });
  }
});

app.get('/api/farms/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM farms WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Farm not found' 
      });
    }
    
    res.json({ 
      success: true, 
      farm: result.rows[0] 
    });
  } catch (error) {
    console.error('Error fetching farm:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching farm' 
    });
  }
});

app.put('/api/farms/:id', async (req, res) => {
  const { id } = req.params;
  const { name, location, size, crops } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE farms SET name = COALESCE($1, name), location = COALESCE($2, location), size = COALESCE($3, size), crops = COALESCE($4, crops), updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [name, location, size, crops, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Farm not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Farm updated successfully',
      farm: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating farm:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating farm' 
    });
  }
});

app.delete('/api/farms/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'DELETE FROM farms WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Farm not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Farm deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting farm:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting farm' 
    });
  }
});

// Root route
app.get('/', (req, res) => res.json({message: "API OK", status: "running", version: "2.0.0"}));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
