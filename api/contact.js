/* ==============================================
   UXBAN — /api/contact
   Sends contact form submissions via Resend.
   Rate-limited per IP to prevent abuse.
   ============================================== */

const attempts = new Map();
const WINDOW_MS = 60 * 60 * 1000;   // 1 hour
const MAX_PER_WINDOW = 3;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DESTINATION = 'uuxban@gmail.com';   // ← where contact emails land

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? fwd.split(',')[0].trim() : req.socket?.remoteAddress) || 'unknown';
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIp(req);
  const now = Date.now();
  const rec = attempts.get(ip);

  if (rec && now < rec.resetAt && rec.count >= MAX_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many messages. Try again later.' });
  }
  if (!rec || now > rec.resetAt) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else rec.count += 1;

  const { name, email, subject, message, _honey } = req.body || {};

  // Honeypot — bots fill this, humans don't
  if (_honey) return res.status(200).json({ ok: true });

  const safeName    = String(name || '').trim().slice(0, 120);
  const safeEmail   = String(email || '').trim().toLowerCase().slice(0, 254);
  const safeSubject = String(subject || 'New message').trim().slice(0, 200);
  const safeMessage = String(message || '').trim().slice(0, 5000);

  if (!safeName || !safeEmail || !safeMessage) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  if (!EMAIL_RE.test(safeEmail)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  try {
    const html = `
      <div style="font-family:Helvetica,Arial,sans-serif;color:#111;line-height:1.6;max-width:600px;">
        <h2 style="margin:0 0 8px;font-size:22px;">New contact form message</h2>
        <p style="margin:0 0 20px;color:#666;font-size:13px;">From uxban.shop/contact</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:6px 0;width:90px;color:#888;">Name</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(safeName)}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(safeEmail)}" style="color:#1a3aff;">${escapeHtml(safeEmail)}</a></td></tr>
          <tr><td style="padding:6px 0;color:#888;">Subject</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(safeSubject)}</td></tr>
        </table>
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
        <p style="margin:0;white-space:pre-wrap;font-size:15px;">${escapeHtml(safeMessage)}</p>
      </div>
    `;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'Uxban Contact <drops@uxban.shop>',
        to:      DESTINATION,
        reply_to: safeEmail,
        subject: `[UXBAN] ${safeSubject}`,
        html,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('[contact] Resend error:', r.status, detail);
      return res.status(500).json({ error: 'Failed to send. Try again or email directly.' });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[contact]', err.message);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};