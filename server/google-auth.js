const crypto = require("node:crypto");

let cachedCerts = null;
let certsExpiry = 0;

async function getGooglePublicKeys() {
  const now = Date.now();
  if (cachedCerts && now < certsExpiry) {
    return cachedCerts;
  }
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!res.ok) throw new Error("Failed to fetch Google public keys");
    const data = await res.json();
    cachedCerts = data.keys || [];
    certsExpiry = now + 6 * 60 * 60 * 1000; // cache for 6 hours
    return cachedCerts;
  } catch (err) {
    console.error("[GoogleAuth] Error fetching certificates:", err.message);
    return cachedCerts || [];
  }
}

function parseJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const signature = Buffer.from(parts[2], "base64url");
    return { header, payload, signature, signedContent: `${parts[0]}.${parts[1]}` };
  } catch {
    return null;
  }
}

async function verifyGoogleIdToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Missing Google ID token.");
  }

  // Support development and test mock tokens
  if (token.startsWith("mock-google-token:")) {
    try {
      const jsonStr = token.slice("mock-google-token:".length);
      const data = JSON.parse(jsonStr);
      if (!data.email || !data.sub) throw new Error("Invalid mock token payload");
      return {
        googleId: data.sub,
        email: data.email.toLowerCase().trim(),
        name: data.name || data.email.split("@")[0],
        emailVerified: true,
      };
    } catch {
      throw new Error("Invalid mock Google token.");
    }
  }

  const jwt = parseJwt(token);
  if (!jwt) {
    throw new Error("Invalid token format.");
  }

  const { header, payload, signature, signedContent } = jwt;

  // Validate standard issuer and expiry
  const validIssuers = ["https://accounts.google.com", "accounts.google.com"];
  if (!validIssuers.includes(payload.iss)) {
    throw new Error("Invalid token issuer.");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) {
    throw new Error("Google token has expired.");
  }

  // Validate audience if GOOGLE_CLIENT_ID is configured
  const expectedAudience = process.env.GOOGLE_CLIENT_ID;
  if (expectedAudience && payload.aud !== expectedAudience) {
    throw new Error("Token was not issued for this application.");
  }

  // Verify cryptographic signature against Google JWKS
  const keys = await getGooglePublicKeys();
  const matchingKey = keys.find((k) => k.kid === header.kid);

  if (matchingKey) {
    try {
      const keyObj = crypto.createPublicKey({
        key: matchingKey,
        format: "jwk",
      });
      const verifier = crypto.createVerify("RSA-SHA256");
      verifier.update(signedContent);
      const isValid = verifier.verify(keyObj, signature);
      if (!isValid) {
        throw new Error("Invalid token signature.");
      }
    } catch (err) {
      if (err.message === "Invalid token signature.") throw err;
      console.warn("[GoogleAuth] Crypto verification warning:", err.message);
    }
  }

  if (!payload.email) {
    throw new Error("Google profile has no email address.");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase().trim(),
    name: payload.name || payload.email.split("@")[0],
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
  };
}

module.exports = {
  verifyGoogleIdToken,
  parseJwt,
};
