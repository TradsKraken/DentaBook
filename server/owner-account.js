const bcrypt = require("bcrypt");
const { email, password, text } = require("./validation");

async function createOwnerAccount(pool, options) {
  const { username, name, address = null, secret, development = false } = options;
  if (development && process.env.NODE_ENV !== "development")
    throw new Error("Development accounts require NODE_ENV=development. No account was created.");
  if (!/^[a-z][a-z0-9_.-]{2,39}$/i.test(username || "") ||
      !text(name, 150) || (address !== null && !email(address)) ||
      typeof secret !== "string" || Buffer.byteLength(secret, "utf8") > 72 ||
      !(development ? secret.length >= 8 : password(secret)))
    throw new Error("Use a valid username, name, optional email, and password (12+ characters in production; at most 72 UTF-8 bytes).");
  const hash = await bcrypt.hash(secret, 12);
  // Insert only: rerunning never takes over an existing identity or resets it.
  return (await pool.query(
    `INSERT INTO users (username, full_name, email, password_hash, role, owner_access, development_only)
     VALUES ($1, $2, $3, $4, 'system_admin', TRUE, $5)
     RETURNING id, username`,
    [username.toLowerCase(), name.trim(), address?.trim().toLowerCase() || null, hash, development],
  )).rows[0];
}

module.exports = { createOwnerAccount };
