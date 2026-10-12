const { checkPassword, setSessionCookie } = require('../lib/adminAuth');

// Very basic in-memory rate limiting per serverless instance.
// Resets when the function cold-starts, but still slows down brute force
// within a warm instance. Good enough alongside a strong password;
// for stronger protection, swap this for Vercel's Edge Config / KV-based
// rate limiting if you want it to persist across instances.
const attempts = new Map(); // ip -> { count, resetAt }
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? fwd.split(',')[0].trim() : req.socket?.remoteAddress) || 'unknown';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getIp(req);
  const now = Date.now();
  const rec = attempts.get(ip);

  if (rec && now < rec.resetAt && rec.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }

  const { password } = req.body || {};

  if (checkPassword(password)) {
    attempts.delete(ip);
    setSessionCookie(res);
    return res.status(200).json({ ok: true });
  }

  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    rec.count += 1;
  }

  return res.status(401).json({ error: 'Incorrect password' });
};