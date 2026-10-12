/* ==============================================
   UXBAN — /api/spotify
   Serves data/releases.json.
   Refresh with: node scripts/refresh-releases.js

   If the file is empty, returns { available: false }
   so the frontend can show a nice state instead of
   pretending nothing exists.
   ============================================== */

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(process.cwd(), 'data', 'releases.json');

let cached     = null;
let cachedMtime = 0;

module.exports = function handler(req, res) {
  try {
    const stat = fs.statSync(DATA_PATH);

    if (!cached || stat.mtimeMs !== cachedMtime) {
      cached = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      cachedMtime = stat.mtimeMs;
    }

    const albums  = cached.albums  || [];
    const singles = cached.singles || [];
    const available = albums.length + singles.length > 0;

    // Cache briefly when empty so we retry sooner, longer when populated
    res.setHeader(
      'Cache-Control',
      available
        ? 's-maxage=3600, stale-while-revalidate=86400'
        : 's-maxage=60, stale-while-revalidate=300'
    );

    return res.status(200).json({
      available,
      albums,
      singles,
    });

  } catch (err) {
    console.error('[spotify]', err.message);
    return res.status(200).json({
      available: false,
      albums: [],
      singles: [],
      error: err.message,
    });
  }
};