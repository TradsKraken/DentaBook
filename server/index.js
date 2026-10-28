/**
 * DentaBook Backend API Server
 * Runtime: Node.js 22 / Express 4 / PostgreSQL
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'dentabook_user',
  password: process.env.DB_PASSWORD || 'dentabook_secure_password_replace_in_prod',
  database: process.env.DB_NAME || 'dentabook_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Disable Express fingerprinting header
app.disable('x-powered-by');

// Health Check Endpoint (Verifies API and Database connectivity)
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() as current_time, current_database() as database');
    return res.status(200).json({
      status: 'healthy',
      service: 'dentabook-api',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        db_time: dbRes.rows[0].current_time,
        database_name: dbRes.rows[0].database,
      },
    });
  } catch (err) {
    return res.status(503).json({
      status: 'degraded',
      service: 'dentabook-api',
      error: 'Database connection failed',
      details: err.message,
    });
  }
});

// Root API Welcome / Status
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to DentaBook API',
    version: '1.0.0',
    documentation: '/docs',
    endpoints: {
      health: '/api/health',
    },
  });
});

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(` DentaBook API running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(`===========================================`);
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing HTTP server and database pool...');
  await pool.end();
  process.exit(0);
});

module.exports = { app, pool };
