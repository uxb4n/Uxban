const sheets = require('../lib/sheets');

const attempts       = new Map();
const WINDOW_MS      = 60 * 1000;
const MAX_PER_WINDOW = 5;
const EMAIL_RE       = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? fwd.split(',')[0].trim() : req.socket?.remoteAddress) || 'unknown';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip  = getIp(req);
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && now < rec.resetAt && rec.count >= MAX_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many requests, slow down' });
  }
  if (!rec || now > rec.resetAt) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else rec.count += 1;

  const { email: rawEmail, source = 'website' } = req.body || {};
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    const existing = await sheets.get(process.env.GOOGLE_SHEET_ID, 'Sheet1!A:A');
    const emails = (existing.values || []).flat().map(e => String(e).toLowerCase());
    if (emails.includes(email)) {
      return res.status(200).json({ message: 'Already subscribed' });
    }

    await sheets.append(process.env.GOOGLE_SHEET_ID, 'Sheet1!A:C', [
      [email, new Date().toISOString(), String(source).slice(0, 50)],
    ]);

    return res.status(200).json({ message: 'Subscribed' });
  } catch (err) {
    console.error('[subscribe]', err.message);
    return res.status(500).json({ error: 'Failed to subscribe' });
  }
};