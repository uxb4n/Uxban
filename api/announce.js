const sheets = require('../lib/sheets');
const { requireAdmin } = require('../lib/adminAuth');

/* ════════════════════════════════════════════════════════
   SUBSCRIBER EMAILS
════════════════════════════════════════════════════════ */
async function getEmails() {
  const data = await sheets.get(process.env.GOOGLE_SHEET_ID, 'Sheet1!A:A');
  return (data.values || []).flat().filter(e => e && e.includes('@'));
}

/* ════════════════════════════════════════════════════════
   LATEST SPOTIFY RELEASE
════════════════════════════════════════════════════════ */
async function getLatestRelease() {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://uxban.shop';
  const res  = await fetch(`${base}/api/spotify`);
  const data = await res.json();
  const all  = [
    ...(data.albums  || []).map(r => ({ ...r, type: 'ALBUM'  })),
    ...(data.singles || []).map(r => ({ ...r, type: 'SINGLE' })),
  ];
  return all.sort((a, b) => new Date(b.release_date) - new Date(a.release_date))[0];
}

/* ════════════════════════════════════════════════════════
   SEND VIA RESEND
════════════════════════════════════════════════════════ */
async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: 'Uxban <drops@uxban.shop>', to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}`);
}

async function sendToAll(emails, subject, html) {
  let sent = 0;
  for (const email of emails) {
    try { await sendEmail({ to: email, subject, html }); sent++; }
    catch (err) { console.error(`Failed to send to ${email}:`, err.message); }
  }
  return sent;
}

/* ════════════════════════════════════════════════════════
   EMAIL TEMPLATES
   Colours + footer now match the new site (blue accent,
   no x34 reference).
════════════════════════════════════════════════════════ */
const BRAND_BLUE  = '#1a3aff';
const BRAND_DARK  = '#000000';
const BRAND_TEXT  = '#ffffff';
const BRAND_MUTED = 'rgba(255,255,255,0.45)';
const BRAND_DIM   = 'rgba(255,255,255,0.2)';

function shell(inner) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BRAND_DARK};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_DARK};padding:40px 20px;">
  <tr><td align="center">
  <table width="100%" style="max-width:560px;">
    <tr><td style="padding-bottom:32px;border-bottom:1px solid #141414;">
      <p style="margin:0;font-size:8px;letter-spacing:5px;color:${BRAND_BLUE};font-family:monospace;text-transform:uppercase;">// UXBAN</p>
    </td></tr>
    ${inner}
    <tr><td style="padding-top:32px;border-top:1px solid #141414;">
      <p style="margin:0;font-size:8px;letter-spacing:2px;color:${BRAND_DIM};font-family:monospace;text-transform:uppercase;">
        © 2026 UXBAN<br><br>
        <a href="https://uxban.shop" style="color:${BRAND_BLUE};text-decoration:none;">uxban.shop</a>
      </p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>`;
}

function musicEmailHtml(release) {
  const cover = release.images?.[0]?.url || '';
  const links = release.links || {};
  const year  = release.release_date?.slice(0, 4) || '';
  const type  = release.type || 'RELEASE';

  return shell(`
    ${cover ? `<tr><td style="padding:40px 0 0;">
      <img src="${cover}" width="100%" style="display:block;max-width:400px;margin:0 auto;" alt="${release.name}">
    </td></tr>` : ''}
    <tr><td style="padding:32px 0 8px;">
      <p style="margin:0 0 8px;font-size:8px;letter-spacing:4px;color:${BRAND_BLUE};font-family:monospace;text-transform:uppercase;">// ${type} · ${year}</p>
      <h1 style="margin:0;font-size:48px;font-weight:900;letter-spacing:-0.05em;line-height:0.9;color:${BRAND_TEXT};">${release.name}</h1>
    </td></tr>
    <tr><td style="padding:24px 0 32px;border-bottom:1px solid #141414;">
      <p style="margin:0;font-size:13px;color:${BRAND_MUTED};line-height:1.7;">
        New music is out now. Stream it everywhere below.
      </p>
    </td></tr>
    <tr><td style="padding:32px 0;">
      ${links.spotify ? `<p style="margin:0 0 12px;"><a href="${links.spotify}" style="display:inline-block;background:${BRAND_BLUE};color:#fff;font-family:monospace;font-size:8px;letter-spacing:3px;font-weight:700;padding:14px 32px;text-decoration:none;text-transform:uppercase;">STREAM ON SPOTIFY →</a></p>` : ''}
      ${links.appleMusic ? `<p style="margin:0 0 12px;"><a href="${links.appleMusic}" style="display:inline-block;border:1px solid rgba(255,255,255,0.15);color:${BRAND_MUTED};font-family:monospace;font-size:8px;letter-spacing:3px;font-weight:700;padding:14px 32px;text-decoration:none;text-transform:uppercase;">APPLE MUSIC →</a></p>` : ''}
      ${links.youtubeMusic ? `<p style="margin:0;"><a href="${links.youtubeMusic}" style="display:inline-block;border:1px solid rgba(255,255,255,0.15);color:${BRAND_MUTED};font-family:monospace;font-size:8px;letter-spacing:3px;font-weight:700;padding:14px 32px;text-decoration:none;text-transform:uppercase;">YOUTUBE MUSIC →</a></p>` : ''}
    </td></tr>
  `);
}

