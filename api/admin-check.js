const { requireAdmin } = require('../lib/adminAuth');

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return; // sends 401 itself
  return res.status(200).json({ ok: true });
};