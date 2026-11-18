const crypto = require("node:crypto");

function hashToken(value) {
  if (!value) return "";
  return crypto.createHash("sha256").update(String(value).trim()).digest("hex");
}

function generateNumericOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function generateHexToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function createVerificationCredentials() {
  const token = generateHexToken(32);
  const code = generateNumericOtp();
  return {
    token,
    code,
    tokenHash: hashToken(token),
    codeHash: hashToken(code),
  };
}

module.exports = {
  hashToken,
  generateNumericOtp,
  generateHexToken,
  createVerificationCredentials,
};
