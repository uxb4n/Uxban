const sheets = require('../lib/sheets');
const { requireAdmin } = require('../lib/adminAuth');

const SHEET_ID  = process.env.GOOGLE_SHEET_ID;
const LINKS_TAB = 'Links';

function isHttpUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

module.exports = async function handler(req, res) {

  if (req.method === 'GET') {
    try {
      const data   = await sheets.get(SHEET_ID, `${LINKS_TAB}!A:C`);
      const rows   = data.values || [];
      const links  = {};
      const custom = [];

      rows.forEach(([key, url, isCustom]) => {
        if (!key || !url) return;
        if (isCustom === 'custom') custom.push({ name: key, url });
        else links[key] = url;
      });

      return res.status(200).json({ links, custom });
    } catch (err) {
      console.error('[links GET]', err.message);
      return res.status(500).json({ error: 'Failed to read links' });
    }
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;

    try {
      const { links = {}, custom = [] } = req.body || {};

      for (const [, url] of Object.entries(links)) {
        if (url && !isHttpUrl(url)) return res.status(400).json({ error: `Invalid URL: ${url}` });
      }
      for (const c of custom) {
        if (!c.name || !c.url || !isHttpUrl(c.url)) {
          return res.status(400).json({ error: `Invalid custom link: ${c.name || ''}` });
        }
      }

      const rows = [
        ...Object.entries(links).map(([key, url]) => [key, url, '']),
        ...custom.map(c => [c.name, c.url, 'custom']),
      ];

      await sheets.clear(SHEET_ID, `${LINKS_TAB}!A:C`);
      if (rows.length) await sheets.update(SHEET_ID, `${LINKS_TAB}!A1`, rows);

      return res.status(200).json({ saved: rows.length });
    } catch (err) {
      console.error('[links POST]', err.message);
      return res.status(500).json({ error: 'Failed to save links' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};