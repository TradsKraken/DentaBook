const { Pool } = require("pg");
function createPool() {
  return new Pool({
    host: process.env.DB_HOST || "db",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "dentabook_user",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "dentabook_db",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}
module.exports = { createPool };
