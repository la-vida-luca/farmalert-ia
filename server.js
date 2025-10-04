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
        size VARCHAR(100),
        crops TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created farms table');
    
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};

// Initialize database tables
const initDB = async () => {
  try {
    // Run migration to ensure clean database state
    await runMigration();
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database on startup
initDB();

// Health check route
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'Database connection successful' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// User registration endpoint
app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and password are required' 
    });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
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
    if (error.code === '23505') {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and password are required' 
    });
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
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

// Get user profile
app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      user: result.rows[0] 
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching user' 
    });
  }
});

// Create farm
app.post('/api/farms', async (req, res) => {
  const { user_id, name, location, size, crops } = req.body;
  
  if (!user_id || !name || !location) {
    return res.status(400).json({ 
      success: false, 
      message: 'User ID, name, and location are required' 
    });
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO farms (user_id, name, location, size, crops) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, name, location, size || null, crops || null]
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

// Get all farms for a user
app.get('/api/users/:userId/farms', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM farms WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
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

// Get single farm
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

// Update farm
app.put('/api/farms/:id', async (req, res) => {
  const { id } = req.params;
  const { name, location, size, crops } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE farms 
       SET name = COALESCE($1, name), 
           location = COALESCE($2, location), 
           size = COALESCE($3, size), 
           crops = COALESCE($4, crops),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
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

// Delete farm
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
