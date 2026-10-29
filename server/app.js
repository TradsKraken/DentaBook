const express = require('express');
const cors = require('cors');
const { createClinicRouter } = require('./routes/clinics');

function createApp(pool, { logger = console } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.get('/api/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'healthy', service: 'dentabook-api', database: { connected: true } });
    } catch {
      res.status(503).json({ status: 'unavailable', service: 'dentabook-api', database: { connected: false } });
    }
  });
  app.get('/api', (req, res) => res.json({ message: 'DentaBook API', version: '1.0.0', endpoints: { health: '/api/health', clinics: '/api/clinics' } }));
  app.use('/api/clinics', createClinicRouter(pool));
  app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use((error, req, res, next) => {
    logger.error('API request failed:', error);
    res.status(503).json({ error: 'This service is temporarily unavailable. Please try again later.' });
  });
  return app;
}
module.exports = { createApp };
