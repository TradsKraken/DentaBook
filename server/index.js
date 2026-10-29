require('dotenv').config();
const { Pool } = require('pg');
const { createApp } = require('./app');

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'dentabook_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'dentabook_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
const app = createApp(pool);
const server = app.listen(process.env.PORT || 5000, () => console.log('DentaBook API listening on port', process.env.PORT || 5000));
async function shutdown() {
  server.close(async () => { await pool.end(); process.exit(0); });
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
