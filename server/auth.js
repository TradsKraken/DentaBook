const crypto = require("node:crypto");
const COOKIE = "dentabook_session";
function cookieName() {
  // __Host- prevents sibling subdomains from injecting a parent-domain cookie.
  return cookieOptions().secure ? `__Host-${COOKIE}` : COOKIE;
}
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
function sessionToken(req) {
  const value = (req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName()}=`))
    ?.slice(cookieName().length + 1);
  return /^[a-f0-9]{64}$/.test(value || "") ? value : null;
}
function cookieOptions() {
  const url = new URL(process.env.CLIENT_URL || "http://localhost:3000");
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: url.protocol === "https:" || process.env.NODE_ENV === "production",
    path: "/",
  };
}
function requireSession(pool) {
  return async (req, res, next) => {
    try {
      const token = sessionToken(req);
      if (!token)
        return res.status(401).json({ error: "Please sign in to continue." });
      const result = await pool.query(
        `SELECT u.id, u.full_name AS name, u.email, u.role
        FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP
          AND s.role = u.role`,
        [hashToken(token)],
      );
      if (!result.rows.length)
        return res
          .status(401)
          .json({ error: "Your session has expired. Please sign in again." });
      req.user = result.rows[0];
      next();
    } catch (error) {
      next(error);
    }
  };
}
function requireRole(role) {
  return (req, res, next) =>
    req.user.role === role
      ? next()
      : res
          .status(403)
          .json({ error: "You do not have access to this workspace." });
}
function protectMutation(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const allowedOrigin = new URL(
    process.env.CLIENT_URL || "http://localhost:3000",
  ).origin;
  if (
    req.get("Sec-Fetch-Site") === "cross-site" ||
    req.get("X-DentaBook-Request") !== "1" ||
    (req.get("Origin") && req.get("Origin") !== allowedOrigin)
  ) {
    return res
      .status(403)
      .json({
        error:
          "This request could not be verified. Please refresh and try again.",
      });
  }
  next();
}
function rateLimit({ limit, windowMs }) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of buckets)
      if (value.until <= now) buckets.delete(key);
    const key = req.ip;
    const entry = buckets.get(key) || { count: 0, until: now + windowMs };
    entry.count++;
    buckets.set(key, entry);
    if (entry.count > limit) {
      res.set("Retry-After", String(Math.ceil((entry.until - now) / 1000)));
      return res
        .status(429)
        .json({ error: "Too many attempts. Please try again later." });
    }
    next();
  };
}
module.exports = {
  COOKIE,
  cookieName,
  hashToken,
  sessionToken,
  cookieOptions,
  requireSession,
  requireRole,
  protectMutation,
  rateLimit,
};
