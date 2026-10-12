// api/secret-check.js
// Called on page load — returns 200 if cookie is valid, 401 if not.
// The frontend uses this to silently restore a session (same as admin-check).

const crypto = require('crypto');

const COOKIE_NAME = 'uxban_vault_session';

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function sign(value) {
  const secret = process.env.VAULT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected   = sign(payload);
  const sigBuf     = Buffer.from(sig);
  const expBuf     = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  const expiry = Number(payload);
  return Number.isFinite(expiry) && Date.now() < expiry;
}

module.exports = function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const cookies = parseCookies(req);
  if (verifyToken(cookies[COOKIE_NAME])) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ error: 'Unauthorized' });
};