const crypto = require("crypto");

/**
 * Hash a plain-text password using scrypt.
 * Returns a string "salt:hash" (hex encoded) that is safe to store.
 */
function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plain-text password against a stored "salt:hash" string.
 */
function verifyPassword(plainPassword, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, originalHash] = stored.split(":");
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(originalHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { hashPassword, verifyPassword };