function merchEmailHtml() {
  return shell(`
    <tr><td style="padding:40px 0 8px;">
      <p style="margin:0 0 8px;font-size:8px;letter-spacing:4px;color:${BRAND_BLUE};font-family:monospace;text-transform:uppercase;">// UXTRA — FIRST DROP</p>
      <h1 style="margin:0;font-size:48px;font-weight:900;letter-spacing:-0.05em;line-height:0.9;color:${BRAND_TEXT};">MERCH<br>IS LIVE.</h1>
    </td></tr>
    <tr><td style="padding:24px 0 32px;border-bottom:1px solid #141414;">
      <p style="margin:0;font-size:13px;color:${BRAND_MUTED};line-height:1.7;">
        The UXTRA first drop is now available. Tees, hoodies and CDs — limited run, ships worldwide.
      </p>
    </td></tr>
    <tr><td style="padding:32px 0;">
      <a href="https://uxban.shop/store/" style="display:inline-block;background:${BRAND_BLUE};color:#fff;font-family:monospace;font-size:8px;letter-spacing:3px;font-weight:700;padding:14px 32px;text-decoration:none;text-transform:uppercase;">SHOP NOW →</a>
    </td></tr>
  `);
}

function customEmailHtml({ eyebrow, headline, body, btnText, btnUrl, btnBg, btnFg }) {
  const safeEyebrow  = eyebrow  || '// UXBAN';
  const safeHeadline = headline || '';
  const safeBody     = (body || '').replace(/\n/g, '<br>');
  const safeBtnText  = btnText  || '';
  const safeBtnUrl   = btnUrl   || '#';
  const safeBtnBg    = btnBg    || BRAND_BLUE;
  const safeBtnFg    = btnFg    || '#ffffff';

  return shell(`
    <tr><td style="padding:40px 0 8px;">
      <p style="margin:0 0 8px;font-size:8px;letter-spacing:4px;color:${BRAND_BLUE};font-family:monospace;text-transform:uppercase;">${safeEyebrow}</p>
      <h1 style="margin:0;font-size:48px;font-weight:900;letter-spacing:-0.05em;line-height:0.9;color:${BRAND_TEXT};">${safeHeadline}</h1>
    </td></tr>
    <tr><td style="padding:24px 0 32px;border-bottom:1px solid #141414;">
      <p style="margin:0;font-size:13px;color:${BRAND_MUTED};line-height:1.7;">${safeBody}</p>
    </td></tr>
    ${safeBtnText ? `<tr><td style="padding:32px 0;">
      <a href="${safeBtnUrl}" style="display:inline-block;background:${safeBtnBg};color:${safeBtnFg};font-family:monospace;font-size:8px;letter-spacing:3px;font-weight:700;padding:14px 32px;text-decoration:none;text-transform:uppercase;">${safeBtnText}</a>
    </td></tr>` : ''}
  `);
}

function broadcastEmailHtml({ body }) {
  const safeBody = (body || '').replace(/\n/g, '<br>');
  return shell(`
    <tr><td style="padding:32px 0;border-bottom:1px solid #141414;">
      <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.8;">${safeBody}</p>
    </td></tr>
  `);
}

/* ════════════════════════════════════════════════════════
   HANDLER
════════════════════════════════════════════════════════ */
module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  const { type, preview } = req.query;

  try {
    const emails = await getEmails();

    if (preview === '1') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

      let html, subject;

      if (type === 'music') {
        const release = await getLatestRelease();
        if (!release) return res.status(404).json({ error: 'No release found' });
        subject = `// ${release.name} — Out Now`;
        html    = musicEmailHtml(release);
      } else if (type === 'merch') {
        subject = '// UXTRA Merch Drop — Available Now';
        html    = merchEmailHtml();
      } else {
        return res.status(400).json({ error: 'Preview not available for this type' });
      }

      return res.status(200).json({ preview: html, subject, count: emails.length });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    let subject, html, releaseName;

    if (type === 'music') {
      const release = await getLatestRelease();
      if (!release) return res.status(404).json({ error: 'No release found' });
      releaseName = release.name;
      subject = `// ${release.name} — Out Now`;
      html    = musicEmailHtml(release);

    } else if (type === 'merch') {
      subject = '// UXTRA Merch Drop — Available Now';
      html    = merchEmailHtml();

    } else if (type === 'custom') {
      const payload = req.body;
      if (!payload?.subject) return res.status(400).json({ error: 'subject required' });
      subject = payload.subject;
      html    = customEmailHtml(payload);

    } else if (type === 'broadcast') {
      const payload = req.body;
      if (!payload?.subject || !payload?.body) return res.status(400).json({ error: 'subject and body required' });
      subject = payload.subject;
      html    = broadcastEmailHtml(payload);

    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const sent = await sendToAll(emails, subject, html);
    return res.status(200).json({ sent, releaseName });

  } catch (err) {
    console.error('[announce]', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};