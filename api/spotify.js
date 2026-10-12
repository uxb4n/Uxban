/* ==============================================
   UXBAN — /api/spotify
   Serves data/releases.json. Refresh that file
   by running: node scripts/refresh-releases.js
   ============================================== */

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(process.cwd(), 'data', 'releases.json');

let cached = null;
let cachedMtime = 0;

module.exports = function handler(req, res) {
  try {
    const stat = fs.statSync(DATA_PATH);

    // Reload if file changed (rare — only on new deploys)
    if (!cached || stat.mtimeMs !== cachedMtime) {
      cached = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      cachedMtime = stat.mtimeMs;
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(cached);
  } catch (err) {
    console.error('[spotify]', err.message);
    return res.status(500).json({
      error: 'Failed to load releases.json',
      detail: err.message,
      albums: [],
      singles: [],
    });
  }
};