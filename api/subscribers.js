const sheets = require('../lib/sheets');
const { requireAdmin } = require('../lib/adminAuth');

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    const data = await sheets.get(process.env.GOOGLE_SHEET_ID, 'Sheet1!A:A');
    const rows = (data.values || []).filter(r => r[0] && r[0].includes('@'));
    return res.status(200).json({ count: rows.length });
  } catch (err) {
    console.error('[subscribers]', err.message);
    return res.status(500).json({ count: 0 });
  }
};