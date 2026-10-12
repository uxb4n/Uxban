// api/secret-login.js
// Mirrors the admin-login pattern — server-side password check,
// signed HttpOnly cookie, rate limiting. No password in client JS.

const { parseCookies } = require('../lib/adminAuth');
const crypto = require('crypto');

const COOKIE_NAME   = 'uxban_vault_session';
const SESSION_TTL   = 1000 * 60 * 60 * 4; // 4 hours
const WINDOW_MS     = 5 * 60 * 1000;       // 5-minute rate limit window
const MAX_ATTEMPTS  = 6;

const attempts = new Map(); // ip -> { count, resetAt }

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? fwd.split(',')[0].trim() : req.socket?.remoteAddress) || 'unknown';
}

function sign(value) {
  const secret = process.env.VAULT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function createToken() {
  const expiry  = String(Date.now() + SESSION_TTL);
  return `${expiry}.${sign(expiry)}`;
}

function checkVaultPassword(candidate) {
  const real = process.env.VAULT_PASSWORD || '';
  if (!candidate || typeof candidate !== 'string') return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(real);
  if (a.length !== b.length) { crypto.timingSafeEqual(a, a); return false; }
  return crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const ip  = getIp(req);
  const now = Date.now();
  const rec = attempts.get(ip);

  if (rec && now < rec.resetAt && rec.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }

  const { password } = req.body || {};

  if (checkVaultPassword(password)) {
    attempts.delete(ip);
    const token    = createToken();
    const maxAge   = Math.floor(SESSION_TTL / 1000);
    res.setHeader('Set-Cookie',
      `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/secret; Max-Age=${maxAge}`
    );
    return res.status(200).json({ ok: true });
  }

  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    rec.count += 1;
  }

  return res.status(401).json({ error: 'Wrong code.' });
};