/* ==============================================
   UXBAN — /api/auth?action=admin-check|admin-login|admin-logout
                     |secret-check|secret-login

   Merged auth endpoints. Keeps us under
   Vercel's 12-function limit.
   ============================================== */

const crypto = require('crypto');

const ADMIN_COOKIE  = 'uxban_admin_session';
const VAULT_COOKIE  = 'uxban_vault_session';
const ADMIN_TTL     = 1000 * 60 * 60 * 8;  // 8h
const VAULT_TTL     = 1000 * 60 * 60 * 4;  // 4h
const WINDOW_MS     = 5 * 60 * 1000;
const ADMIN_MAX     = 8;
const VAULT_MAX     = 6;

const attempts = new Map(); // ip -> { count, resetAt } — shared across actions

/* ── Crypto helpers ─────────────────────────── */
function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  const expiry = Number(payload);
  return Number.isFinite(expiry) && Date.now() < expiry;
}

function createToken(ttl, secret) {
  const expiry = String(Date.now() + ttl);
  return `${expiry}.${sign(expiry, secret)}`;
}

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

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) { crypto.timingSafeEqual(ba, ba); return false; }
  return crypto.timingSafeEqual(ba, bb);
}

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? fwd.split(',')[0].trim() : req.socket?.remoteAddress) || 'unknown';
}

function rateLimited(ip, max) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && now < rec.resetAt && rec.count >= max) return true;
  if (!rec || now > rec.resetAt) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else rec.count += 1;
  return false;
}

/* ── Session helpers (shared by other routes) ── */
function requireAdmin(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[ADMIN_COOKIE];
  if (verifyToken(token, process.env.ADMIN_SESSION_SECRET)) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

/* ── Handler ─────────────────────────────────── */
module.exports = async function handler(req, res) {
  const action = req.query.action;
  const ip = getIp(req);

  /* ══ ADMIN CHECK ══ */
  if (action === 'admin-check') {
    if (req.method !== 'GET') return res.status(405).end();
    const cookies = parseCookies(req);
    if (verifyToken(cookies[ADMIN_COOKIE], process.env.ADMIN_SESSION_SECRET)) {
      return res.status(200).json({ ok: true });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  /* ══ ADMIN LOGIN ══ */
  if (action === 'admin-login') {
    if (req.method !== 'POST') return res.status(405).end();
    if (rateLimited(ip, ADMIN_MAX)) {
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }
    const { password } = req.body || {};
    if (timingSafeEqualStr(password, process.env.ADMIN_PASSWORD || '')) {
      attempts.delete(ip);
      const token = createToken(ADMIN_TTL, process.env.ADMIN_SESSION_SECRET);
      const maxAge = Math.floor(ADMIN_TTL / 1000);
      res.setHeader('Set-Cookie',
        `${ADMIN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`
      );
      return res.status(200).json({ ok: true });
    }
    return res.status(401).json({ error: 'Incorrect password' });
  }

  /* ══ ADMIN LOGOUT ══ */
  if (action === 'admin-logout') {
    if (req.method !== 'POST') return res.status(405).end();
    res.setHeader('Set-Cookie',
      `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
    );
    return res.status(200).json({ ok: true });
  }

  /* ══ VAULT CHECK ══ */
  if (action === 'secret-check') {
    if (req.method !== 'GET') return res.status(405).end();
    const cookies = parseCookies(req);
    const secret = process.env.VAULT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
    if (verifyToken(cookies[VAULT_COOKIE], secret)) {
      return res.status(200).json({ ok: true });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  /* ══ VAULT LOGIN ══ */
  if (action === 'secret-login') {
    if (req.method !== 'POST') return res.status(405).end();
    if (rateLimited(ip, VAULT_MAX)) {
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }
    const { password } = req.body || {};
    if (timingSafeEqualStr(password, process.env.VAULT_PASSWORD || '')) {
      attempts.delete(ip);
      const secret = process.env.VAULT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
      const token = createToken(VAULT_TTL, secret);
      const maxAge = Math.floor(VAULT_TTL / 1000);
      res.setHeader('Set-Cookie',
        `${VAULT_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/secret; Max-Age=${maxAge}`
      );
      return res.status(200).json({ ok: true });
    }
    return res.status(401).json({ error: 'Wrong code.' });
  }

  return res.status(404).json({ error: 'Unknown action' });
};

module.exports.requireAdmin = requireAdmin;
module.exports.parseCookies = parseCookies;