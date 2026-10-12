const crypto = require('crypto');

const COOKIE_NAME = 'uxban_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function sign(value) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

/**
 * Build a signed session cookie value: "<expiry>.<hmac>"
 */
function createSessionToken() {
  const expiry = Date.now() + SESSION_TTL_MS;
  const payload = String(expiry);
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

/**
 * Verify a session token. Returns true only if signature matches
 * AND it hasn't expired. Uses timing-safe comparison.
 */
function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;

  const expected = sign(payload);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

  const expiry = Number(payload);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;

  return true;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

/**
 * Checks the password using timing-safe comparison.
 */
function checkPassword(candidate) {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!candidate || typeof candidate !== 'string') return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(real);
  if (a.length !== b.length) {
    // Still run a comparison to avoid leaking length via timing,
    // by comparing against a buffer of the same length as `a`.
    crypto.timingSafeEqual(a, a);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/**
 * Call at the top of any protected API route.
 * Returns true if authorized; otherwise sends 401 and returns false.
 */
function requireAdmin(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (verifySessionToken(token)) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

function setSessionCookie(res) {
  const token = createSessionToken();
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
  );
}

module.exports = {
  requireAdmin,
  setSessionCookie,
  clearSessionCookie,
  checkPassword,
  parseCookies,
  verifySessionToken,
  COOKIE_NAME,
};